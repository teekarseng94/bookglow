import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Logo } from "../../constants";
import {
  registerWithGoogleForBooking,
  registerWithFacebookForBooking,
  registerForBooking,
  getAuthErrorMessage,
  signInForBooking,
  resetPasswordForBooking,
} from "../../services/authService";
import { isCustomerOAuthEnabled } from "../../services/supabaseAuthService";

export default function BookingAuth() {
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const [searchParams] = useSearchParams();
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginSource = searchParams.get("loginSource") || "homepage";
  const googleEnabled = isCustomerOAuthEnabled("google");
  const facebookEnabled = isCustomerOAuthEnabled("facebook");
  /** Same path the user used (slug or legacy id); strip trailing /auth for OAuth redirect. */
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.replace(/\/auth\/?$/, "")}`
      : "/";

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading("google");
    try {
      await registerWithGoogleForBooking(bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebook = async () => {
    setError(null);
    setSocialLoading("facebook");
    try {
      await registerWithFacebookForBooking(bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") await signInForBooking({ email, password }, bookingUrl);
      else {
        if (password !== confirmation) throw new Error("Passwords do not match.");
        if (!acceptedTerms) throw new Error("Please accept the terms and privacy notice.");
        await registerForBooking({ email, password, fullName, phone }, bookingUrl);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    try { await resetPasswordForBooking(email); setError("Password reset instructions have been sent if that account exists."); }
    catch (err) { setError(getAuthErrorMessage(err)); }
  };

  return (
    <div className="bookglow-auth-page">
      <header className="bookglow-auth-header">
        <a href="/" className="bookglow-auth-logo" aria-label="Bookglow home">
          <Logo />
        </a>
        <span className="bookglow-auth-header__note">Secure booking access</span>
      </header>

      <main className="bookglow-auth-main">
        <section className="bookglow-auth-intro" aria-label="Booking profile information">
          <span className="bookglow-auth-eyebrow">Continue your booking</span>
          <h1>Save your details and keep your appointment connected to you.</h1>
          <p>
            A lightweight Bookglow profile helps the merchant recognise your booking and lets you return without entering everything again.
          </p>
          <div className="bookglow-auth-trust-list" aria-label="Profile benefits">
            <span><b>01</b> Faster future bookings</span>
            <span><b>02</b> Clear appointment ownership</span>
            <span><b>03</b> Secure sign-in options</span>
          </div>
        </section>

        <section className="bookglow-auth-card">
          <div className="bookglow-auth-card__heading">
            <span className="bookglow-auth-eyebrow">Customer profile</span>
            <h2>Login to book online</h2>
            <p>Choose the quickest way to continue.</p>
          </div>

          {error && <div className="bookglow-auth-error" role="alert">{error}</div>}

          <div className="bookglow-auth-socials" aria-label="Customer authentication mode">
            <button type="button" onClick={() => { setMode("signin"); setShowEmail(true); }}>Sign in</button>
            <button type="button" onClick={() => { setMode("register"); setShowEmail(true); }}>Create account</button>
          </div>

          <div className="bookglow-auth-socials">
            {googleEnabled && <button type="button" onClick={handleGoogle} disabled={!!socialLoading} aria-label="Continue with Google">
              <span className="bookglow-auth-social-mark">G</span>
              <span>{socialLoading === "google" ? "Connecting…" : "Google"}</span>
            </button>}
            {facebookEnabled && <button type="button" onClick={handleFacebook} disabled={!!socialLoading} aria-label="Continue with Facebook">
              <span className="bookglow-auth-social-mark bookglow-auth-social-mark--facebook">f</span>
              <span>{socialLoading === "facebook" ? "Connecting…" : "Facebook"}</span>
            </button>}
          </div>

          <div className="bookglow-auth-divider"><span>or use email</span></div>

          {!showEmail ? (
            <button type="button" onClick={() => setShowEmail(true)} className="bookglow-auth-primary">
              Continue with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="bookglow-auth-form">
              {mode === "register" && <>
                <div className="bookglow-auth-field"><label htmlFor="booking-full-name">Full name</label><input id="booking-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                <div className="bookglow-auth-field"><label htmlFor="booking-phone">Phone</label><input id="booking-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
              </>}
              <div className="bookglow-auth-field">
                <label htmlFor="booking-email">Email address</label>
                <input
                  id="booking-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {mode === "register" && <>
                <div className="bookglow-auth-field"><label htmlFor="booking-confirm-password">Confirm password</label><input id="booking-confirm-password" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength={6} required /></div>
                <label><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} /> I agree to the terms and privacy notice.</label>
              </>}
              <div className="bookglow-auth-field">
                <label htmlFor="booking-password">Password</label>
                <input
                  id="booking-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="bookglow-auth-primary">
                {loading ? "Creating profile…" : "Create profile and continue"}
              </button>
              {mode === "signin" && <button type="button" onClick={handleReset} className="bookglow-auth-primary">Forgot password</button>}
            </form>
          )}

          <a href={bookingUrl} className="bookglow-auth-primary">Continue as guest</a>

          <p className="bookglow-auth-context">
            Booking for <strong>{bookingPath}</strong>
            <span aria-hidden="true"> · </span>
            <span>{loginSource}</span>
          </p>
        </section>
      </main>
    </div>
  );
}
