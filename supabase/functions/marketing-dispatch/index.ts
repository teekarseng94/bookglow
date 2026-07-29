import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type CampaignRow = {
  id: string;
  outlet_id: string;
  audience_id: string | null;
  name: string;
  channel: "email" | "sms" | "whatsapp" | "share_link";
  subject: string | null;
  message: string;
  status: string;
  scheduled_at: string | null;
};

type AudienceCriteria = { type?: string; value?: string };
type ClientRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  member_tier: string | null;
  tag: string | null;
  voucher_count: number | null;
  marketing_email_consent: boolean;
  marketing_sms_consent: boolean;
  marketing_whatsapp_consent: boolean;
  marketing_unsubscribed_at: string | null;
};

const maskRecipient = (value: string) => {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
};

const matchesCriteria = (criteria: AudienceCriteria, customer: ClientRow) => {
  switch (criteria.type) {
    case "birthday_month":
      return customer.birthday?.slice(5, 7) === String(criteria.value || "").padStart(2, "0");
    case "member_tier":
      return !!criteria.value && customer.member_tier === criteria.value;
    case "tag":
      return !!criteria.value && customer.tag === criteria.value;
    case "voucher_holders":
      return Number(customer.voucher_count || 0) > 0;
    case "contactable":
      if (customer.marketing_unsubscribed_at) return false;
      if (criteria.value === "email") return !!customer.email && customer.marketing_email_consent;
      if (criteria.value === "whatsapp") return !!customer.phone && customer.marketing_whatsapp_consent;
      return !!customer.phone && customer.marketing_sms_consent;
    default:
      return true;
  }
};

const eligibleRecipient = (campaign: CampaignRow, customer: ClientRow) => {
  if (customer.marketing_unsubscribed_at) return null;
  if (campaign.channel === "email" && customer.email && customer.marketing_email_consent) {
    return customer.email.trim();
  }
  if (campaign.channel === "sms" && customer.phone && customer.marketing_sms_consent) {
    return customer.phone.trim();
  }
  if (campaign.channel === "whatsapp" && customer.phone && customer.marketing_whatsapp_consent) {
    return customer.phone.trim();
  }
  return null;
};

const personalize = (template: string, name: string | null) => {
  const firstName = (name || "there").trim().split(/\s+/)[0] || "there";
  return template.replaceAll("{{first_name}}", firstName);
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function sendEmail(
  recipient: string,
  subject: string,
  message: string,
  deliveryId: string,
) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MARKETING_EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Resend is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `bookglow-${deliveryId}`,
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(message)}</div>`,
      tags: [{ name: "delivery_id", value: deliveryId }],
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || `Resend returned ${response.status}`);
  return String(payload.id);
}

async function sendTwilio(
  channel: "sms" | "whatsapp",
  recipient: string,
  message: string,
) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const whatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!accountSid || !authToken) throw new Error("Twilio is not configured");
  if (channel === "sms" && !messagingServiceSid) throw new Error("Twilio SMS sender is not configured");
  if (channel === "whatsapp" && !whatsappFrom) throw new Error("Twilio WhatsApp sender is not configured");

  const form = new URLSearchParams();
  form.set("To", channel === "whatsapp" ? `whatsapp:${recipient}` : recipient);
  form.set("Body", message);
  if (channel === "whatsapp") form.set("From", whatsappFrom!.startsWith("whatsapp:") ? whatsappFrom! : `whatsapp:${whatsappFrom}`);
  else form.set("MessagingServiceSid", messagingServiceSid!);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || `Twilio returned ${response.status}`);
  return String(payload.sid);
}

async function queueCampaign(admin: any, campaign: CampaignRow) {
  if (campaign.channel === "share_link") {
    await admin.from("marketing_campaigns").update({
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", campaign.id);
    return { queued: 0, skipped: 0, manual: true };
  }
  if (!campaign.audience_id) throw new Error("Campaign audience is missing");
  const { data: audience, error: audienceError } = await admin
    .from("marketing_audiences")
    .select("criteria")
    .eq("id", campaign.audience_id)
    .eq("outlet_id", campaign.outlet_id)
    .single();
  if (audienceError) throw audienceError;

  const { data: customers, error: customerError } = await admin
    .from("clients")
    .select("id,name,email,phone,birthday,member_tier,tag,voucher_count,marketing_email_consent,marketing_sms_consent,marketing_whatsapp_consent,marketing_unsubscribed_at")
    .eq("outlet_id", campaign.outlet_id);
  if (customerError) throw customerError;

  let skipped = 0;
  const deliveries = (customers || []).flatMap((raw: ClientRow) => {
    if (!matchesCriteria(audience.criteria || { type: "all" }, raw)) return [];
    const recipient = eligibleRecipient(campaign, raw);
    if (!recipient) {
      skipped += 1;
      return [];
    }
    return [{
      outlet_id: campaign.outlet_id,
      campaign_id: campaign.id,
      client_id: raw.id,
      channel: campaign.channel,
      recipient_masked: maskRecipient(recipient),
      status: "queued",
    }];
  });

  if (deliveries.length) {
    const { error } = await admin
      .from("marketing_campaign_deliveries")
      .upsert(deliveries, { onConflict: "campaign_id,client_id,channel", ignoreDuplicates: true });
    if (error) throw error;
  }
  return { queued: deliveries.length, skipped, manual: false };
}

async function processQueue(admin: any, campaignId: string) {
  let query = admin
    .from("marketing_campaign_deliveries")
    .select("id,client_id,campaign_id,channel,attempt_count,clients(name,email,phone),marketing_campaigns(name,subject,message)")
    .eq("status", "queued")
    .eq("campaign_id", campaignId)
    .order("queued_at", { ascending: true })
    .limit(50);
  const { data: deliveries, error } = await query;
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const delivery of deliveries || []) {
    const claimed = await admin
      .from("marketing_campaign_deliveries")
      .update({
        status: "processing",
        attempt_count: Number(delivery.attempt_count || 0) + 1,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;

    const customer = delivery.clients;
    const campaign = delivery.marketing_campaigns;
    const body = personalize(campaign.message, customer.name);
    try {
      const providerId =
        delivery.channel === "email"
          ? await sendEmail(customer.email, campaign.subject || campaign.name, body, delivery.id)
          : await sendTwilio(delivery.channel, customer.phone, body);
      await admin.from("marketing_campaign_deliveries").update({
        status: "sent",
        provider: delivery.channel === "email" ? "resend" : "twilio",
        provider_message_id: providerId,
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", delivery.id);
      sent += 1;
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);
      await admin.from("marketing_campaign_deliveries").update({
        status: "failed",
        last_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", delivery.id);
      await admin.from("platform_monitoring_events").insert({
        service: "marketing-dispatch",
        severity: "error",
        event_type: "provider_send_failed",
        message: message.slice(0, 500),
        correlation_id: delivery.id,
      });
      failed += 1;
    }
  }
  const { count: queuedRemaining } = await admin
    .from("marketing_campaign_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");
  return { sent, failed, queuedRemaining: Number(queuedRemaining || 0) };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: "Marketing dispatcher is not configured" });

  const authorization = request.headers.get("Authorization") || "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "launch");

  if (action === "process_due" && authorization === `Bearer ${serviceKey}`) {
    const { data: due, error } = await admin
      .from("marketing_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);
    if (error) return json(500, { error: error.message });
    const results = [];
    for (const campaign of due || []) {
      const queued = await queueCampaign(admin, campaign as CampaignRow);
      const processed = await processQueue(admin, campaign.id);
      results.push({ campaignId: campaign.id, ...queued, ...processed });
      await admin.from("marketing_campaigns").update({
        status: processed.failed ? "paused" : processed.queuedRemaining ? "scheduled" : "completed",
        updated_at: new Date().toISOString(),
      }).eq("id", campaign.id);
    }
    return json(200, { processedCampaigns: results.length, results });
  }

  const scoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await scoped.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Authentication required" });
  const { data: portalUser } = await admin
    .from("users")
    .select("role,outlet_id")
    .eq("uid", authData.user.id)
    .maybeSingle();
  if (!portalUser || !["admin", "platform_admin"].includes(String(portalUser.role))) {
    return json(403, { error: "Administrator access required" });
  }

  const campaignId = String(body.campaignId || "");
  if (!campaignId) return json(400, { error: "campaignId is required" });
  const { data: campaign, error: campaignError } = await admin
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError || !campaign) return json(404, { error: "Campaign not found" });
  const platformAdmin = portalUser.role === "platform_admin";
  if (!platformAdmin && campaign.outlet_id !== portalUser.outlet_id) {
    return json(403, { error: "Campaign belongs to another outlet" });
  }

  try {
    const queued = await queueCampaign(admin, campaign as CampaignRow);
    const processed = await processQueue(admin, campaign.id);
    await admin.from("marketing_campaigns").update({
      status: processed.failed ? "paused" : processed.queuedRemaining ? "scheduled" : "completed",
      scheduled_at: processed.queuedRemaining ? new Date().toISOString() : campaign.scheduled_at,
      updated_at: new Date().toISOString(),
    }).eq("id", campaign.id);
    return json(200, { campaignId, ...queued, ...processed });
  } catch (dispatchError) {
    const message = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
    return json(500, { error: message });
  }
});
