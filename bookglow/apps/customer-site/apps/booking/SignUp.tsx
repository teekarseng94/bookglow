import React, { useState } from "react";
import { Logo } from "../../constants";
import {
  register,
  registerWithGoogle,
  registerWithFacebook,
  getAuthErrorMessage,
  DASHBOARD_URL,
} from "../../services/authService";

export default function SignUp() {
  const [continueWithEmail, setContinueWithEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading("google");
    try {
      await registerWithGoogle();
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
      await registerWithFacebook();
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
      await register({ email, password });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bookglow-auth-page bookglow-auth-page--merchant-signup">
      <header className="bookglow-auth-header">
        <a href="/" className="bookglow-auth-logo" aria-label="Bookglow home"><Logo /></a>
        <div className="bookglow-auth-header__actions">
          <a href="tel:+60169929123">+60 16-992 9123</a>
          <a href={DASHBOARD_URL} className="bookglow-auth-header__login">Merchant login</a>
        </div>
      </header>

      <main className="bookglow-auth-main bookglow-auth-main--signup">
        <section className="bookglow-auth-intro">
          <span className="bookglow-auth-eyebrow">Bookglow for merchants</span>
          <h1>Your bookings, customers and daily work in one place.</h1>
          <p>
            Open your online booking page, organise the team calendar and keep every customer visit connected to the same workspace.
          </p>

          <div className="bookglow-auth-product-preview" aria-hidden="true">
            <div className="bookglow-auth-product-preview__top">
              <span>Today’s overview</span>
              <strong>Wednesday, 15 July</strong>
            </div>
            <div className="bookglow-auth-product-preview__metrics">
              <span><b>08</b><small>Bookings</small></span>
              <span><b>05</b><small>Customers</small></span>
              <span><b>RM 680</b><small>Expected</small></span>
            </div>
            <div className="bookglow-auth-product-preview__timeline">
              <span><time>10:00</time><i /><b>Body therapy</b><small>Confirmed</small></span>
              <span><time>11:30</time><i /><b>Consultation</b><small>Arriving soon</small></span>
              <span><time>14:00</time><i /><b>Facial treatment</b><small>Confirmed</small></span>
            </div>
          </div>
        </section>

        <section className="bookglow-auth-card">
          <div className="bookglow-auth-card__heading">
            <span className="bookglow-auth-eyebrow">Start your workspace</span>
            <h2>Create your free account</h2>
            <p>Choose one sign-up method. You can complete your outlet details after entering the workspace.</p>
          </div>

          {error && <div className="bookglow-auth-error" role="alert">{error}</div>}

          <div className="bookglow-auth-socials bookglow-auth-socials--stacked">
            <button type="button" onClick={handleGoogle} disabled={!!socialLoading}>
              <span className="bookglow-auth-social-mark">G</span>
              <span>{socialLoading === "google" ? "Connecting…" : "Continue with Google"}</span>
            </button>
            <button type="button" onClick={handleFacebook} disabled={!!socialLoading}>
              <span className="bookglow-auth-social-mark bookglow-auth-social-mark--facebook">f</span>
              <span>{socialLoading === "facebook" ? "Connecting…" : "Continue with Facebook"}</span>
            </button>
          </div>

          <div className="bookglow-auth-divider"><span>or use email</span></div>

          {!continueWithEmail ? (
            <button type="button" onClick={() => setContinueWithEmail(true)} className="bookglow-auth-secondary">
              Continue with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="bookglow-auth-form">
              <div className="bookglow-auth-field">
                <label htmlFor="signup-email">Email address</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="bookglow-auth-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          <p className="bookglow-auth-signin">Already have an account? <a href={DASHBOARD_URL}>Merchant login</a></p>
          <p className="bookglow-auth-legal">
            By continuing, you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
