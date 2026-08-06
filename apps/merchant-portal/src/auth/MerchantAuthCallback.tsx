import React, { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { resolveMerchantAccess, merchantAccessDestination } from "./accessResolver";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;
export default function MerchantAuthCallback() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => {
    try {
      const sb = createBrowserSupabaseClient(env());
      const code = new URLSearchParams(location.search).get("code");
      if (code) { const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code); if (exchangeError) throw exchangeError; }
      const invitation = new URLSearchParams(location.search).get("invitation");
      if (invitation) { const { error: invitationError } = await sb.rpc("accept_outlet_invitation", { invitation_token: invitation }); if (invitationError) throw invitationError; }
      const access = await resolveMerchantAccess();
      window.location.replace(merchantAccessDestination(access));
    } catch (cause) { console.error("Merchant callback failed", cause); setError("We could not finish merchant sign-in. Please return to login and try again."); }
  })(); }, []);
  return <div className="bookglow-login bookglow-login--loading" role={error ? "alert" : "status"}>{error || "Resolving your merchant workspace…"}</div>;
}
