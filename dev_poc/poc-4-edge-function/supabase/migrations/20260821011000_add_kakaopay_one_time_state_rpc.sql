-- The provider calls remain outside the database transaction. Once Kakao has
-- confirmed a result, all local order, entitlement, and member-plan changes are
-- committed or rolled back together by service-role-only functions.
CREATE OR REPLACE FUNCTION public.claim_kakaopay_one_time_order(
  p_user_id UUID,
  p_order_id TEXT,
  p_partner_user_id TEXT,
  p_product_key TEXT
)
RETURNS SETOF public.kakaopay_one_time_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_order public.kakaopay_one_time_orders;
BEGIN
  IF p_product_key <> 'pro_30_day_once' THEN
    RAISE EXCEPTION 'Unsupported Kakao Pay one-time product';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT));

  IF EXISTS (
    SELECT 1 FROM public.toss_subscriptions
    WHERE user_id = p_user_id AND next_billing_at > NOW()
  ) OR EXISTS (
    SELECT 1 FROM public.kakaopay_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'past_due', 'cancel_requested')
      AND current_period_end > NOW()
  ) OR EXISTS (
    SELECT 1 FROM public.kakaopay_one_time_entitlements
    WHERE user_id = p_user_id AND status = 'active' AND ends_at > NOW()
  ) THEN
    RAISE EXCEPTION 'An active Pro entitlement already exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kakaopay_one_time_orders
    WHERE user_id = p_user_id
      AND status IN ('ready', 'approving', 'reconciliation_required')
  ) THEN
    RAISE EXCEPTION 'A Kakao Pay one-time order is already in progress';
  END IF;

  INSERT INTO public.kakaopay_one_time_orders (
    order_id, user_id, product_key, amount, currency, order_name, partner_user_id
  ) VALUES (
    p_order_id, p_user_id, p_product_key, 7000, 'KRW',
    'Vocally Pro 30일 이용권', p_partner_user_id
  ) RETURNING * INTO created_order;

  RETURN NEXT created_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_kakaopay_one_time_payment(
  p_order_id TEXT,
  p_aid TEXT,
  p_provider_status TEXT,
  p_payment_method_type TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS TABLE(already_paid BOOLEAN, plan TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_order public.kakaopay_one_time_orders;
  next_plan TEXT;
BEGIN
  SELECT * INTO source_order
  FROM public.kakaopay_one_time_orders
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kakao Pay one-time order not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(source_order.user_id::TEXT));

  IF source_order.status = 'paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.kakaopay_one_time_entitlements
      WHERE source_order_id = source_order.order_id
    ) THEN
      RAISE EXCEPTION 'Paid Kakao Pay order needs reconciliation';
    END IF;
    RETURN QUERY SELECT TRUE, public.recompute_member_plan(source_order.user_id);
    RETURN;
  END IF;

  IF source_order.status <> 'approving' THEN
    RAISE EXCEPTION 'Kakao Pay one-time order is not being approved';
  END IF;

  INSERT INTO public.members (id, type, plan, is_on_trial)
  VALUES (source_order.user_id, 'user', 'free', FALSE)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.kakaopay_one_time_orders
  SET status = 'paid',
      aid = p_aid,
      provider_status = p_provider_status,
      payment_method_type = p_payment_method_type,
      paid_at = p_paid_at,
      failure_code = NULL,
      failure_message = NULL
  WHERE order_id = source_order.order_id;

  INSERT INTO public.kakaopay_one_time_entitlements (
    source_order_id, user_id, product_key, starts_at, ends_at, status
  ) VALUES (
    source_order.order_id,
    source_order.user_id,
    source_order.product_key,
    p_paid_at,
    p_paid_at + INTERVAL '30 days',
    'active'
  );

  next_plan := public.recompute_member_plan(source_order.user_id);
  RETURN QUERY SELECT FALSE, next_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_kakaopay_one_time_payment(
  p_order_id TEXT,
  p_provider_status TEXT,
  p_canceled_at TIMESTAMPTZ
)
RETURNS TABLE(plan TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_order public.kakaopay_one_time_orders;
  next_plan TEXT;
BEGIN
  SELECT * INTO source_order
  FROM public.kakaopay_one_time_orders
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kakao Pay one-time order not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(source_order.user_id::TEXT));

  IF source_order.status = 'refunded' THEN
    RETURN QUERY SELECT public.recompute_member_plan(source_order.user_id);
    RETURN;
  END IF;

  IF source_order.status <> 'paid' THEN
    RAISE EXCEPTION 'Kakao Pay one-time order is not refundable';
  END IF;

  UPDATE public.kakaopay_one_time_orders
  SET status = 'refunded',
      provider_status = p_provider_status,
      canceled_at = p_canceled_at
  WHERE order_id = source_order.order_id;

  UPDATE public.kakaopay_one_time_entitlements
  SET status = 'refunded', refunded_at = p_canceled_at
  WHERE source_order_id = source_order.order_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kakao Pay one-time entitlement needs reconciliation';
  END IF;

  next_plan := public.recompute_member_plan(source_order.user_id);
  RETURN QUERY SELECT next_plan;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_kakaopay_one_time_order(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_kakaopay_one_time_order(UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_kakaopay_one_time_order(UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_kakaopay_one_time_order(UUID, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_kakaopay_one_time_payment(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_kakaopay_one_time_payment(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_kakaopay_one_time_payment(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_kakaopay_one_time_payment(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.revoke_kakaopay_one_time_payment(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_kakaopay_one_time_payment(TEXT, TEXT, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_kakaopay_one_time_payment(TEXT, TEXT, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_kakaopay_one_time_payment(TEXT, TEXT, TIMESTAMPTZ) TO service_role;
