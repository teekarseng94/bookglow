/**
 * Chatbot webhook — Supabase Edge Function (replaces Firebase CF + Firestore).
 *
 * Auth: X-API-Key + X-Outlet-Id (SHA-256 hash vs api_integrations.api_key_hash).
 * JWT verification is disabled; this endpoint uses custom API-key auth.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-API-Key, X-Outlet-Id",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashApiKey(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(apiKey.trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Number(y), Number(m) - 1, Number(d)));
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = (req.headers.get("x-api-key") || "").trim();
  const outletId = (req.headers.get("x-outlet-id") || "").trim();
  if (!apiKey || !outletId) {
    return json(401, {
      error: "Unauthorized",
      message: "X-API-Key and X-Outlet-Id headers are required.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Server misconfigured" });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: integration, error: integErr } = await sb
    .from("api_integrations")
    .select("api_key_hash")
    .eq("outlet_id", outletId)
    .maybeSingle();

  if (integErr || !integration?.api_key_hash) {
    return json(401, {
      error: "Unauthorized",
      message: "API integration not found for this outlet.",
    });
  }

  const incoming = await hashApiKey(apiKey);
  if (incoming !== integration.api_key_hash) {
    return json(401, { error: "Unauthorized", message: "Invalid API key." });
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = {};
    }
  }

  if (body.action === "test_connection") {
    return json(200, {
      status: "success",
      message: `Connection verified for ${outletId}`,
    });
  }

  const rawMessage = String(
    body.customer_message || body.message || body.text || ""
  );
  const message = rawMessage.toLowerCase();

  let category: "appointment" | "menu" | "member" | null = null;
  if (/(time|available|booking|slot|tonight|nanar)/.test(message)) {
    category = "appointment";
  } else if (/(price|prices|menu|services?)/.test(message)) {
    category = "menu";
  } else if (/(points|member)/.test(message)) {
    category = "member";
  }

  if (!category) {
    return json(200, {
      type: "unknown",
      data: [],
      message: "No matching category for this question.",
    });
  }

  try {
    if (category === "appointment") {
      const dateStr =
        (body.date && String(body.date).trim()) || todayYmd();

      const { data: staffRows, error: staffErr } = await sb
        .from("staff")
        .select("id, name")
        .eq("outlet_id", outletId);
      if (staffErr) throw staffErr;

      const staffList = (staffRows || []).map((s) => ({
        id: s.id,
        name: s.name || s.id,
      }));

      const { data: apps, error: appsErr } = await sb
        .from("appointments")
        .select("staff_id, time, end_time, status")
        .eq("outlet_id", outletId)
        .eq("date", dateStr)
        .order("time", { ascending: true })
        .limit(200);
      if (appsErr) throw appsErr;

      const staffIdToEndTimes = new Map<string, string[]>();
      for (const app of apps || []) {
        const status = String(app.status || "").toLowerCase();
        if (status === "cancelled" || status === "no-show") continue;
        const staffId = String(app.staff_id || "");
        if (!staffId) continue;
        const end = app.end_time || app.time;
        if (!staffIdToEndTimes.has(staffId)) staffIdToEndTimes.set(staffId, []);
        if (end) staffIdToEndTimes.get(staffId)!.push(String(end));
      }

      const busySentences: string[] = [];
      const availableNames: string[] = [];
      for (const staff of staffList) {
        const endTimes = staffIdToEndTimes.get(staff.id) || [];
        if (endTimes.length === 0) {
          availableNames.push(staff.name);
        } else {
          const latestEnd = endTimes.sort()[endTimes.length - 1];
          busySentences.push(`${staff.name} is busy until ${latestEnd}`);
        }
      }

      const dateLabel = prettyDate(dateStr);
      let crmContext: string;
      if (busySentences.length === 0 && availableNames.length === 0) {
        crmContext = `On ${dateLabel}: No staff found for this outlet.`;
      } else {
        const parts: string[] = [];
        if (busySentences.length) parts.push(busySentences.join(". ") + ".");
        if (availableNames.length) {
          const list = joinNames(availableNames);
          const verb = availableNames.length === 1 ? "is" : "are";
          parts.push(`${list} ${verb} Available Now.`);
        }
        crmContext = `On ${dateLabel}: ${parts.join(" ")}`;
      }

      return json(200, {
        type: "appointment",
        crmContext,
        date: dateStr,
        busy_staff: busySentences,
        available_staff: availableNames,
      });
    }

    if (category === "menu") {
      const { data, error } = await sb
        .from("services")
        .select("id, name, description, duration, price")
        .eq("outlet_id", outletId)
        .order("name", { ascending: true })
        .limit(100);
      if (error) throw error;

      const items = (data || []).map((x) => ({
        id: x.id,
        name: x.name || "",
        description: x.description || "",
        duration: x.duration ?? 60,
        price: x.price ?? 0,
      }));

      return json(200, {
        type: "menu",
        summary: `Found ${items.length} menu items for outlet ${outletId}.`,
        items,
      });
    }

    // member
    const { data, error } = await sb
      .from("clients")
      .select("id, name, phone, email, points")
      .eq("outlet_id", outletId)
      .order("name", { ascending: true })
      .limit(50);
    if (error) throw error;

    const members = (data || []).map((x) => ({
      id: x.id,
      name: x.name || "",
      phone: x.phone || "",
      email: x.email || "",
      points: x.points ?? 0,
    }));

    return json(200, {
      type: "member",
      summary: `Found ${members.length} members for outlet ${outletId}.`,
      members,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load data";
    console.error("chatbot-webhook error:", err);
    return json(500, {
      type: category,
      error: "internal_error",
      message: msg,
    });
  }
});
