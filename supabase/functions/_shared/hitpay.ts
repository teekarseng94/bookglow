export const HITPAY_PLAN_AMOUNT_MAJOR = "20.00";
export const HITPAY_PLAN_CURRENCY = "MYR";
export const HITPAY_PLAN_CYCLE = "monthly";
export const HITPAY_PLAN_NAME = "BookGlow Pro";

export function hitpayConfig() {
  const apiKey = Deno.env.get("HITPAY_API_KEY") || "";
  const salt = Deno.env.get("HITPAY_WEBHOOK_SALT") || "";
  const base = (Deno.env.get("HITPAY_API_BASE") || "https://api.hit-pay.com").replace(/\/$/, "");
  const planId = Deno.env.get("HITPAY_PLAN_ID") || "";
  return {
    apiKey,
    salt,
    base,
    planId,
    amount: Deno.env.get("HITPAY_PLAN_AMOUNT") || HITPAY_PLAN_AMOUNT_MAJOR,
    currency: (Deno.env.get("HITPAY_PLAN_CURRENCY") || HITPAY_PLAN_CURRENCY).toLowerCase(),
    cycle: Deno.env.get("HITPAY_PLAN_CYCLE") || HITPAY_PLAN_CYCLE,
    name: Deno.env.get("HITPAY_PLAN_NAME") || HITPAY_PLAN_NAME,
    livemode: !base.includes("sandbox"),
  };
}

export function singaporeDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function amountToMinorUnits(amount: string | number | null | undefined): number | null {
  if (amount == null || amount === "") return null;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function mapHitpayStatus(status: string | null | undefined): string {
  const value = String(status || "").toLowerCase();
  if (value === "active" || value === "succeeded" || value === "completed" || value === "paid") return "active";
  if (value === "paused") return "paused";
  if (value === "past_due" || value === "overdue" || value === "failed") return "past_due";
  if (value === "cancelled" || value === "canceled" || value === "expired" || value === "inactive") return "canceled";
  if (value === "scheduled" || value === "pending") return "incomplete";
  return value || "incomplete";
}

export async function verifyHitpaySignature(rawBody: string, signature: string, salt: string): Promise<boolean> {
  if (!signature || !salt) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const expected = signature.trim().toLowerCase().replace(/^sha256=/, "");
  if (computed.length !== expected.length) return false;
  const left = new TextEncoder().encode(computed);
  const right = new TextEncoder().encode(expected);
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

export async function hitpayRequest(
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string,
  fields?: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const { apiKey, base } = hitpayConfig();
  const headers: Record<string, string> = {
    "X-BUSINESS-API-KEY": apiKey,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  };
  const init: RequestInit = { method, headers };
  if (method === "POST") {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields || {})) {
      if (value == null || value === "") continue;
      body.append(key, value);
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = body;
  }
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(text);
    json = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json, text };
}

export function hitpayErrorMessage(result: { json: Record<string, unknown> | null; text: string; status: number }): string {
  const json = result.json;
  if (json) {
    if (typeof json.message === "string" && json.message) return json.message;
    if (typeof json.error === "string" && json.error) return json.error;
    const errors = json.errors;
    if (errors && typeof errors === "object") return JSON.stringify(errors);
  }
  return result.text?.slice(0, 280) || `HitPay request failed (${result.status})`;
}
