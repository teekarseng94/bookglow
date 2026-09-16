import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { MERCHANT_AUTH_INTENT_KEY } from "@bookglow/auth-contracts";
import { resolveMerchantAccess, merchantAccessDestination } from "./accessResolver";
import { clearNativeOAuthCallback, oauthCodeFromValue, readNativeOAuthCallback } from "./nativeAuthStorage";

const env = () => import.meta.env as unknown as Record<string, string | undefined>;

function callbackParams(search: string): URLSearchParams {
  const merged = new URLSearchParams(search);
  const hash = window.location.hash.replace(/^#/, "");
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : hash.includes("=") ? hash : "";
  new URLSearchParams(hashQuery).forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged;
}

async function oauthCallbackCode(search: string): Promise<string | null> {
  const params = callbackParams(search);
  const fromRoute = params.get("code") || oauthCodeFromValue(window.location.href);
  if (fromRoute) return fromRoute;
  const started = Date.now();
  do {
    const stored = oauthCodeFromValue(await readNativeOAuthCallback());
    if (stored) return stored;
    await new Promise((resolve) => setTimeout(resolve, 40));
  } while (Date.now() - started < 400);
  return null;
}

export default function MerchantAuthCallback() {
  const route = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    const params = callbackParams(route.search);
    const invitation = params.get("invitation");
    try {
      const oauthError = params.get("error") || params.get("error_code");
      if (oauthError) {
        console.error("[BookGlow Auth] OAuth provider returned an error.", { code: oauthError });
        const cancelled = /cancel|access_denied/i.test(`${oauthError} ${params.get("error_description") || ""}`);
        navigate(`/login?oauth_error=${cancelled ? "cancelled" : "callback"}`, { replace: true });
        return;
      }
      const code = await oauthCallbackCode(route.search);
      // Native Android OAuth returns via deep link; sessionStorage intent may be gone after process death.
      // PKCE code (+ verifier in native storage) is sufficient proof of our login start.
      const hasLoginIntent = sessionStorage.getItem(MERCHANT_AUTH_INTENT_KEY) === "login";
      if (!hasLoginIntent && !invitation && !code) {
        throw new Error("Missing merchant login intent");
      }
      const sb = createBrowserSupabaseClient(env());
      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.warn("[BookGlow Auth] PKCE exchange returned an error; checking for an existing session.", exchangeError.message);
        }
      }
      const { data: session, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !session.session) throw sessionError || new Error("No merchant session");
      if (invitation) {
        const { error: invitationError } = await sb.rpc("accept_outlet_invitation", { invitation_token: invitation });
        if (invitationError) throw invitationError;
      }
      let destination = "/onboarding";
      try {
        destination = merchantAccessDestination(await resolveMerchantAccess());
      } catch (accessError) {
        console.error("[BookGlow Auth] Workspace lookup failed after Google sign-in.", accessError);
      }
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      await clearNativeOAuthCallback();
      navigate(destination, { replace: true });
    } catch (cause) {
      console.error("[BookGlow Auth] Merchant OAuth callback failed.", cause);
      sessionStorage.removeItem(MERCHANT_AUTH_INTENT_KEY);
      setError(invitation
        ? "We couldn't accept this invitation. Sign in with the invited email or ask an admin to send a new invite."
        : "We couldn't finish signing you in with Google. Please return to login and try again.");
    }
  })(); }, [navigate, route.hash, route.search]);

  return <main className="bookglow-login bookglow-login--loading" role={error ? "alert" : "status"}>{!error && <div className="bookglow-login__loader" aria-hidden="true" />}<p>{error || "Resolving your merchant workspace…"}</p>{error && <a href="/login">Return to merchant login</a>}</main>;
}
