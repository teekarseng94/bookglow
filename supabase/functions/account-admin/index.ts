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

const allowedRoles = new Set(["admin", "manager", "cashier"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Account administration is not configured" });
  }

  const authorization = request.headers.get("Authorization") || "";
  const scoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await scoped.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Authentication required" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: operator } = await admin
    .from("users")
    .select("role,outlet_id,email")
    .eq("uid", authData.user.id)
    .maybeSingle();
  const isPlatformAdmin = operator?.role === "platform_admin" || (operator?.role === "admin" && !operator?.outlet_id);
  if (!isPlatformAdmin) return json(403, { error: "Platform administrator access required" });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "list_unlinked") {
    const { data: mapped, error: mappedError } = await admin.from("users").select("uid");
    if (mappedError) return json(500, { error: "Could not load workspace account mappings" });
    const mappedIds = new Set((mapped || []).map((row) => String(row.uid)));
    const accounts: Array<Record<string, unknown>> = [];

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) return json(500, { error: "Could not load registered Supabase accounts" });
      for (const user of data.users) {
        if (!mappedIds.has(user.id)) {
          accounts.push({
            id: user.id,
            email: user.email || "",
            displayName: user.user_metadata?.display_name || user.user_metadata?.name || null,
            createdAt: user.created_at || null,
            lastSignInAt: user.last_sign_in_at || null,
          });
        }
      }
      if (data.users.length < 100) break;
    }

    accounts.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return json(200, { accounts });
  }

  const outletId = String(body.outletId || "").trim();
  const role = String(body.role || "cashier").toLowerCase();
  if (!outletId) return json(400, { error: "Choose a workspace first" });
  if (!allowedRoles.has(role)) return json(400, { error: "Choose a valid account role" });

  const { data: outlet } = await admin.from("outlets").select("outlet_id,name").eq("outlet_id", outletId).maybeSingle();
  if (!outlet) return json(404, { error: "Workspace not found" });

  let targetUser;
  if (action === "link_registered") {
    const userId = String(body.userId || "");
    if (!userId) return json(400, { error: "Registered account is required" });
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return json(404, { error: "Registered account not found" });
    targetUser = data.user;
  } else if (action === "invite") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return json(400, { error: "Email address is required" });
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error || !data.user) return json(400, { error: error?.message || "Could not send invitation" });
    targetUser = data.user;
  } else {
    return json(400, { error: "Unsupported account action" });
  }

  const displayName = targetUser.user_metadata?.display_name || targetUser.user_metadata?.name || null;
  const { error: linkError } = await admin.from("users").upsert({
    uid: targetUser.id,
    email: targetUser.email || null,
    outlet_id: outletId,
    role,
    display_name: displayName,
  }, { onConflict: "uid" });
  if (linkError) return json(500, { error: "Could not link the account to this workspace" });

  await admin.from("platform_audit_events").insert({
    outlet_id: outletId,
    action: action === "invite" ? "workspace account invited" : "registered account linked",
    affected_target: targetUser.email || targetUser.id,
    actor_uid: authData.user.id,
    actor_email: operator.email,
    metadata: { role, auth_user_id: targetUser.id },
    source: "account-admin",
  });

  return json(200, { success: true });
});
