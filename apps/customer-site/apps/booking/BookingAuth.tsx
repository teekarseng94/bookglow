import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Logo } from "../../constants";
import {
  registerWithGoogleForBooking,
  registerWithFacebookForBooking,
  registerForBooking,
  getAuthErrorMessage,
} from "../../services/authService";

export default function BookingAuth() {
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const [searchParams] = useSearchParams();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginSource = searchParams.get("loginSource") || "homepage";
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
      await registerForBooking({ email, password }, bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
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

          <div className="bookglow-auth-socials">
            <button type="button" onClick={handleGoogle} disabled={!!socialLoading} aria-label="Continue with Google">
              <span className="bookglow-auth-social-mark">G</span>
              <span>{socialLoading === "google" ? "Connecting…" : "Google"}</span>
            </button>
            <button type="button" onClick={handleFacebook} disabled={!!socialLoading} aria-label="Continue with Facebook">
              <span className="bookglow-auth-social-mark bookglow-auth-social-mark--facebook">f</span>
              <span>{socialLoading === "facebook" ? "Connecting…" : "Facebook"}</span>
            </button>
          </div>

          <div className="bookglow-auth-divider"><span>or use email</span></div>

          {!showEmail ? (
            <button type="button" onClick={() => setShowEmail(true)} className="bookglow-auth-primary">
              Continue with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="bookglow-auth-form">
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
              <div className="bookglow-auth-field">
                <label htmlFor="booking-password">Password</label>
                <input
                  id="booking-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="bookglow-auth-primary">
                {loading ? "Creating profile…" : "Create profile and continue"}
              </button>
            </form>
          )}

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
