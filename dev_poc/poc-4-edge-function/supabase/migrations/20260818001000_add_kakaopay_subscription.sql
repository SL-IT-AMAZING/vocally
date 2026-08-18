-- Payment entitlement is server-managed. Members contains plan and usage limits, so a
-- browser must never be able to insert or update arbitrary rows in this table.
DROP POLICY IF EXISTS "members_update_own" ON public.members;
DROP POLICY IF EXISTS "members_insert_own" ON public.members;

CREATE TABLE IF NOT EXISTS public.kakaopay_payment_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  order_name TEXT NOT NULL,
  partner_user_id TEXT NOT NULL,
  tid TEXT UNIQUE,
  sid TEXT,
  billing_period_start TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN (
    'ready', 'approving', 'paid', 'partially_refunded', 'refunded',
    'failed', 'reconciliation_required'
  )),
  provider_status TEXT,
  payment_method_type TEXT,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, billing_period_start)
);

ALTER TABLE public.kakaopay_payment_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_kakaopay_orders_user_created
  ON public.kakaopay_payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kakaopay_orders_status
  ON public.kakaopay_payment_orders(status, created_at DESC);
CREATE TRIGGER kakaopay_payment_orders_updated_at
  BEFORE UPDATE ON public.kakaopay_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.kakaopay_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sid TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'past_due', 'cancel_requested', 'canceled'
  )),
  sid_status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_at TIMESTAMPTZ NOT NULL,
  cancel_requested_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kakaopay_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_kakaopay_subscriptions_due
  ON public.kakaopay_subscriptions(next_billing_at)
  WHERE status IN ('active', 'past_due', 'cancel_requested');
CREATE TRIGGER kakaopay_subscriptions_updated_at
  BEFORE UPDATE ON public.kakaopay_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.recompute_member_plan(p_member_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_plan TEXT := 'free';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.toss_subscriptions
    WHERE user_id = p_member_id
      AND next_billing_at > NOW()
  ) OR EXISTS (
    SELECT 1 FROM public.kakaopay_subscriptions
    WHERE user_id = p_member_id
      AND status IN ('active', 'past_due', 'cancel_requested')
      AND current_period_end > NOW()
  ) THEN
    next_plan := 'pro';
  END IF;

  UPDATE public.members
  SET plan = next_plan, is_on_trial = FALSE
  WHERE id = p_member_id;

  RETURN next_plan;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_member_plan(UUID) TO service_role;
