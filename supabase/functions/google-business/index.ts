/**
 * Google Business Profile — read-only reviews integration.
 *
 * One function serves three trust levels, so `verify_jwt` is false and every
 * privileged action validates the caller explicitly:
 *   - merchant actions  : require a Supabase JWT + outlet admin rights
 *   - /callback         : Google's browser redirect (no JWT available)
 *   - public_reviews    : anonymous booking-page reads, resolved from the slug
 *
 * Client secrets and refresh tokens never leave this function. The browser only
 * ever receives normalized review data and opaque, outlet-bound cursors.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";
const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";

/** Google only supports these orders, and each applies to the whole collection. */
const ORDER_BY: Record<string, string> = {
  newest: "updateTime desc",
  highest: "rating desc",
  lowest: "rating",
};

/** Actions that require a merchant JWT plus outlet admin rights. */
const MERCHANT_ACTIONS = new Set([
  "status",
  "oauth_start",
  "locations",
  "select_location",
  "refresh",
  "visibility",
  "disconnect",
]);

const PUBLIC_PAGE_SIZE = 10;
/** How long a cached page counts as fresh. */
const FIRST_PAGE_TTL_SECONDS = 15 * 60;
const DEEP_PAGE_TTL_SECONDS = 60 * 60;
/** Hard retention cap. Stale rows are only used while Google is failing. */
const CACHE_RETENTION_SECONDS = 24 * 60 * 60;
const CURSOR_TTL_SECONDS = 60 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const GOOGLE_TIMEOUT_MS = 10_000;

type Env = {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: string;
  merchantAppUrl: string;
};

function readEnv(): { env: Env | null; missing: string[] } {
  const values = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    clientId: Deno.env.get("GOOGLE_BUSINESS_CLIENT_ID") || "",
    clientSecret: Deno.env.get("GOOGLE_BUSINESS_CLIENT_SECRET") || "",
    redirectUri: Deno.env.get("GOOGLE_BUSINESS_REDIRECT_URI") || "",
    encryptionKey: Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "",
    merchantAppUrl: Deno.env.get("MERCHANT_APP_URL") || "",
  };
  const required: (keyof typeof values)[] = [
    "supabaseUrl",
    "anonKey",
    "serviceKey",
    "clientId",
    "clientSecret",
    "redirectUri",
    "encryptionKey",
  ];
  const missing = required.filter((key) => !values[key]);
  return { env: missing.length === 0 ? (values as Env) : null, missing };
}

// ---------------------------------------------------------------------------
// Token encryption at rest (AES-GCM, key supplied as base64 32 bytes)
// ---------------------------------------------------------------------------
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(keyB64);
  if (raw.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded.");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(plain: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

async function decryptSecret(payload: string, keyB64: string): Promise<string> {
  const [version, ivB64, cipherB64] = String(payload || "").split(".");
  if (version !== "v1" || !ivB64 || !cipherB64) throw new Error("Stored Google token is unreadable.");
  const key = await importKey(keyB64);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivB64) },
    key,
    base64ToBytes(cipherB64),
  );
  return new TextDecoder().decode(plain);
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Bounded fetch with timeout + retry for transient Google failures
// ---------------------------------------------------------------------------
async function googleFetch(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // Retry only on transient upstream conditions.
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Google request failed.");
}

type GoogleErrorShape = { code: string; message: string; status: number };

async function describeGoogleError(response: Response): Promise<GoogleErrorShape> {
  let message = `Google returned ${response.status}.`;
  let code = `http_${response.status}`;
  try {
    const body = await response.json();
    const detail = body?.error?.message || body?.error_description || body?.error;
    if (typeof detail === "string" && detail.trim()) message = detail.trim();
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) code = "unauthorized";
  else if (response.status === 403) code = "forbidden";
  else if (response.status === 429) code = "rate_limited";
  if (code === "rate_limited" || code === "forbidden" || response.status >= 500) {
    message = "Google Business Profile connection is currently unavailable. Please try again later.";
  }
  return { code, message, status: response.status };
}

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------
function adminClient(env: Env) {
  return createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
}

