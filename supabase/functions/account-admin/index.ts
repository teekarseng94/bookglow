import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const allowedRoles = new Set(["admin", "manager", "cashier"]);
const operationActions = new Set(["suspend_global", "reactivate_global", "revoke_bookglow_access", "start_password_recovery", "resend_invitation"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: "Account administration is not configured" });
  const authorization = request.headers.get("Authorization") || "";
  const scoped = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await scoped.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Authentication required" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: platformAdmin } = await admin.from("platform_admins").select("status").eq("user_id", authData.user.id).maybeSingle();
  const { data: operator } = await admin.from("users").select("email").eq("uid", authData.user.id).maybeSingle();
  if (platformAdmin?.status !== "active") return json(403, { error: "Platform administrator access required" });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const reason = String(body.reason || "").trim() || null;

  if (action === "list_unlinked") {
    const { data: mapped, error: mappedError } = await admin.from("users").select("uid");
    if (mappedError) return json(500, { error: "Could not load workspace account mappings" });
    const mappedIds = new Set((mapped || []).map((row) => String(row.uid)));
    const accounts: Array<Record<string, unknown>> = [];
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) return json(500, { error: "Could not load registered Supabase accounts" });
      for (const user of data.users) if (!mappedIds.has(user.id)) accounts.push({ id: user.id, email: user.email || "", displayName: user.user_metadata?.display_name || user.user_metadata?.name || null, createdAt: user.created_at || null, lastSignInAt: user.last_sign_in_at || null });
      if (data.users.length < 100) break;
    }
    accounts.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return json(200, { accounts });
  }

  if (action === "link_registered" || action === "invite") {
    const outletId = String(body.outletId || "").trim();
    const role = String(body.role || "cashier").toLowerCase();
    if (!outletId) return json(400, { error: "Choose a workspace first" });
    if (!allowedRoles.has(role)) return json(400, { error: "Choose a valid account role" });
    const { data: outlet } = await admin.from("outlets").select("outlet_id").eq("outlet_id", outletId).maybeSingle();
    if (!outlet) return json(404, { error: "Workspace not found" });
    let targetUser;
    if (action === "link_registered") {
      const { data, error } = await admin.auth.admin.getUserById(String(body.userId || ""));
      if (error || !data.user) return json(404, { error: "Registered account not found" });
      targetUser = data.user;
    } else {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json(400, { error: "Email address is required" });
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error || !data.user) return json(400, { error: error?.message || "Could not send invitation" });
      targetUser = data.user;
    }
    const { data: protectedAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", targetUser.id).maybeSingle();
    if (protectedAdmin) return json(409, { error: "Platform administrator accounts cannot be linked as merchant accounts" });
    const displayName = targetUser.user_metadata?.display_name || targetUser.user_metadata?.name || null;
    const { error: linkError } = await admin.from("users").upsert({ uid: targetUser.id, email: targetUser.email || null, outlet_id: outletId, role, display_name: displayName }, { onConflict: "uid" });
    if (linkError) return json(500, { error: "Could not link the account to this workspace" });
    const { error: memberError } = await admin.from("outlet_members").upsert({ outlet_id: outletId, user_id: targetUser.id, role, status: "active", invited_by: authData.user.id }, { onConflict: "outlet_id,user_id" });
    if (memberError) return json(207, { partial: true, error: "The account mapping was saved but the authoritative membership failed. Do not repeat the action." });
    const { error: auditError } = await admin.from("platform_audit_events").insert({ outlet_id: outletId, action: action === "invite" ? "workspace account invited" : "registered account linked", affected_target: targetUser.email || targetUser.id, actor_uid: authData.user.id, actor_email: operator?.email, metadata: { role, auth_user_id: targetUser.id }, source: "account-admin", outcome: "succeeded" });
    if (auditError) return json(207, { partial: true, error: "The account was linked, but its audit record failed. Do not repeat the action; contact an operator." });
    return json(200, { success: true });
  }

  if (!operationActions.has(action)) return json(400, { error: "Unsupported account action" });
  const userId = String(body.userId || "");
  const operationId = String(body.operationId || "");
  if (!userId || !operationId) return json(400, { error: "Target account and operation id are required" });
  if (userId === authData.user.id) return json(409, { error: "You cannot change or revoke your own platform access" });
  const { data: protectedAdmin } = await admin.from("platform_admins").select("status").eq("user_id", userId).maybeSingle();
  if (protectedAdmin?.status === "active") return json(409, { error: "Platform administrator accounts are protected from ordinary account actions" });
  const { data: prior } = await admin.from("platform_admin_operations").select("state,result").eq("id", operationId).maybeSingle();
  if (prior) return json(prior.state === "succeeded" ? 200 : 409, { operationId, state: prior.state, ...(prior.result || {}) });
  const { data: authUser, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError || !authUser.user) return json(404, { error: "Account not found" });
  const { error: startError } = await admin.from("platform_admin_operations").insert({ id: operationId, action, target_id: userId, actor_uid: authData.user.id, state: "started" });
  if (startError) return json(409, { error: "This operation is already running or could not be tracked" });

  let result: Record<string, unknown> = {};
  let actionError: Error | null = null;
  let externalIdentityChanged = false;
  try {
    if (action === "suspend_global") {
      if (!reason) throw new Error("A global suspension reason is required");
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (error) throw error;
      externalIdentityChanged = true;
      const { error: controlError } = await admin.from("platform_account_controls").upsert({ user_id: userId, status: "suspended", reason, changed_by: authData.user.id, changed_at: new Date().toISOString(), sessions_blocked_at: new Date().toISOString() });
      if (controlError) throw controlError;
      result = { scope: "global", access: "blocked", existingSessions: "Bookglow backend access blocked immediately; outstanding access JWTs expire normally" };
    } else if (action === "reactivate_global") {
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw error;
      externalIdentityChanged = true;
      const { error: controlError } = await admin.from("platform_account_controls").upsert({ user_id: userId, status: "active", reason, changed_by: authData.user.id, changed_at: new Date().toISOString(), sessions_blocked_at: null });
      if (controlError) throw controlError;
      result = { scope: "global", access: "active" };
    } else if (action === "revoke_bookglow_access") {
      const { error } = await admin.from("platform_account_controls").upsert({ user_id: userId, status: "suspended", reason: reason || "Bookglow access revoked", changed_by: authData.user.id, changed_at: new Date().toISOString(), sessions_blocked_at: new Date().toISOString() });
      if (error) throw error;
      result = { scope: "bookglow", access: "blocked", note: "Provider refresh tokens are not revoked; backend access is denied immediately" };
    } else if (action === "start_password_recovery") {
      const providers = (authUser.user.identities || []).map((identity) => identity.provider);
      if (!providers.includes("email")) throw new Error("This account uses Google sign-in and has no Bookglow password to recover");
      const { error } = await admin.auth.resetPasswordForEmail(authUser.user.email || "", { redirectTo: String(body.redirectTo || "") || undefined });
      if (error) throw error;
      result = { recoveryEmailStarted: true, enforced: false };
    } else if (action === "resend_invitation") {
      if (authUser.user.email_confirmed_at) throw new Error("This account is already registered; an invitation cannot be resent");
      const { error } = await admin.auth.resend({ type: "signup", email: authUser.user.email || "" });
      if (error) throw error;
      result = { invitationResent: true };
    }
  } catch (error) { actionError = error instanceof Error ? error : new Error(String(error)); }

  if (actionError) {
    const state = externalIdentityChanged ? "partial" : "failed";
    const partialNote = externalIdentityChanged
      ? "The identity-provider change succeeded, but Bookglow state did not finish. Do not retry; reconcile this operation."
      : null;
    await admin.from("platform_admin_operations").update({ state, completed_at: new Date().toISOString(), result: { error: actionError.message, partialNote } }).eq("id", operationId);
    await admin.from("platform_audit_events").insert({ action, affected_target: authUser.user.email || userId, actor_uid: authData.user.id, actor_email: operator?.email, reason, metadata: { operation_id: operationId, error: actionError.message, partial_note: partialNote }, source: "account-admin", outcome: state, operation_id: operationId });
    return json(externalIdentityChanged ? 207 : 400, { error: partialNote || actionError.message, detail: actionError.message, operationId, state });
  }
  const { error: auditError } = await admin.from("platform_audit_events").insert({ action, affected_target: authUser.user.email || userId, actor_uid: authData.user.id, actor_email: operator?.email, reason, metadata: result, source: "account-admin", outcome: "succeeded", operation_id: operationId });
  const state = auditError ? "partial" : "succeeded";
  await admin.from("platform_admin_operations").update({ state, completed_at: new Date().toISOString(), result }).eq("id", operationId);
  if (auditError) return json(207, { partial: true, operationId, state, error: "The identity action succeeded, but audit completion failed. Do not retry this operation." });
  return json(200, { success: true, operationId, state, ...result });
});
