-- Production already has the two historical payment migrations' schema but not their
-- migration-history rows. This forward migration changes only the four plan CHECK
-- constraints after proving the expected monthly/yearly constraints are present.
DO $$
DECLARE
  expected_plan_checks INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO expected_plan_checks
  FROM pg_constraint constraint_row
  JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
  WHERE schema_row.nspname = 'public'
    AND constraint_row.contype = 'c'
    AND (table_row.relname, constraint_row.conname) IN (
      ('toss_subscriptions', 'toss_subscriptions_plan_check'),
      ('toss_payment_orders', 'toss_payment_orders_plan_check'),
      ('kakaopay_payment_orders', 'kakaopay_payment_orders_plan_check'),
      ('kakaopay_subscriptions', 'kakaopay_subscriptions_plan_check')
    )
    AND pg_get_constraintdef(constraint_row.oid) LIKE '%monthly%'
    AND pg_get_constraintdef(constraint_row.oid) LIKE '%yearly%'
    AND pg_get_constraintdef(constraint_row.oid) NOT LIKE '%semiannual%';

  IF expected_plan_checks <> 4 THEN
    RAISE EXCEPTION 'Expected four monthly/yearly payment plan constraints before migration, found %', expected_plan_checks;
  END IF;
END;
$$;

ALTER TABLE public.toss_subscriptions
  DROP CONSTRAINT toss_subscriptions_plan_check;
ALTER TABLE public.toss_subscriptions
  ADD CONSTRAINT toss_subscriptions_plan_check
  CHECK (plan IN ('monthly', 'semiannual', 'yearly'));

ALTER TABLE public.toss_payment_orders
  DROP CONSTRAINT toss_payment_orders_plan_check;
ALTER TABLE public.toss_payment_orders
  ADD CONSTRAINT toss_payment_orders_plan_check
  CHECK (plan IN ('monthly', 'semiannual', 'yearly'));

ALTER TABLE public.kakaopay_payment_orders
  DROP CONSTRAINT kakaopay_payment_orders_plan_check;
ALTER TABLE public.kakaopay_payment_orders
  ADD CONSTRAINT kakaopay_payment_orders_plan_check
  CHECK (plan IN ('monthly', 'semiannual', 'yearly'));

ALTER TABLE public.kakaopay_subscriptions
  DROP CONSTRAINT kakaopay_subscriptions_plan_check;
ALTER TABLE public.kakaopay_subscriptions
  ADD CONSTRAINT kakaopay_subscriptions_plan_check
  CHECK (plan IN ('monthly', 'semiannual', 'yearly'));

DO $$
DECLARE
  semiannual_plan_checks INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO semiannual_plan_checks
  FROM pg_constraint constraint_row
  JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
  WHERE schema_row.nspname = 'public'
    AND constraint_row.contype = 'c'
    AND (table_row.relname, constraint_row.conname) IN (
      ('toss_subscriptions', 'toss_subscriptions_plan_check'),
      ('toss_payment_orders', 'toss_payment_orders_plan_check'),
      ('kakaopay_payment_orders', 'kakaopay_payment_orders_plan_check'),
      ('kakaopay_subscriptions', 'kakaopay_subscriptions_plan_check')
    )
    AND pg_get_constraintdef(constraint_row.oid) LIKE '%monthly%'
    AND pg_get_constraintdef(constraint_row.oid) LIKE '%semiannual%'
    AND pg_get_constraintdef(constraint_row.oid) LIKE '%yearly%';

  IF semiannual_plan_checks <> 4 THEN
    RAISE EXCEPTION 'Failed to create all semiannual payment plan constraints, found %', semiannual_plan_checks;
  END IF;
END;
$$;
