import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Function environment is incomplete." }, 500);
    const authorization = request.headers.get("Authorization") || "";
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await callerClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Authentication required." }, 401);
    const body = await request.json() as { outletId?: string; email?: string; role?: string; redirectTo?: string };
    const outletId = String(body.outletId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").toLowerCase();
    if (!outletId || !/^\S+@\S+\.\S+$/.test(email) || !["admin", "manager", "cashier"].includes(role)) return json({ error: "Valid outlet, email, and role are required." }, 400);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: caller } = await admin.from("outlet_members").select("role,status").eq("outlet_id", outletId).eq("user_id", auth.user.id).maybeSingle();
    if (!caller || caller.status !== "active" || !["owner", "admin"].includes(caller.role)) return json({ error: "You cannot manage accounts for this outlet." }, 403);
    const { data: outlet } = await admin.from("outlets").select("account_limit,access_status").eq("outlet_id", outletId).single();
    if (!outlet || outlet.access_status !== "active") return json({ error: "Outlet access is disabled." }, 409);
    const { count } = await admin.from("outlet_members").select("id", { head: true, count: "exact" }).eq("outlet_id", outletId).eq("status", "active");
    if ((count || 0) >= outlet.account_limit) return json({ error: "This outlet has reached its active account limit.", code: "account_limit_reached" }, 409);
    const { data: existingMember } = await admin.from("outlet_members").select("id,profiles!inner(email)").eq("outlet_id", outletId).eq("profiles.email", email).maybeSingle();
    if (existingMember) return json({ error: "This person already belongs to the outlet.", code: "duplicate_membership" }, 409);
    const { data: pending } = await admin.from("outlet_invitations").select("id").eq("outlet_id", outletId).ilike("email", email).eq("status", "pending").maybeSingle();
    if (pending) return json({ error: "A pending invitation already exists.", code: "duplicate_invitation" }, 409);
    const rawToken = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
    const { data: invitation, error: insertError } = await admin.from("outlet_invitations").insert({ outlet_id: outletId, email, role, token_hash: tokenHash, status: "pending", invited_by: auth.user.id, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }).select("id").single();
    if (insertError) throw insertError;
    const redirectTo = body.redirectTo || `${request.headers.get("origin")}/auth/callback/merchant?invitation=${encodeURIComponent(rawToken)}`;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { invitation_id: invitation.id, outlet_id: outletId, role } });
    if (inviteError) { await admin.from("outlet_invitations").delete().eq("id", invitation.id); throw inviteError; }
    await admin.from("audit_logs").insert({ outlet_id: outletId, actor_user_id: auth.user.id, action: "member.invited", target_type: "outlet_invitation", target_id: invitation.id, metadata: { email, role } });
    return json({ invitationId: invitation.id, status: "pending" }, 201);
  } catch (error) {
    console.error("invite-outlet-member", error);
    return json({ error: "The invitation could not be sent. No account was added." }, 500);
  }
});
