const migration = await Deno.readTextFile(
  new URL(
    "../migrations/20260821010000_add_kakaopay_one_time_pass.sql",
    import.meta.url,
  ),
);
const memberGet = await Deno.readTextFile(
  new URL("member-get/index.ts", import.meta.url),
);

function requireSource(
  source: string,
  expected: string,
  message: string,
): void {
  if (!source.includes(expected)) throw new Error(message);
}

Deno.test("one-time entitlement schema binds access to one paid source order", () => {
  requireSource(
    migration,
    "source_order_id TEXT NOT NULL UNIQUE",
    "entitlement source order must be unique",
  );
  requireSource(
    migration,
    "validate_kakaopay_one_time_entitlement",
    "entitlement source validation trigger is missing",
  );
  requireSource(
    migration,
    "source_order.status <> 'paid'",
    "new entitlement must require a paid order",
  );
  requireSource(
    migration,
    "source_order.user_id IS DISTINCT FROM NEW.user_id",
    "entitlement user must match the source order",
  );
});

Deno.test("membership recomputation persists expiry without erasing free trials", () => {
  requireSource(
    migration,
    "AND ends_at <= NOW()",
    "expired entitlement state transition is missing",
  );
  requireSource(
    migration,
    "CASE WHEN next_plan = 'pro' THEN FALSE ELSE is_on_trial END",
    "free-plan recomputation must preserve trial state",
  );
  requireSource(
    migration,
    "FROM public.toss_subscriptions",
    "Toss access must remain part of effective membership",
  );
  requireSource(
    migration,
    "FROM public.kakaopay_subscriptions",
    "recurring Kakao Pay access must remain part of effective membership",
  );
});

Deno.test("member-get refreshes entitlement state before returning membership", () => {
  const recompute = memberGet.indexOf('supabase.rpc("recompute_member_plan"');
  const failedRefresh = memberGet.indexOf("Unable to refresh membership");
  const memberRead = memberGet.indexOf('.from("members")');
  if (
    recompute < 0 || failedRefresh < recompute || memberRead < failedRefresh
  ) {
    throw new Error("member-get must fail closed before reading membership");
  }
});
