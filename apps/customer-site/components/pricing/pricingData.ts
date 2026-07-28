/**
 * Pricing plan data — single source of truth.
 *
 * The PricingView hero and the landing-page pricing preview
 * both consume this configuration so plan names, prices,
 * and feature lists stay in sync.
 */

export interface PricingPlan {
  id: string;
  name: string;
  headline: string;
  description: string;
  price: number;
  /** Price when billed monthly (only relevant for paid plans). */
  monthlyPrice?: number;
  priceSuffix: string;
  userLimit?: string;
  featured?: boolean;
  ctaLabel: string;
  ctaHref: string;
  supportBadge?: string;
  features: string[];
}

export const PLANS: PricingPlan[] = [
  {
    id: 'pro',
    name: 'Start Pro',
    headline: 'Get Pro',
    description: 'Unlimited users',
    price: 79,
    monthlyPrice: 99,
    priceSuffix: '/month',
    featured: true,
    ctaLabel: 'Start Pro',
    ctaHref: '/signup',
    supportBadge: '24/7 HUMAN SUPPORT',
    features: [
      'Unlimited appointments',
      'Accept payments',
      'Branded Booking Page',
      'Branded Mobile App',
      'SMS reminders*',
      'Email reminders',
      'Email confirmations',
      'Recurring appointments',
      '2-way calendar sync',
      'Remove Bookglow branding',
      'Block customers',
      'Google Reviews',
      'iOS and Android apps',
      'Custom notifications & reminders',
      'Team collaboration tools',
      'Donating 1% to plant trees',
    ],
  },
  {
    id: 'free',
    name: 'Start Free',
    headline: 'Start Free',
    description: 'Up to 4 users',
    price: 0,
    priceSuffix: '/month',
    featured: false,
    ctaLabel: 'Start FREE',
    ctaHref: '/signup',
    supportBadge: '24/7 HUMAN SUPPORT',
    features: [
      '200 appointments',
      'Accept payments',
      'Branded Booking Page',
      'Branded Mobile App',
      'Email reminders',
      'Email confirmations',
      'Integrations with leading apps',
      'iOS and Android apps',
      'Team collaboration tools',
    ],
  },
];

/** Testimonial shown on the pricing social-proof column. */
export const PRICING_TESTIMONIAL = {
  quote:
    'Highly recommend Bookglow to anyone. I must have tried a zillion apps and you can trust me that this is the best!',
  author: 'Sruthi Ravindran',
  role: 'Beauty & Wellness Owner',
  rating: 5,
};

/**
 * Landing-page pricing preview cards.
 * These are the compact summary cards shown in the FeaturesAndPricing section.
 */
export const LANDING_PRICING_PLANS = [
  {
    name: 'Starter',
    price: 0,
    blurb: 'Perfect for getting started.',
    popular: false,
  },
  {
    name: 'Pro',
    price: 79,
    blurb: 'Everything you need to grow.',
    popular: true,
  },
  {
    name: 'Premium',
    price: 159,
    blurb: 'Advanced tools for scaling.',
    popular: false,
  },
];
