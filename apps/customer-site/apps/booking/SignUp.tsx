import React, { useEffect, useState } from 'react';
import { Logo } from '../../constants';
import MerchantOnboardingWizard from '../merchant-onboarding/MerchantOnboardingWizard';
import {
  getMerchantSession, isMerchantProviderEnabled, merchantAuthError,
  registerMerchantWithEmail, registerMerchantWithProvider,
} from '../../services/merchantAuthService';

const merchantPortalUrl = (import.meta.env as unknown as Record<string, string | undefined>).VITE_MERCHANT_PORTAL_URL || 'http://localhost:5173';

export default function SignUp() {
  const [sessionEmail, setSessionEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  useEffect(() => { getMerchantSession().then((session) => setSessionEmail(session?.user.email || '')).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="bookglow-state-screen"><div className="bookglow-state-card" role="status">Loading secure sign-up…</div></div>;
  if (sessionEmail) return <MerchantOnboardingWizard email={sessionEmail} />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
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
          <div className="bookglow-auth-card__heading"><span className="bookglow-auth-eyebrow">Start your workspace</span><h2>Create your merchant account</h2><p>Choose a secure sign-up method, then tell us about your business.</p></div>
          {error && <div className="bookglow-auth-error" role="alert">{error}</div>}
          {confirmationRequired ? <div className="bookglow-auth-confirmation" role="status"><h3>Check your email</h3><p>We sent a confirmation link to <strong>{email.trim().toLowerCase()}</strong>. Confirm it, then return here to continue setup.</p><button type="button" className="bookglow-auth-secondary" onClick={() => window.location.reload()}>I’ve confirmed my email</button></div> : <>
            <div className="bookglow-auth-socials bookglow-auth-socials--stacked">
              {isMerchantProviderEnabled('google') && <button type="button" onClick={() => registerMerchantWithProvider('google').catch((cause) => setError(merchantAuthError(cause)))}><span className="bookglow-auth-social-mark">G</span>Continue with Google</button>}
              {isMerchantProviderEnabled('facebook') && <button type="button" onClick={() => registerMerchantWithProvider('facebook').catch((cause) => setError(merchantAuthError(cause)))}><span className="bookglow-auth-social-mark bookglow-auth-social-mark--facebook">f</span>Continue with Facebook</button>}
            </div>
            {(isMerchantProviderEnabled('google') || isMerchantProviderEnabled('facebook')) && <div className="bookglow-auth-divider"><span>or use email</span></div>}
            {!emailMode ? <button type="button" onClick={() => setEmailMode(true)} className="bookglow-auth-secondary">Continue with email</button> : <form onSubmit={submit} className="bookglow-auth-form">
              <div className="bookglow-auth-field"><label htmlFor="signup-email">Email address</label><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
              <div className="bookglow-auth-field"><label htmlFor="signup-password">Password</label><input id="signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></div>
              <div className="bookglow-auth-field"><label htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></div>
              <button type="submit" disabled={loading} className="bookglow-auth-primary">{loading ? 'Creating account…' : 'Create account'}</button>
            </form>}
          </>}
          <p className="bookglow-auth-signin">Already have an account? <a href={`${merchantPortalUrl}/login`}>Merchant login</a></p>
        </section>
      </main>
    </div>
  );
}
