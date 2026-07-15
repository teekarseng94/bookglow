/**
 * BookingV2Layout — the structural V2 application shell.
 *
 * Structural foundation only (no final screen design): merchant identity,
 * Bookglow attribution, progress indicator, main stage content (Outlet),
 * desktop summary placeholder, mobile sticky action region (owned by stages),
 * plus loading / not-found / disabled / error states and an error boundary.
 * Everything renders inside `.bg-v2`, keeping V2 styling isolated.
 */
import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useBooking } from '../state/BookingProvider';
import { BOOKING_ROUTES, pathToStage } from '../routes/bookingRouteConfig';
import { isStageAccessible } from '../state/bookingSelectors';
import { BOOKING_STAGE_ORDER, type BookingStage } from '../state/bookingTypes';
import { BookingErrorBoundary } from '../components/BookingErrorBoundary';
import { MERCHANT_FALLBACKS } from '../data/publicBookingTypes';
import { formatDuration, formatPrice } from '../data/serviceCatalogue';
import { formatLongDate } from '../utils/dates';
import { resolveMerchantAccent } from '../theme/merchantAccent';
import { shouldShowOutletName } from './merchantIdentity';

/**
 * Build CSS-var overrides for a valid, accessible merchant accent. Returns
 * undefined for the governed default so the token defaults win (inert). Only
 * `--merchant-accent*` vars are set — semantic colours are never overridden.
 */
function accentStyle(accent: string | null): React.CSSProperties | undefined {
  const resolved = resolveMerchantAccent(accent);
  if (resolved.isDefault) return undefined;
  return {
    ['--merchant-accent' as string]: resolved.accent,
    ['--merchant-accent-hover' as string]: resolved.hover,
    ['--merchant-accent-active' as string]: resolved.active,
    ['--merchant-accent-contrast' as string]: resolved.contrast,
  } as React.CSSProperties;
}

function StateScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="bgv2-state" role="status">
      <h1>{title}</h1>
      <p className="bgv2-supporting">{body}</p>
    </div>
  );
}

