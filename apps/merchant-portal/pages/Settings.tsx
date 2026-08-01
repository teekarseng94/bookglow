import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { OutletSettings, Outlet, ApiIntegration } from '../types';
import { Icons } from '../constants';
import { useUserContext } from '../contexts/UserContext';
import { outletService, apiIntegrationService } from '../services/databaseService';
import { generateApiKey, sha256Hex } from '../utils/apiKeyHash';
import { shopNameToBookingSlug, isValidBookingSlug } from '../utils/bookingSlug';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  ModalFooterActions,
} from '../components/ui';
import {
  OperatingHoursRow,
  SettingsNavigation,
  SettingsPageHeader,
  SettingsSaveBar,
  SettingsSection,
  type SettingsSectionId,
} from '../components/settings';

const BOOKING_BASE_URL = 'https://bookglow-83fb3.web.app/book';
// Supabase Edge Function (Firestore retired). Old Firebase CF URL still proxies here.
const CHATBOT_WEBHOOK_URL =
  'https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook';

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
  const { outletId, outletName, userData, loading: contextLoading } = useUserContext();
  const effectiveOutletId = propOutletId || outletId || '';
  

  // Prevent rendering until outletId is available
  if (!effectiveOutletId) {
    return <LoadingSpinner />;
  }

  // Local state for outlet form data
  const [addressDisplay, setAddressDisplay] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string; isOpen?: boolean }>>({});
  const [outletLoading, setOutletLoading] = useState(true);

  const [newMethodName, setNewMethodName] = useState('');
  const [editingMethod, setEditingMethod] = useState<{ index: number; name: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [bookingSlug, setBookingSlug] = useState('');
  const [bookingSlugError, setBookingSlugError] = useState<string | null>(null);
  const [bookingInfoStatus, setBookingInfoStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiIntegration, setApiIntegration] = useState<ApiIntegration | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiRevealedKey, setApiRevealedKey] = useState<string | null>(null);
  const [copyField, setCopyField] = useState<'outlet' | 'key' | 'webhook' | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('business-profile');

  // Load outlet data using outletId
  useEffect(() => {
    if (!effectiveOutletId) {
      setOutletLoading(false);
      return;
    }

    // If outlet prop is provided, use it
    if (propOutlet) {
      setAddressDisplay(propOutlet.addressDisplay || '');
      setPhoneNumber(propOutlet.phoneNumber || '');
      setBusinessHours(propOutlet.businessHours || {});
      const derived = shopNameToBookingSlug(propOutlet.name || '');
      const existing = (propOutlet.bookingSlug && propOutlet.bookingSlug.trim()) || '';
      setBookingSlug(existing || derived);
      setOutletLoading(false);

      if (!existing && derived && isValidBookingSlug(derived) && effectiveOutletId) {
        outletService
          .getByBookingSlug(derived)
          .then(async (taken) => {
            if (!taken || taken.outletID === effectiveOutletId) {
              await outletService.update(effectiveOutletId, { bookingSlug: derived });
            }
          })
          .catch((persistErr) => {
            console.warn('Could not auto-persist bookingSlug:', persistErr);
          });
      }
      return;
    }

    // Otherwise, load from Firestore using outletId from context
    setOutletLoading(true);
    
    // Timeout fallback: if loading takes more than 10 seconds, show form anyway
    const timeoutId = setTimeout(() => setOutletLoading(false), 10000);

    outletService.getById(effectiveOutletId)
      .then(async (outletData) => {
        clearTimeout(timeoutId);
        if (outletData) {
          setAddressDisplay(outletData.addressDisplay || '');
          setPhoneNumber(outletData.phoneNumber || '');
          setBusinessHours(outletData.businessHours || {});
          const derived = shopNameToBookingSlug(outletData.name || '');
          const existing = (outletData.bookingSlug && outletData.bookingSlug.trim()) || '';
          setBookingSlug(existing || derived);

          // Persist derived slug when Settings showed a URL that was never saved to Firestore.
          if (!existing && derived && isValidBookingSlug(derived)) {
            try {
              const taken = await outletService.getByBookingSlug(derived);
              if (!taken || taken.outletID === effectiveOutletId) {
                await outletService.update(effectiveOutletId, { bookingSlug: derived });
              }
            } catch (persistErr) {
              console.warn('Could not auto-persist bookingSlug:', persistErr);
            }
          }
        } else {
          // Outlet doesn't exist yet - initialize with empty values
          setAddressDisplay('');
          setPhoneNumber('');
          setBusinessHours({});
          setBookingSlug(shopNameToBookingSlug(settings.shopName || ''));
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error('Failed to load outlet:', err);
        // On error, still allow editing (initialize with empty values)
        setAddressDisplay('');
        setPhoneNumber('');
        setBusinessHours({});
      })
      .finally(() => {
        setOutletLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [effectiveOutletId, propOutlet]);

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
      const slugRaw = bookingSlug.trim();
      if (slugRaw && !isValidBookingSlug(slugRaw)) {
        setBookingSlugError('Use a letter first, then letters, numbers, hyphens, or underscores only.');
        setBookingInfoStatus('error');
        setTimeout(() => setBookingInfoStatus('idle'), 3000);
        return;
      }
      if (slugRaw) {
        const taken = await outletService.getByBookingSlug(slugRaw);
        if (taken && taken.outletID !== effectiveOutletId) {
          setBookingSlugError('This booking path is already used by another outlet.');
          setBookingInfoStatus('error');
          setTimeout(() => setBookingInfoStatus('idle'), 3000);
          return;
        }
      }

      // Build payload: always send full businessHours object so all 7 days persist
      const payload = {
        addressDisplay: addressDisplay.trim() || '',
        phoneNumber: phoneNumber.trim() || '',
        businessHours: { ...businessHours },
      };

      if (slugRaw) {
        await outletService.update(effectiveOutletId, { ...payload, bookingSlug: slugRaw });
      } else {
        await outletService.update(effectiveOutletId, { ...payload, bookingSlug: '' });
      }

      if (onUpdateOutlet) {
        await Promise.resolve(onUpdateOutlet(slugRaw ? { ...payload, bookingSlug: slugRaw } : payload));
      }

      setBookingInfoStatus('success');
      setTimeout(() => setBookingInfoStatus('idle'), 2500);
    } catch (err) {
      setBookingInfoStatus('error');
      setTimeout(() => setBookingInfoStatus('idle'), 3000);
    }
  };

  const bookingPathSegment = (bookingSlug || '').trim() || effectiveOutletId;
  const bookingUrl = effectiveOutletId ? `${BOOKING_BASE_URL}/${bookingPathSegment}` : '';

  const handleCopyLink = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  };

  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, shopName: e.target.value });
  };

  const toggleOutletMode = () => {
    onUpdateSettings({ ...settings, isOutletModeEnabled: !settings.isOutletModeEnabled });
  };

  const toggleAdminAuth = () => {
    onUpdateSettings({ ...settings, isAdminAuthenticated: !settings.isAdminAuthenticated });
  };

  const toggleFeatureLock = (featureId: string) => {
    const newLocks = settings.lockedFeatures.includes(featureId)
      ? settings.lockedFeatures.filter(f => f !== featureId)
      : [...settings.lockedFeatures, featureId];
    onUpdateSettings({ ...settings, lockedFeatures: newLocks });
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

  const permissionList = [
    { id: 'delete-transaction', label: 'Delete/Edit Transactions', description: 'Prevent accidental or unauthorized removal of sales logs.' },
    { id: 'edit-service', label: 'Modify Service Catalog', description: 'Restricts adding, editing, or deleting spa treatments.' },
    { id: 'manage-staff', label: 'Manage Staff Profiles', description: 'Locks staff registration and commission rate changes.' },
    { id: 'export-crm', label: 'Export Client Data', description: 'Restrict downloading sensitive CRM databases to CSV.' },
    { id: 'finance-view', label: 'Expense & Profit Access', description: 'Limits access to financial charts and expense recording.' },
  ];

  const handleOpenApiModal = async () => {
    if (!effectiveOutletId) return;
    setShowApiModal(true);
    setApiLoading(true);
    setApiError(null);
    setApiRevealedKey(null);
    try {
      const data = await apiIntegrationService.get(effectiveOutletId);
      setApiIntegration(data);
    } catch (err) {
      console.error('Failed to load API integration:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to load API integration');
    } finally {
      setApiLoading(false);
    }
  };

  const handleGenerateOrRegenerateKey = async () => {
    if (!effectiveOutletId) return;
    setApiLoading(true);
    setApiError(null);
    setApiRevealedKey(null);
    try {
      const rawKey = generateApiKey();
      const hash = await sha256Hex(rawKey);
      const prefix = rawKey.slice(0, 12) + '...';
      await apiIntegrationService.setApiKey(effectiveOutletId, hash, prefix, effectiveOutletId);
      setApiRevealedKey(rawKey);
      setApiIntegration((prev) => ({
        ...(prev || { outletID: effectiveOutletId }),
        outletID: effectiveOutletId,
        apiKeyHash: hash,
        keyPrefix: prefix,
      }));
    } catch (err) {
      console.error('Failed to generate API key:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to generate API key');
    } finally {
      setApiLoading(false);
    }
  };

  const handleCopyField = async (value: string, field: 'outlet' | 'key' | 'webhook') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyField(field);
      setTimeout(() => setCopyField(null), 2000);
    } catch {
      setCopyField(null);
    }
  };

  const scrollToSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const bookingSaveStatus =
    bookingInfoStatus === 'success'
      ? 'success'
      : bookingInfoStatus === 'error'
        ? 'error'
        : bookingInfoStatus === 'saving'
          ? 'saving'
          : 'idle';

  return (
    <div className="m-page-with-bottom-nav animate-fadeIn sm:pb-20">
      <SettingsPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleOpenApiModal}>
              API Integration
            </Button>
          </div>
        }
      />

      <div className="mt-4 lg:mt-6 flex gap-6 items-start">
        <SettingsNavigation activeId={activeSection} onSelect={scrollToSection} />

        <div className="min-w-0 flex-1 max-w-3xl space-y-4 sm:space-y-5">
      {/* 1. Business profile */}
      <SettingsSection
        id="settings-business-profile"
        defaultOpen
        iconWrap="bg-[var(--brand-soft)] text-[var(--brand)]"
        title="Business profile"
        description="Customize your brand and outlet details."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      >
        <div className="max-w-md">
          <label className="m-settings-label block uppercase tracking-widest">Shop Name</label>
          <input 
            type="text" 
            placeholder="e.g. Bookglow Spa"
            className="m-settings-control w-full outline-none"
            value={settings.shopName}
            onChange={handleShopNameChange}
          />
          <p className="m-settings-hint mt-2 italic">This name will appear in the sidebar, invoices, and browser title.</p>
        </div>
      </SettingsSection>

      {/* 2. Booking page */}
      <SettingsSection
        id="settings-booking-page"
        defaultOpen
        iconWrap="bg-[var(--success-soft)] text-[var(--success)]"
        title="Booking page"
        description="Public booking link, path, address and phone shown to customers."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
      >
        {bookingUrl ? (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Booking page path</label>
                <input
                  type="text"
                  value={bookingSlug}
                  onChange={(e) => {
                    setBookingSlug(e.target.value);
                    setBookingSlugError(null);
                  }}
                  placeholder={shopNameToBookingSlug(settings.shopName || '') || 'baliWellness'}
                  className="m-settings-control w-full outline-none bg-[var(--bg-surface)]"
                />
                <p className="m-settings-hint mt-1">
                  Last segment of your public link (e.g. baliWellness). Leave empty to use your outlet id. Save with Save Changes under Operating hours.
                </p>
                {bookingSlugError && (
                  <p className="text-xs text-[var(--danger)] mt-1">{bookingSlugError}</p>
                )}
              </div>
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Booking URL</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={bookingUrl}
                    className="m-settings-control flex-1 min-w-0 truncate"
                  />
                  <div className="relative w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl m-settings-btn bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy Link
                    </button>
                    {copySuccess && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--success)] text-white text-xs font-bold rounded-ui-sm shadow-ui-md whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="m-settings-hint">Customers can open this link to view your service menu and book a time. No login required.</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line-soft)]">
              <QRCodeSVG value={bookingUrl} size={160} level="M" includeMargin />
              <span className="m-settings-hint font-medium">Scan to book · Print for counter</span>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">Loading your outlet link…</p>
        )}

        {effectiveOutletId && (
          <div className="mt-6 pt-6 border-t border-[var(--line-soft)] space-y-4">
            {(contextLoading || outletLoading) ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-[var(--text-secondary)]">Loading outlet information...</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="m-settings-label block uppercase tracking-widest">Address (one line)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 43-G, Jln Damai Perdana 6/1F, Bandar Damai Perdana, 56000 Cheras, Kuala Lumpur"
                    className="m-settings-control w-full outline-none"
                    value={addressDisplay}
                    onChange={(e) => setAddressDisplay(e.target.value)}
                  />
                </div>
                <div>
                  <label className="m-settings-label block uppercase tracking-widest">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +60 169929123"
                    className="m-settings-control w-full outline-none"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </SettingsSection>

      {/* 3. Operating hours */}
      <SettingsSection
        id="settings-operating-hours"
        defaultOpen
        iconWrap="bg-sky-50 text-sky-600"
        title="Operating hours"
        description="Hours used for Open / Closed status on the booking page."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        {!effectiveOutletId ? (
          <p className="text-sm text-[var(--danger)] font-semibold">Outlet ID missing — cannot save hours.</p>
        ) : (contextLoading || outletLoading) ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[var(--text-secondary)]">Loading outlet information...</span>
          </div>
        ) : (
          <>
            <div>
              {DAYS.map((day) => {
                const dayKey = day;
                const hours = businessHours[dayKey] || { open: '09:00', close: '17:00', isOpen: true };
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
            <p className="m-settings-hint mt-2">
              Saves address, phone, booking path and hours together. Closing without Save Changes does not write these fields.
            </p>
            <SettingsSaveBar
              status={bookingSaveStatus}
              disabled={!effectiveOutletId}
              onSave={() => {
                if (bookingInfoStatus === 'saving' || !effectiveOutletId) return;
                handleSaveBookingInfo();
              }}
            />
          </>
        )}
      </SettingsSection>

      {/* 4. Notifications */}
      <SettingsSection
        id="settings-notifications"
        iconWrap="bg-indigo-50 text-indigo-600"
        title="Notifications & reminders"
        description="Configure automated client notifications for upcoming bookings."
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-soft)] rounded-ui-sm border border-[var(--line-soft)]">
              <div>
                <span className="block text-sm font-bold text-[var(--text-secondary)]">Enable Reminders</span>
                <span className="m-settings-hint font-semibold uppercase tracking-tight">Send messages automatically</span>
              </div>
              <button 
                onClick={() => onUpdateSettings({ ...settings, reminderEnabled: !settings.reminderEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.reminderEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className={`space-y-4 ${!settings.reminderEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Reminder Channel</label>
                <select 
                  className="m-settings-control w-full"
                  value={settings.reminderChannel}
                  onChange={(e) => onUpdateSettings({ ...settings, reminderChannel: e.target.value as any })}
                >
                  <option value="Email">Email Only</option>
                  <option value="SMS">SMS Only</option>
                  <option value="Both">Both Email & SMS</option>
                </select>
              </div>

              <div>
                <label className="m-settings-label block uppercase tracking-widest">Reminder Timing</label>
                <div className="flex items-center gap-3">
                  <select 
                    className="m-settings-control flex-1"
                    value={settings.reminderTiming}
                    onChange={(e) => onUpdateSettings({ ...settings, reminderTiming: parseInt(e.target.value) })}
                  >
                    <option value={2}>2 Hours Before</option>
                    <option value={12}>12 Hours Before</option>
                    <option value={24}>24 Hours Before (Default)</option>
                    <option value={48}>48 Hours Before</option>
                    <option value={72}>72 Hours Before</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[var(--brand-soft)] rounded-ui-md border border-[var(--brand-border)] h-fit">
            <h4 className="m-settings-subhead text-[var(--brand-deep)] mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AI Messaging
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed font-medium">
              Bookglow can draft personalized, welcoming messages for each client. When reminders are triggered from the dashboard or calendar, they are simulated based on these settings.
            </p>
            <div className="mt-4 p-3 bg-[var(--bg-surface)]/70 rounded-ui-sm m-settings-hint text-[var(--brand)] italic border border-[var(--brand-border)]">
              "Hi Sarah! Just a gentle reminder of your Swedish Massage tomorrow at 11:00 AM at Bookglow Spa. We can't wait to see you!"
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 5. Receipt & payment */}
      <SettingsSection
        id="settings-receipt-payment"
        iconWrap="bg-[var(--success-soft)] text-[var(--success)]"
        title="Receipt & payment"
        description="POS payment methods and printed receipt layout for this outlet."
        icon={<Icons.POS />}
      >
        <div className="space-y-8">
          <div>
            <h4 className="m-settings-subhead">Payment methods</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="m-settings-label block uppercase tracking-widest">Active Methods</label>
                <div className="space-y-2">
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
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

          <div className="border-t border-[var(--line-soft)] pt-6">
            <h4 className="m-settings-subhead">Receipt layout</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Header Title</label>
                <input
                  type="text"
                  value={settings.receiptHeaderTitle || 'Tax Invoice'}
                  onChange={(e) => handleReceiptLayoutChange('receiptHeaderTitle', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Tax Invoice"
                />
              </div>
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Company Name</label>
                <input
                  type="text"
                  value={settings.receiptCompanyName || settings.shopName || ''}
                  onChange={(e) => handleReceiptLayoutChange('receiptCompanyName', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Bookglow Spa"
                />
              </div>
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Company Phone</label>
                <input
                  type="text"
                  value={settings.receiptPhone || ''}
                  onChange={(e) => handleReceiptLayoutChange('receiptPhone', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="+60 12-345 6789"
                />
              </div>
              <div>
                <label className="m-settings-label block uppercase tracking-widest">Company Address</label>
                <input
                  type="text"
                  value={settings.receiptAddress || ''}
                  onChange={(e) => handleReceiptLayoutChange('receiptAddress', e.target.value)}
                  className="m-settings-control w-full"
                  placeholder="Outlet address for receipt"
                />
              </div>
              <div className="sm:col-span-2">
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
              <p className="m-settings-subhead">Live Receipt Preview</p>
              <div className="mx-auto w-full max-w-[340px] bg-[var(--bg-paper)] border border-[var(--line-strong)] rounded-ui-sm p-4 font-mono m-caption text-[var(--text-secondary)] space-y-1">
                <div className="text-center border-b border-dashed border-[var(--line-strong)] pb-2 mb-2">
                  <p className="font-bold text-sm">{settings.receiptCompanyName || settings.shopName || 'Bookglow Spa'}</p>
                  <p>{settings.receiptHeaderTitle || 'Tax Invoice'}</p>
                  {(settings.receiptPhone || '').trim() && <p>Phone: {settings.receiptPhone}</p>}
                  {(settings.receiptAddress || '').trim() && <p>{settings.receiptAddress}</p>}
                  <p>{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <p>Customer: Jane Doe</p>
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
            <p className="m-settings-hint mt-3">Receipt layout values are stored in outlet settings and used by POS when user clicks Print Receipt.</p>
          </div>
        </div>
      </SettingsSection>

      {/* 6. Access & permissions */}
      <div id="settings-access-permissions" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 scroll-mt-4">
        <SettingsSection
          className="h-fit"
          iconWrap="bg-[var(--brand-soft)] text-[var(--brand)]"
          title="Outlet Environment"
          description={'Toggle "restricted mode" for shared terminals.'}
          icon={<Icons.Dashboard />}
        >
          <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-[var(--bg-soft)] rounded-ui-sm border border-[var(--line-soft)]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--text-secondary)]">Enable Outlet Mode</span>
              <span className="m-settings-hint font-semibold uppercase tracking-tight">Active restrictions for non-admins</span>
            </div>
            <button 
              onClick={toggleOutletMode}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.isOutletModeEnabled ? 'bg-[var(--brand)]' : 'bg-[var(--line-strong)]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isOutletModeEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className={`p-4 rounded-ui-sm border transition-all ${settings.isAdminAuthenticated ? 'bg-[var(--brand-soft)] border-[var(--brand-border)]' : 'bg-[var(--danger-soft)] border-[var(--danger-border)]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.isAdminAuthenticated ? 'bg-[var(--brand)] text-white' : 'bg-[var(--danger)] text-white'}`}>
                  {settings.isAdminAuthenticated ? <Icons.Dashboard /> : <Icons.Lock />}
                </div>
                <div>
                  <span className="block text-sm font-bold uppercase text-[var(--text-primary)]">
                    {settings.isAdminAuthenticated ? 'Admin Authenticated' : 'Restricted Access'}
                  </span>
                  <span className="m-settings-hint font-semibold">Currently in {settings.isAdminAuthenticated ? 'Manager' : 'Staff'} View</span>
                </div>
              </div>
              <button 
                onClick={toggleAdminAuth}
                className={`m-settings-btn text-xs uppercase tracking-widest shadow-ui-xs transition-all ${
                  settings.isAdminAuthenticated 
                    ? 'bg-[var(--bg-surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                    : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                }`}
              >
                {settings.isAdminAuthenticated ? 'Logout Admin' : 'Simulate Admin'}
              </button>
            </div>
          </div>
          </div>
        </SettingsSection>

        <SettingsSection
          className="h-fit"
          iconWrap="bg-amber-50 text-amber-600"
          title="Feature Permissions"
          description="Control which features require admin elevation."
          icon={<Icons.Lock />}
        >
          <div className={`space-y-4 ${!settings.isOutletModeEnabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
            {permissionList.map(perm => (
              <div 
                key={perm.id} 
                onClick={() => toggleFeatureLock(perm.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                  settings.lockedFeatures.includes(perm.id) 
                    ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white shadow-ui-md translate-x-1'
                    : 'bg-[var(--bg-soft)] border-[var(--line-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{perm.label}</span>
                    {settings.lockedFeatures.includes(perm.id) && <span className="text-amber-400"><Icons.Lock /></span>}
                  </div>
                  <p className={`m-settings-hint mt-1`}>{perm.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                  settings.lockedFeatures.includes(perm.id) ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--line-strong)] bg-transparent'
                }`}>
                  {settings.lockedFeatures.includes(perm.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>
      </div>

      {/* 7. Integrations */}
      <SettingsSection
        id="settings-integrations"
        iconWrap="bg-sky-50 text-sky-600"
        title="Integrations"
        description="Chatbot API access for this outlet."
        icon={<Icons.Calendar />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenApiModal}
            className="flex items-start gap-3 p-4 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)] hover:bg-[var(--bg-selection)] transition-colors text-left"
          >
            <svg className="w-5 h-5 text-[var(--brand)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Chatbot API Integration</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Outlet ID, API key, and webhook URL</p>
            </div>
          </button>
        </div>
      </SettingsSection>

      {/* 8. Advanced */}
      <SettingsSection
        id="settings-advanced"
        iconWrap="bg-[var(--danger-soft)] text-[var(--danger)]"
        title="Advanced settings"
        description="Voucher redemption security and other advanced outlet controls."
        icon={<Icons.Lock />}
      >
        <div className="max-w-md space-y-2">
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
      </div>

      <AppModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
        title="Chatbot API Integration"
        description="Use these details to connect MyChatBot (or other bots) to this outlet."
        size="md"
        mobileFullscreen
        busy={apiLoading}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowApiModal(false)}>
              Close
            </Button>
            <Button onClick={handleGenerateOrRegenerateKey} disabled={apiLoading}>
              {apiIntegration?.apiKeyHash
                ? apiLoading
                  ? 'Regenerating…'
                  : 'Regenerate Key'
                : apiLoading
                  ? 'Generating…'
                  : 'Generate API Key'}
            </Button>
          </ModalFooterActions>
        }
      >
        {apiError && (
          <div className="rounded-ui-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {apiError}
          </div>
        )}

        <FormSection>
          <Field id="chatbot-outlet-id" label="Outlet ID">
            <div className="flex gap-2">
              <input
                id="chatbot-outlet-id"
                type="text"
                readOnly
                value={effectiveOutletId}
                className={`${fieldControlClassName} flex-1 font-mono`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopyField(effectiveOutletId, 'outlet')}
              >
                {copyField === 'outlet' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Field>

          <Field
            id="chatbot-api-key"
            label="API Access Key"
            hint={
              <>
                Use this in the <code className="bg-[var(--bg-soft)] px-1 rounded">X-API-Key</code>{' '}
                header. We never store the raw key, only its hash.
              </>
            }
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  id="chatbot-api-key"
                  type="text"
                  readOnly
                  value={
                    apiRevealedKey ||
                    apiIntegration?.keyPrefix ||
                    (apiLoading ? 'Loading…' : 'No key generated yet.')
                  }
                  className={`${fieldControlClassName} flex-1 font-mono`}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => apiRevealedKey && handleCopyField(apiRevealedKey, 'key')}
                  disabled={!apiRevealedKey}
                >
                  {copyField === 'key' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {apiIntegration?.keyPrefix && !apiRevealedKey && (
                <p className="text-xs text-[var(--text-muted)]">
                  Current key prefix:{' '}
                  <span className="font-mono">{apiIntegration.keyPrefix}</span>. The full key is
                  only shown right after generation.
                </p>
              )}
            </div>
          </Field>

          <Field
            id="chatbot-webhook-url"
            label="Webhook URL"
            hint="MyChatBot can call this endpoint to verify the key and talk to your POS."
          >
            <div className="flex gap-2">
              <input
                id="chatbot-webhook-url"
                type="text"
                readOnly
                value={CHATBOT_WEBHOOK_URL}
                className={`${fieldControlClassName} flex-1 font-mono text-xs`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopyField(CHATBOT_WEBHOOK_URL, 'webhook')}
              >
                {copyField === 'webhook' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Field>
        </FormSection>

        <div className="rounded-ui-md bg-[var(--bg-soft)] border border-[var(--line)] p-3 text-xs text-[var(--text-secondary)] space-y-1">
          <p className="font-semibold text-[var(--text-primary)]">Setup Guide (MyChatBot)</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              Paste the <span className="font-mono">Outlet ID</span> into the bot&apos;s outlet /
              location field.
            </li>
            <li>
              Paste the <span className="font-mono">API Access Key</span> into the bot&apos;s API
              key field. This is used as the <span className="font-mono">X-API-Key</span> header.
            </li>
            <li>
              Use the <span className="font-mono">Webhook URL</span> where MyChatBot should send
              verification or booking requests.
            </li>
            <li>
              For advanced options or to change the outbound webhook URL, open the full{' '}
              <Link
                to="/settings/api-integration"
                className="text-[var(--brand)] underline"
              >
                API Integration Management
              </Link>{' '}
              page.
            </li>
          </ul>
        </div>
      </AppModal>
    </div>
  );
};

export default Settings;
