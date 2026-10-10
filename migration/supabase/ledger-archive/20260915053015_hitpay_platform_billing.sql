ALTER TABLE public.billing_customers ALTER COLUMN stripe_customer_id DROP NOT NULL, ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay', ADD COLUMN IF NOT EXISTS hitpay_customer_id text;
ALTER TABLE public.billing_customers DROP CONSTRAINT IF EXISTS billing_customers_provider_check;
ALTER TABLE public.billing_customers ADD CONSTRAINT billing_customers_provider_check CHECK (provider IN ('hitpay', 'stripe'));
ALTER TABLE public.outlet_subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL, ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay', ADD COLUMN IF NOT EXISTS hitpay_recurring_id text, ADD COLUMN IF NOT EXISTS hitpay_plan_id text;
ALTER TABLE public.outlet_subscriptions DROP CONSTRAINT IF EXISTS outlet_subscriptions_provider_check;
ALTER TABLE public.outlet_subscriptions ADD CONSTRAINT outlet_subscriptions_provider_check CHECK (provider IN ('hitpay', 'stripe'));
CREATE INDEX IF NOT EXISTS idx_outlet_subscriptions_hitpay_recurring ON public.outlet_subscriptions(hitpay_recurring_id);
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay';