import React, { useState } from 'react';

const assets: Record<string, string> = {
  Google: 'google.png', Square: 'square.svg', Stripe: 'stripe.svg',
  Facebook: 'facebook.svg', Instagram: 'instagram.svg', 'Instagram booking': 'instagram.svg',
  Wix: 'wix.svg', Shopify: 'shopify.svg', WhatsApp: 'whatsapp.svg', PayPal: 'paypal.svg',
};

export function BrandLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  return assets[name] && !failed
    ? <img src={`/brands/${assets[name]}`} alt={name} width="40" height="40" className="h-10 w-10 object-contain" onError={() => setFailed(true)} />
    : <span className="text-xs font-semibold text-slate-600 text-center break-words">{name}</span>;
}
