/**
 * Cloud Functions for ZenFlow Spa Manager
 * 
 * uploadServiceImage: Receives image as base64 and uploads to Firebase Storage.
 * Used to avoid CORS when the web app cannot upload directly to Storage.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const axios = require("axios");
const ical = require("node-ical");

admin.initializeApp();
const bucket = admin.storage().bucket();
const db = admin.firestore();

/**
 * Hash API key with SHA-256 (hex). Must match client-side hash in utils/apiKeyHash.ts.
 * Use for verification only; never log the raw key.
 */
function hashApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return "";
  return crypto.createHash("sha256").update(apiKey.trim(), "utf8").digest("hex");
}

/**
 * Verify API key for an outlet. Use as middleware for chatbot requests.
 * Headers: X-API-Key, X-Outlet-Id (or pass outletId + apiKey).
 * Returns { valid: true, outletId } or throws HttpsError.
 */
async function verifyApiKey(outletId, apiKey) {
  if (!outletId || !apiKey) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "X-Outlet-Id and X-API-Key are required."
    );
  }
  const docRef = db.collection("apiIntegrations").doc(String(outletId).trim());
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "API integration not found for this outlet."
    );
  }
  const storedHash = (snap.data() || {}).apiKeyHash;
  if (!storedHash) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No API key configured for this outlet."
    );
  }
  const incomingHash = hashApiKey(apiKey);
  if (incomingHash !== storedHash) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Invalid API key."
    );
  }
  return { valid: true, outletId: String(outletId).trim() };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Callable: uploadServiceImage
 * Body: { path: string, base64: string, contentType: string }
 * Returns: { url: string }
 */
exports.uploadServiceImage = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to upload images."
      );
    }

    const { path, base64, contentType } = data;
    if (!path || !base64) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "path and base64 are required."
      );
    }

    try {
      const buffer = Buffer.from(base64, "base64");
      const file = bucket.file(path);
      const downloadToken = crypto.randomUUID();
      const metadata = {
        contentType: contentType || "image/jpeg",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      };

      await file.save(buffer, { metadata });

      // Build public download URL (no IAM signBlob required; uses token we set)
      const encodedPath = encodeURIComponent(path);
      const url =
        "https://firebasestorage.googleapis.com/v0/b/" +
        bucket.name +
        "/o/" +
        encodedPath +
        "?alt=media&token=" +
        downloadToken;

      return { url };
    } catch (err) {
      console.error("uploadServiceImage error:", err);
      throw new functions.https.HttpsError(
        "internal",
        err.message || "Failed to upload image."
      );
    }
  });

/**
 * Callable: deleteStorageFile
 * Body: { imageUrl: string }
 * Deletes the file at the given Storage URL (keeps storage clean, avoids CORS on delete).
 */
exports.deleteStorageFile = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to delete images."
      );
    }

    const { imageUrl } = data;
    if (!imageUrl || typeof imageUrl !== "string") {
      return { ok: false };
    }

    try {
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
      if (!pathMatch || !pathMatch[1]) {
        return { ok: false };
      }
      const decodedPath = decodeURIComponent(pathMatch[1].replace(/%2F/g, "/"));
      const file = bucket.file(decodedPath);
      await file.delete();
      return { ok: true };
    } catch (err) {
      console.warn("deleteStorageFile (non-blocking):", err.message);
      return { ok: false };
    }
  });

/**
 * Callable: verifyApiKeyForChatbot
 * Body: {
 *   outletId: string;
 *   apiKey: string;
 *   intent?: 'appointment';
 *   date?: string; // optional, YYYY-MM-DD; defaults to "today" in server timezone
 * }
 *
 * Primary use: verify the API key from Settings or from the chatbot.
 * If intent === 'appointment', it also returns a human-readable crmContext string
 * summarising staff availability for the requested date and outlet.
 *
 * Example crmContext:
 * "Date: 11 March 2026. Outlet: SOHOKAKI WELLNESS. Staff Status: Yan (Busy 11:30-13:30), Candy (Busy 11:19-13:17), Ahti (Available), Nanar (Available)."
 */