async function rateLimitAllows(
  admin: ReturnType<typeof adminClient>,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("google_api_rate_limit_hit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return true; // Never fail closed on limiter bookkeeping errors.
  return data !== false;
}

/** Validates the merchant JWT and outlet admin rights. */
async function requireOutletAdmin(env: Env, request: Request, outletId: string) {
  if (!outletId) return { error: json({ error: "An outlet is required." }, 400) };
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { error: json({ error: "Authentication required." }, 401) };
  }
  const scoped = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: authError } = await scoped.auth.getUser();
  if (authError || !auth.user) return { error: json({ error: "Authentication required." }, 401) };

  const admin = adminClient(env);
  const { data: allowed, error: checkError } = await admin.rpc("can_manage_outlet_integrations", {
    p_outlet_id: outletId,
    p_user_id: auth.user.id,
  });
  if (checkError) return { error: json({ error: "Could not verify outlet permissions." }, 500) };
  if (allowed !== true) {
    return { error: json({ error: "Only an outlet admin can manage this integration." }, 403) };
  }
  return { admin, user: auth.user };
}

// ---------------------------------------------------------------------------
// Google token handling
// ---------------------------------------------------------------------------
type ConnectionRow = {
  outlet_id: string;
  status: string;
  google_account_name: string | null;
  google_location_name: string | null;
  location_title: string | null;
  location_address: string | null;
  maps_uri: string | null;
  google_place_id: string | null;
  refresh_token_encrypted: string | null;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  show_on_booking_page: boolean;
  average_rating: number | null;
  total_review_count: number | null;
  last_synced_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  connected_email: string | null;
};

async function markNeedsReauth(
  admin: ReturnType<typeof adminClient>,
  outletId: string,
  message: string,
) {
  await admin
    .from("google_business_connections")
    .update({
      status: "needs_reauth",
      access_token_encrypted: null,
      access_token_expires_at: null,
      last_error_code: "unauthorized",
      last_error_message: message,
      last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("outlet_id", outletId);
}

/** Returns a usable access token, refreshing through Google when needed. */
async function getAccessToken(
  env: Env,
  admin: ReturnType<typeof adminClient>,
  connection: ConnectionRow,
): Promise<{ token: string } | { error: GoogleErrorShape }> {
  const expiresAt = connection.access_token_expires_at ? Date.parse(connection.access_token_expires_at) : 0;
  if (connection.access_token_encrypted && expiresAt - 60_000 > Date.now()) {
    try {
      return { token: await decryptSecret(connection.access_token_encrypted, env.encryptionKey) };
    } catch {
      /* fall through to refresh */
    }
  }

  if (!connection.refresh_token_encrypted) {
    return { error: { code: "unauthorized", message: "Google authorization is missing.", status: 401 } };
  }

  let refreshToken: string;
  try {
    refreshToken = await decryptSecret(connection.refresh_token_encrypted, env.encryptionKey);
  } catch {
    return { error: { code: "config", message: "Stored Google token could not be decrypted.", status: 500 } };
  }

  const response = await googleFetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const described = await describeGoogleError(response);
    if (response.status === 400 || response.status === 401) {
      await markNeedsReauth(admin, connection.outlet_id, "Google authorization expired. Reconnect to continue.");
      return {
        error: { code: "unauthorized", message: "Google authorization expired. Reconnect Google.", status: 401 },
      };
    }
    return { error: described };
  }

  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    return { error: { code: "google", message: "Google did not return an access token.", status: 502 } };
  }
  const expiry = new Date(Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000).toISOString();
  await admin
    .from("google_business_connections")
    .update({
      access_token_encrypted: await encryptSecret(payload.access_token, env.encryptionKey),
      access_token_expires_at: expiry,
      updated_at: new Date().toISOString(),
    })
    .eq("outlet_id", connection.outlet_id);

  return { token: payload.access_token };
}

// ---------------------------------------------------------------------------
// Review normalization (no tokens or Google internals reach the browser)
// ---------------------------------------------------------------------------
const STAR_WORDS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function starRatingToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 1 && value <= 5 ? Math.round(value) : null;
  }
  if (typeof value === "string") {
    const word = STAR_WORDS[value.trim().toUpperCase()];
    if (word) return word;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) return Math.round(parsed);
  }
  return null;
}

type NormalizedReview = {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  rating: number | null;
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
};

