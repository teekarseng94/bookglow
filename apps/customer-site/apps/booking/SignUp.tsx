import React, { useEffect, useRef, useState } from 'react';
import './SignUp.css';
import { Logo } from '../../constants';
import MerchantOnboardingWizard from '../merchant-onboarding/MerchantOnboardingWizard';
import {
  getMerchantSession, isMerchantProviderEnabled, merchantAuthError, merchantOAuthReturnError,
  registerMerchantWithEmail, registerMerchantWithProvider, signInMerchantForOnboarding,
} from '../../services/merchantAuthService';
import { customerPublicEnv } from '../../src/customerPublicEnv';

const merchantPortalUrl = customerPublicEnv.VITE_MERCHANT_PORTAL_URL;

const GoogleIcon = () => (
  <svg className="bookglow-auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3a10 10 0 0 0 0 9.2L6.4 14Z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 6 12 6Z" />
  </svg>
);

export default function SignUp() {
  const query = new URLSearchParams(window.location.search);
  const [resumeMode, setResumeMode] = useState(query.get('resume') === '1');
  const [sessionEmail, setSessionEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(query.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const connecting = useRef(false);
  const [error, setError] = useState(merchantOAuthReturnError);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const googleEnabled = isMerchantProviderEnabled('google');
  const facebookEnabled = isMerchantProviderEnabled('facebook');

  useEffect(() => {
    getMerchantSession().then((session) => setSessionEmail(session?.user.email || ''))
      .catch((cause) => setError(merchantAuthError(cause))).finally(() => setChecking(false));
    const restore = () => { connecting.current = false; setLoading(false); setGoogleLoading(false); };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  const connectProvider = async (provider: 'google' | 'facebook') => {
    if (connecting.current || loading || googleLoading) return;
    connecting.current = true;
    setGoogleLoading(true); setError('');
    try { await registerMerchantWithProvider(provider); }
    catch (cause) {
      setError(merchantAuthError(cause));
      connecting.current = false;
      setGoogleLoading(false);
    }
  };

  if (checking) return <div className="bookglow-state-screen"><div className="bookglow-state-card" role="status">Loading secure sign-up…</div></div>;
  if (sessionEmail) return <MerchantOnboardingWizard email={sessionEmail} />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || connecting.current || googleLoading) return;
    setError('');
    if (!resumeMode && password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!resumeMode && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (resumeMode) {
        const result = await signInMerchantForOnboarding(email, password);
        setSessionEmail(result.user?.email || email.trim().toLowerCase());
        return;
      }
      const result = await registerMerchantWithEmail(email, password);
      if (result.confirmationRequired) setConfirmationRequired(true);
      else setSessionEmail(result.user?.email || email.trim().toLowerCase());
    } catch (cause) { setError(merchantAuthError(cause)); }
    finally { setLoading(false); }
  };

  return (
    <div className="bookglow-auth-page bookglow-auth-page--merchant-signup">
      <header className="bookglow-auth-header"><a href="/" className="bookglow-auth-logo" aria-label="BookGlow home"><Logo /></a><div className="bookglow-auth-header__actions"><a href={`${merchantPortalUrl}/login`} className="bookglow-auth-header__login">Merchant login</a></div></header>
      <main className="bookglow-auth-main bookglow-auth-main--signup">
        <section className="bookglow-auth-intro"><span className="bookglow-auth-eyebrow">BookGlow for merchants</span><h1>Build the workspace your business deserves.</h1><p>Set up online booking, your team calendar and customer operations in one guided flow.</p><div className="bookglow-auth-product-preview" aria-hidden="true"><div className="bookglow-auth-product-preview__top"><span>Your new workspace</span><strong>Ready in a few steps</strong></div><div className="bookglow-auth-product-preview__metrics"><span><b>One</b><small>Secure account</small></span><span><b>One</b><small>Business profile</small></span><span><b>24/7</b><small>Booking page</small></span></div></div></section>
        <section className="bookglow-auth-card">
          <div className="bookglow-auth-card__heading"><span className="bookglow-auth-eyebrow">{resumeMode ? 'Resume your workspace' : 'Start your workspace'}</span><h2>{resumeMode ? 'Continue business setup' : 'Create your merchant account'}</h2><p>{resumeMode ? 'Sign in with your existing merchant account. Your saved onboarding progress will be restored.' : 'Choose a secure sign-up method, then tell us about your business.'}</p></div>
          {error && <div className="bookglow-auth-error" role="alert">{error}</div>}
          {confirmationRequired ? <div className="bookglow-auth-confirmation" role="status"><h3>Check your email</h3><p>We sent a confirmation link to <strong>{email.trim().toLowerCase()}</strong>. Confirm it, then return here to continue setup.</p><button type="button" className="bookglow-auth-secondary" onClick={() => window.location.reload()}>I’ve confirmed my email</button></div> : <>
            {googleEnabled && (
              <>
                <button
                  type="button"
                  className="bookglow-auth-google"
                  disabled={loading || googleLoading}
                  aria-busy={googleLoading}
                  aria-label="Continue with Google"
                  onClick={() => void connectProvider('google')}
                >
                  <GoogleIcon />
                  <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
                </button>
                <div className="bookglow-auth-divider"><span>or continue with email</span></div>
              </>
            )}
            {facebookEnabled && (
              <div className="bookglow-auth-socials bookglow-auth-socials--stacked">
                <button type="button" disabled={loading || googleLoading} onClick={() => void connectProvider('facebook')}>
                  <span className="bookglow-auth-social-mark bookglow-auth-social-mark--facebook">f</span>
                  Continue with Facebook
                </button>
              </div>
            )}
            <form onSubmit={submit} className="bookglow-auth-form">
              <div className="bookglow-auth-field"><label htmlFor="signup-email">Email address</label><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
              <div className="bookglow-auth-field"><label htmlFor="signup-password">Password</label><input id="signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={resumeMode ? 'current-password' : 'new-password'} minLength={resumeMode ? undefined : 8} required /></div>
              {!resumeMode && <div className="bookglow-auth-field"><label htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></div>}
              <button type="submit" disabled={loading || googleLoading} className="bookglow-auth-primary">{loading ? (resumeMode ? 'Signing in…' : 'Creating account…') : (resumeMode ? 'Resume setup' : 'Create account')}</button>
            </form>
          </>}
          {resumeMode && <button type="button" className="bookglow-auth-secondary" onClick={() => { setResumeMode(false); setPassword(''); setConfirmPassword(''); setError(''); }}>Create a different account</button>}
          <p className="bookglow-auth-signin">Already have an account? <a href={`${merchantPortalUrl}/login`}>Merchant login</a></p>
        </section>
      </main>
    </div>
  );
}