exports.verifyApiKeyForChatbot = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    const outletId = data && data.outletId ? String(data.outletId).trim() : null;
    const apiKey = data && data.apiKey ? String(data.apiKey).trim() : null;

    const result = await verifyApiKey(outletId, apiKey); // throws if invalid

    // Default response for simple "verify only" calls (e.g. Settings test button)
    const response = { ...result };

    const intent = data && data.intent ? String(data.intent).toLowerCase() : null;
    if (!intent || intent !== "appointment" || !outletId) {
      return response;
    }

    // Appointment CRM context for the given outlet + date
    try {
      let requestedDate =
        data && data.date ? String(data.date).trim() : null;

      if (!requestedDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        requestedDate = `${yyyy}-${mm}-${dd}`;
      }

      // Fetch outlet name for nicer text
      let outletName = outletId;
      try {
        const outletDoc = await db.collection("outlets").doc(outletId).get();
        if (outletDoc.exists) {
          const o = outletDoc.data() || {};
          outletName = o.name || outletName;
        }
      } catch (e) {
        // Non-fatal, fall back to outletId
      }

      // Get all appointments for that outlet + date
      const appsSnap = await db
        .collection("appointments")
        .where("outletID", "==", outletId)
        .where("date", "==", requestedDate)
        .orderBy("time", "asc")
        .limit(200)
        .get();

      const staffSchedules = new Map();
      const staffIds = new Set();

      appsSnap.docs.forEach((docSnap) => {
        const x = docSnap.data() || {};
        const staffId = (x.staffId || "").toString();
        if (!staffId) return;
        staffIds.add(staffId);

        const status = (x.status || "").toString().toLowerCase();
        // Treat scheduled/completed as busy; cancelled/no-show as free
        if (status === "cancelled" || status === "no-show") {
          return;
        }

        const start = x.time || "";
        const end = x.endTime || null;

        if (!staffSchedules.has(staffId)) {
          staffSchedules.set(staffId, {
            name: staffId, // temporary, replaced with real name below
            busySlots: [],
          });
        }
        staffSchedules.get(staffId).busySlots.push({ start, end });
      });

      // Fetch staff names for this outlet only
      const staffDocs = await db
        .collection("staff")
        .where("outletID", "==", outletId)
        .get();

      staffDocs.docs.forEach((sDoc) => {
        const s = sDoc.data() || {};
        const id = sDoc.id;
        const name = s.name || id;

        if (!staffSchedules.has(id)) {
          // Staff has no busy slots -> Available
          staffSchedules.set(id, { name, busySlots: [] });
        } else {
          const sched = staffSchedules.get(id);
          sched.name = name;
        }
      });

      // Build human-readable status list
      const formatter = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const [y, m, d] = requestedDate.split("-");
      const prettyDate = formatter.format(
        new Date(Number(y), Number(m) - 1, Number(d))
      );

      const busySentences = [];
      const availableNames = [];

      for (const sched of staffSchedules.values()) {
        if (!sched.busySlots.length) {
          availableNames.push(sched.name);
        } else {
          // Merge into min start / max end for a concise "busy X-Y" range
          const validSlots = sched.busySlots.filter((s) => s.start);
          if (!validSlots.length) {
            availableNames.push(sched.name);
            continue;
          }
          const startTimes = validSlots.map((s) => s.start);
          const endTimes = validSlots
            .map((s) => s.end)
            .filter((e) => !!e);

          const minStart = startTimes.sort()[0];
          const maxEnd = endTimes.length ? endTimes.sort()[endTimes.length - 1] : "";
          const label =
            maxEnd && maxEnd !== minStart
              ? `${minStart}-${maxEnd}`
              : `${minStart}`;

          busySentences.push(`${sched.name} is busy ${label}`);
        }
      }

      // Build human-readable summary like:
      // "Status for 11 March 2026: Yan is busy 11:30-13:30. Candy is busy 11:19-13:17. Ahti, Rahimah, Nanar, and Su are AVAILABLE now."
      let crmContext;
      if (!busySentences.length && !availableNames.length) {
        crmContext = `Status for ${prettyDate}: No staff found for this outlet/date.`;
      } else {
        const parts = [];
        if (busySentences.length) {
          parts.push(busySentences.join(". ") + ".");
        }
        if (availableNames.length) {
          const uniqueAvailable = Array.from(new Set(availableNames));
          // Join with commas and 'and' before the last name
          let list;
          if (uniqueAvailable.length === 1) {
            list = uniqueAvailable[0];
          } else if (uniqueAvailable.length === 2) {
            list = `${uniqueAvailable[0]} and ${uniqueAvailable[1]}`;
          } else {
            const allButLast = uniqueAvailable.slice(0, -1).join(", ");
            const last = uniqueAvailable[uniqueAvailable.length - 1];
            list = `${allButLast}, and ${last}`;
          }
          const verb = uniqueAvailable.length > 1 ? "are" : "is";
          parts.push(`${list} ${verb} AVAILABLE now.`);
        }

        crmContext = `Status for ${prettyDate}: ${parts.join(" ")}`;
      }

      response.crmContext = crmContext;
    } catch (err) {
      console.error("verifyApiKeyForChatbot appointment intent error:", err);
      // Do not fail the whole verification; just omit crmContext
    }

    return response;
  });

/**
 * HTTP Webhook: chatbotWebhook
 * URL: https://REGION-PROJECT.cloudfunctions.net/chatbotWebhook
 * Use this URL in Settings > API Integration (Chatbot) as the Webhook URL.
 * - Validates X-API-Key and X-Outlet-Id headers against Firestore (apiIntegrations/{outletId}).
 * - If req.body.action === 'test_connection', returns 200 with { status: "success", message: "Connection verified for outlet_XXX" }.
 * - If key is missing or invalid, returns 401 Unauthorized.
 */
const CHATBOT_WEBHOOK_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Outlet-Id",
  "Access-Control-Max-Age": "86400",
};