function normalizeReview(raw: Record<string, unknown>, index: number): NormalizedReview {
  const reviewer = (raw.reviewer || {}) as Record<string, unknown>;
  const isAnonymous = reviewer.isAnonymous === true;
  const displayName = typeof reviewer.displayName === "string" ? reviewer.displayName.trim() : "";
  const photo = typeof reviewer.profilePhotoUrl === "string" ? reviewer.profilePhotoUrl.trim() : "";
  const comment = typeof raw.comment === "string" && raw.comment.trim() ? raw.comment : null;
  const id = typeof raw.reviewId === "string" && raw.reviewId
    ? raw.reviewId
    : typeof raw.name === "string" && raw.name
      ? raw.name
      : `review-${index}`;
  return {
    id,
    authorName: isAnonymous || !displayName ? "A Google user" : displayName,
    avatarUrl: isAnonymous || !photo.startsWith("https://") ? null : photo,
    isAnonymous,
    rating: starRatingToNumber(raw.starRating),
    comment,
    createTime: typeof raw.createTime === "string" ? raw.createTime : null,
    updateTime: typeof raw.updateTime === "string" ? raw.updateTime : null,
  };
}

type ReviewPage = {
  reviews: NormalizedReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
  nextPageToken: string | null;
};

async function fetchReviewPage(
  env: Env,
  admin: ReturnType<typeof adminClient>,
  connection: ConnectionRow,
  orderKey: string,
  pageToken: string | null,
  pageSize: number,
): Promise<{ page: ReviewPage } | { error: GoogleErrorShape }> {
  if (!connection.google_account_name || !connection.google_location_name) {
    return { error: { code: "not_connected", message: "No Google location is selected.", status: 409 } };
  }

  const pageKey = pageToken ? `t:${await sha256Hex(pageToken)}` : "first";
  const ttl = pageToken ? DEEP_PAGE_TTL_SECONDS : FIRST_PAGE_TTL_SECONDS;
  const { data: cached } = await admin
    .from("google_review_page_cache")
    .select("payload, fetched_at")
    .eq("outlet_id", connection.outlet_id)
    .eq("order_by", orderKey)
    .eq("page_key", pageKey)
    .maybeSingle();
  if (cached?.payload && cached.fetched_at && Date.parse(cached.fetched_at) + ttl * 1000 > Date.now()) {
    return { page: cached.payload as ReviewPage };
  }

  const allowed = await rateLimitAllows(admin, `google_reviews:${connection.outlet_id}`, 60, 60);
  if (!allowed) {
    return { error: { code: "rate_limited", message: "Too many review requests. Try again shortly.", status: 429 } };
  }

  const token = await getAccessToken(env, admin, connection);
  if ("error" in token) return { error: token.error };

  const locationId = connection.google_location_name.split("/").pop() || connection.google_location_name;
  const url = new URL(`${REVIEWS_API}/${connection.google_account_name}/locations/${locationId}/reviews`);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("orderBy", ORDER_BY[orderKey] || ORDER_BY.newest);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await googleFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  if (!response.ok) {
    const described = await describeGoogleError(response);
    if (response.status === 401) {
      await markNeedsReauth(admin, connection.outlet_id, "Google authorization expired. Reconnect to continue.");
    } else {
      await admin
        .from("google_business_connections")
        .update({
          last_error_code: described.code,
          last_error_message: described.message,
          last_error_at: new Date().toISOString(),
        })
        .eq("outlet_id", connection.outlet_id);
    }
    return { error: described };
  }

  const body = await response.json() as Record<string, unknown>;
  const rawReviews = Array.isArray(body.reviews) ? body.reviews as Record<string, unknown>[] : [];
  const page: ReviewPage = {
    reviews: rawReviews.map(normalizeReview),
    averageRating: typeof body.averageRating === "number" ? body.averageRating : null,
    totalReviewCount: typeof body.totalReviewCount === "number" ? body.totalReviewCount : null,
    nextPageToken: typeof body.nextPageToken === "string" && body.nextPageToken ? body.nextPageToken : null,
  };

  await admin.from("google_review_page_cache").upsert({
    outlet_id: connection.outlet_id,
    order_by: orderKey,
    page_key: pageKey,
    payload: page,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_RETENTION_SECONDS * 1000).toISOString(),
  }, { onConflict: "outlet_id,order_by,page_key" });

  // Keep the outlet summary fresh from Google's own aggregate values.
  if (page.averageRating !== null || page.totalReviewCount !== null) {
    await admin
      .from("google_business_connections")
      .update({
        average_rating: page.averageRating,
        total_review_count: page.totalReviewCount,
        last_synced_at: new Date().toISOString(),
        last_error_code: null,
        last_error_message: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("outlet_id", connection.outlet_id);
  }

  return { page };
}

/** Issues an opaque cursor bound to this outlet and sort order. */
async function issueCursor(
  admin: ReturnType<typeof adminClient>,
  outletId: string,
  orderKey: string,
  pageToken: string,
): Promise<string> {
  const cursorId = randomId();
  await admin.from("google_review_cursors").insert({
    cursor_id: cursorId,
    outlet_id: outletId,
    order_by: orderKey,
    page_token: pageToken,
    expires_at: new Date(Date.now() + CURSOR_TTL_SECONDS * 1000).toISOString(),
  });
  return cursorId;
}

async function resolveCursor(
  admin: ReturnType<typeof adminClient>,
  outletId: string,
  orderKey: string,
  cursorId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("google_review_cursors")
    .select("page_token, expires_at")
    .eq("cursor_id", cursorId)
    .eq("outlet_id", outletId)
    .eq("order_by", orderKey)
    .maybeSingle();
  if (!data?.page_token) return null;
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return null;
  return data.page_token;
}

// ---------------------------------------------------------------------------
// Merchant-facing shapes
// ---------------------------------------------------------------------------
function connectionSummary(row: ConnectionRow | null, configured: boolean, missing: string[]) {
  if (!configured) {
    return {
      configured: false,
      missingConfig: missing,
      status: "setup_required" as const,
      showOnBookingPage: false,
    };
  }
  if (!row) {
    return { configured: true, missingConfig: [], status: "disconnected" as const, showOnBookingPage: false };
  }
  return {
    configured: true,
    missingConfig: [],
    status: row.status as "pending_location" | "connected" | "needs_reauth" | "error",
    locationName: row.google_location_name,
    accountName: row.google_account_name,
    locationTitle: row.location_title,
    locationAddress: row.location_address,
    mapsUri: row.maps_uri,
    showOnBookingPage: row.show_on_booking_page === true,
    averageRating: row.average_rating,
    totalReviewCount: row.total_review_count,
    lastSyncedAt: row.last_synced_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    lastErrorAt: row.last_error_at,
    connectedEmail: row.connected_email,
  };
}

async function loadConnection(
  admin: ReturnType<typeof adminClient>,
  outletId: string,
): Promise<ConnectionRow | null> {
  const { data } = await admin
    .from("google_business_connections")
    .select("*")
    .eq("outlet_id", outletId)
    .maybeSingle();
  return (data as ConnectionRow) || null;
}

async function clearOutletCache(admin: ReturnType<typeof adminClient>, outletId: string) {
  await admin.from("google_review_page_cache").delete().eq("outlet_id", outletId);
  await admin.from("google_review_cursors").delete().eq("outlet_id", outletId);
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { env, missing } = readEnv();
  const url = new URL(request.url);
  const isCallback = url.pathname.endsWith("/callback");

  // Supabase infrastructure keys are required even to report setup state.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Function environment is incomplete." }, 500);
  }

  try {
    if (isCallback) return await handleCallback(request, env, missing);

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "public_reviews") {
      return await handlePublicReviews(body, env, missing, {
        supabaseUrl,
        serviceKey,
        anonKey,
      });
    }

    if (!MERCHANT_ACTIONS.has(action)) return json({ error: "Unsupported action." }, 400);

    const outletId = String(body.outletId || "").trim();

    // Authorize before anything else, so an unauthenticated caller learns
    // nothing about this outlet or the server's Google configuration state.
    const gate = await requireOutletAdmin({ supabaseUrl, anonKey, serviceKey } as Env, request, outletId);
    if ("error" in gate) return gate.error;
    const { admin, user } = gate;

    // `status` must answer before Google is configured so the card can explain setup.
    if (action === "status") {
      const row = await loadConnection(admin, outletId);
      return json({ connection: connectionSummary(row, Boolean(env), missing) });
    }

    if (!env) {
      return json({ error: "Google Business Profile is not configured yet.", missingConfig: missing }, 503);
    }

    await admin.rpc("google_business_purge_expired");

    switch (action) {
      case "oauth_start": {
        const state = randomId();
        const returnTo = typeof body.returnTo === "string" ? body.returnTo.slice(0, 500) : null;
        const { error: stateError } = await admin.from("google_oauth_states").insert({
          state,
          outlet_id: outletId,
          user_id: user.id,
          return_to: returnTo,
          expires_at: new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000).toISOString(),
        });
        if (stateError) return json({ error: "Could not start Google authorization." }, 500);

        const authUrl = new URL(OAUTH_AUTH_URL);
        authUrl.searchParams.set("client_id", env.clientId);
        authUrl.searchParams.set("redirect_uri", env.redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", GOOGLE_SCOPE);
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("include_granted_scopes", "true");
        authUrl.searchParams.set("state", state);
        return json({ authorizationUrl: authUrl.toString() });
      }

      case "locations": {
        const connection = await loadConnection(admin, outletId);
        if (!connection?.refresh_token_encrypted) {
          return json({ error: "Connect Google Business Profile first.", code: "not_connected" }, 409);
        }
        const token = await getAccessToken(env, admin, connection);
        if ("error" in token) return json({ error: token.error.message, code: token.error.code }, token.error.status);

        const accountsResponse = await googleFetch(`${ACCOUNTS_API}/accounts?pageSize=20`, {
          headers: { Authorization: `Bearer ${token.token}` },
        });
        if (!accountsResponse.ok) {
          const described = await describeGoogleError(accountsResponse);
          return json({ error: described.message, code: described.code }, described.status);
        }
        const accountsBody = await accountsResponse.json() as {
          accounts?: { name?: string; accountName?: string }[];
        };
        const accounts = accountsBody.accounts || [];

        const locations: {
          accountName: string;
          accountLabel: string;
          locationName: string;
          title: string;
          address: string;
          mapsUri: string | null;
        }[] = [];

        for (const account of accounts) {
          if (!account.name) continue;
          const locationsUrl = new URL(`${INFO_API}/${account.name}/locations`);
          locationsUrl.searchParams.set("readMask", "name,title,storefrontAddress,metadata");
          locationsUrl.searchParams.set("pageSize", "100");
          const locationsResponse = await googleFetch(locationsUrl.toString(), {
            headers: { Authorization: `Bearer ${token.token}` },
          });
          if (!locationsResponse.ok) continue;
          const locationsBody = await locationsResponse.json() as {
            locations?: Record<string, unknown>[];
          };
          for (const location of locationsBody.locations || []) {
            const address = location.storefrontAddress as Record<string, unknown> | undefined;
            const lines = Array.isArray(address?.addressLines) ? address?.addressLines as string[] : [];
            const metadata = location.metadata as Record<string, unknown> | undefined;
            locations.push({
              accountName: account.name,
              accountLabel: account.accountName || account.name,
              locationName: String(location.name || ""),
              title: String(location.title || "Untitled location"),
              address: [...lines, address?.locality, address?.administrativeArea, address?.postalCode]
                .filter((part) => typeof part === "string" && part.trim())
                .join(", "),
              mapsUri: typeof metadata?.mapsUri === "string" ? metadata.mapsUri : null,
            });
          }
        }

        // The merchant chooses explicitly; we never auto-match on a similar name.
        return json({ locations });
      }

      case "select_location": {
        const accountName = String(body.accountName || "").trim();
        const locationName = String(body.locationName || "").trim();
        if (!/^accounts\/[\w-]+$/.test(accountName) || !/^locations\/[\w-]+$/.test(locationName)) {
          return json({ error: "Choose a Google location from the list." }, 400);
        }
        const connection = await loadConnection(admin, outletId);
        if (!connection?.refresh_token_encrypted) {
          return json({ error: "Connect Google Business Profile first.", code: "not_connected" }, 409);
        }
        const token = await getAccessToken(env, admin, connection);
        if ("error" in token) return json({ error: token.error.message, code: token.error.code }, token.error.status);

        // Confirm the merchant actually manages this location under this account.
        const verifyUrl = new URL(`${INFO_API}/${accountName}/locations`);
        verifyUrl.searchParams.set("readMask", "name,title,storefrontAddress,metadata");
        verifyUrl.searchParams.set("pageSize", "100");
        const verifyResponse = await googleFetch(verifyUrl.toString(), {
          headers: { Authorization: `Bearer ${token.token}` },
        });
        if (!verifyResponse.ok) {
          const described = await describeGoogleError(verifyResponse);
          return json({ error: described.message, code: described.code }, described.status);
        }
        const verifyBody = await verifyResponse.json() as { locations?: Record<string, unknown>[] };
        const match = (verifyBody.locations || []).find((row) => String(row.name || "") === locationName);
        if (!match) {
          return json({ error: "That location is not available on the authorized Google account." }, 403);
        }

        const address = match.storefrontAddress as Record<string, unknown> | undefined;
        const lines = Array.isArray(address?.addressLines) ? address?.addressLines as string[] : [];
        const metadata = match.metadata as Record<string, unknown> | undefined;

        await clearOutletCache(admin, outletId);
        await admin.from("google_business_connections").update({
          status: "connected",
          google_account_name: accountName,
          google_location_name: locationName,
          location_title: String(match.title || ""),
          location_address: [...lines, address?.locality, address?.administrativeArea, address?.postalCode]
            .filter((part) => typeof part === "string" && part.trim())
            .join(", "),
          maps_uri: typeof metadata?.mapsUri === "string" ? metadata.mapsUri : null,
          show_on_booking_page: true,
          average_rating: null,
          total_review_count: null,
          last_error_code: null,
          last_error_message: null,
          last_error_at: null,
          updated_at: new Date().toISOString(),
        }).eq("outlet_id", outletId);

        if (typeof metadata?.placeId === "string" && metadata.placeId) {
          await admin
            .from("google_business_connections")
            .update({ google_place_id: metadata.placeId })
            .eq("outlet_id", outletId);
        }

        const refreshed = await loadConnection(admin, outletId);
        if (refreshed) {
          const first = await fetchReviewPage(env, admin, refreshed, "newest", null, PUBLIC_PAGE_SIZE);
          if ("error" in first) {
            const after = await loadConnection(admin, outletId);
            return json({
              connection: connectionSummary(after, true, []),
              warning: first.error.message,
            });
          }
        }
        return json({ connection: connectionSummary(await loadConnection(admin, outletId), true, []) });
      }

      case "refresh": {
        const connection = await loadConnection(admin, outletId);
        if (!connection?.google_location_name) {
          return json({ error: "Select a Google location first.", code: "not_connected" }, 409);
        }
        const allowed = await rateLimitAllows(admin, `google_refresh:${outletId}`, 6, 60);
        if (!allowed) return json({ error: "Please wait a moment before refreshing again." }, 429);

        await admin.from("google_review_page_cache").delete().eq("outlet_id", outletId);
        const page = await fetchReviewPage(env, admin, connection, "newest", null, PUBLIC_PAGE_SIZE);
        const after = await loadConnection(admin, outletId);
        if ("error" in page) {
          return json({
            connection: connectionSummary(after, true, []),
            error: page.error.message,
            code: page.error.code,
          }, page.error.status);
        }
        return json({ connection: connectionSummary(after, true, []) });
      }

      case "visibility": {
        const enabled = body.enabled === true;
        const connection = await loadConnection(admin, outletId);
        if (!connection) return json({ error: "Connect Google Business Profile first." }, 409);
        if (enabled && connection.status !== "connected") {
          return json({ error: "Select a verified Google location before showing reviews." }, 409);
        }
        await admin
          .from("google_business_connections")
          .update({ show_on_booking_page: enabled, updated_at: new Date().toISOString() })
          .eq("outlet_id", outletId);
        return json({ connection: connectionSummary(await loadConnection(admin, outletId), true, []) });
      }

      case "disconnect": {
        const connection = await loadConnection(admin, outletId);
        if (connection?.refresh_token_encrypted) {
          try {
            const refreshToken = await decryptSecret(connection.refresh_token_encrypted, env.encryptionKey);
            await googleFetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, { method: "POST" }, 1);
          } catch {
            /* Revocation is best effort; local cleanup must still run. */
          }
        }
        await clearOutletCache(admin, outletId);
        await admin.from("google_oauth_states").delete().eq("outlet_id", outletId);
        await admin.from("google_business_connections").delete().eq("outlet_id", outletId);
        return json({ connection: connectionSummary(null, true, []) });
      }

      default:
        return json({ error: "Unsupported action." }, 400);
    }
  } catch (error) {
    console.error("google-business", error);
    return json({ error: "The Google Business Profile request failed." }, 500);
  }
});

