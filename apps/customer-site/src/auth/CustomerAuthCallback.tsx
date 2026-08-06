import React, { useEffect, useState } from "react";
import { CUSTOMER_RETURN_PATH_KEY, validatedCustomerReturnPath } from "@bookglow/auth-contracts";
import { customerAuthClient, getSupabaseAuthErrorMessage } from "../../services/supabaseAuthService";
import { upsertFrontendCustomerProfileFromSupabase } from "../../services/supabasePublicBooking";

export default function CustomerAuthCallback() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      try {
        const sb = customerAuthClient();
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        const { data, error: sessionError } = await sb.auth.getSession();
        if (sessionError || !data.session?.user) throw sessionError || new Error("Your sign-in session could not be restored.");
        await upsertFrontendCustomerProfileFromSupabase({
          email: data.session.user.email || null,
          name: String(data.session.user.user_metadata?.full_name || "") || null,
        });
        const { error: profileError } = await sb.rpc("ensure_customer_profile" as never);
        if (profileError) throw profileError;
        const target = validatedCustomerReturnPath(sessionStorage.getItem(CUSTOMER_RETURN_PATH_KEY));
        sessionStorage.removeItem(CUSTOMER_RETURN_PATH_KEY);
        window.location.replace(target);
      } catch (cause) { setError(getSupabaseAuthErrorMessage(cause)); }
    })();
  }, []);
  return <div className="bookglow-state-screen"><div className="bookglow-state-card" role={error ? "alert" : "status"}>{error || "Completing secure sign-in…"}</div></div>;
}