function setChatbotCors(res) {
  Object.entries(CHATBOT_WEBHOOK_CORS).forEach(([k, v]) => res.set(k, v));
}

exports.chatbotWebhook = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    setChatbotCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "POST" && req.method !== "GET") {
      res.status(405).set("Content-Type", "application/json").json({ error: "Method not allowed" });
      return;
    }

    const apiKey = (req.headers["x-api-key"] || req.headers["X-API-Key"] || "").trim();
    const outletId = (req.headers["x-outlet-id"] || req.headers["X-Outlet-Id"] || "").trim();

    if (!apiKey || !outletId) {
      res.status(401).set("Content-Type", "application/json").json({
        error: "Unauthorized",
        message: "X-API-Key and X-Outlet-Id headers are required.",
      });
      return;
    }

    try {
      await verifyApiKey(outletId, apiKey);
    } catch (err) {
      const code = err.code === "unauthenticated" ? 401 : 500;
      res.status(code).set("Content-Type", "application/json").json({
        error: "Unauthorized",
        message: err.message || "Invalid API key or outlet.",
      });
      return;
    }

    let body = {};
    if (req.method === "POST" && req.body) {
      if (typeof req.body === "object" && !Array.isArray(req.body)) {
        body = req.body;
      } else if (typeof req.body === "string") {
        try {
          body = JSON.parse(req.body);
        } catch {
          body = {};
        }
      }
    }

    if (body.action === "test_connection") {
      res.status(200).set("Content-Type", "application/json").json({
        status: "success",
        message: `Connection verified for ${outletId}`,
      });
      return;
    }

    const rawMessage = (body.customer_message || body.message || body.text || "").toString();
    const message = rawMessage.toLowerCase();

    let category = null;
    if (/(time|available|booking|slot|tonight|nanar)/.test(message)) {
      category = "appointment";
    } else if (/(price|prices|menu|services?)/.test(message)) {
      category = "menu";
    } else if (/(points|member)/.test(message)) {
      category = "member";
    }

    if (!category) {
      res.status(200).set("Content-Type", "application/json").json({
        type: "unknown",
        data: [],
        message: "No matching category for this question.",
      });
      return;
    }

    try {
      if (category === "appointment") {
        // Resolve date: body.date (YYYY-MM-DD) or default to today
        let dateStr = (body.date && String(body.date).trim()) || null;
        if (!dateStr) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          dateStr = `${yyyy}-${mm}-${dd}`;
        }

        // 1. Define staff list: fetch all therapists for this outlet
        const staffSnap = await db
          .collection("staff")
          .where("outletID", "==", outletId)
          .get();
        const staffList = staffSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() || {}).name || d.id,
        }));

        // 2. Fetch all appointments for that date and outlet
        const appsSnap = await db
          .collection("appointments")
          .where("outletID", "==", outletId)
          .where("date", "==", dateStr)
          .orderBy("time", "asc")
          .limit(200)
          .get();

        const appointments = appsSnap.docs.map((d) => {
          const x = d.data() || {};
          return {
            staffId: (x.staffId || "").toString(),
            time: x.time || "",
            endTime: x.endTime || null,
            status: (x.status || "").toString().toLowerCase(),
          };
        });

        // 3. Busy/Free logic: per staffId, collect end times from non-cancelled appointments
        const staffIdToEndTimes = new Map();
        for (const app of appointments) {
          if (app.status === "cancelled" || app.status === "no-show") continue;
          if (!app.staffId) continue;
          const end = app.endTime || app.time;
          if (!staffIdToEndTimes.has(app.staffId)) {
            staffIdToEndTimes.set(app.staffId, []);
          }
          if (end) staffIdToEndTimes.get(app.staffId).push(end);
        }

        const busySentences = [];
        const availableNames = [];

        for (const staff of staffList) {
          const endTimes = staffIdToEndTimes.get(staff.id) || [];
          if (endTimes.length === 0) {
            availableNames.push(staff.name);
          } else {
            const latestEnd = endTimes.sort()[endTimes.length - 1];
            busySentences.push(`${staff.name} is busy until ${latestEnd}`);
          }
        }

        // 4. Generate crmContext: "On 11 March 2026: Yan is busy until 13:30. Candy is busy until 13:17. Ahti, Rahimah, Nanar, and Su are Available Now."
        const [y, m, d] = dateStr.split("-");
        const prettyDate = new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(Number(y), Number(m) - 1, Number(d)));

        let crmContext;
        if (busySentences.length === 0 && availableNames.length === 0) {
          crmContext = `On ${prettyDate}: No staff found for this outlet.`;
        } else {
          const parts = [];
          if (busySentences.length) {
            parts.push(busySentences.join(". ") + ".");
          }
          if (availableNames.length) {
            const list =
              availableNames.length === 1
                ? availableNames[0]
                : availableNames.length === 2
                  ? `${availableNames[0]} and ${availableNames[1]}`
                  : `${availableNames.slice(0, -1).join(", ")}, and ${availableNames[availableNames.length - 1]}`;
            const verb = availableNames.length === 1 ? "is" : "are";
            parts.push(`${list} ${verb} Available Now.`);
          }
          crmContext = `On ${prettyDate}: ${parts.join(" ")}`;
        }

        res.status(200).set("Content-Type", "application/json").json({
          type: "appointment",
          crmContext,
          date: dateStr,
          busy_staff: busySentences,
          available_staff: availableNames,
        });
        return;
      }

      if (category === "menu") {
        const servicesSnap = await db
          .collection("services")
          .where("outletID", "==", outletId)
          .orderBy("name", "asc")
          .limit(100)
          .get();

        const data = servicesSnap.docs.map((d) => {
          const x = d.data() || {};
          return {
            id: d.id,
            name: x.name || "",
            description: x.description || "",
            duration: x.duration ?? 60,
            price: x.price ?? 0,
          };
        });

        res.status(200).set("Content-Type", "application/json").json({
          type: "menu",
          summary: `Found ${data.length} menu items for outlet ${outletId}.`,
          items: data,
        });
        return;
      }

      if (category === "member") {
        const clientsSnap = await db
          .collection("clients")
          .where("outletID", "==", outletId)
          .orderBy("name", "asc")
          .limit(50)
          .get();

        const data = clientsSnap.docs.map((d) => {
          const x = d.data() || {};
          return {
            id: d.id,
            name: x.name || "",
            phone: x.phone || "",
            email: x.email || "",
            points: x.points ?? 0,
          };
        });

        res.status(200).set("Content-Type", "application/json").json({
          type: "member",
          summary: `Found ${data.length} members for outlet ${outletId}.`,
          members: data,
        });
        return;
      }
    } catch (err) {
      console.error("chatbotWebhook data handler error:", err);
      res.status(500).set("Content-Type", "application/json").json({
        type: category,
        error: "internal_error",
        message: err.message || "Failed to load data for this question.",
      });
      return;
    }
  });

