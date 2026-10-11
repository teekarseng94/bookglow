import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OutletSettings, Outlet } from '../types';
import { Icons } from '../constants';
import { useUserContext } from '../contexts/UserContext';
import { outletService } from '../services/databaseService';
import {
  bookingSlugForEditor,
  bookingSlugFromShopName,
  bookingSlugToPersist,
  isValidBookingSlug,
  resolveBookingSlug,
  uniqueBookingSlug,
} from '../utils/bookingSlug';
import { resolveReceiptIdentity } from '../utils/receiptIdentity';
import { ensureOutletBookingSlug } from '../utils/ensureOutletBookingSlug';
import {
  OperatingHoursRow,
  SETTINGS_NAV_ITEMS,
  SettingsNavigation,
  SettingsPageHeader,
  SettingsSaveBar,
  SettingsSection,
  type SettingsSectionId,
} from '../components/settings';
import { TeamAccess } from '../components/settings/TeamAccess';
import { DeleteAccountSection } from '../components/settings/DeleteAccountSection';

import { customerSiteOrigin } from '../utils/customerSiteUrl';
import { publicAccountDeletionUrl, publicPrivacyPolicyUrl } from '../src/legal/publicLegalUrls';

const CUSTOMER_SITE_URL = customerSiteOrigin();
const BOOKING_BASE_URL = CUSTOMER_SITE_URL ? `${CUSTOMER_SITE_URL}/book` : '';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface SettingsProps {
  settings: OutletSettings;
  onUpdateSettings: (settings: OutletSettings) => void;
  outletId?: string;
  outlet?: Outlet | null;
  onUpdateOutlet?: (updates: Partial<Outlet>) => void;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[var(--text-secondary)]">Loading settings...</p>
    </div>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, outletId: propOutletId, outlet: propOutlet, onUpdateOutlet }) => {
  // Get outletId from context (fallback if prop is missing)
  const { outletId, outletName, loading: contextLoading } = useUserContext();
  const effectiveOutletId = propOutletId || outletId || '';
  

  // Prevent rendering until outletId is available
  if (!effectiveOutletId) {
    return <LoadingSpinner />;
  }

  // Local state for outlet form data
  const [addressDisplay, setAddressDisplay] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string; isOpen?: boolean }>>({});
  const [outletLoading, setOutletLoading] = useState(true);

  const [newMethodName, setNewMethodName] = useState('');
  const [editingMethod, setEditingMethod] = useState<{ index: number; name: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [bookingSlug, setBookingSlug] = useState('');
  /** Path currently stored on the outlet, so a rename knows whether it still has to persist one. */
  const [savedBookingSlug, setSavedBookingSlug] = useState('');
  const [bookingSlugError, setBookingSlugError] = useState<string | null>(null);
  const [bookingInfoStatus, setBookingInfoStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('business-profile');
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [phoneLayout, setPhoneLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  );
  const [shopNameDraft, setShopNameDraft] = useState(settings.shopName || '');
  const [categoryDraft, setCategoryDraft] = useState(settings.primaryBusinessCategory || '');
  const [teamSizeDraft, setTeamSizeDraft] = useState(settings.teamSize || '');
  const [categoriesDraft, setCategoriesDraft] = useState((settings.businessCategories || []).join(', '));
  const [locationDraft, setLocationDraft] = useState(settings.serviceLocationType || '');
  const [softwareDraft, setSoftwareDraft] = useState(
    settings.previousSoftware === 'Other' ? settings.previousSoftwareOther || 'Other' : settings.previousSoftware || '',
  );

  // Load outlet data using outletId
  useEffect(() => {
    if (!effectiveOutletId) {
      setOutletLoading(false);
      return;
    }

    const applyOutletFields = async (outletData: {
      addressDisplay?: string;
      website?: string;
      phoneNumber?: string;
      businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>;
      bookingSlug?: string;
      name?: string;
    } | null) => {
      setAddressDisplay(outletData?.addressDisplay || '');
      setWebsite(outletData?.website || '');
      setPhoneNumber(outletData?.phoneNumber || '');
      setBusinessHours(outletData?.businessHours || {});
      const name = outletData?.name || settings.shopName || '';
      const savedSlug = bookingSlugForEditor(outletData?.bookingSlug);
      const slug = await ensureOutletBookingSlug({
        outletId: effectiveOutletId,
        existing: savedSlug,
        name,
      });
      const editorSlug = bookingSlugForEditor(slug || uniqueBookingSlug(name, effectiveOutletId));
      setBookingSlug(editorSlug);
      setSavedBookingSlug(editorSlug);
    };

    // If outlet prop is provided, use it
    if (propOutlet) {
      void applyOutletFields(propOutlet).finally(() => setOutletLoading(false));
      return;
    }

    // Otherwise, load from Firestore using outletId from context
    setOutletLoading(true);
    
    // Timeout fallback: if loading takes more than 10 seconds, show form anyway
    const timeoutId = setTimeout(() => setOutletLoading(false), 10000);

    outletService.getById(effectiveOutletId)
      .then(async (outletData) => {
        clearTimeout(timeoutId);
        await applyOutletFields(outletData);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error('Failed to load outlet:', err);
        // On error, still allocate a public path so Copy link is not a truncated outlet id.
        void applyOutletFields(null);
      })
      .finally(() => {
        setOutletLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [effectiveOutletId, propOutlet]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767.98px)');
    const apply = () => setPhoneLayout(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (profileDirty) return;
    setShopNameDraft(settings.shopName || '');
    setCategoryDraft(settings.primaryBusinessCategory || '');
    setTeamSizeDraft(settings.teamSize || '');
    setCategoriesDraft((settings.businessCategories || []).join(', '));
    setLocationDraft(settings.serviceLocationType || '');
    setSoftwareDraft(
      settings.previousSoftware === 'Other' ? settings.previousSoftwareOther || 'Other' : settings.previousSoftware || '',
    );
  }, [settings, profileDirty]);

  useEffect(() => {
    const derived = bookingSlugFromShopName(settings.shopName || '');
    if (!derived) return;
    setBookingSlug((current) => (current.trim() === derived ? current : derived));
  }, [settings.shopName]);

  // Permanent save to Firestore: writes to document outlets/{outletId} (e.g. outlets/outlet_002).
  // Network tab will show a write to the outlets collection when successful.
  const handleSaveBookingInfo = async () => {
    if (!effectiveOutletId) {
      setBookingInfoStatus('error');
      return;
    }

    setBookingInfoStatus('saving');
    setBookingSlugError(null);

    try {
      const slugToSave = bookingSlugToPersist(
        bookingSlugFromShopName(settings.shopName || '') || bookingSlug,
        settings.shopName || '',
        effectiveOutletId,
      );
      if (!isValidBookingSlug(slugToSave)) {
        setBookingSlugError('Use a letter first, then letters, numbers, hyphens, or underscores only.');
        setBookingInfoStatus('error');
        setTimeout(() => setBookingInfoStatus('idle'), 3000);
        return;
      }
      const taken = await outletService.getByBookingSlug(slugToSave);
      if (taken && taken.outletID !== effectiveOutletId) {
        setBookingSlugError('This booking path is already used by another outlet.');
        setBookingInfoStatus('error');
        setTimeout(() => setBookingInfoStatus('idle'), 3000);
        return;
      }

      // Build payload: always send full businessHours object so all 7 days persist
      const payload = {
        addressDisplay: addressDisplay.trim() || '',
        phoneNumber: phoneNumber.trim() || '',
        businessHours: { ...businessHours },
      };

      setBookingSlug(slugToSave);
      setSavedBookingSlug(slugToSave);
      await outletService.update(effectiveOutletId, { ...payload, bookingSlug: slugToSave });

      if (onUpdateOutlet) {
        await Promise.resolve(onUpdateOutlet({ ...payload, bookingSlug: slugToSave }));
      }

      if (settings.businessHoursConfigured === false) {
        await Promise.resolve(onUpdateSettings({ ...settings, businessHoursConfigured: true }));
      }

      setBookingInfoStatus('success');
      setTimeout(() => setBookingInfoStatus('idle'), 2500);
    } catch (err) {
      setBookingInfoStatus('error');
      setTimeout(() => setBookingInfoStatus('idle'), 3000);
    }
  };

  // A shop name with no Latin characters cannot form a path, so the merchant has
  // to supply one instead of inheriting an unreadable generated path.
  const derivedBookingPath = bookingSlugFromShopName(settings.shopName || '');
  const shopNameHasNoPath = !derivedBookingPath;
  const bookingPathValue = derivedBookingPath || bookingSlug;
  const bookingPathSegment = resolveBookingSlug(bookingPathValue, settings.shopName || '', effectiveOutletId);
  const bookingUrl = effectiveOutletId && BOOKING_BASE_URL ? `${BOOKING_BASE_URL}/${bookingPathSegment}` : '';

  // Receipt lines inherit the shop name and the contact details above until the
  // merchant types something of their own into the receipt fields.
  const receiptIdentity = resolveReceiptIdentity({
    shopName: settings.shopName,
    receiptCompanyName: settings.receiptCompanyName,
    receiptPhone: settings.receiptPhone,
    receiptAddress: settings.receiptAddress,
    contact: { phone: phoneNumber, address: addressDisplay },
  });

  const persistPublicBookingSlug = async (): Promise<string | null> => {
    if (!effectiveOutletId) return null;
    const slugToSave = bookingSlugToPersist(
      bookingSlugFromShopName(settings.shopName || '') || bookingSlug,
      settings.shopName || '',
      effectiveOutletId,
    );
    if (!isValidBookingSlug(slugToSave)) {
      setBookingSlugError('Use a letter first, then letters, numbers, hyphens, or underscores only.');
      return null;
    }
    const taken = await outletService.getByBookingSlug(slugToSave);
    if (taken && taken.outletID !== effectiveOutletId) {
      setBookingSlugError('This booking path is already used by another outlet.');
      return null;
    }
    // Always write so Copy never advertises a path that only exists in the editor.
    await outletService.update(effectiveOutletId, { bookingSlug: slugToSave });
    if (onUpdateOutlet) await Promise.resolve(onUpdateOutlet({ bookingSlug: slugToSave }));
    setBookingSlug(slugToSave);
    setSavedBookingSlug(slugToSave);
    setBookingSlugError(null);
    return slugToSave;
  };

  const handleCopyLink = async () => {
    try {
      const slug = await persistPublicBookingSlug();
      if (!slug || !BOOKING_BASE_URL) return;
      const url = `${BOOKING_BASE_URL}/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setBookingSlugError('Could not save the booking path. Try Save, then copy again.');
      setCopySuccess(false);
    }
  };

  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = e.target.value;
    const derived = bookingSlugFromShopName(nextName);
    if (derived && derived !== bookingSlug) {
      setBookingSlug(derived);
      setBookingSlugError(null);
    }
    onUpdateSettings({ ...settings, shopName: nextName });
  };

  /** Desktop shop name writes immediately, so the public path has to follow it. */
  const handleShopNameBlur = async () => {
    const derived = bookingSlugFromShopName(settings.shopName || '');
    if (!effectiveOutletId || !derived || derived === savedBookingSlug) return;

    try {
      const taken = await outletService.getByBookingSlug(derived);
      if (taken && taken.outletID !== effectiveOutletId) {
        setBookingSlugError('This booking path is already used by another outlet.');
        return;
      }
      setBookingSlug(derived);
      await outletService.update(effectiveOutletId, { bookingSlug: derived });
      setSavedBookingSlug(derived);
      setBookingSlugError(null);
      if (onUpdateOutlet) {
        await Promise.resolve(onUpdateOutlet({ bookingSlug: derived }));
      }
    } catch (err) {
      console.error('Failed to save the booking path for the new shop name:', err);
    }
  };

  const handleSaveBusinessProfile = async () => {
    if (!effectiveOutletId || profileSaveStatus === 'saving') return;
    const nextName = shopNameDraft.trim();
    if (!nextName) {
      setProfileSaveError('Enter a shop name.');
      setProfileSaveStatus('error');
      setTimeout(() => setProfileSaveStatus('idle'), 3000);
      return;
    }

    setProfileSaveStatus('saving');
    setProfileSaveError(null);

    try {
      const categories = categoriesDraft.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 4);
      const nextSettings: OutletSettings = {
        ...settings,
        shopName: nextName,
        primaryBusinessCategory: categoryDraft.trim(),
        teamSize: (teamSizeDraft || undefined) as OutletSettings['teamSize'],
        businessCategories: categories,
        serviceLocationType: (locationDraft || undefined) as OutletSettings['serviceLocationType'],
        previousSoftware: softwareDraft.trim(),
      };
      await Promise.resolve(onUpdateSettings(nextSettings));

      const derived = bookingSlugFromShopName(nextName);
      const websiteValue = website.trim();
      await outletService.update(effectiveOutletId, { website: websiteValue });

      if (derived) {
        const taken = await outletService.getByBookingSlug(derived);
        if (taken && taken.outletID !== effectiveOutletId) {
          setBookingSlugError('This booking path is already used by another outlet.');
          setProfileSaveError('Profile saved, but that booking path is already used by another outlet.');
          setProfileDirty(false);
          setProfileSaveStatus('error');
          setTimeout(() => setProfileSaveStatus('idle'), 3000);
          return;
        }
        await outletService.update(effectiveOutletId, { bookingSlug: derived });
        setBookingSlug(derived);
        setSavedBookingSlug(derived);
        setBookingSlugError(null);
        if (onUpdateOutlet) {
          await Promise.resolve(onUpdateOutlet({ bookingSlug: derived, website: websiteValue }));
        }
      }

      setShopNameDraft(nextName);
      setProfileDirty(false);
      setProfileSaveStatus('success');
      setTimeout(() => setProfileSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to save business profile:', err);
      setProfileSaveError('Could not save the business profile.');
      setProfileSaveStatus('error');
      setTimeout(() => setProfileSaveStatus('idle'), 3000);
    }
  };

  const addPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMethodName.trim()) {
      onUpdateSettings({ 
        ...settings, 
        paymentMethods: [...settings.paymentMethods, newMethodName.trim()] 
      });
      setNewMethodName('');
    }
  };

  const removePaymentMethod = (index: number) => {
    const updated = settings.paymentMethods.filter((_, i) => i !== index);
    onUpdateSettings({ ...settings, paymentMethods: updated });
  };

  const handleEditMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMethod && editingMethod.name.trim()) {
      const updated = [...settings.paymentMethods];
      updated[editingMethod.index] = editingMethod.name.trim();
      onUpdateSettings({ ...settings, paymentMethods: updated });
      setEditingMethod(null);
    }
  };

  const handleReceiptLayoutChange = (
    key: 'receiptHeaderTitle' | 'receiptCompanyName' | 'receiptPhone' | 'receiptAddress' | 'receiptFooterNote',
    value: string
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value
    });
  };

  const scrollToSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    if (!desktop) {
      document.querySelector('.bookglow-main-scroll')?.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(`settings-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Keep side nav in sync with which section is in view (jump links, not tabs).
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    if (!desktop.matches) return;

    const ids = SETTINGS_NAV_ITEMS.map((item) => `settings-${item.id}`);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target?.id) return;
        const sectionId = top.target.id.replace(/^settings-/, '') as SettingsSectionId;
        if (SETTINGS_NAV_ITEMS.some((item) => item.id === sectionId)) {
          setActiveSection(sectionId);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [effectiveOutletId, outletLoading]);

  const bookingSaveStatus =
    bookingInfoStatus === 'success'
      ? 'success'
      : bookingInfoStatus === 'error'
        ? 'error'
        : bookingInfoStatus === 'saving'
          ? 'saving'
          : 'idle';

  const profileBarStatus =
    profileSaveStatus === 'success'
      ? 'success'
      : profileSaveStatus === 'error'
        ? 'error'
        : profileSaveStatus === 'saving'
          ? 'saving'
          : profileDirty
            ? 'unsaved'
            : 'idle';

  const panel = (visible: boolean) => (visible ? 'block min-w-0 w-full md:contents' : 'hidden md:contents');

  return (
    <div className="m-page-with-sticky-action animate-fadeIn min-w-0 overflow-x-hidden sm:pb-20">
      <SettingsPageHeader />

      <div className="mt-4 md:mt-6 flex flex-col md:flex-row gap-6 items-start min-w-0">
        <SettingsNavigation activeId={activeSection} onSelect={scrollToSection} />
        <label className="md:hidden w-full m-settings-field">
          <span className="m-settings-label">Section</span>
          <select
            aria-label="Settings sections"
            className="m-settings-control"
            value={activeSection}
            onChange={(event) => scrollToSection(event.target.value as SettingsSectionId)}
          >
            {SETTINGS_NAV_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <div className="min-w-0 flex-1 max-w-3xl w-full space-y-5 sm:space-y-6 overflow-x-hidden">
      {/* 1. Business profile */}
      <div className={panel(activeSection === 'business-profile')}>
      <SettingsSection
        id="settings-business-profile"
        defaultOpen
        hideHeaderOnMobile
        iconWrap="bg-[var(--brand-soft)] text-[var(--brand)]"
        title="Business profile"
        description="Name shown in the sidebar, invoices, and browser title."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      >
        <div className="m-settings-block max-w-xl">
          <div className="m-settings-field">
            <label htmlFor="settings-shop-name" className="m-settings-label hidden md:block">Shop name</label>
            <input
              id="settings-shop-name"
              type="text"
              placeholder="e.g. Bookglow Spa"
              className="m-settings-control m-settings-shop-title"
              value={phoneLayout ? shopNameDraft : settings.shopName}
              onChange={(event) => {
                if (phoneLayout) {
                  setShopNameDraft(event.target.value);
                  setProfileDirty(true);
                  return;
                }
                handleShopNameChange(event);
              }}
              onBlur={() => {
                if (phoneLayout) return;
                void handleShopNameBlur();
              }}
            />
          </div>
          <div className="m-settings-field">
            <label htmlFor="settings-website" className="m-settings-label block">Website</label>
            <input
              id="settings-website"
              type="url"
              placeholder="https://www.example.com"
              className="m-settings-control"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value);
                if (phoneLayout) setProfileDirty(true);
              }}
              onBlur={(event) => {
                if (phoneLayout) return;
                outletService
                  .update(effectiveOutletId, { website: event.currentTarget.value.trim() })
                  .catch((saveError) => console.error('Failed to save website:', saveError));
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="m-settings-field">
              <label htmlFor="settings-primary-category" className="m-settings-label block">Primary business category</label>
              <input
                id="settings-primary-category"
                className="m-settings-control"
                value={phoneLayout ? categoryDraft : settings.primaryBusinessCategory || ''}
                onChange={(event) => {
                  if (phoneLayout) {
                    setCategoryDraft(event.target.value);
                    setProfileDirty(true);
                    return;
                  }
                  onUpdateSettings({ ...settings, primaryBusinessCategory: event.target.value });
                }}
              />
            </div>
            <div className="m-settings-field">
              <label htmlFor="settings-team-size" className="m-settings-label block">Team size</label>
              <select
                id="settings-team-size"
                className="m-settings-control"
                value={phoneLayout ? teamSizeDraft : settings.teamSize || ''}
                onChange={(event) => {
                  if (phoneLayout) {
                    setTeamSizeDraft(event.target.value as OutletSettings['teamSize'] | '');
                    setProfileDirty(true);
                    return;
                  }
                  onUpdateSettings({ ...settings, teamSize: event.target.value as OutletSettings['teamSize'] });
                }}
              >
                <option value="">Not set</option><option value="independent">Independent</option><option value="2-5">2–5 people</option><option value="6-10">6–10 people</option><option value="11-20">11–20 people</option><option value="20-plus">20+ people</option>
              </select>
            </div>
          </div>
          <div className="m-settings-field">
            <label htmlFor="settings-related-categories" className="m-settings-label block">Business categories</label>
            <input
              id="settings-related-categories"
              className="m-settings-control"
              value={phoneLayout ? categoriesDraft : (settings.businessCategories || []).join(', ')}
              onChange={(event) => {
                if (phoneLayout) {
                  setCategoriesDraft(event.target.value);
                  setProfileDirty(true);
                  return;
                }
                onUpdateSettings({ ...settings, businessCategories: event.target.value.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 4) });
              }}
            />
            <p className="m-settings-hint">Up to four categories, separated by commas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="m-settings-field">
              <label htmlFor="settings-location-type" className="m-settings-label block">Service location type</label>
              <select
                id="settings-location-type"
                className="m-settings-control"
                value={phoneLayout ? locationDraft : settings.serviceLocationType || ''}
                onChange={(event) => {
                  if (phoneLayout) {
                    setLocationDraft(event.target.value as OutletSettings['serviceLocationType'] | '');
                    setProfileDirty(true);
                    return;
                  }
                  onUpdateSettings({ ...settings, serviceLocationType: event.target.value as OutletSettings['serviceLocationType'] });
                }}
              >
                <option value="">Not set</option><option value="physical">Physical location</option><option value="mobile">Mobile operator</option><option value="virtual">Virtual services</option>
              </select>
            </div>
            <div className="m-settings-field">
              <label htmlFor="settings-previous-software" className="m-settings-label block">Previous software</label>
              <input
                id="settings-previous-software"
                className="m-settings-control"
                value={phoneLayout ? softwareDraft : settings.previousSoftware === 'Other' ? settings.previousSoftwareOther || 'Other' : settings.previousSoftware || ''}
                onChange={(event) => {
                  if (phoneLayout) {
                    setSoftwareDraft(event.target.value);
                    setProfileDirty(true);
                    return;
                  }
                  onUpdateSettings({ ...settings, previousSoftware: event.target.value });
                }}
              />
            </div>
          </div>
        </div>
      </SettingsSection>
      <div className="m-sticky-bar m-sheet-footer sticky bottom-0 z-20 mt-4 rounded-ui-md border border-[var(--line-strong,var(--line))] bg-[var(--bg-surface)]/95 px-4 py-3 shadow-ui-md backdrop-blur-sm pb-[calc(var(--space-3)+var(--safe-bottom))] md:hidden">
        {profileSaveError ? (
          <p className="mb-2 text-center text-xs text-[var(--danger)]" role="alert">{profileSaveError}</p>
        ) : null}
        <SettingsSaveBar
          status={profileBarStatus}
          disabled={!effectiveOutletId}
          saveLabel="Save"
          className="w-full"
          onSave={() => {
            if (profileSaveStatus === 'saving') return;
            void handleSaveBusinessProfile();
          }}
        />
      </div>
      </div>

      {/* Booking + hours share one Save */}
      <div className={`space-y-5 sm:space-y-6 ${panel(activeSection === 'booking-page' || activeSection === 'operating-hours')}`}>
      {/* 2. Booking page */}
      <div className={panel(activeSection === 'booking-page')}>
      <SettingsSection
        id="settings-booking-page"
        defaultOpen
        iconWrap="bg-[var(--success-soft)] text-[var(--success)]"
        title="Booking page"
        description="Public link and contact details customers see when booking."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
      >
        {bookingUrl && !outletLoading ? (
          <div className="m-settings-block">
            <h4 className="m-settings-subhead text-[var(--text-primary)]">Public booking link</h4>

            <div className="m-settings-field">
              <label htmlFor="settings-booking-slug" className="m-settings-label block">Booking page path</label>
              <input
                id="settings-booking-slug"
                type="text"
                value={bookingPathValue}
                readOnly={!shopNameHasNoPath}
                aria-readonly={!shopNameHasNoPath}
                onChange={shopNameHasNoPath ? (e) => {
                  setBookingSlug(e.target.value);
                  setBookingSlugError(null);
                } : undefined}
                placeholder={shopNameHasNoPath ? 'e.g. restoranDesaPetaling' : ''}
                className="m-settings-control"
              />
              <p className="m-settings-hint">
                {shopNameHasNoPath
                  ? 'Your shop name has no Latin letters, so the path cannot follow it automatically. Type the path you want customers to see.'
                  : 'Follows your shop name. Change the name in Business profile to update this link.'}
              </p>
              {bookingSlugError && (
                <p className="text-xs text-[var(--danger)]">{bookingSlugError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:gap-5 items-start">
              <div className="m-settings-field min-w-0">
                <label htmlFor="settings-booking-url" className="m-settings-label block">Booking URL</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="settings-booking-url"
                    type="text"
                    readOnly
                    value={bookingUrl}
                    className="m-settings-control flex-1 min-w-0 font-mono text-sm [overflow-wrap:anywhere]"
                  />
                  <div className="relative w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      disabled={!BOOKING_BASE_URL || !effectiveOutletId}
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[2.75rem] rounded-ui-sm m-settings-btn bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy link
                    </button>
                    {copySuccess && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--success)] text-white text-xs font-bold rounded-ui-sm shadow-ui-md whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
                <p className="m-settings-hint">
                  Customers open this link to view services and book — no login required.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shrink-0 justify-self-start">
                <QRCodeSVG value={bookingUrl} size={120} level="M" includeMargin />
                <span className="m-settings-hint text-center leading-snug">Scan to book</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">Loading your outlet link…</p>
        )}

        {effectiveOutletId && (
          <div className="m-settings-block">
            <h4 className="m-settings-subhead text-[var(--text-primary)]">Contact details</h4>
            {(contextLoading || outletLoading) ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-[var(--text-secondary)]">Loading outlet information...</span>
              </div>
            ) : (
              <div className="m-settings-group !gap-4">
                <div className="m-settings-field">
                  <label htmlFor="settings-address" className="m-settings-label block">Address</label>
                  <textarea
                    id="settings-address"
                    rows={3}
                    className="m-settings-control"
                    value={addressDisplay}
                    onChange={(e) => setAddressDisplay(e.target.value)}
                  />
                </div>
                <div className="m-settings-field max-w-md">
                  <label htmlFor="settings-phone" className="m-settings-label block">Phone number</label>
                  <input
                    id="settings-phone"
                    type="text"
                    placeholder="e.g. +60 169929123"
                    className="m-settings-control"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </SettingsSection>
      </div>

      {/* 3. Operating hours */}
      <div className={panel(activeSection === 'operating-hours')}>
      <SettingsSection
        id="settings-operating-hours"
        className="m-hours-section"
        defaultOpen
        iconWrap="bg-sky-50 text-sky-600"
        title="Operating hours"
        description="Controls Open / Closed status on the booking page."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        {settings.businessHoursConfigured === false && (
          <div className="mb-3 rounded-ui-sm border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]" role="status">
            Operating hours are not configured yet. Set each day's hours and availability, then save outlet details.
          </div>
        )}
        {!effectiveOutletId ? (
          <p className="text-sm text-[var(--danger)] font-semibold">Outlet ID missing — cannot save hours.</p>
        ) : (contextLoading || outletLoading) ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[var(--text-secondary)]">Loading outlet information...</span>
          </div>
        ) : (
          <div className="m-hours-panel m-settings-list">
              {DAYS.map((day) => {
                const dayKey = day;
                const hours = businessHours[dayKey] || {
                  open: '09:00',
                  close: '17:00',
                  isOpen: settings.businessHoursConfigured === false ? false : true,
                };
                return (
                  <OperatingHoursRow
                    key={day}
                    day={day}
                    openTime={hours.open || '09:00'}
                    closeTime={hours.close || '17:00'}
                    isOpen={hours.isOpen !== false}
                    onChangeOpenTime={(value) =>
                      setBusinessHours((prev) => ({ ...prev, [dayKey]: { ...(prev[dayKey] || hours), open: value } }))
                    }
                    onChangeCloseTime={(value) =>
                      setBusinessHours((prev) => ({ ...prev, [dayKey]: { ...(prev[dayKey] || hours), close: value } }))
                    }
                    onToggleOpen={(checked) =>
                      setBusinessHours((prev) => ({ ...prev, [dayKey]: { ...(prev[dayKey] || hours), isOpen: checked } }))
                    }
                  />
                );
              })}
            </div>
        )}
      </SettingsSection>
      </div>

      <div className="m-sticky-bar m-sheet-footer sticky bottom-0 z-20 rounded-ui-md border border-[var(--line-strong,var(--line))] bg-[var(--bg-surface)]/95 px-4 py-3 shadow-ui-md backdrop-blur-sm pb-[calc(var(--space-3)+var(--safe-bottom))]">
        <SettingsSaveBar
          status={bookingSaveStatus}
          disabled={!effectiveOutletId}
          saveLabel="Save outlet details"
          className="w-full"
          onSave={() => {
            if (bookingInfoStatus === 'saving' || !effectiveOutletId) return;
            handleSaveBookingInfo();
          }}
        />
      </div>
      <p className="m-settings-hint mt-2 hidden sm:block">
        Saves the booking path, address, phone, and operating hours. Receipt layout, team invites, and the voucher PIN are saved in their own sections.
      </p>
      </div>

      {/* Receipt & payment */}
      <div className={panel(activeSection === 'receipt-payment')}>
      <SettingsSection
        id="settings-receipt-payment"
        iconWrap="bg-[var(--success-soft)] text-[var(--success)]"
        title="Receipt & payment"
        description="POS payment methods and printed receipt layout for this outlet."
        defaultOpen
        icon={<Icons.POS />}
      >
        <div className="m-settings-group !gap-8">
          <div className="m-settings-group !gap-4">
            <h4 className="m-settings-subhead">Payment methods</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="m-settings-label block uppercase tracking-widest">Active Methods</label>
                <div className="m-settings-list">
                  {settings.paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[var(--bg-soft)] rounded-ui-sm border border-[var(--line-soft)] group">
                      {editingMethod?.index === index ? (
                        <form onSubmit={handleEditMethod} className="flex-1 flex gap-2">
                          <input autoFocus type="text" className="m-settings-control flex-1 !h-9 !px-2" value={editingMethod.name} onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })} />
                          <button type="submit" className="text-[var(--brand)] font-semibold text-xs">Save</button>
                          <button type="button" onClick={() => setEditingMethod(null)} className="text-[var(--text-muted)] font-bold text-xs">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-[var(--text-secondary)]">{method}</span>
                          <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMethod({ index, name: method })} className="text-[var(--text-muted)] hover:text-[var(--brand)]"><Icons.Edit /></button>
                            <button onClick={() => removePaymentMethod(index)} className="text-[var(--text-muted)] hover:text-[var(--danger)]"><Icons.Trash /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="m-settings-label block uppercase tracking-widest">Add New Method</label>
                <form onSubmit={addPaymentMethod} className="flex gap-2">
                  <input type="text" placeholder="e.g. PayPal, Apple Pay..." className="m-settings-control flex-1" value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} />
                  <button type="submit" className="m-settings-btn px-5 bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-ui-xs">Add</button>
                </form>
              </div>
            </div>
          </div>

          <div className="m-settings-group !gap-4 border-t border-[var(--line-soft)] pt-6">
            <h4 className="m-settings-subhead">Receipt layout</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="m-settings-field">
                <label className="m-settings-label block uppercase tracking-widest">Header Title</label>
                <input
                  type="text"
                  value={settings.receiptHeaderTitle || 'Tax Invoice'}
                  onChange={(e) => handleReceiptLayoutChange('receiptHeaderTitle', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Tax Invoice"
                />
              </div>
              <div className="m-settings-field">
                <label className="m-settings-label block uppercase tracking-widest">Company Name</label>
                <input
                  type="text"
                  value={receiptIdentity.companyName}
                  onChange={(e) => handleReceiptLayoutChange('receiptCompanyName', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Bookglow Spa"
                />
                <p className="m-settings-hint">Follows your shop name. Edit to print a different company name.</p>
              </div>
              <div className="m-settings-field">
                <label className="m-settings-label block uppercase tracking-widest">Company Phone</label>
                <input
                  type="text"
                  value={receiptIdentity.phone}
                  onChange={(e) => handleReceiptLayoutChange('receiptPhone', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="+60 12-345 6789"
                />
                <p className="m-settings-hint">Follows the phone number in Booking page → Contact details.</p>
              </div>
              <div className="m-settings-field">
                <label className="m-settings-label block uppercase tracking-widest">Company Address</label>
                <input
                  type="text"
                  value={receiptIdentity.address}
                  onChange={(e) => handleReceiptLayoutChange('receiptAddress', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Outlet address for receipt"
                />
                <p className="m-settings-hint">Follows the address in Booking page → Contact details.</p>
              </div>
              <div className="m-settings-field sm:col-span-2">
                <label className="m-settings-label block uppercase tracking-widest">Footer Note</label>
                <input
                  type="text"
                  value={settings.receiptFooterNote || 'Thank you for your visit!'}
                  onChange={(e) => handleReceiptLayoutChange('receiptFooterNote', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Thank you for your visit!"
                />
              </div>
            </div>
            <div className="mt-5 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-soft)] p-4">
              <p className="m-settings-subhead">Sample receipt</p>
              <p className="m-settings-hint mb-3">Sample lines, not a real sale.</p>
              <div className="mx-auto w-full max-w-[340px] bg-[var(--bg-paper)] border border-[var(--line-strong)] rounded-ui-sm p-4 font-mono m-caption text-[var(--text-secondary)] space-y-1">
                <div className="text-center border-b border-dashed border-[var(--line-strong)] pb-2 mb-2">
                  <p className="font-bold text-sm">{receiptIdentity.companyName || 'Bookglow Spa'}</p>
                  <p>{settings.receiptHeaderTitle || 'Tax Invoice'}</p>
                  {receiptIdentity.phone && <p>Phone: {receiptIdentity.phone}</p>}
                  {receiptIdentity.address && <p>{receiptIdentity.address}</p>}
                  <p>{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <p>Customer: Sample guest</p>
                </div>
                <div className="flex justify-between"><span>Swedish Massage</span><span>1 x RM 80.00</span></div>
                <div className="flex justify-between"><span>Aroma Oil</span><span>1 x RM 20.00</span></div>
                <div className="border-t border-dashed border-[var(--line-strong)] pt-1 mt-1 flex justify-between font-bold text-[var(--text-primary)]">
                  <span>Total</span><span>RM 100.00</span>
                </div>
                <p className="pt-1">Payment: Cash</p>
                <div className="text-center border-t border-dashed border-[var(--line-strong)] pt-2 mt-2">
                  <p>{settings.receiptFooterNote || 'Thank you for your visit!'}</p>
                </div>
              </div>
            </div>
            <p className="m-settings-hint">Receipt layout values are stored in outlet settings and used by POS when user clicks Print Receipt.</p>
          </div>
        </div>
      </SettingsSection>
      </div>

      <div className={panel(activeSection === 'team-access')}>
      <TeamAccess outletId={effectiveOutletId} accountLimit={Number((propOutlet as any)?.accountLimit || 3)} />
      </div>

      {/* Advanced */}
      <div className={panel(activeSection === 'advanced')}>
      <SettingsSection
        id="settings-advanced"
        iconWrap="bg-[var(--danger-soft)] text-[var(--danger)]"
        title="Advanced settings"
        description="Voucher redemption security and other advanced outlet controls."
        icon={<Icons.Lock />}
      >
        <div className="m-settings-field max-w-md mb-5">
          <label htmlFor="settings-outlet-id" className="m-settings-label block uppercase tracking-widest">Outlet ID</label>
          <div className="flex gap-2">
            <input id="settings-outlet-id" readOnly value={effectiveOutletId} className="m-settings-control flex-1 font-mono" />
            <button type="button" className="m-settings-btn px-4 border border-[var(--line)] bg-[var(--bg-surface)]" onClick={() => navigator.clipboard.writeText(effectiveOutletId)}>Copy</button>
          </div>
          <p className="m-settings-hint">Permanent workspace identifier. It cannot be changed.</p>
        </div>
        <div className="m-settings-field max-w-md">
          <label className="m-settings-label block uppercase tracking-widest">
            Voucher Redemption PIN
          </label>
          <input
            type="password"
            value={settings.voucherRedemptionPin || ''}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                voucherRedemptionPin: e.target.value,
              })
            }
            placeholder="e.g. 1234"
            className="m-settings-control w-full"
          />
          <p className="m-settings-hint">
            Leave blank to disable PIN checking and use confirmation checkbox only.
          </p>
        </div>
      </SettingsSection>
      </div>

      <div className={panel(activeSection === 'legal')}>
      <SettingsSection
        id="settings-legal"
        iconWrap="bg-[var(--brand-soft)] text-[var(--brand)]"
        title="About & legal"
        description="Privacy Policy and account deletion for this BookGlow Merchant workspace."
        defaultOpen
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>}
      >
        <div className="space-y-3 max-w-md">
          <a
            href={publicPrivacyPolicyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="m-settings-btn px-4 py-3 border border-[var(--line)] bg-[var(--bg-surface)] w-full text-left inline-flex items-center justify-between min-h-11"
          >
            Privacy Policy
            <span aria-hidden className="text-[var(--text-muted)]">↗</span>
          </a>
          <a
            href={publicAccountDeletionUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="m-settings-btn px-4 py-3 border border-[var(--line)] bg-[var(--bg-surface)] w-full text-left inline-flex items-center justify-between min-h-11"
          >
            Request account deletion
            <span aria-hidden className="text-[var(--text-muted)]">↗</span>
          </a>
          <p className="m-settings-hint">
            These pages open on the public BookGlow website and do not require signing in.
          </p>
          <DeleteAccountSection />
        </div>
      </SettingsSection>
      </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
