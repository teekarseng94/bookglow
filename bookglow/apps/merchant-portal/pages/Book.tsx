/**
 * Public Booking Portal: /book/:id
 * No authentication — guests can view and book without an account.
 * Uses :id from URL (e.g. outlet_002) to fetch spa name and treatments from the backend.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicOutletData, createPublicBooking, PublicService } from '../services/bookingApi';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export function PublicBookingPage() {
  const { id } = useParams<{ id: string }>();
  console.log('Rendering PublicBookingPage for ID:', id);
  const outletId = id ?? '';
  const [outletName, setOutletName] = useState<string>('');
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'service' | 'datetime' | 'contact'>('service');
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId) {
      setError('Missing outlet');
      setLoading(false);
      return;
    }
    getPublicOutletData(outletId)
      .then(({ outlet, services: s }) => {
        setOutletName(outlet.name);
        setServices(s);
      })
      .catch((e: any) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [outletId]);

  const minDate = (() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  })();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  })();

  const handleConfirmBooking = async () => {
    if (!outletId || !selectedService || !selectedDate || !selectedTime || !customerName.trim() || !phone.trim()) {
      setSubmitError('Please fill all required fields.');
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const result = await createPublicBooking({
        outletId,
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined
      });
      setBookingId(result.appointmentId);
    } catch (e: any) {
      setSubmitError(e.message || 'Booking failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-stone-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-stone-500 mt-2">Check the link or try again later.</p>
        </div>
      </div>
    );
  }

  if (bookingId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-800">Booking confirmed</h2>
          <p className="text-stone-600 mt-2">We look forward to seeing you at {outletName}.</p>
          <p className="text-sm text-stone-500 mt-4">{selectedService?.name} · {selectedDate} at {selectedTime}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">
            {outletName || 'Booking'}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Book your visit</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {step === 'service' && (
          <>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Treatments</h2>
            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="text-stone-500 py-8 text-center">No treatments available.</p>
              ) : (
                services.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800">{s.name}</p>
                      <p className="text-sm text-stone-500 mt-0.5">{s.duration} min · {s.category}</p>
                      <p className="text-teal-600 font-bold mt-1">${s.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedService(s); setStep('datetime'); }}
                      className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {step === 'datetime' && selectedService && (
          <>
            <button
              type="button"
              onClick={() => setStep('service')}
              className="text-sm text-teal-600 font-medium mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <p className="font-semibold text-stone-800">{selectedService.name}</p>
              <p className="text-sm text-stone-500">${selectedService.price} · {selectedService.duration} min</p>
            </div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Date</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 mb-6 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <label className="block text-sm font-medium text-stone-700 mb-2">Time</label>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTime(t)}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedTime === t
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-teal-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep('contact')}
              className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </>
        )}

        {step === 'contact' && selectedService && (
          <>
            <button
              type="button"
              onClick={() => setStep('datetime')}
              className="text-sm text-teal-600 font-medium mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <p className="font-semibold text-stone-800">{selectedService.name}</p>
              <p className="text-sm text-stone-500">{selectedDate} at {selectedTime}</p>
            </div>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Your details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
            {submitError && <p className="mt-4 text-red-600 text-sm">{submitError}</p>}
            <button
              type="button"
              disabled={submitLoading || !customerName.trim() || !phone.trim()}
              onClick={handleConfirmBooking}
              className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </>
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-6 text-center text-sm text-stone-400">
        {outletName ? `${outletName} · ` : ''}Book with confidence
      </footer>
    </div>
  );
}

export default PublicBookingPage;