/**
 * CORS Proxy: fetchSetmoreFeed
 * Fetches the Setmore ICS URL server-side (no CORS / 401). Parses with node-ical
 * and returns clean JSON for the app to save into appointments.
 * Body: none (or optional { feedUrl?: string })
 * Returns: { success: true, events: [{ id, title, start, end, description }] }
 */
const DEFAULT_SETMORE_FEED =
  "https://events.setmore.com/feeds/v1/NDYxYTA2YWE1ODllODMxYw==";

exports.fetchSetmoreFeed = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to fetch the Setmore feed."
      );
    }

    const url = (data && data.feedUrl) || DEFAULT_SETMORE_FEED;

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        responseType: "text",
      });
      const parsed = ical.parseICS(response.data);
      const events = [];
      for (const k in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;
        const ev = parsed[k];
        if (ev.type !== "VEVENT" || !ev.uid) continue;
        const start = ev.start ? new Date(ev.start) : null;
        const end = ev.end ? new Date(ev.end) : null;
        if (!start || Number.isNaN(start.getTime())) continue;
        events.push({
          id: ev.uid,
          title: ev.summary || "",
          start: start.toISOString(),
          end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : "",
          description: ev.description || "",
        });
      }
      return { success: true, events };
    } catch (error) {
      console.error("fetchSetmoreFeed error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Setmore Fetch Failed"
      );
    }
  });

/**
 * Callable: getSetmoreFeed
 * Proxy: fetches the Setmore ICS URL server-side (avoids CORS and 401 from client).
 * Returns raw ICS text for the client to parse with ical.js.
 * Body (optional): { feedUrl?: string }
 * Returns: { icsText: string }
 */
exports.getSetmoreFeed = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to fetch the Setmore feed."
      );
    }

    const feedUrl = (data && data.feedUrl) || DEFAULT_SETMORE_FEED;

    try {
      const response = await axios.get(feedUrl, {
        timeout: 15000,
        responseType: "text",
      });
      return { icsText: response.data };
    } catch (error) {
      console.error("getSetmoreFeed error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch Setmore feed"
      );
    }
  });

/**
 * Callable: syncSetmoreCalendar
 * Fetches Setmore ICS feed, parses with node-ical, returns appointments for client to save to Firestore.
 * Body (optional): { feedUrl?: string, outletID?: string }
 * Returns: { success: true, appointments: [{ id, title, start, end, description, outletID, source }] }
 * @deprecated Prefer getSetmoreFeed + client-side parse; kept for backward compatibility.
 */
