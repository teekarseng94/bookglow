import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const alreadyRegistered = (message: string) =>
  /already been registered|already registered|email_exists|user already exists/i.test(message);

function invitationRedirect(base: string | undefined, origin: string | null, token: string) {
  const fallback = `${origin || "http://localhost:5173"}/auth/callback/merchant`;
  const url = new URL(base || fallback);
  url.searchParams.set("invitation", token);
  return url.toString();
}

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

    const body = await request.json().catch(() => ({})) as {
      action?: string;
      outletId?: string;
      email?: string;
      role?: string;
      redirectTo?: string;
    };
    const outletId = String(body.outletId || "").trim();
    if (!outletId) return json({ error: "Choose a workspace first." }, 400);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: caller } = await admin
      .from("outlet_members")
      .select("role,status")
      .eq("outlet_id", outletId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    const { data: callerProfile } = await admin
      .from("users")
      .select("role,outlet_id")
      .eq("uid", auth.user.id)
      .maybeSingle();
    const membershipAllows =
      caller?.status === "active" && ["owner", "admin"].includes(String(caller.role));
    const profileAllows =
      callerProfile?.outlet_id === outletId &&
      ["admin", "platform_admin"].includes(String(callerProfile.role || "").toLowerCase());
    if (!membershipAllows && !profileAllows) {
      return json({ error: "Only an outlet admin can manage team invitations." }, 403);
    }

    if (body.action === "list") {
      const { data: members, error: memberError } = await admin
        .from("outlet_members")
        .select("id,user_id,role,status,joined_at")
        .eq("outlet_id", outletId)
        .order("created_at");
      if (memberError) throw memberError;
      const ids = (members || []).map((row) => row.user_id);
      const { data: profiles } = ids.length
        ? await admin.from("profiles").select("id,full_name,email").in("id", ids)
        : { data: [] };
      const { data: mapped } = ids.length
        ? await admin.from("users").select("uid,email,display_name").in("uid", ids.map(String))
        : { data: [] };
      const profileById = new Map((profiles || []).map((row) => [row.id, row]));
      const userById = new Map((mapped || []).map((row) => [row.uid, row]));
      return json({
        accounts: (members || []).map((row) => {
          const profile = profileById.get(row.user_id);
          const user = userById.get(String(row.user_id));
          return {
            id: row.id,
            userId: row.user_id,
            name: profile?.full_name || user?.display_name || profile?.email || user?.email || "Account",
            email: profile?.email || user?.email || "",
            role: row.role,
            status: row.status,
            joinedAt: row.joined_at,
          };
        }),
      });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !["admin", "manager", "cashier"].includes(role)) {
      return json({ error: "Valid email and role are required." }, 400);
    }

    const { data: outlet } = await admin
      .from("outlets")
      .select("account_limit,access_status")
      .eq("outlet_id", outletId)
      .maybeSingle();
    if (!outlet || outlet.access_status !== "active") return json({ error: "Outlet access is disabled." }, 409);

    const { count } = await admin
      .from("outlet_members")
      .select("id", { head: true, count: "exact" })
      .eq("outlet_id", outletId)
      .eq("status", "active");
    if ((count || 0) >= Number(outlet.account_limit || 3)) {
      return json({ error: "This outlet has reached its active account limit.", code: "account_limit_reached" }, 409);
    }

    const { data: mappedUser } = await admin.from("users").select("uid,outlet_id,email").ilike("email", email).maybeSingle();
    if (mappedUser?.outlet_id === outletId) {
      return json({ error: "This person already belongs to the outlet.", code: "duplicate_membership" }, 409);
    }
    if (mappedUser?.outlet_id) {
      return json({ error: "This email already belongs to another workspace.", code: "other_workspace" }, 409);
    }

    const { data: pending } = await admin
      .from("outlet_invitations")
      .select("id")
      .eq("outlet_id", outletId)
      .ilike("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) return json({ error: "A pending invitation already exists for this email.", code: "duplicate_invitation" }, 409);

    const rawToken = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
    const { data: invitation, error: insertError } = await admin
      .from("outlet_invitations")
      .insert({
        outlet_id: outletId,
        email,
        role,
        token_hash: tokenHash,
        status: "pending",
        invited_by: auth.user.id,
        created_by: auth.user.id,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const redirectTo = invitationRedirect(body.redirectTo, request.headers.get("origin"), rawToken);
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { invitation_id: invitation.id, outlet_id: outletId, role },
    });

    if (inviteError) {
      const message = inviteError.message || "The invitation email could not be sent.";
      if (alreadyRegistered(message)) {
        await admin.from("outlet_invitations").delete().eq("id", invitation.id);
        return json({ error: "This email already belongs to another workspace.", code: "other_workspace" }, 409);
      }
      await admin.from("outlet_invitations").delete().eq("id", invitation.id);
      return json({ error: message }, 500);
    }

    await admin.from("audit_logs").insert({
      outlet_id: outletId,
      actor_user_id: auth.user.id,
      action: "member.invited",
      target_type: "outlet_invitation",
      target_id: invitation.id,
      metadata: { email, role },
    });
    return json({ invitationId: invitation.id, status: "pending" }, 201);
  } catch (error) {
    console.error("invite-outlet-member", error);
    const message = error instanceof Error ? error.message : "The invitation could not be sent. No account was added.";
    return json({ error: message }, 500);
  }
});
