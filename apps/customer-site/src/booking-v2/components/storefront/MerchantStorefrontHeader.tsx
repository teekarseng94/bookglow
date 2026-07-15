/**
 * MerchantStorefrontHeader — the first real customer-facing storefront section.
 *
 * Shows merchant identity (logo/initials, name, optional outlet name, short
 * description), a restrained cover frame, and contact actions. The merchant is
 * the visible brand; Bookglow is a small trusted attribution. Governed
 * fallbacks are used for missing media — never random stock imagery.
 */
import React from 'react';
import type { MerchantSummary } from '../../state/bookingTypes';
import { MERCHANT_FALLBACKS } from '../../data/publicBookingTypes';
import { shouldShowOutletName } from '../../layouts/merchantIdentity';

interface Props {
  merchant: MerchantSummary;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((p) => p.charAt(0).toUpperCase()).join('');
  return letters || 'B';
}

function mapHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function MerchantStorefrontHeader({ merchant }: Props) {
  const merchantName = merchant.merchantName ?? MERCHANT_FALLBACKS.merchantName;
  const showOutlet = shouldShowOutletName(merchant.merchantName, merchant.outletName);

  return (
    <section className="bgv2-storefront" aria-label="Merchant">
      {merchant.coverImageUrl && (
        <div className="bgv2-storefront-cover">
          <img src={merchant.coverImageUrl} alt="" loading="lazy" />
        </div>
      )}

      <div className="bgv2-storefront-body">
        <div className="bgv2-storefront-identity">
          {merchant.logoUrl ? (
            <img className="bgv2-storefront-logo" src={merchant.logoUrl} alt="" loading="lazy" />
          ) : (
            <span className="bgv2-storefront-logo bgv2-storefront-logo--fallback" aria-hidden="true">
              {initialsOf(merchantName)}
            </span>
          )}

          <div className="bgv2-storefront-headings">
            <h1 className="bgv2-storefront-name">{merchantName}</h1>
            {showOutlet && merchant.outletName && (
              <p className="bgv2-storefront-outlet">{merchant.outletName}</p>
            )}
          </div>
        </div>

        {merchant.shortDescription && (
          <p className="bgv2-storefront-description">{merchant.shortDescription}</p>
        )}

        {(merchant.address || merchant.phone) && (
          <div className="bgv2-storefront-contact">
            {merchant.address && (
              <a
                className="bgv2-contact-link"
                href={mapHref(merchant.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">📍</span>
                <span>{merchant.address}</span>
              </a>
            )}
            {merchant.phone && (
              <a className="bgv2-contact-link" href={`tel:${merchant.phone.replace(/\s+/g, '')}`}>
                <span aria-hidden="true">📞</span>
                <span>{merchant.phone}</span>
              </a>
            )}
          </div>
        )}

        <p className="bgv2-storefront-attribution">
          Booking powered by <strong>Bookglow</strong>
        </p>
      </div>
    </section>
  );
}