exports.syncSetmoreCalendar = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to sync Setmore appointments."
      );
    }

    const feedUrl = (data && data.feedUrl) || DEFAULT_SETMORE_FEED;
    const outletID = (data && data.outletID) || "outlet_002";

    try {
      const response = await axios.get(feedUrl, {
        timeout: 15000,
        responseType: "text",
      });
      const events = ical.parseICS(response.data);

      const appointments = [];
      for (const k in events) {
        if (Object.prototype.hasOwnProperty.call(events, k)) {
          const ev = events[k];
          if (ev.type === "VEVENT" && ev.uid) {
            const start = ev.start ? new Date(ev.start) : null;
            const end = ev.end ? new Date(ev.end) : null;
            if (start && !Number.isNaN(start.getTime())) {
              appointments.push({
                id: ev.uid,
                title: ev.summary || "",
                start: start.toISOString(),
                end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : "",
                description: ev.description || "",
                outletID,
                source: "setmore",
              });
            }
          }
        }
      }
      return { success: true, appointments };
    } catch (error) {
      console.error("syncSetmoreCalendar error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch Setmore feed"
      );
    }
  });

/**
 * Callable: getPublicAvailableSlots
 * Body: { outletId: string, serviceId: string, date: string (YYYY-MM-DD) }
 * Returns: { slots: string[] } where slots are HH:mm start times that:
 *   - fall within the outlet's businessHours for that weekday
 *   - do not overlap existing non-cancelled appointments for that outlet/date
 *   - can accommodate the service duration
 */
exports.getPublicAvailableSlots = functions
  .region("asia-southeast1")
  .https.onCall(async (data) => {
    // https.onCall automatically handles CORS, but we need to ensure errors are caught properly
    try {
      // Validate input data
      if (!data || typeof data !== "object") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid request data."
        );
      }

      const outletId = data.outletId ? String(data.outletId).trim() : null;
      const serviceId = data.serviceId ? String(data.serviceId).trim() : null;
      const date = data.date ? String(data.date).trim() : null;
      const staffId = data.staffId ? String(data.staffId).trim() : null;

      if (!outletId || !serviceId || !date) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "outletId, serviceId and date are required."
        );
      }

      // Build appointments query: filter by outlet, date, and optionally by staffId
      // Only add staffId filter if it's a non-empty string
      let appointmentsQuery = db
        .collection("appointments")
        .where("outletID", "==", outletId)
        .where("date", "==", date);
      
      if (staffId && staffId.length > 0 && staffId !== "null" && staffId !== "undefined") {
        appointmentsQuery = appointmentsQuery.where("staffId", "==", staffId);
      }

      let appointmentsSnap;
      try {
        appointmentsSnap = await appointmentsQuery.get();
      } catch (queryErr) {
        console.error("Appointments query error:", queryErr);
        // If query fails, return empty slots (don't crash the function)
        // This ensures CORS headers are still set
        return { slots: [] };
      }

      const [outletSnap, serviceSnap] = await Promise.all([
        db.collection("outlets").doc(outletId).get(),
        db.collection("services").doc(serviceId).get(),
      ]);

      if (!outletSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Outlet not found.");
      }
      if (!serviceSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found.");
      }

      const outletData = outletSnap.data() || {};
      const serviceData = serviceSnap.data() || {};
      const businessHours = outletData.businessHours || {};
      const durationMinutes = serviceData.duration ?? 60;

      // Determine weekday key from the requested date
      const baseDate = new Date(date + "T00:00:00");
      if (Number.isNaN(baseDate.getTime())) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid date format.");
      }
      const dayIndex = baseDate.getDay(); // 0 = Sunday
      const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayKey = dayKeys[dayIndex];
      const todayHours = businessHours[dayKey];

      if (!todayHours || todayHours.isOpen === false) {
        return { slots: [] };
      }

      const openM = parseTimeToMinutes(todayHours.open);
      const closeM = parseTimeToMinutes(todayHours.close);
      if (!Number.isFinite(openM) || !Number.isFinite(closeM) || closeM <= openM) {
        return { slots: [] };
      }

      // Build appointment ranges for the day
      const appointments = appointmentsSnap.docs
        .map((d) => d.data() || {})
        .filter(
          (apt) => apt.status !== "cancelled" && apt.status !== "no-show"
        )
        .map((apt) => {
          const start = parseTimeToMinutes(apt.time || "00:00");
          const end = parseTimeToMinutes(apt.endTime || apt.time || "00:00");
          return {
            startMin: start,
            endMin: end > start ? end : start + durationMinutes,
          };
        });

      const slots = [];
      // 30-minute increments between open (inclusive) and close (exclusive)
      for (let minutes = openM; minutes < closeM; minutes += 30) {
        const slotStart = minutes;
        const slotEnd = slotStart + durationMinutes;
        if (slotEnd > closeM) {
          break;
        }

        const overlapsExisting = appointments.some(
          (apt) => slotStart < apt.endMin && slotEnd > apt.startMin
        );
        if (overlapsExisting) {
          continue;
        }

        const h = Math.floor(slotStart / 60);
        const m = slotStart % 60;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }

      return { slots };
    } catch (err) {
      // Ensure HttpsError is re-thrown to maintain proper CORS headers
      if (err instanceof functions.https.HttpsError) {
        console.error("getPublicAvailableSlots HttpsError:", err.code, err.message);
        throw err;
      }
      console.error("getPublicAvailableSlots unexpected error:", err);
      // Wrap any unexpected errors in HttpsError to ensure CORS headers are set
      // This is critical - only HttpsError maintains CORS headers
      throw new functions.https.HttpsError(
        "internal",
        err.message || "Failed to load available slots"
      );
    }
  });

