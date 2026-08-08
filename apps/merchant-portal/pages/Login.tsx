import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MERCHANT_RETURN_PATH_KEY, validatedMerchantReturnPath } from '@bookglow/auth-contracts';
import { login, loginWithOAuth, isMerchantOAuthEnabled, resetPassword, LoginCredentials } from '../services/authService';
import { merchantAccessDestination, merchantBrowserDestination, resolveMerchantAccess } from '../src/auth/accessResolver';

const GoogleIcon = () => (
  <svg className="bookglow-login__google-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3a10 10 0 0 0 0 9.2L6.4 14Z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 6 12 6Z" />
  </svg>
);

const Login: React.FC = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const [email, setEmail] = useState(query.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleEnabled = isMerchantOAuthEnabled('google');
  const customerSiteUrl = ((import.meta.env as unknown as Record<string, string | undefined>).VITE_CUSTOMER_SITE_URL || 'http://localhost:5174').replace(/\/$/, '');

  useEffect(() => {
    const oauthError = query.get('oauth_error');
    if (oauthError === 'cancelled') setError('Google sign-in was cancelled.');
    else if (oauthError) setError("We couldn't sign you in with Google. Please try again.");
    const returnPath = validatedMerchantReturnPath(query.get('returnTo'));
    if (returnPath) sessionStorage.setItem(MERCHANT_RETURN_PATH_KEY, returnPath);
  }, [location.search]);

  if (location.pathname.startsWith('/book/')) {
    return <div className="bookglow-login bookglow-login--loading"><div className="bookglow-login__loader" aria-hidden="true" /><p>Loading booking…</p></div>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      await login({ email, password } satisfies LoginCredentials);
      window.location.replace(merchantBrowserDestination(merchantAccessDestination(await resolveMerchantAccess())));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (googleLoading || loading) return;
    setError(''); setGoogleLoading(true);
    try { await loginWithOAuth('google'); }
    catch (cause) {
      if (import.meta.env.DEV) console.error('Merchant Google OAuth start failed', cause);
      setError(cause instanceof Error ? cause.message : "We couldn't sign you in with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="bookglow-login">
      <section className="bookglow-login__story" aria-label="Bookglow merchant workspace introduction">
        <a href="/" className="bookglow-login__brand" aria-label="Bookglow home"><span className="bookglow-login__mark" aria-hidden="true">✦</span><span>Bookglow</span></a>
        <div className="bookglow-login__story-copy"><span className="bookglow-login__eyebrow">Merchant workspace</span><h1>Run today’s bookings with less friction.</h1><p>Your schedule, checkout, customers and team stay together in one calm operational workspace.</p></div>
        <div className="bookglow-login__preview" aria-hidden="true"><div className="bookglow-login__preview-head"><span>Today</span><strong>8 appointments</strong></div><div className="bookglow-login__preview-row"><span className="bookglow-login__preview-time">10:00</span><span><strong>Hair treatment</strong><small>Confirmed · 60 min</small></span></div><div className="bookglow-login__preview-row"><span className="bookglow-login__preview-time">11:30</span><span><strong>Facial therapy</strong><small>Arriving soon · 45 min</small></span></div></div>
      </section>

      <section className="bookglow-login__form-side">
        <div className="bookglow-login__mobile-brand"><span className="bookglow-login__mark" aria-hidden="true">✦</span><span>Bookglow</span></div>
        <div className="bookglow-login__card">
          <div className="bookglow-login__heading"><span className="bookglow-login__eyebrow">Welcome back</span><h2>Sign in to your workspace</h2><p>Sign in to manage your business.</p></div>
          {query.get('onboarding') === 'complete' && <div className="bookglow-login__success" role="status">Your workspace is ready. Sign in once to open your new dashboard.</div>}
          {googleEnabled && <><button type="button" className="bookglow-login__google" onClick={() => void handleGoogle()} disabled={googleLoading || loading} aria-label="Continue with Google"><GoogleIcon /><span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span></button><div className="bookglow-login__divider"><span>or continue with email</span></div></>}
          <form onSubmit={handleSubmit} className="bookglow-login__form">
            <div className="bookglow-login__field"><label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" /></div>
            <div className="bookglow-login__field"><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>
            <button type="button" className="bookglow-login__forgot" onClick={() => void resetPassword(email).then(() => setError('Password reset instructions have been sent if that account exists.')).catch(() => setError('Password reset is unavailable. Please try again.'))}>Forgot password?</button>
            {error && <div className="bookglow-login__error" role="alert">{error}</div>}
            <button type="submit" disabled={loading || googleLoading} className="bookglow-login__submit">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="bookglow-login__support">Don't have a Bookglow business account? <a href={`${customerSiteUrl}/signup`}>Create your business</a></p>
        </div>
      </section>
    </main>
  );
};

export default Login;
