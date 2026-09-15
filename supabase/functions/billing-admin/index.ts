import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  amountToMinorUnits,
  hitpayConfig,
  hitpayErrorMessage,
  hitpayRequest,
  singaporeDate,
} from "../_shared/hitpay.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: "Billing administration backend is not configured" });

  const authorization = request.headers.get("Authorization") || "";
  const scoped = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await scoped.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Authentication required" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: portalUser } = await admin.from("users").select("role,outlet_id,email").eq("uid", authData.user.id).maybeSingle();
  const isPlatformAdmin = portalUser?.role === "platform_admin" || (portalUser?.role === "admin" && !portalUser?.outlet_id);
  if (!isPlatformAdmin) return json(403, { error: "Platform administrator access required" });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const config = hitpayConfig();

  if (action === "readiness") {
    const { count, error: subscriptionsError } = await admin.from("outlet_subscriptions").select("id", { count: "exact", head: true });
    if (subscriptionsError) {
      return json(200, {
        state: "subscription_data_unavailable",
        provider: "hitpay",
        subscriptionDataAvailable: false,
        detail: subscriptionsError.message,
        webhook: "unverified",
        checkoutReady: false,
        portalReady: false,
      });
    }
    if (!config.apiKey) {
      return json(200, {
        state: "provider_not_configured",
        provider: "hitpay",
        subscriptionDataAvailable: true,
        subscriptionCount: count || 0,
        checkoutReady: false,
        portalReady: false,
        webhook: config.salt ? "secret_present_endpoint_unverified" : "not_configured",
      });
    }
    try {
      const probePath = config.planId ? `/v1/subscription-plan/${config.planId}` : "/v1/subscription-plan";
      const probe = await hitpayRequest("GET", probePath);
      const unauthorized = probe.status === 401 || probe.status === 403;
      const apiReachable = !unauthorized;
      const webhook = config.salt ? "secret_present_endpoint_unverified" : "not_configured";
      const ready = apiReachable && Boolean(config.salt);
      return json(200, {
        state: unauthorized ? "billing_service_error" : ready ? "readiness_verified" : "configured_unverified",
        provider: "hitpay",
        subscriptionDataAvailable: true,
        subscriptionCount: count || 0,
        priceVerified: apiReachable,
        webhook,
        checkoutReady: apiReachable,
        portalReady: false,
        detail: unauthorized ? hitpayErrorMessage(probe) : undefined,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      return json(200, {
        state: "billing_service_error",
        provider: "hitpay",
        subscriptionDataAvailable: true,
        subscriptionCount: count || 0,
        checkoutReady: false,
        portalReady: false,
        webhook: config.salt ? "secret_present_endpoint_unverified" : "unverified",
        detail: error instanceof Error ? error.message : "HitPay readiness check failed",
        checkedAt: new Date().toISOString(),
      });
    }
  }

  const outletId = String(body.outletId || "");
  if (!outletId && action !== "create_portal") return json(400, { error: "outletId is required" });
  if (!config.apiKey && action !== "create_portal") return json(503, { error: "HitPay is not configured" });

  if (action === "create_portal") {
    return json(400, { error: "HitPay does not provide a customer billing portal. Cancel the subscription from Superadmin instead." });
  }

  if (action === "cancel_subscription") {
    const { data: rows, error: lookupError } = await admin
      .from("outlet_subscriptions")
      .select("id,hitpay_recurring_id,status")
      .eq("outlet_id", outletId)
      .in("status", ["active", "past_due", "paused", "incomplete"])
      .order("updated_at", { ascending: false })
      .limit(1);
    if (lookupError) return json(500, { error: "Could not load the outlet subscription" });
    const subscription = rows?.[0];
    if (!subscription) return json(404, { error: "No cancellable subscription found for this outlet" });
    const recurringId = String(subscription.hitpay_recurring_id || subscription.id);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(recurringId)) return json(400, { error: "Subscription is missing a HitPay billing id" });
    const cancelled = await hitpayRequest("DELETE", `/v1/recurring-billing/${recurringId}`);
    if (!cancelled.ok && cancelled.status !== 404 && cancelled.status !== 410) {
      return json(502, { error: hitpayErrorMessage(cancelled) });
    }
    const { error: updateError } = await admin.from("outlet_subscriptions").update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
    if (updateError) return json(500, { error: "HitPay cancelled the subscription, but BookGlow could not record it. Reload and check HitPay." });
    await admin.from("platform_audit_events").insert({
      outlet_id: outletId,
      action: "subscription canceled",
      affected_target: recurringId,
      actor_uid: authData.user.id,
      actor_email: portalUser?.email,
      source: "billing-admin",
      metadata: { provider: "hitpay", hitpay_status: cancelled.status },
    });
    return json(200, { success: true, status: "canceled" });
  }

  if (action !== "create_checkout") return json(400, { error: "Unsupported billing action" });

  const { data: outlet, error: outletError } = await admin.from("outlets").select("outlet_id,name,email").eq("outlet_id", outletId).maybeSingle();
  if (outletError || !outlet) return json(404, { error: "Outlet not found" });
  const customerEmail = String(outlet.email || portalUser?.email || "").trim();
  if (!customerEmail) return json(400, { error: "Outlet email is required to start a HitPay subscription" });

  const { data: existing } = await admin.from("outlet_subscriptions").select("id,status").eq("outlet_id", outletId).in("status", ["active", "past_due", "paused"]).limit(1);
  if (existing?.[0]) return json(409, { error: "This outlet already has a BookGlow subscription" });

  let billingCustomer = (await admin.from("billing_customers").select("*").eq("outlet_id", outletId).maybeSingle()).data;
  if (!billingCustomer) {
    const { data, error: customerInsertError } = await admin.from("billing_customers").insert({
      outlet_id: outletId,
      provider: "hitpay",
      email: customerEmail,
      stripe_customer_id: null,
    }).select().single();
    if (customerInsertError || !data) return json(500, { error: "Could not persist HitPay customer mapping" });
    billingCustomer = data;
  }

  const fields: Record<string, string | undefined> = {
    customer_email: customerEmail,
    customer_name: outlet.name || outletId,
    start_date: singaporeDate(),
    redirect_url: `${String(body.appUrl || Deno.env.get("DASHBOARD_APP_URL") || "").replace(/\/$/, "")}/admin/subscriptions?checkout=success`,
    reference: outletId,
    send_email: "true",
    "payment_methods[]": "card",
  };
  if (config.planId) {
    fields.plan_id = config.planId;
  } else {
    fields.name = config.name;
    fields.amount = config.amount;
    fields.cycle = config.cycle;
    fields.currency = config.currency;
  }

  const created = await hitpayRequest("POST", "/v1/recurring-billing", fields);
  if (!created.ok || !created.json) return json(502, { error: hitpayErrorMessage(created) });

  const recurringId = String(created.json.id || "");
  const checkoutUrl = String(created.json.url || created.json.checkout_url || "");
  if (!recurringId || !checkoutUrl) return json(502, { error: "HitPay did not return a checkout URL" });

  const unitAmount = amountToMinorUnits(typeof created.json.amount === "number" || typeof created.json.amount === "string" ? created.json.amount : config.amount);
  await admin.from("outlet_subscriptions").upsert({
    id: recurringId,
    outlet_id: outletId,
    provider: "hitpay",
    hitpay_recurring_id: recurringId,
    hitpay_plan_id: config.planId || null,
    stripe_customer_id: billingCustomer.stripe_customer_id,
    stripe_price_id: config.planId || null,
    status: "incomplete",
    cancel_at_period_end: false,
    unit_amount: unitAmount,
    currency: config.currency,
    recurring_interval: config.cycle === "yearly" ? "year" : "month",
    interval_count: 1,
    quantity: 1,
    discount_percent: null,
    mrr_reliable: true,
    updated_at: new Date().toISOString(),
  });

  await admin.from("platform_audit_events").insert({
    outlet_id: outletId,
    action: "subscription checkout created",
    affected_target: recurringId,
    actor_uid: authData.user.id,
    actor_email: portalUser?.email,
    source: "billing-admin",
    metadata: { provider: "hitpay" },
  });

  return json(200, { url: checkoutUrl });
});
