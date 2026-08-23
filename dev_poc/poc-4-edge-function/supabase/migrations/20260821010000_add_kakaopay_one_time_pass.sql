-- One-time Kakao Pay access is isolated from recurring billing records. These
-- tables have RLS enabled with no browser policies; only service-role functions
-- can create, approve, refund, or reconcile paid access.
CREATE TABLE public.kakaopay_one_time_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL CHECK (product_key = 'pro_30_day_once'),
  amount INTEGER NOT NULL CHECK (amount = 7000),
  currency TEXT NOT NULL CHECK (currency = 'KRW'),
  order_name TEXT NOT NULL CHECK (order_name = 'Vocally Pro 30일 이용권'),
  partner_user_id TEXT NOT NULL,
  tid TEXT UNIQUE,
  aid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN (
    'ready', 'approving', 'paid', 'refunded', 'failed', 'reconciliation_required'
  )),
  provider_status TEXT,
  payment_method_type TEXT,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kakaopay_one_time_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_kakaopay_one_time_orders_user_created
  ON public.kakaopay_one_time_orders(user_id, created_at DESC);
CREATE INDEX idx_kakaopay_one_time_orders_status
  ON public.kakaopay_one_time_orders(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_kakaopay_one_time_order_identity_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.product_key IS DISTINCT FROM OLD.product_key
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.order_name IS DISTINCT FROM OLD.order_name THEN
    RAISE EXCEPTION 'Kakao Pay one-time order identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kakaopay_one_time_orders_identity_immutable
  BEFORE UPDATE ON public.kakaopay_one_time_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_kakaopay_one_time_order_identity_mutation();
CREATE TRIGGER kakaopay_one_time_orders_updated_at
  BEFORE UPDATE ON public.kakaopay_one_time_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.kakaopay_one_time_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_order_id TEXT NOT NULL UNIQUE
    REFERENCES public.kakaopay_one_time_orders(order_id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL CHECK (product_key = 'pro_30_day_once'),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'refunded', 'expired')),
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kakaopay_one_time_entitlements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_kakaopay_one_time_entitlements_user_active
  ON public.kakaopay_one_time_entitlements(user_id, ends_at)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.validate_kakaopay_one_time_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  source_order public.kakaopay_one_time_orders;
BEGIN
  IF TG_OP = 'UPDATE'
    AND (
      NEW.source_order_id IS DISTINCT FROM OLD.source_order_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.product_key IS DISTINCT FROM OLD.product_key
      OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
      OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
    ) THEN
    RAISE EXCEPTION 'Kakao Pay one-time entitlement identity is immutable';
  END IF;

  SELECT * INTO source_order
  FROM public.kakaopay_one_time_orders
  WHERE order_id = NEW.source_order_id;

  IF NOT FOUND
    OR source_order.user_id IS DISTINCT FROM NEW.user_id
    OR source_order.product_key IS DISTINCT FROM NEW.product_key
    OR (TG_OP = 'INSERT' AND source_order.status <> 'paid')
    OR (TG_OP = 'UPDATE' AND source_order.status NOT IN ('paid', 'refunded')) THEN
    RAISE EXCEPTION 'Kakao Pay one-time entitlement must match a paid source order';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER kakaopay_one_time_entitlements_validate_source
  BEFORE INSERT OR UPDATE ON public.kakaopay_one_time_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_kakaopay_one_time_entitlement();
CREATE TRIGGER kakaopay_one_time_entitlements_updated_at
  BEFORE UPDATE ON public.kakaopay_one_time_entitlements
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
  UPDATE public.kakaopay_one_time_entitlements
  SET status = 'expired'
  WHERE user_id = p_member_id
    AND status = 'active'
    AND ends_at <= NOW();

  IF EXISTS (
    SELECT 1 FROM public.toss_subscriptions
    WHERE user_id = p_member_id
      AND next_billing_at > NOW()
  ) OR EXISTS (
    SELECT 1 FROM public.kakaopay_subscriptions
    WHERE user_id = p_member_id
      AND status IN ('active', 'past_due', 'cancel_requested')
      AND current_period_end > NOW()
  ) OR EXISTS (
    SELECT 1 FROM public.kakaopay_one_time_entitlements
    WHERE user_id = p_member_id
      AND status = 'active'
      AND ends_at > NOW()
  ) THEN
    next_plan := 'pro';
  END IF;

  UPDATE public.members
  SET plan = next_plan,
      is_on_trial = CASE WHEN next_plan = 'pro' THEN FALSE ELSE is_on_trial END
  WHERE id = p_member_id;

  RETURN next_plan;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.recompute_member_plan(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_member_plan(UUID) TO service_role;