/**
 * Public (no auth): get outlet info and service menu for booking page.
 * Body: { outletId: string }
 * Returns: { outlet: { id, name }, services: [{ id, name, price, duration, category }] }
 */
exports.getPublicOutletData = functions
  .region("asia-southeast1")
  .https.onCall(async (data) => {
    const outletId = data && data.outletId ? String(data.outletId).trim() : null;
    if (!outletId) {
      throw new functions.https.HttpsError("invalid-argument", "outletId is required.");
    }
    try {
      const outletRef = db.collection("outlets").doc(outletId);
      const outletSnap = await outletRef.get();
      if (!outletSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Outlet not found.");
      }
      const outletData = outletSnap.data();
      const outlet = {
        id: outletSnap.id,
        name: outletData.name || "Spa",
        addressDisplay: outletData.addressDisplay || "",
        phoneNumber: outletData.phoneNumber || outletData.phone || "",
        businessHours: outletData.businessHours || {},
        timezone: outletData.timezone || "Asia/Kuala_Lumpur",
        reviews: outletData.reviews || [],
      };

      const [servicesSnap, staffSnap] = await Promise.all([
        db.collection("services").where("outletID", "==", outletId).orderBy("name", "asc").get(),
        db.collection("staff").where("outletID", "==", outletId).get(),
      ]);

      const services = servicesSnap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.name || "",
          price: x.price ?? 0,
          duration: x.duration ?? 60,
          category: x.category || "",
        };
      });

      const team = staffSnap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.name || "",
          profilePicture: x.profilePicture || x.photoURL || ""
        };
      });

      return { outlet, services, team };
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error("getPublicOutletData error:", err);
      throw new functions.https.HttpsError(
        "internal",
        err.message || "Failed to load outlet data"
      );
    }
  });

/**
 * Public (no auth): create a booking (client + appointment) for an outlet.
 * Body: { outletId, serviceId, date, time, customerName, phone, email }
 * date: YYYY-MM-DD, time: HH:mm
 * Returns: { success: true, appointmentId }
 */
