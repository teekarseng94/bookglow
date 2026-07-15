/**
 * Merchant sign-in page.
 * Authentication behavior is intentionally unchanged; this file only owns presentation.
 */
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { login, LoginCredentials } from '../services/authService';

const Login: React.FC = () => {
  const location = useLocation();
  const isBookingPath = location.pathname.startsWith('/book/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Do not show merchant login when the URL belongs to the public booking route.
  if (isBookingPath) {
    return (
      <div className="bookglow-login bookglow-login--loading">
        <div className="bookglow-login__loader" aria-hidden="true" />
        <p>Loading booking…</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credentials: LoginCredentials = { email, password };
      await login(credentials);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bookglow-login">
      <section className="bookglow-login__story" aria-label="Bookglow merchant workspace introduction">
        <a href="/" className="bookglow-login__brand" aria-label="Bookglow home">
          <span className="bookglow-login__mark" aria-hidden="true">✦</span>
          <span>Bookglow</span>
        </a>

        <div className="bookglow-login__story-copy">
          <span className="bookglow-login__eyebrow">Merchant workspace</span>
          <h1>Run today’s bookings with less friction.</h1>
          <p>
            Your schedule, checkout, customers and team stay together in one calm operational workspace.
          </p>
        </div>

        <div className="bookglow-login__preview" aria-hidden="true">
          <div className="bookglow-login__preview-head">
            <span>Today</span>
            <strong>8 appointments</strong>
          </div>
          <div className="bookglow-login__preview-row">
            <span className="bookglow-login__preview-time">10:00</span>
            <span><strong>Hair treatment</strong><small>Confirmed · 60 min</small></span>
          </div>
          <div className="bookglow-login__preview-row">
            <span className="bookglow-login__preview-time">11:30</span>
            <span><strong>Facial therapy</strong><small>Arriving soon · 45 min</small></span>
          </div>
        </div>
      </section>

      <section className="bookglow-login__form-side">
        <div className="bookglow-login__mobile-brand">
          <span className="bookglow-login__mark" aria-hidden="true">✦</span>
          <span>Bookglow</span>
        </div>

        <div className="bookglow-login__card">
          <div className="bookglow-login__heading">
            <span className="bookglow-login__eyebrow">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Use the merchant account connected to your outlet.</p>
          </div>

          <form onSubmit={handleSubmit} className="bookglow-login__form">
            <div className="bookglow-login__field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="bookglow-login__field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bookglow-login__error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="bookglow-login__submit">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="bookglow-login__support">Having trouble signing in? Contact your Bookglow administrator.</p>
        </div>
      </section>
    </main>
  );
};

export default Login;
