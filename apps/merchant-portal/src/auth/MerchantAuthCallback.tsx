import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { MERCHANT_AUTH_INTENT_KEY } from "@bookglow/auth-contracts";
import { resolveMerchantAccess, merchantAccessDestination, merchantBrowserDestination } from "./accessResolver";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;

export default function MerchantAuthCallback() {
  const route = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    const params = new URLSearchParams(route.search);
    try {
      const oauthError = params.get("error") || params.get("error_code");
      if (oauthError) {
        const cancelled = /cancel|access_denied/i.test(`${oauthError} ${params.get("error_description") || ""}`);
        window.location.replace(`/#/login?oauth_error=${cancelled ? "cancelled" : "callback"}`);
        return;
      }
      if (sessionStorage.getItem(MERCHANT_AUTH_INTENT_KEY) !== "login") {
        throw new Error("Missing merchant login intent");
      }
      const sb = createBrowserSupabaseClient(env());
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      const { data: session, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !session.session) throw sessionError || new Error("No merchant session");

      const invitation = params.get("invitation");
      if (invitation) {
        const { error: invitationError } = await sb.rpc("accept_outlet_invitation", { invitation_token: invitation });
        if (invitationError) throw invitationError;
      }
      const access = await resolveMerchantAccess();
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      window.location.replace(merchantBrowserDestination(merchantAccessDestination(access)));
    } catch (cause) {
      if (import.meta.env.DEV) console.error("Merchant callback failed", cause);
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      setError("We couldn't finish signing you in with Google. Please return to login and try again.");
    }
  })(); }, [route.search]);

  return <main className="bookglow-login bookglow-login--loading" role={error ? "alert" : "status"}><div className="bookglow-login__loader" aria-hidden="true" /><p>{error || "Resolving your merchant workspace…"}</p>{error && <a href="/login">Return to merchant login</a>}</main>;
}