exports.createPublicBooking = functions
  .region("asia-southeast1")
  .https.onCall(async (data) => {
    const {
      outletId,
      serviceId,
      date,
      time,
      customerName,
      phone,
      email,
      staffId,
    } = data || {};
    if (!outletId || !serviceId || !date || !time || !customerName || !phone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "outletId, serviceId, date, time, customerName, and phone are required."
      );
    }
    const trimmedName = String(customerName).trim();
    const trimmedPhone = String(phone).trim();
    const trimmedEmail = email ? String(email).trim() : "";
    const trimmedDate = String(date).trim();
    const trimmedTime = String(time).trim();
    const trimmedStaffId = staffId ? String(staffId).trim() : null;

    try {
      const outletRef = db.collection("outlets").doc(outletId);
      const outletSnap = await outletRef.get();
      if (!outletSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Outlet not found.");
      }

      const serviceRef = db.collection("services").doc(serviceId);
      const serviceSnap = await serviceRef.get();
      if (!serviceSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found.");
      }
      const serviceData = serviceSnap.data();
      if (serviceData.outletID !== outletId) {
        throw new functions.https.HttpsError("invalid-argument", "Service does not belong to this outlet.");
      }
      const durationMinutes = serviceData.duration ?? 60;

      // Use provided staffId if valid, otherwise fallback to first staff member
      let finalStaffId = "unassigned";
      console.log(`[createPublicBooking] Received staffId: "${trimmedStaffId}", outletId: "${outletId}"`);
      
      if (trimmedStaffId && trimmedStaffId.length > 0) {
        try {
          const staffDoc = await db.collection("staff").doc(trimmedStaffId).get();
          if (staffDoc.exists) {
            const staffData = staffDoc.data();
            const staffOutletID = staffData.outletID || staffData.outletId; // Check both possible field names
            console.log(`[createPublicBooking] Staff document found: ${staffDoc.id}, outletID: "${staffOutletID}", name: "${staffData.name}"`);
            
            // Compare outlet IDs (case-insensitive, trim whitespace)
            const normalizedStaffOutletID = String(staffOutletID || "").trim().toLowerCase();
            const normalizedRequestOutletID = String(outletId || "").trim().toLowerCase();
            
            if (normalizedStaffOutletID === normalizedRequestOutletID) {
              finalStaffId = trimmedStaffId;
              console.log(`[createPublicBooking] ✓ Using provided staffId: ${finalStaffId} (${staffData.name})`);
            } else {
              console.error(`[createPublicBooking] ✗ Staff ${trimmedStaffId} (${staffData.name}) belongs to different outlet ("${staffOutletID}" vs "${outletId}"), falling back to first staff`);
              // Invalid staffId provided, fallback to first staff
              const staffSnap = await db
                .collection("staff")
                .where("outletID", "==", outletId)
                .limit(1)
                .get();
              finalStaffId = staffSnap.empty ? "unassigned" : staffSnap.docs[0].id;
              if (!staffSnap.empty) {
                const firstStaffData = staffSnap.docs[0].data();
                console.log(`[createPublicBooking] ⚠ Fallback to first staff: ${finalStaffId} (${firstStaffData.name})`);
              }
            }
          } else {
            console.error(`[createPublicBooking] ✗ Staff document ${trimmedStaffId} does not exist in Firestore, falling back to first staff`);
            // Invalid staffId provided, fallback to first staff
            const staffSnap = await db
              .collection("staff")
              .where("outletID", "==", outletId)
              .limit(1)
              .get();
            finalStaffId = staffSnap.empty ? "unassigned" : staffSnap.docs[0].id;
            if (!staffSnap.empty) {
              const firstStaffData = staffSnap.docs[0].data();
              console.log(`[createPublicBooking] ⚠ Fallback to first staff: ${finalStaffId} (${firstStaffData.name})`);
            }
          }
        } catch (staffLookupError) {
          console.error(`[createPublicBooking] ✗ Error looking up staff ${trimmedStaffId}:`, staffLookupError);
          // On error, fallback to first staff
          const staffSnap = await db
            .collection("staff")
            .where("outletID", "==", outletId)
            .limit(1)
            .get();
          finalStaffId = staffSnap.empty ? "unassigned" : staffSnap.docs[0].id;
          if (!staffSnap.empty) {
            const firstStaffData = staffSnap.docs[0].data();
            console.log(`[createPublicBooking] ⚠ Fallback to first staff after error: ${finalStaffId} (${firstStaffData.name})`);
          }
        }
      } else {
        console.log(`[createPublicBooking] No staffId provided, using first staff member`);
        // No staffId provided, use first staff member
        const staffSnap = await db
          .collection("staff")
          .where("outletID", "==", outletId)
          .limit(1)
          .get();
        finalStaffId = staffSnap.empty ? "unassigned" : staffSnap.docs[0].id;
        if (!staffSnap.empty) {
          const firstStaffData = staffSnap.docs[0].data();
          console.log(`[createPublicBooking] Using first staff: ${finalStaffId} (${firstStaffData.name})`);
        }
      }
      
      console.log(`[createPublicBooking] ✓ Final staffId assigned: ${finalStaffId}`);

      const clientsQuery = await db
        .collection("clients")
        .where("outletID", "==", outletId)
        .where("phone", "==", trimmedPhone)
        .limit(1)
        .get();
      let clientId;
      if (!clientsQuery.empty) {
        clientId = clientsQuery.docs[0].id;
      } else {
        const clientRef = await db.collection("clients").add({
          outletID: outletId,
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          notes: "Public booking",
          points: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        clientId = clientRef.id;
      }

      const timeParts = trimmedTime.split(":");
      const hour = parseInt(timeParts[0], 10) || 0;
      const min = parseInt(timeParts[1], 10) || 0;
      const startDate = new Date(trimmedDate + "T" + String(hour).padStart(2, "0") + ":" + String(min).padStart(2, "0") + ":00");
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
      const endTime = endDate.toTimeString().slice(0, 5);

      // Final verification: Log what we're about to save
      const finalStaffDoc = await db.collection("staff").doc(finalStaffId).get();
      const finalStaffName = finalStaffDoc.exists ? finalStaffDoc.data().name : "Unknown";
      console.log(`[createPublicBooking] ✓ Creating appointment with staffId: ${finalStaffId} (${finalStaffName})`);
      
      const appointmentRef = await db.collection("appointments").add({
        outletID: outletId,
        clientId,
        staffId: finalStaffId,
        serviceId,
        date: trimmedDate,
        time: trimmedTime,
        endTime,
        status: "scheduled",
      });
      
      console.log(`[createPublicBooking] ✓ Appointment created: ${appointmentRef.id} with staffId: ${finalStaffId} (${finalStaffName})`);
      return { success: true, appointmentId: appointmentRef.id };
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error("createPublicBooking error:", err);
      throw new functions.https.HttpsError(
        "internal",
        err.message || "Failed to create booking"
      );
    }
  });

// ---------- Public HTTP API (no Bearer token) ----------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.set(k, v));
}

/**
 * GET /public/menu/:outletId
 * Returns only name, description, duration, price (and id) of services for that outlet.
 * No Bearer token required.
 */
exports.publicGetMenu = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "GET") {
      res.status(405).set("Allow", "GET").json({ error: "Method not allowed" });
      return;
    }
    const match = (req.path || req.url || "").match(/\/public\/menu\/([^/]+)/);
    const outletId = match ? match[1].trim() : null;
    if (!outletId) {
      res.status(400).json({ error: "outletId is required in path: /public/menu/:outletId" });
      return;
    }
    try {
      const outletRef = db.collection("outlets").doc(outletId);
      const outletSnap = await outletRef.get();
      if (!outletSnap.exists) {
        res.status(404).json({ error: "Outlet not found" });
        return;
      }
      const servicesSnap = await db
        .collection("services")
        .where("outletID", "==", outletId)
        .orderBy("name", "asc")
        .get();
      const services = servicesSnap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.name || "",
          description: x.description || "",
          duration: x.duration ?? 60,
          price: x.price ?? 0,
        };
      });
      res.status(200).json({ services });
    } catch (err) {
      console.error("publicGetMenu error:", err);
      res.status(500).json({ error: err.message || "Failed to load menu" });
    }
  });

