import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  amountToMinorUnits,
  hitpayConfig,
  mapHitpayStatus,
  verifyHitpaySignature,
} from "../_shared/hitpay.ts";

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  const config = hitpayConfig();
  const signature = request.headers.get("Hitpay-Signature") || request.headers.get("hitpay-signature") || "";
  if (!config.salt) return respond(500, { error: "HitPay webhook is not configured" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond(500, { error: "Supabase service credentials are unavailable" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const rawBody = await request.text();
  const valid = await verifyHitpaySignature(rawBody, signature, config.salt);
  if (!valid) {
    await admin.from("platform_monitoring_events").insert({
      service: "hitpay",
      severity: "warning",
      event_type: "webhook_signature_failed",
      message: "HitPay signature verification failed",
    });
    return respond(400, { error: "Invalid webhook signature" });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return respond(400, { error: "Invalid webhook payload" });
  }

  const eventObject = request.headers.get("Hitpay-Event-Object") || request.headers.get("hitpay-event-object") || "event";
  const eventType = request.headers.get("Hitpay-Event-Type") || request.headers.get("hitpay-event-type") || String(payload.event || payload.status || "received");
  const objectId = pickString(payload, ["id", "recurring_billing_id", "subscription_id", "charge_id"]) || crypto.randomUUID();
  const eventId = `${eventObject}:${eventType}:${objectId}`;
  const nested = asRecord(payload.recurring_billing || payload.subscription || payload.data);
  const customer = asRecord(payload.customer);
  let outletId = pickString(payload, ["reference", "reference_number"]) || pickString(nested, ["reference", "reference_number"]);

  if (!outletId) {
    const recurringId = pickString(payload, ["recurring_billing_id", "subscription_id", "id"]) || pickString(nested, ["id"]);
    if (recurringId && /^[0-9a-f-]{8,}$/i.test(recurringId)) {
      const byId = await admin.from("outlet_subscriptions").select("outlet_id").eq("id", recurringId).maybeSingle();
      outletId = byId.data?.outlet_id || null;
      if (!outletId) {
        const byHitpay = await admin.from("outlet_subscriptions").select("outlet_id").eq("hitpay_recurring_id", recurringId).maybeSingle();
        outletId = byHitpay.data?.outlet_id || null;
      }
    }
  }
  if (!outletId) {
    const email = pickString(customer, ["email"]) || pickString(payload, ["customer_email"]);
    if (email) {
      const { data } = await admin.from("billing_customers").select("outlet_id").eq("email", email).maybeSingle();
      outletId = data?.outlet_id || null;
    }
  }

  const { error: eventError } = await admin.from("billing_events").insert({
    id: eventId,
    event_type: `${eventObject}.${eventType}`,
    outlet_id: outletId,
    provider: "hitpay",
    stripe_created_at: typeof payload.created_at === "string" ? payload.created_at : new Date().toISOString(),
    livemode: config.livemode,
    payload: {
      object_id: objectId,
      status: pickString(payload, ["status"]) || pickString(nested, ["status"]),
      reference: outletId,
    },
  });
  if (eventError?.code === "23505") return respond(200, { received: true, duplicate: true });
  if (eventError) return respond(500, { error: "Could not persist billing event" });

  try {
    const isSubscriptionEvent = eventObject.includes("recurring") || eventType.includes("subscription");
    if (isSubscriptionEvent) {
      const recurringId = pickString(nested, ["id"]) || pickString(payload, ["recurring_billing_id", "subscription_id", "id"]);
      const status = mapHitpayStatus(pickString(nested, ["status"]) || pickString(payload, ["status"]));
      if (recurringId && outletId) {
        const amount = nested.amount ?? payload.amount;
        await admin.from("outlet_subscriptions").upsert({
          id: recurringId,
          outlet_id: outletId,
          provider: "hitpay",
          hitpay_recurring_id: recurringId,
          hitpay_plan_id: pickString(nested, ["plan_id"]) || hitpayConfig().planId || null,
          status,
          cancel_at_period_end: status === "canceled",
          unit_amount: amountToMinorUnits(typeof amount === "string" || typeof amount === "number" ? amount : null),
          currency: String(nested.currency || payload.currency || hitpayConfig().currency).toLowerCase(),
          recurring_interval: String(nested.cycle || payload.cycle || "monthly").includes("year") ? "year" : "month",
          interval_count: 1,
          quantity: 1,
          mrr_reliable: true,
          updated_at: new Date().toISOString(),
        });
      }
    } else if (outletId && (eventObject === "charge" || eventType === "completed" || eventType === "created")) {
      await admin.from("outlet_subscriptions").update({
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("outlet_id", outletId).eq("status", "incomplete");
    }

    await admin.from("platform_audit_events").insert({
      outlet_id: outletId,
      action: `hitpay ${eventObject}.${eventType}`,
      affected_target: objectId,
      actor_email: "hitpay-webhook",
      source: "hitpay",
      metadata: { hitpay_event_id: eventId, livemode: config.livemode },
    });
  } catch (error) {
    await admin.from("platform_monitoring_events").insert({
      service: "hitpay",
      severity: "error",
      event_type: "webhook_processing_failed",
      message: error instanceof Error ? error.message : "HitPay webhook processing failed",
      outlet_id: outletId,
      correlation_id: eventId,
      metadata: { event_type: `${eventObject}.${eventType}` },
    });
    return respond(500, { error: "Webhook processing failed" });
  }

  return respond(200, { received: true });
});