// ---------------------------------------------------------------------------
// OAuth callback (browser redirect from Google, no JWT present)
// ---------------------------------------------------------------------------
async function handleCallback(request: Request, env: Env | null, missing: string[]): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const oauthError = url.searchParams.get("error") || "";

  const merchantAppUrl = Deno.env.get("MERCHANT_APP_URL") || "";

  /** Sends the merchant back to Google Reviews (HashRouter) with a one-off notice. */
  const redirect = (status: string, detail?: string) => {
    const query = new URLSearchParams({ google: status });
    if (detail) query.set("google_detail", detail.slice(0, 140));

    let location: string | null = null;
    try {
      const target = new URL(merchantAppUrl);
      target.hash = `/integrations/google-reviews?${query.toString()}`;
      location = target.toString();
    } catch {
      location = null;
    }
    if (!location) {
      return new Response(
        "Google authorization finished, but MERCHANT_APP_URL is not configured. Return to BookGlow Integrations manually.",
        { status: 200, headers: { ...cors, "Content-Type": "text/plain" } },
      );
    }
    return new Response(null, { status: 302, headers: { ...cors, Location: location } });
  };

  if (!env) return redirect("setup_required", `Missing: ${missing.join(", ")}`);
  if (oauthError) return redirect("cancelled");
  if (!state || !code) return redirect("error", "Google did not return an authorization code.");

  const admin = adminClient(env);
  await admin.rpc("google_business_purge_expired");

  // Single-use state, bound to the merchant and outlet that started the flow.
  const { data: stateRow } = await admin
    .from("google_oauth_states")
    .select("state, outlet_id, user_id, consumed_at, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (!stateRow || stateRow.consumed_at || Date.parse(stateRow.expires_at) < Date.now()) {
    return redirect("error", "This Google authorization link is no longer valid.");
  }
  const { data: claimed } = await admin
    .from("google_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state", state)
    .is("consumed_at", null)
    .select("state")
    .maybeSingle();
  if (!claimed) return redirect("error", "This Google authorization link was already used.");

  const { data: stillAllowed } = await admin.rpc("can_manage_outlet_integrations", {
    p_outlet_id: stateRow.outlet_id,
    p_user_id: stateRow.user_id,
  });
  if (stillAllowed !== true) return redirect("error", "You no longer have permission to manage this outlet.");

  const tokenResponse = await googleFetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.redirectUri,
    }),
  });
  if (!tokenResponse.ok) {
    const described = await describeGoogleError(tokenResponse);
    return redirect("error", described.message);
  }
  const tokens = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!tokens.refresh_token) {
    return redirect("error", "Google did not return a refresh token. Remove BookGlow from your Google account permissions and try again.");
  }
  if (!String(tokens.scope || "").includes("business.manage")) {
    return redirect("error", "The Business Profile permission was not granted.");
  }

  let email: string | null = null;
  if (tokens.access_token) {
    try {
      const infoResponse = await googleFetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }, 1);
      if (infoResponse.ok) {
        const info = await infoResponse.json() as { email?: string };
        email = typeof info.email === "string" ? info.email : null;
      }
    } catch {
      /* email is cosmetic */
    }
  }

  await admin.from("google_business_connections").upsert({
    outlet_id: stateRow.outlet_id,
    status: "pending_location",
    refresh_token_encrypted: await encryptSecret(tokens.refresh_token, env.encryptionKey),
    access_token_encrypted: tokens.access_token
      ? await encryptSecret(tokens.access_token, env.encryptionKey)
      : null,
    access_token_expires_at: tokens.access_token
      ? new Date(Date.now() + Math.max(60, Number(tokens.expires_in || 3600)) * 1000).toISOString()
      : null,
    granted_scope: tokens.scope || GOOGLE_SCOPE,
    connected_by: stateRow.user_id,
    connected_email: email,
    google_account_name: null,
    google_location_name: null,
    location_title: null,
    location_address: null,
    maps_uri: null,
    average_rating: null,
    total_review_count: null,
    show_on_booking_page: false,
    last_error_code: null,
    last_error_message: null,
    last_error_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "outlet_id" });

  await clearOutletCache(admin, stateRow.outlet_id);
  await admin.from("google_oauth_states").delete().eq("outlet_id", stateRow.outlet_id);

  return redirect("select_location");
}

