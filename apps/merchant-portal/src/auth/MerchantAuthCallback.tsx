import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { MERCHANT_AUTH_INTENT_KEY } from "@bookglow/auth-contracts";
import { resolveMerchantAccess, merchantAccessDestination, merchantBrowserDestination } from "./accessResolver";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;

function callbackParams(search: string): URLSearchParams {
  const fromSearch = new URLSearchParams(search);
  if ([...fromSearch.keys()].length > 0) return fromSearch;
  // HashRouter deep links may place OAuth params after the hash path.
  const hash = window.location.hash.replace(/^#/, "");
  const queryIndex = hash.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
}

export default function MerchantAuthCallback() {
  const route = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    const params = callbackParams(route.search);
    const invitation = params.get("invitation");
    const code = params.get("code");
    try {
      const oauthError = params.get("error") || params.get("error_code");
      if (oauthError) {
        const cancelled = /cancel|access_denied/i.test(`${oauthError} ${params.get("error_description") || ""}`);
        window.location.replace(`/#/login?oauth_error=${cancelled ? "cancelled" : "callback"}`);
        return;
      }
      // Native Android OAuth returns via deep link; sessionStorage intent may be gone after process death.
      // PKCE code (+ verifier in this WebView) is sufficient proof of our login start.
      const hasLoginIntent = sessionStorage.getItem(MERCHANT_AUTH_INTENT_KEY) === "login";
      if (!hasLoginIntent && !invitation && !code) {
        throw new Error("Missing merchant login intent");
      }
      const sb = createBrowserSupabaseClient(env());
      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      const { data: session, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !session.session) throw sessionError || new Error("No merchant session");
      if (invitation) {
        const { error: invitationError } = await sb.rpc("accept_outlet_invitation", { invitation_token: invitation });
        if (invitationError) throw invitationError;
      }
      const access = await resolveMerchantAccess();
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      // Existing merchants → dashboard/POS. New Google users with no outlet → /access/no-workspace
      // (existing CTA opens customer /signup provisioning). Never send to marketing /.
      window.location.replace(merchantBrowserDestination(merchantAccessDestination(access)));
    } catch (cause) {
      if (import.meta.env.DEV) console.error("Merchant callback failed", cause);
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      setError(invitation
        ? "We couldn't accept this invitation. Sign in with the invited email or ask an admin to send a new invite."
        : "We couldn't finish signing you in with Google. Please return to login and try again.");
    }
  })(); }, [route.search]);

  return <main className="bookglow-login bookglow-login--loading" role={error ? "alert" : "status"}><div className="bookglow-login__loader" aria-hidden="true" /><p>{error || "Resolving your merchant workspace…"}</p>{error && <a href="/#/login">Return to merchant login</a>}</main>;
}
