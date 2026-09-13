import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

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
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: "Billing administration backend is not configured" });

  const authorization = request.headers.get("Authorization") || "";
  const scoped = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await scoped.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Authentication required" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: portalUser } = await admin.from("users").select("role,outlet_id,email").eq("uid", authData.user.id).maybeSingle();
  const isPlatformAdmin = portalUser?.role === "platform_admin" || (portalUser?.role === "admin" && !portalUser?.outlet_id);
  if (!isPlatformAdmin) return json(403, { error: "Platform administrator access required" });

  const body = await request.json();
  const action = String(body.action || "");
  if (action === "readiness") {
    const { count, error: subscriptionsError } = await admin.from("outlet_subscriptions").select("id", { count: "exact", head: true });
    if (subscriptionsError) return json(200, { state: "subscription_data_unavailable", provider: "stripe", subscriptionDataAvailable: false, detail: subscriptionsError.message });
    if (!stripeKey) return json(200, { state: "provider_not_configured", provider: "stripe", subscriptionDataAvailable: true, subscriptionCount: count || 0, checkoutReady: false, portalReady: false, webhook: "unverified" });
    const defaultPriceId = Deno.env.get("STRIPE_DEFAULT_PRICE_ID") || "";
    const webhookSecretPresent = Boolean(Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET"));
    const stripe = new Stripe(stripeKey);
    try {
      const price = defaultPriceId ? await stripe.prices.retrieve(defaultPriceId) : null;
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const webhookEndpoint = endpoints.data.find((item) => item.status === "enabled" && item.url.includes("/functions/v1/stripe-webhook"));
      const priceVerified = Boolean(price?.active && price.recurring && price.unit_amount != null && price.currency);
      const webhook = webhookSecretPresent && webhookEndpoint ? "verified" : webhookSecretPresent ? "secret_present_endpoint_unverified" : "not_configured";
      const ready = priceVerified && webhook === "verified";
      return json(200, { state: ready ? "readiness_verified" : "configured_unverified", provider: "stripe", subscriptionDataAvailable: true, subscriptionCount: count || 0, priceVerified, webhook, checkoutReady: priceVerified, portalReady: true, checkedAt: new Date().toISOString() });
    } catch (error) {
      return json(200, { state: "billing_service_error", provider: "stripe", subscriptionDataAvailable: true, subscriptionCount: count || 0, checkoutReady: false, portalReady: false, webhook: "unverified", detail: error instanceof Error ? error.message : "Stripe readiness check failed", checkedAt: new Date().toISOString() });
    }
  }
  const outletId = String(body.outletId || "");
  if (!outletId) return json(400, { error: "outletId is required" });

  const { data: outlet, error: outletError } = await admin.from("outlets").select("outlet_id,name,email").eq("outlet_id", outletId).maybeSingle();
  if (outletError || !outlet) return json(404, { error: "Outlet not found" });
  if (!stripeKey) return json(503, { error: "Stripe is not configured" });
  const stripe = new Stripe(stripeKey);

  let { data: billingCustomer } = await admin.from("billing_customers").select("*").eq("outlet_id", outletId).maybeSingle();
  if (!billingCustomer) {
    const customer = await stripe.customers.create({
      name: outlet.name || outletId,
      email: outlet.email || undefined,
      metadata: { outlet_id: outletId },
    });
    const { data, error: customerInsertError } = await admin.from("billing_customers").insert({
      outlet_id: outletId,
      stripe_customer_id: customer.id,
      email: outlet.email,
    }).select().single();
    if (customerInsertError || !data) return json(500, { error: "Could not persist Stripe customer mapping" });
    billingCustomer = data;
  }

  if (action === "create_checkout") {
    const priceId = String(body.priceId || Deno.env.get("STRIPE_DEFAULT_PRICE_ID") || "");
    const appUrl = String(body.appUrl || Deno.env.get("DASHBOARD_APP_URL") || "");
    if (!priceId || !appUrl) return json(400, { error: "Stripe price and dashboard URL are required" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: billingCustomer.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/admin/subscriptions?checkout=success`,
      cancel_url: `${appUrl}/admin/subscriptions?checkout=cancelled`,
      client_reference_id: outletId,
      subscription_data: { metadata: { outlet_id: outletId } },
      metadata: { outlet_id: outletId },
    });
    await admin.from("platform_audit_events").insert({
      outlet_id: outletId,
      action: "subscription checkout created",
      affected_target: session.id,
      actor_uid: authData.user.id,
      actor_email: portalUser.email,
      source: "billing-admin",
    });
    return json(200, { url: session.url });
  }

  if (action === "create_portal") {
    const appUrl = String(body.appUrl || Deno.env.get("DASHBOARD_APP_URL") || "");
    if (!appUrl) return json(400, { error: "Dashboard URL is required" });
    const session = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: `${appUrl}/admin/subscriptions`,
    });
    return json(200, { url: session.url });
  }

  return json(400, { error: "Unsupported billing action" });
});
