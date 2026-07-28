import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") || "";
const stripe = new Stripe(stripeKey);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function unixDate(value?: number | null): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  const signature = request.headers.get("stripe-signature");
  if (!signature || !stripeKey || !webhookSecret) return respond(500, { error: "Stripe webhook is not configured" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond(500, { error: "Supabase service credentials are unavailable" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    await admin.from("platform_monitoring_events").insert({
      service: "stripe",
      severity: "warning",
      event_type: "webhook_signature_failed",
      message: error instanceof Error ? error.message : "Stripe signature verification failed",
    });
    return respond(400, { error: "Invalid webhook signature" });
  }

  const object = event.data.object as unknown as Record<string, unknown>;
  const customerId = typeof object.customer === "string" ? object.customer : null;
  let outletId = typeof object.metadata === "object" && object.metadata
    ? String((object.metadata as Record<string, unknown>).outlet_id || "") || null
    : null;

  if (!outletId && customerId) {
    const { data } = await admin.from("billing_customers").select("outlet_id").eq("stripe_customer_id", customerId).maybeSingle();
    outletId = data?.outlet_id || null;
  }

  const { error: eventError } = await admin.from("billing_events").insert({
    id: event.id,
    event_type: event.type,
    outlet_id: outletId,
    stripe_created_at: unixDate(event.created),
    livemode: event.livemode,
    payload: {
      object_id: typeof object.id === "string" ? object.id : null,
      customer_id: customerId,
      status: typeof object.status === "string" ? object.status : null,
    },
  });
  if (eventError?.code === "23505") return respond(200, { received: true, duplicate: true });
  if (eventError) return respond(500, { error: "Could not persist billing event" });

  try {
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionOutlet = subscription.metadata?.outlet_id || outletId;
      if (!subscriptionOutlet) throw new Error("Subscription is missing outlet_id metadata");
      const firstItem = subscription.items.data[0];
      await admin.from("outlet_subscriptions").upsert({
        id: subscription.id,
        outlet_id: subscriptionOutlet,
        stripe_customer_id: String(subscription.customer),
        stripe_price_id: firstItem?.price?.id || null,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: unixDate(firstItem?.current_period_start),
        current_period_end: unixDate(firstItem?.current_period_end),
        trial_end: unixDate(subscription.trial_end),
        updated_at: new Date().toISOString(),
      });
    }

    await admin.from("platform_audit_events").insert({
      outlet_id: outletId,
      action: `stripe ${event.type}`,
      affected_target: typeof object.id === "string" ? object.id : event.id,
      actor_email: "stripe-webhook",
      source: "stripe",
      metadata: { stripe_event_id: event.id, livemode: event.livemode },
    });
  } catch (error) {
    await admin.from("platform_monitoring_events").insert({
      service: "stripe",
      severity: "error",
      event_type: "webhook_processing_failed",
      message: error instanceof Error ? error.message : "Stripe webhook processing failed",
      outlet_id: outletId,
      correlation_id: event.id,
      metadata: { event_type: event.type },
    });
    return respond(500, { error: "Webhook processing failed" });
  }

  return respond(200, { received: true });
});
