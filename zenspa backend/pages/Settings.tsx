import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { OutletSettings, Outlet, ApiIntegration } from '../types';
import { Icons } from '../constants';
import { useUserContext } from '../contexts/UserContext';
import { outletService, apiIntegrationService } from '../services/firestoreService';
import { generateApiKey, sha256Hex } from '../utils/apiKeyHash';

const BOOKING_BASE_URL = 'https://zenspabookingsystem.web.app/book';
// Cloud Function endpoint used by MyChatBot to verify API key for this outlet
const CHATBOT_WEBHOOK_URL =
  'https://asia-southeast1-razak-residence-2026.cloudfunctions.net/chatbotWebhook';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface SettingsProps {
  settings: OutletSettings;
  onUpdateSettings: (settings: OutletSettings) => void;
  outletId?: string;
  outlet?: Outlet | null;
  onUpdateOutlet?: (updates: Partial<Outlet>) => void;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-600">Loading settings...</p>
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
  const [bookingInfoStatus, setBookingInfoStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiIntegration, setApiIntegration] = useState<ApiIntegration | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiRevealedKey, setApiRevealedKey] = useState<string | null>(null);
  const [copyField, setCopyField] = useState<'outlet' | 'key' | 'webhook' | null>(null);

  // Load outlet data from Firestore using outletId
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
      setOutletLoading(false);
      return;
    }

    // Otherwise, load from Firestore using outletId from context
    setOutletLoading(true);
    
    // Timeout fallback: if loading takes more than 10 seconds, show form anyway
    const timeoutId = setTimeout(() => setOutletLoading(false), 10000);

    outletService.getById(effectiveOutletId)
      .then((outletData) => {
        clearTimeout(timeoutId);
        if (outletData) {
          setAddressDisplay(outletData.addressDisplay || '');
          setPhoneNumber(outletData.phoneNumber || '');
          setBusinessHours(outletData.businessHours || {});
        } else {
          // Outlet doesn't exist yet - initialize with empty values
          setAddressDisplay('');
          setPhoneNumber('');
          setBusinessHours({});
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

    try {
      // Build payload: always send full businessHours object so all 7 days persist
      const payload = {
        addressDisplay: addressDisplay.trim() || '',
        phoneNumber: phoneNumber.trim() || '',
        businessHours: { ...businessHours },
      };

      await outletService.update(effectiveOutletId, payload);

      if (onUpdateOutlet) {
        await Promise.resolve(onUpdateOutlet(payload));
      }

      setBookingInfoStatus('success');
      setTimeout(() => setBookingInfoStatus('idle'), 2500);
    } catch (err) {
      setBookingInfoStatus('error');
      setTimeout(() => setBookingInfoStatus('idle'), 3000);
    }
  };

  const bookingUrl = effectiveOutletId ? `${BOOKING_BASE_URL}/${effectiveOutletId}` : '';

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
          <p className="text-slate-500 text-sm">Configure your outlet's environment and staff access control.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/settings/integrations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 font-bold text-sm hover:bg-sky-100 transition-colors"
          >
            <Icons.Calendar />
            External Integrations (Setmore)
          </Link>
          <button
            type="button"
            onClick={handleOpenApiModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 font-bold text-sm hover:bg-teal-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            API Integration (Chatbot)
          </button>
        </div>
      </div>

      {/* Share Booking Link (Owner) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Share Booking Link</h3>
            <p className="text-xs text-slate-400 font-medium">Your unique public booking URL. Share it or print the QR code for your spa counter.</p>
          </div>
        </div>
        {bookingUrl ? (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Booking URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={bookingUrl}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 truncate"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy Link
                    </button>
                    {copySuccess && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Customers can open this link to view your service menu and book a time. No login required.</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <QRCodeSVG value={bookingUrl} size={160} level="M" includeMargin />
              <span className="text-[10px] font-medium text-slate-500">Scan to book · Print for counter</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Loading your outlet link…</p>
        )}
      </div>

      {/* Booking Page Info: Address, Phone, Operating Hours */}
      {effectiveOutletId && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Booking Page Info</h3>
              <p className="text-xs text-slate-400 font-medium">Address, phone and hours shown on your public booking page.</p>
            </div>
          </div>
          {(contextLoading || outletLoading) ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-slate-600">Loading outlet information...</span>
            </div>
          ) : (
            <>
            <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Address (one line)</label>
              <textarea
                rows={2}
                placeholder="e.g. 43-G, Jln Damai Perdana 6/1F, Bandar Damai Perdana, 56000 Cheras, Kuala Lumpur"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                value={addressDisplay}
                onChange={(e) => setAddressDisplay(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +60 169929123"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Operating Hours (for Open/Closed status)</label>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const dayKey = day;
                  const hours = businessHours[dayKey] || { open: '09:00', close: '17:00', isOpen: true };
                  return (
                    <div key={day} className="flex items-center gap-4 flex-wrap">
                      <span className="w-24 text-sm font-medium text-slate-700 capitalize">{day}</span>
                      <input
                        type="time"
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        value={hours.open || '09:00'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBusinessHours(prev => ({
                            ...prev,
                            [dayKey]: { ...hours, open: value }
                          }));
                        }}
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="time"
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        value={hours.close || '17:00'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBusinessHours(prev => ({
                            ...prev,
                            [dayKey]: { ...hours, close: value }
                          }));
                        }}
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={hours.isOpen !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBusinessHours(prev => ({
                              ...prev,
                              [dayKey]: { ...hours, isOpen: checked }
                            }));
                          }}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Open
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Used to show &quot;Open / Closes at X&quot; on the booking page.</p>
            </div>
            <div className="pt-4 flex items-center justify-between">
              <div className="text-xs">
                {!effectiveOutletId && (
                  <span className="text-red-600 font-semibold">⚠ Outlet ID missing - button disabled</span>
                )}
                {bookingInfoStatus === 'success' && (
                  <span className="text-emerald-600 font-semibold">Booking page info saved.</span>
                )}
                {bookingInfoStatus === 'error' && (
                  <span className="text-red-600">Failed to save booking info. Please try again.</span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (bookingInfoStatus === 'saving' || !effectiveOutletId) return;
                  handleSaveBookingInfo();
                }}
                disabled={bookingInfoStatus === 'saving' || !effectiveOutletId}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  bookingInfoStatus === 'saving'
                    ? 'bg-teal-400 text-white cursor-wait opacity-50'
                    : bookingInfoStatus === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                }`}
              >
                {bookingInfoStatus === 'saving' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving…
                  </span>
                ) : bookingInfoStatus === 'success' ? (
                  '✓ Saved'
                ) : (
                  'Save Booking Info'
                )}
              </button>
            </div>
            </div>
            </>
          )}
        </div>
      )}


      {/* Business Profile Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Business Profile</h3>
            <p className="text-xs text-slate-400 font-medium">Customize your brand and outlet details.</p>
          </div>
        </div>

        <div className="max-w-md">
          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Shop Name</label>
          <input 
            type="text" 
            placeholder="e.g. ZenFlow Spa"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold"
            value={settings.shopName}
            onChange={handleShopNameChange}
          />
          <p className="text-[10px] text-slate-400 mt-2 italic">This name will appear in the sidebar, invoices, and browser title.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Global Toggle */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 h-fit">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
              <Icons.Dashboard />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Outlet Environment</h3>
              <p className="text-xs text-slate-400 font-medium">Toggle "restricted mode" for shared terminals.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">Enable Outlet Mode</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active restrictions for non-admins</span>
            </div>
            <button 
              onClick={toggleOutletMode}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.isOutletModeEnabled ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isOutletModeEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${settings.isAdminAuthenticated ? 'bg-teal-50 border-teal-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.isAdminAuthenticated ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'}`}>
                  {settings.isAdminAuthenticated ? <Icons.Dashboard /> : <Icons.Lock />}
                </div>
                <div>
                  <span className="block text-sm font-black uppercase text-slate-800">
                    {settings.isAdminAuthenticated ? 'Admin Authenticated' : 'Restricted Access'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">Currently in {settings.isAdminAuthenticated ? 'Manager' : 'Staff'} View</span>
                </div>
              </div>
              <button 
                onClick={toggleAdminAuth}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-all ${
                  settings.isAdminAuthenticated 
                    ? 'bg-white text-rose-600 hover:bg-rose-50' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {settings.isAdminAuthenticated ? 'Logout Admin' : 'Simulate Admin'}
              </button>
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Icons.Lock />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Feature Permissions</h3>
              <p className="text-xs text-slate-400 font-medium">Control which features require admin elevation.</p>
            </div>
          </div>

          <div className={`space-y-4 ${!settings.isOutletModeEnabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
            {permissionList.map(perm => (
              <div 
                key={perm.id} 
                onClick={() => toggleFeatureLock(perm.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                  settings.lockedFeatures.includes(perm.id) 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg translate-x-1' 
                    : 'bg-slate-50 border-slate-100 text-slate-800 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{perm.label}</span>
                    {settings.lockedFeatures.includes(perm.id) && <span className="text-amber-400"><Icons.Lock /></span>}
                  </div>
                  <p className={`text-[10px] mt-1 text-slate-400`}>{perm.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                  settings.lockedFeatures.includes(perm.id) ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-transparent'
                }`}>
                  {settings.lockedFeatures.includes(perm.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automated Reminders Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Communication & Reminders</h3>
            <p className="text-xs text-slate-400 font-medium">Configure automated client notifications for upcoming bookings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="block text-sm font-bold text-slate-700">Enable Reminders</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Send messages automatically</span>
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
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Reminder Channel</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  value={settings.reminderChannel}
                  onChange={(e) => onUpdateSettings({ ...settings, reminderChannel: e.target.value as any })}
                >
                  <option value="Email">Email Only</option>
                  <option value="SMS">SMS Only</option>
                  <option value="Both">Both Email & SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Reminder Timing</label>
                <div className="flex items-center gap-3">
                  <select 
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
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

          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 h-fit">
            <h4 className="text-xs font-black uppercase text-indigo-700 tracking-widest mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AI Messaging
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed font-medium">
              ZenFlow uses AI to draft personalized, welcoming messages for each client. When reminders are triggered from the dashboard or calendar, they are simulated based on these settings.
            </p>
            <div className="mt-4 p-3 bg-white/60 rounded-xl text-[10px] text-indigo-600 italic border border-white/40">
              "Hi Sarah! Just a gentle reminder of your Swedish Massage tomorrow at 11:00 AM at ZenFlow Spa. We can't wait to see you!"
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Configuration */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600"><Icons.POS /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Payment Methods</h3>
            <p className="text-xs text-slate-400 font-medium">Add or remove accepted payment options for POS checkout.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Methods</label>
             <div className="space-y-2">
               {settings.paymentMethods.map((method, index) => (
                 <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    {editingMethod?.index === index ? (
                      <form onSubmit={handleEditMethod} className="flex-1 flex gap-2">
                         <input autoFocus type="text" className="flex-1 p-1 px-2 text-sm bg-white border border-teal-200 rounded outline-none" value={editingMethod.name} onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })} />
                         <button type="submit" className="text-teal-600 font-bold text-xs">Save</button>
                         <button type="button" onClick={() => setEditingMethod(null)} className="text-slate-400 font-bold text-xs">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-slate-700">{method}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingMethod({ index, name: method })} className="text-slate-400 hover:text-teal-600"><Icons.Edit /></button>
                          <button onClick={() => removePaymentMethod(index)} className="text-slate-400 hover:text-rose-500"><Icons.Trash /></button>
                        </div>
                      </>
                    )}
                 </div>
               ))}
             </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Add New Method</label>
            <form onSubmit={addPaymentMethod} className="flex gap-2">
              <input type="text" placeholder="e.g. PayPal, Apple Pay..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium" value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} />
              <button type="submit" className="px-5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-sm">Add</button>
            </form>
          </div>
        </div>
      </div>
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Chatbot API Integration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Use these details to connect MyChatBot (or other bots) to this outlet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {apiError}
                </div>
              )}

              {/* Outlet ID */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Outlet ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveOutletId}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyField(effectiveOutletId, 'outlet')}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    {copyField === 'outlet' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* API Access Key */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  API Access Key
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Use this in the <code className="bg-slate-100 px-1 rounded">X-API-Key</code> header. We never store the raw key,
                  only its hash. You can generate a new key below.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        apiRevealedKey ||
                        apiIntegration?.keyPrefix ||
                        (apiLoading ? 'Loading…' : 'No key generated yet.')
                      }
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => apiRevealedKey && handleCopyField(apiRevealedKey, 'key')}
                      disabled={!apiRevealedKey}
                      className="px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copyField === 'key' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateOrRegenerateKey}
                      disabled={apiLoading}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                      {apiIntegration?.apiKeyHash
                        ? apiLoading
                          ? 'Regenerating…'
                          : 'Regenerate Key'
                        : apiLoading
                        ? 'Generating…'
                        : 'Generate API Key'}
                    </button>
                    {apiIntegration?.keyPrefix && !apiRevealedKey && (
                      <p className="text-[11px] text-slate-500 flex-1">
                        Current key prefix: <span className="font-mono">{apiIntegration.keyPrefix}</span>. The full key is only
                        shown right after generation.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                  Webhook URL
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  MyChatBot can call this Cloud Function to verify the key and talk to your POS.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={CHATBOT_WEBHOOK_URL}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyField(CHATBOT_WEBHOOK_URL, 'webhook')}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    {copyField === 'webhook' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Setup guide */}
              <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Setup Guide (MyChatBot)</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Paste the <span className="font-mono">Outlet ID</span> into the bot&apos;s outlet / location field.</li>
                  <li>
                    Paste the <span className="font-mono">API Access Key</span> into the bot&apos;s API key field. This is used as
                    the <span className="font-mono">X-API-Key</span> header.
                  </li>
                  <li>
                    Use the <span className="font-mono">Webhook URL</span> where MyChatBot should send verification or booking
                    requests.
                  </li>
                  <li>
                    For advanced options or to change the outbound webhook URL, open the full{' '}
                    <Link to="/settings/api-integration" className="text-teal-600 underline">
                      API Integration Management
                    </Link>{' '}
                    page.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
