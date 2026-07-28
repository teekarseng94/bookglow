/**
 * Bookglow Cloud Functions — Firestore retired (2026-07-26).
 *
 * Production data lives in Supabase. Chatbot webhook moved to:
 *   https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook
 * 
 * This file keeps a thin proxy for the old Firebase chatbotWebhook URL
 * (so existing MyChatBot configs keep working) and returns 410 for all
 * other legacy Firestore-backed endpoints.
 */

const functions = require("firebase-functions");

const SUPABASE_CHATBOT_WEBHOOK =
  "https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook";

const CHATBOT_WEBHOOK_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-API-Key, X-Outlet-Id",
  "Access-Control-Max-Age": "86400",
};

function setChatbotCors(res) {
  Object.entries(CHATBOT_WEBHOOK_CORS).forEach(([k, v]) => res.set(k, v));
}

function retiredCallable(name) {
  return functions.region("asia-southeast1").https.onCall(async () => {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `${name} has been retired. Bookglow no longer uses Firestore; use the Supabase booking APIs / Edge Functions.`
    );
  });
}

function retiredHttp(name) {
  return functions.region("asia-southeast1").https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    res.status(410).set("Content-Type", "application/json").json({
      error: "gone",
      message: `${name} has been retired. Bookglow no longer uses Firestore.`,
    });
  });
}

/**
 * Proxy old Firebase chatbotWebhook → Supabase Edge Function.
 * Forwards method, headers (API key / outlet), and body unchanged.
 */
exports.chatbotWebhook = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    setChatbotCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "POST" && req.method !== "GET") {
      res
        .status(405)
        .set("Content-Type", "application/json")
        .json({ error: "Method not allowed" });
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      const apiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];
      const outletId = req.headers["x-outlet-id"] || req.headers["X-Outlet-Id"];
      if (apiKey) headers["X-API-Key"] = String(apiKey);
      if (outletId) headers["X-Outlet-Id"] = String(outletId);

      let bodyInit;
      if (req.method === "POST") {
        if (typeof req.body === "string") {
          bodyInit = req.body;
        } else if (req.body && typeof req.body === "object") {
          bodyInit = JSON.stringify(req.body);
        } else {
          bodyInit = "{}";
        }
      }

      const upstream = await fetch(SUPABASE_CHATBOT_WEBHOOK, {
        method: req.method,
        headers,
        body: bodyInit,
      });

      const text = await upstream.text();
      res
        .status(upstream.status)
        .set("Content-Type", upstream.headers.get("content-type") || "application/json")
        .send(text);
    } catch (err) {
      console.error("chatbotWebhook proxy error:", err);
      res.status(502).set("Content-Type", "application/json").json({
        error: "Bad Gateway",
        message: err.message || "Failed to reach Supabase chatbot webhook.",
      });
    }
  });

/** Callable verify — retired; use Edge Function test_connection action. */
exports.verifyApiKeyForChatbot = retiredCallable("verifyApiKeyForChatbot");

/** Legacy public booking / storage — retired (apps use Supabase). */
exports.getPublicAvailableSlots = retiredCallable("getPublicAvailableSlots");
exports.getPublicOutletData = retiredCallable("getPublicOutletData");
exports.createPublicBooking = retiredCallable("createPublicBooking");
exports.submitPublicReview = retiredCallable("submitPublicReview");
exports.uploadServiceImage = retiredCallable("uploadServiceImage");
exports.deleteStorageFile = retiredCallable("deleteStorageFile");
exports.publicGetMenu = retiredHttp("publicGetMenu");
exports.publicPostBook = retiredHttp("publicPostBook");
