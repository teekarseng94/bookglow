import React, { useEffect, useMemo, useRef, useState } from 'react';
import { acceptMerchantInvitation, completeMerchantOnboarding, loadMerchantDraft, merchantPortalLoginUrl, saveMerchantDraft } from '../../services/merchantOnboardingService';
import { activeSteps, BUSINESS_CATEGORIES, PREVIOUS_SOFTWARE, TEAM_SIZES } from './onboardingSteps';
import { emptyOnboardingPayload, type MerchantOnboardingPayload, type OnboardingStepId } from './onboardingTypes';
import { normalizeWebsite, serializeDraft, validateStep } from './onboardingValidation';
import OnboardingShell from './components/OnboardingShell';

interface Props { email: string; }
const locationChoices = [
  ['physical', 'Clients come to me at a physical location'],
  ['mobile', 'I visit my clients as a mobile operator'],
  ['virtual', 'I provide virtual services online'],
] as const;

export default function MerchantOnboardingWizard({ email }: Props) {
  const [payload, setPayload] = useState<MerchantOnboardingPayload>(emptyOnboardingPayload);
  const [step, setStep] = useState<OnboardingStepId>('account-type');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ outlet_id: string; booking_slug: string } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const steps = useMemo(() => activeSteps(payload.serviceLocationType), [payload.serviceLocationType]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const update = (patch: Partial<MerchantOnboardingPayload>) => setPayload((current) => ({ ...current, ...patch }));

  useEffect(() => {
    loadMerchantDraft().then((draft) => {
      if (draft?.payload) setPayload({ ...emptyOnboardingPayload(), ...draft.payload });
      if (draft?.currentStep) setStep(draft.currentStep);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load your setup progress.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { titleRef.current?.focus(); }, [step]);

  const persistAndMove = async () => {
    setError('');
    const validation = validateStep(step, payload);
    if (validation) { setError(validation); return; }
    setSaving(true);
    try {
      const normalized = step === 'business-identity' ? { ...payload, businessName: payload.businessName.trim(), website: normalizeWebsite(payload.website) } : serializeDraft(payload);
      setPayload(normalized);
      if (step === 'account-type' && normalized.accountType === 'join') {
        await acceptMerchantInvitation(normalized.invitationCode || '');
        window.location.assign(merchantPortalLoginUrl(email));
        return;
      }
      const currentSteps = activeSteps(normalized.serviceLocationType);
      const next = currentSteps[currentSteps.indexOf(step) + 1] || 'complete';
      if (next === 'complete') {
        const completed = await completeMerchantOnboarding(normalized);
        setResult(completed);
        setStep('complete');
      } else {
        await saveMerchantDraft(next, normalized);
        setStep(next);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not save this step. Try again.'); }
    finally { setSaving(false); }
  };

  const saveAndExit = async () => {
    setSaving(true); setError('');
    try { await saveMerchantDraft(step, payload); window.location.assign('/'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your progress.'); setSaving(false); }
  };

  const toggleCategory = (category: string) => {
    const selected = payload.businessCategories;
    if (selected.includes(category)) {
      const next = selected.filter((item) => item !== category);
      update({ businessCategories: next, primaryBusinessCategory: next[0] || '' });
    } else if (selected.length < 4) {
      const next = [...selected, category];
      update({ businessCategories: next, primaryBusinessCategory: payload.primaryBusinessCategory || category });
    } else setError('You can select up to four categories.');
  };

  if (loading) return <div className="merchant-onboarding__loading" role="status">Loading your setup…</div>;
  const footer = step !== 'complete' ? <button type="button" className="merchant-onboarding__continue" onClick={persistAndMove} disabled={saving}>{saving ? 'Saving…' : <>Continue <span aria-hidden>→</span></>}</button> : undefined;

  return (
    <OnboardingShell
      progress={Math.round(((stepIndex + 1) / steps.length) * 100)} canGoBack={stepIndex > 0 && step !== 'complete'}
      onBack={() => setStep(steps[Math.max(0, stepIndex - 1)])} onSaveExit={saveAndExit} saving={saving} footer={footer}
    >
      <section className="merchant-onboarding__content">
        {step !== 'complete' && <p className="merchant-onboarding__eyebrow">Account setup</p>}
        {step === 'account-type' && <>
          <h1 tabIndex={-1} ref={titleRef}>How would you like to set up your professional account?</h1>
          <div className="merchant-onboarding__choices" role="radiogroup" aria-label="Professional account type">
            {([['create','Create a new business account','Build a new BookGlow workspace'],['join','Join an existing BookGlow business','Use a secure invitation from the business']] as const).map(([id,title,description]) =>
              <button type="button" key={id} role="radio" aria-checked={payload.accountType === id} className={payload.accountType === id ? 'is-selected' : ''} onClick={() => update({ accountType: id })}><strong>{title}</strong><span>{description}</span><b aria-hidden>→</b></button>)}
          </div>
          {payload.accountType === 'join' && <label className="merchant-onboarding__field">Invitation code<input value={payload.invitationCode || ''} onChange={(event) => update({ invitationCode: event.target.value })} autoComplete="one-time-code" /></label>}
        </>}
        {step === 'business-identity' && <>
          <h1 tabIndex={-1} ref={titleRef}>What’s your business name?</h1><p className="merchant-onboarding__description">This is the brand name your clients will see. Your billing and legal name can be added later.</p>
          <label className="merchant-onboarding__field">Business name<input value={payload.businessName} maxLength={80} onChange={(event) => update({ businessName: event.target.value })} autoFocus /></label>
          <label className="merchant-onboarding__field">Website <span>(Optional)</span><input type="url" placeholder="www.yoursite.com" value={payload.website} onChange={(event) => update({ website: event.target.value })} /></label>
        </>}
        {step === 'categories' && <>
          <h1 tabIndex={-1} ref={titleRef}>Select categories that best describe your business</h1><p className="merchant-onboarding__description">Choose one primary category and up to three related categories.</p>
          <div className="merchant-onboarding__category-grid">{BUSINESS_CATEGORIES.map((category) => { const index = payload.businessCategories.indexOf(category); return <button type="button" key={category} role="checkbox" aria-checked={index >= 0} className={index >= 0 ? 'is-selected' : ''} onClick={() => toggleCategory(category)}><span aria-hidden>✦</span><strong>{category}</strong>{index >= 0 && <b>{index + 1}</b>}</button>; })}</div>
          {payload.businessCategories.length > 1 && <label className="merchant-onboarding__field">Primary category<select value={payload.primaryBusinessCategory} onChange={(event) => update({ primaryBusinessCategory: event.target.value })}>{payload.businessCategories.map((category) => <option key={category}>{category}</option>)}</select></label>}
        </>}
        {step === 'service-location' && <>
          <h1 tabIndex={-1} ref={titleRef}>Where do you provide your services?</h1>
          <div className="merchant-onboarding__choices" role="radiogroup">{locationChoices.map(([id,label]) => <button type="button" role="radio" aria-checked={payload.serviceLocationType === id} key={id} className={payload.serviceLocationType === id ? 'is-selected' : ''} onClick={() => update({ serviceLocationType: id })}><strong>{label}</strong>{payload.serviceLocationType === id && <b aria-hidden>✓</b>}</button>)}</div>
        </>}
        {step === 'physical-location' && <>
          <h1 tabIndex={-1} ref={titleRef}>Set your venue’s physical location</h1><p className="merchant-onboarding__description">Add your primary business location so clients can easily find you. Additional locations can be added later.</p>
          <label className="merchant-onboarding__field">Where is your business located?<textarea rows={3} value={payload.location.addressDisplay} onChange={(event) => update({ location: { ...payload.location, addressDisplay: event.target.value } })} placeholder="Full business address" /></label>
          {payload.location.addressDisplay ? <iframe className="merchant-onboarding__map" title="Selected business location" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(payload.location.addressDisplay)}&output=embed`} /> : <div className="merchant-onboarding__map-fallback">Enter an address to preview its location on the map.</div>}
          <div className="merchant-onboarding__two-fields"><label className="merchant-onboarding__field">Country<input value={payload.location.country} onChange={(event) => update({ location: { ...payload.location, country: event.target.value } })} /></label><label className="merchant-onboarding__field">Timezone<input value={payload.location.timezone} onChange={(event) => update({ location: { ...payload.location, timezone: event.target.value } })} /></label></div>
        </>}
        {step === 'team-size' && <>
          <h1 tabIndex={-1} ref={titleRef}>What’s your team size?</h1><p className="merchant-onboarding__description">This will help us set up your calendar correctly.</p>
          <div className="merchant-onboarding__choices" role="radiogroup">{TEAM_SIZES.map(([id,label]) => <button type="button" role="radio" aria-checked={payload.teamSize === id} key={id} className={payload.teamSize === id ? 'is-selected' : ''} onClick={() => update({ teamSize: id })}><strong>{label}</strong></button>)}</div>
        </>}
        {step === 'software' && <>
          <h1 tabIndex={-1} ref={titleRef}>Which software are you currently using?</h1><p className="merchant-onboarding__description">This is optional and helps us understand your setup.</p>
          <div className="merchant-onboarding__software" role="radiogroup">{PREVIOUS_SOFTWARE.map((software) => <label key={software}><input type="radio" name="software" checked={payload.previousSoftware === software} onChange={() => update({ previousSoftware: software })} /><span>{software}</span></label>)}</div>
          {payload.previousSoftware === 'Other' && <label className="merchant-onboarding__field">Software name<input value={payload.previousSoftwareOther} onChange={(event) => update({ previousSoftwareOther: event.target.value })} /></label>}
        </>}
        {step === 'complete' && <div className="merchant-onboarding__complete">
          <div className="merchant-onboarding__complete-mark" aria-hidden>✦</div><h1 tabIndex={-1} ref={titleRef}>Your BookGlow workspace is ready</h1><p>Your business workspace has been created securely.</p>
          <dl><div><dt>Business</dt><dd>{payload.businessName}</dd></div><div><dt>Outlet_ID</dt><dd>{result?.outlet_id || 'Created'}</dd></div><div><dt>Booking path</dt><dd>/book/{result?.booking_slug || 'your-business'}</dd></div><div><dt>Owner email</dt><dd>{email}</dd></div></dl>
          <button type="button" className="merchant-onboarding__continue" onClick={() => window.location.assign(merchantPortalLoginUrl(email))}>Go to dashboard <span aria-hidden>→</span></button>
        </div>}
        {error && <div className="merchant-onboarding__error" role="alert">{error}</div>}
      </section>
    </OnboardingShell>
  );
}