export function BookingV2Layout() {
  const { bookingPath } = useParams<{ bookingPath: string }>();
  const location = useLocation();
  const { state, merchantLoad, reloadMerchant } = useBooking();

  // Which stage does the URL correspond to?
  const activeStage: BookingStage | null = useMemo(() => {
    const seg = location.pathname.split('/').filter(Boolean).pop() ?? '';
    return pathToStage(seg);
  }, [location.pathname]);

  const merchant = state.merchant;
  const merchantName = merchant?.merchantName ?? MERCHANT_FALLBACKS.merchantName;
  const outletName = merchant?.outletName ?? MERCHANT_FALLBACKS.outletName;

  // Correct, per-stage document title.
  useEffect(() => {
    const def = BOOKING_ROUTES.find((r) => r.stage === activeStage);
    const suffix = def ? `${def.title} · ` : '';
    document.title = `${suffix}${merchantName} · Bookglow`;
  }, [activeStage, merchantName]);

  const rootStyle = accentStyle(merchant?.accentColor ?? null);

  const renderBody = () => {
    if (merchantLoad === 'loading') {
      return (
        <div className="bgv2-state" role="status" aria-live="polite">
          <div className="bgv2-spinner" aria-hidden="true" />
          <p className="bgv2-supporting">Loading booking…</p>
        </div>
      );
    }
    if (merchantLoad === 'not-found') {
      return (
        <StateScreen
          title="Booking page not found"
          body="We couldn't find a merchant for this link. Check the address and try again."
        />
      );
    }
    if (merchantLoad === 'disabled') {
      const m = state.merchant;
      return (
        <div className="bgv2-state" role="status">
          <h1>Online booking unavailable</h1>
          <p className="bgv2-supporting">
            This merchant isn't accepting online bookings right now.
          </p>
          {(m?.phone || m?.address) && (
            <p className="bgv2-supporting" style={{ marginTop: 'var(--space-3)' }}>
              {m?.phone && (
                <a className="bgv2-contact-inline" href={`tel:${m.phone.replace(/\s+/g, '')}`}>
                  {m.phone}
                </a>
              )}
              {m?.phone && m?.address ? ' · ' : ''}
              {m?.address}
            </p>
          )}
        </div>
      );
    }
    if (merchantLoad === 'error') {
      // Governed generic copy only — never raw Firebase error text.
      return (
        <div className="bgv2-state" role="alert">
          <h1>Couldn't load booking</h1>
          <p className="bgv2-supporting">Please try again in a moment.</p>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <button type="button" className="bgv2-btn bgv2-btn--primary" onClick={reloadMerchant}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    // merchantLoad === 'ok'
    return (
      <BookingErrorBoundary onReset={reloadMerchant}>
        <Outlet />
      </BookingErrorBoundary>
    );
  };

  const logoInitial = (merchantName || 'B').trim().charAt(0).toUpperCase();

  return (
    <div className="bg-v2" style={rootStyle} data-booking-path={bookingPath}>
      <div className="bgv2-shell">
        <header className="bgv2-header">
          <div className="bgv2-merchant-identity">
            {merchant?.logoUrl ? (
              <img className="bgv2-merchant-logo" src={merchant.logoUrl} alt="" />
            ) : (
              <span className="bgv2-merchant-logo bgv2-merchant-logo--fallback" aria-hidden="true">
                {logoInitial}
              </span>
            )}
            <span style={{ minWidth: 0 }}>
              <span className="bgv2-merchant-name">{merchantName}</span>
              {shouldShowOutletName(merchant?.merchantName, merchant?.outletName) && (
                <span className="bgv2-merchant-outlet">{outletName}</span>
              )}
            </span>
          </div>
        </header>

        {/* Progress indicator — communicates state with text + aria-current,
            never colour alone. Hidden until merchant is loaded. */}
        {merchantLoad === 'ok' && (
          <nav className="bgv2-progress" aria-label="Booking progress">
            <ol className="bgv2-progress-list">
              {BOOKING_ROUTES.map((route, index) => {
                const isCurrent = route.stage === activeStage;
                const isComplete =
                  BOOKING_STAGE_ORDER.indexOf(route.stage) <
                    BOOKING_STAGE_ORDER.indexOf(activeStage ?? 'service') &&
                  isStageAccessible(route.stage, state);
                return (
                  <li
                    key={route.stage}
                    className="bgv2-progress-step"
                    aria-current={isCurrent ? 'step' : undefined}
                    data-complete={isComplete ? 'true' : 'false'}
                  >
                    <span className="bgv2-progress-index" aria-hidden="true">
                      {isComplete ? '✓' : index + 1}
                    </span>
                    <span>{route.label}</span>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="bgv2-body">
          <main className="bgv2-main" id="bgv2-main">
            {renderBody()}
          </main>

          {/* Desktop summary rail — reflects the live booking selections. */}
          {merchantLoad === 'ok' && (
            <aside className="bgv2-summary" aria-label="Booking summary">
              <div className="bgv2-surface">
                <p className="bgv2-eyebrow">Your booking</p>
                {state.selectedService ? (
                  <>
                    <div className="bgv2-summary-item">
                      <span className="bgv2-summary-service-name">
                        {state.selectedService.name}
                      </span>
                      <span className="bgv2-summary-meta">
                        {formatDuration(state.selectedService.durationMinutes)}
                        {' · '}
                        {formatPrice(
                          state.selectedService.price,
                          state.selectedService.currency,
                        )}
                      </span>
                    </div>
                    {state.professionalPreference && (
                      <div className="bgv2-summary-item">
                        <span className="bgv2-summary-label">Professional</span>
                        <span className="bgv2-summary-meta">
                          {state.professionalPreference === 'any'
                            ? 'Any available professional'
                            : state.selectedProfessional?.name ?? '—'}
                        </span>
                      </div>
                    )}
                    {state.selectedDate && state.selectedTimeSlot && (
                      <div className="bgv2-summary-item">
                        <span className="bgv2-summary-label">Date &amp; time</span>
                        <span className="bgv2-summary-meta">
                          {formatLongDate(state.selectedDate)}
                          {' · '}
                          {state.selectedTimeSlot.label ?? state.selectedTimeSlot.time}
                        </span>
                      </div>
                    )}
                    {state.customerDetails.fullName.trim() !== '' && (
                      <div className="bgv2-summary-item">
                        <span className="bgv2-summary-label">Booked for</span>
                        <span className="bgv2-summary-meta">
                          {state.customerDetails.fullName}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="bgv2-supporting">
                    Select a service to start your booking.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>

        <footer className="bgv2-footer">
          <p>
            Powered by <strong>Bookglow</strong> · V2 preview
          </p>
        </footer>
      </div>
    </div>
  );
}
