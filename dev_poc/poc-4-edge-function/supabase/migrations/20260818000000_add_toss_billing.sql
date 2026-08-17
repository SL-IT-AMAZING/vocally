-- Toss Payments billing state is kept out of members because the members
-- table is readable by the authenticated user. Billing keys are provider
-- tokens and must remain service-role-only.
CREATE TABLE IF NOT EXISTS public.toss_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_key TEXT NOT NULL,
  billing_key TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled')),
  next_billing_at TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.toss_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_toss_subscriptions_due
  ON public.toss_subscriptions(next_billing_at)
  WHERE next_billing_at IS NOT NULL;

CREATE TRIGGER toss_subscriptions_updated_at
  BEFORE UPDATE ON public.toss_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.toss_payment_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  order_name TEXT NOT NULL,
  customer_key TEXT,
  payment_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.toss_payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toss_payment_orders_select_own"
  ON public.toss_payment_orders FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_toss_payment_orders_user
  ON public.toss_payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toss_payment_orders_status_due
  ON public.toss_payment_orders(status, due_at);

CREATE TRIGGER toss_payment_orders_updated_at
  BEFORE UPDATE ON public.toss_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