// ---------------------------------------------------------------------------
// Public booking page reviews
// ---------------------------------------------------------------------------
async function handlePublicReviews(
  body: Record<string, unknown>,
  env: Env | null,
  missing: string[],
  fallback: { supabaseUrl: string; serviceKey: string; anonKey: string },
): Promise<Response> {
  const slug = String(body.bookingSlug || "").trim();
  if (!slug || slug.length > 200) return json({ enabled: false, reason: "unavailable" });

  const admin = createClient(fallback.supabaseUrl, fallback.serviceKey, { auth: { persistSession: false } });

  // The outlet is derived from the published slug on the server; the caller
  // cannot name an outlet or a Google location.
  const { data: outletId, error: resolveError } = await admin.rpc("resolve_public_booking_outlet", {
    p_segment: slug,
  });
  if (resolveError || !outletId || typeof outletId !== "string") {
    return json({ enabled: false, reason: "unavailable" });
  }

  const connection = await loadConnection(admin, outletId);
  // Disabled or disconnected integrations disappear from the booking page.
  if (!connection || connection.show_on_booking_page !== true || connection.status === "pending_location") {
    return json({ enabled: false, reason: "disabled" });
  }
  if (!env) return json({ enabled: false, reason: "disabled" });

  const orderKey = typeof body.orderBy === "string" && ORDER_BY[body.orderBy] ? body.orderBy : "newest";
  const cursorInput = typeof body.cursor === "string" ? body.cursor.trim() : "";
  if (cursorInput && !/^[a-f0-9]{64}$/i.test(cursorInput)) {
    return json({ error: "Invalid pagination cursor." }, 400);
  }

  let pageToken: string | null = null;
  if (cursorInput) {
    pageToken = await resolveCursor(admin, outletId, orderKey, cursorInput);
    if (!pageToken) return json({ error: "This page of reviews expired. Reload to continue." }, 410);
  }

  const allowed = await rateLimitAllows(admin, `google_public:${outletId}`, 120, 60);
  if (!allowed) return json({ error: "Reviews are busy right now. Try again shortly." }, 429);

  if (connection.status === "needs_reauth") {
    return await servePublicFallback(admin, connection, orderKey, pageToken);
  }

  const result = await fetchReviewPage(env, admin, connection, orderKey, pageToken, PUBLIC_PAGE_SIZE);
  if ("error" in result) {
    return await servePublicFallback(admin, connection, orderKey, pageToken);
  }

  const nextCursor = result.page.nextPageToken
    ? await issueCursor(admin, outletId, orderKey, result.page.nextPageToken)
    : null;

  return json({
    enabled: true,
    source: "google",
    locationTitle: connection.location_title,
    mapsUri: connection.maps_uri,
    averageRating: result.page.averageRating,
    totalReviewCount: result.page.totalReviewCount,
    reviews: result.page.reviews,
    nextCursor,
    supportedSorts: Object.keys(ORDER_BY),
    lastSyncedAt: connection.last_synced_at,
  });
}

/**
 * Temporary Google failure: serve only still-valid cached data, otherwise a
 * concise unavailable state. Never a fabricated review or a false "0 reviews".
 */
async function servePublicFallback(
  admin: ReturnType<typeof adminClient>,
  connection: ConnectionRow,
  orderKey: string,
  pageToken: string | null,
): Promise<Response> {
  const pageKey = pageToken ? `t:${await sha256Hex(pageToken)}` : "first";
  // Stale but still inside the retention window is acceptable here; anything
  // older has been dropped and we show an unavailable state instead.
  const { data: cached } = await admin
    .from("google_review_page_cache")
    .select("payload, expires_at")
    .eq("outlet_id", connection.outlet_id)
    .eq("order_by", orderKey)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (cached?.payload && cached.expires_at && Date.parse(cached.expires_at) > Date.now()) {
    const page = cached.payload as ReviewPage;
    const nextCursor = page.nextPageToken
      ? await issueCursor(admin, connection.outlet_id, orderKey, page.nextPageToken)
      : null;
    return json({
      enabled: true,
      source: "google_cached",
      stale: true,
      locationTitle: connection.location_title,
      mapsUri: connection.maps_uri,
      averageRating: page.averageRating,
      totalReviewCount: page.totalReviewCount,
      reviews: page.reviews,
      nextCursor,
      supportedSorts: Object.keys(ORDER_BY),
      lastSyncedAt: connection.last_synced_at,
    });
  }

  return json({
    enabled: true,
    source: "unavailable",
    unavailable: true,
    locationTitle: connection.location_title,
    mapsUri: connection.maps_uri,
    supportedSorts: Object.keys(ORDER_BY),
  });
}