/**
 * POST /public/book
 * Body: { outletId, serviceId, date, time, customerName, phone, email? }
 * date: YYYY-MM-DD, time: HH:mm
 * Validates: outlet exists, service exists and belongs to outlet, time slot not already taken.
 * No Bearer token required.
 */
exports.publicPostBook = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "POST") {
      res.status(405).set("Allow", "POST").json({ error: "Method not allowed" });
      return;
    }
    let body;
    try {
      body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    const {
      outletId,
      serviceId,
      date,
      time,
      customerName,
      phone,
      email,
    } = body;
    if (!outletId || !serviceId || !date || !time || !customerName || !phone) {
      res.status(400).json({
        error: "outletId, serviceId, date, time, customerName, and phone are required.",
      });
      return;
    }
    const trimmedName = String(customerName).trim();
    const trimmedPhone = String(phone).trim();
    const trimmedEmail = email ? String(email).trim() : "";
    const trimmedDate = String(date).trim();
    const trimmedTime = String(time).trim();

    try {
      const outletRef = db.collection("outlets").doc(outletId);
      const outletSnap = await outletRef.get();
      if (!outletSnap.exists) {
        res.status(404).json({ error: "Outlet not found" });
        return;
      }

      const serviceRef = db.collection("services").doc(serviceId);
      const serviceSnap = await serviceRef.get();
      if (!serviceSnap.exists) {
        res.status(404).json({ error: "Service not found" });
        return;
      }
      const serviceData = serviceSnap.data();
      if (serviceData.outletID !== outletId) {
        res.status(400).json({ error: "Service does not belong to this outlet" });
        return;
      }
      const durationMinutes = serviceData.duration ?? 60;

      // Time slot validation: no overlapping scheduled appointment for this outlet on this date
      const timeParts = trimmedTime.split(":");
      const hour = parseInt(timeParts[0], 10) || 0;
      const min = parseInt(timeParts[1], 10) || 0;
      const reqStart = new Date(trimmedDate + "T" + String(hour).padStart(2, "0") + ":" + String(min).padStart(2, "0") + ":00");
      const reqEnd = new Date(reqStart.getTime() + durationMinutes * 60 * 1000);
      const reqStartMin = reqStart.getHours() * 60 + reqStart.getMinutes();
      const reqEndMin = reqEnd.getHours() * 60 + reqEnd.getMinutes();

      const appointmentsSnap = await db
        .collection("appointments")
        .where("outletID", "==", outletId)
        .where("date", "==", trimmedDate)
        .get();

      for (const doc of appointmentsSnap.docs) {
        const apt = doc.data();
        if (apt.status === "cancelled" || apt.status === "no-show") continue;
        const aptStart = (apt.time || "00:00").split(":");
        const aptEnd = (apt.endTime || apt.time || "00:00").split(":");
        const aptStartMin = parseInt(aptStart[0], 10) * 60 + parseInt(aptStart[1], 10);
        const aptEndMin = parseInt(aptEnd[0], 10) * 60 + parseInt(aptEnd[1], 10);
        const overlaps = reqStartMin < aptEndMin && reqEndMin > aptStartMin;
        if (overlaps) {
          res.status(409).json({
            error: "This time slot is already taken. Please choose another date or time.",
          });
          return;
        }
      }

      const staffSnap = await db
        .collection("staff")
        .where("outletID", "==", outletId)
        .limit(1)
        .get();
      const firstStaffId = staffSnap.empty ? "unassigned" : staffSnap.docs[0].id;

      const clientsQuery = await db
        .collection("clients")
        .where("outletID", "==", outletId)
        .where("phone", "==", trimmedPhone)
        .limit(1)
        .get();
      let clientId;
      if (!clientsQuery.empty) {
        clientId = clientsQuery.docs[0].id;
      } else {
        const clientRef = await db.collection("clients").add({
          outletID: outletId,
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          notes: "Public booking",
          points: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        clientId = clientRef.id;
      }

      const endTime = reqEnd.toTimeString().slice(0, 5);
      const appointmentRef = await db.collection("appointments").add({
        outletID: outletId,
        clientId,
        staffId: firstStaffId,
        serviceId,
        date: trimmedDate,
        time: trimmedTime,
        endTime,
        status: "scheduled",
      });
      res.status(201).json({ success: true, appointmentId: appointmentRef.id });
    } catch (err) {
      console.error("publicPostBook error:", err);
      res.status(500).json({ error: err.message || "Failed to create booking" });
    }
  });
