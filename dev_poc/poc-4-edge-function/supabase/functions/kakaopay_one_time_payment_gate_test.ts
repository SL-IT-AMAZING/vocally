const functionPaths = [
  "kakaopay-one-time-ready",
  "kakaopay-one-time-approve",
  "kakaopay-one-time-cancel",
] as const;

async function waitForDisabledEndpoint(url: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (response.status === 503) return;
      lastError = new Error(`expected 503, received ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error("endpoint did not start");
}

Deno.test({
  name:
    "one-time Kakao Pay provider-call endpoints reject requests while disabled",
  permissions: { env: true, net: true, read: true, run: true },
  async fn() {
    for (const functionName of functionPaths) {
      const child = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-env",
          "--allow-net",
          "--allow-read",
          "--no-prompt",
          `dev_poc/poc-4-edge-function/supabase/functions/${functionName}/index.ts`,
        ],
        env: { ...Deno.env.toObject(), KAKAOPAY_ONETIME_ENABLED: "false" },
        stdout: "null",
        stderr: "null",
      }).spawn();
      try {
        await waitForDisabledEndpoint("http://127.0.0.1:8000");
      } finally {
        child.kill("SIGTERM");
        await child.status;
      }
    }
  },
});

Deno.test({
  name:
    "one-time handlers keep provider state and product authority server-side",
  permissions: { read: true },
  async fn() {
    const ready = await Deno.readTextFile(
      new URL("kakaopay-one-time-ready/index.ts", import.meta.url),
    );
    const approve = await Deno.readTextFile(
      new URL("kakaopay-one-time-approve/index.ts", import.meta.url),
    );
    const cancel = await Deno.readTextFile(
      new URL("kakaopay-one-time-cancel/index.ts", import.meta.url),
    );
    const migration = await Deno.readTextFile(
      new URL(
        "../migrations/20260821011000_add_kakaopay_one_time_state_rpc.sql",
        import.meta.url,
      ),
    );

    const checks = [
      ready.indexOf("if (!isKakaoPayOneTimePaymentEnabled())") <
        ready.indexOf('"claim_kakaopay_one_time_order"'),
      ready.includes("KAKAOPAY_ONE_TIME_PRODUCTS[body.productKey]"),
      !ready.includes("body.amount") && !ready.includes("body.duration"),
      approve.indexOf("if (!isKakaoPayOneTimePaymentEnabled())") <
        approve.indexOf('"finalize_kakaopay_one_time_payment"'),
      approve.includes("approval.amount?.total === order.amount"),
      cancel.includes("Object.keys(body).length === 1"),
      cancel.includes("cancellable?.total !== order.amount"),
      cancel.includes('cancellation.data.status !== "CANCEL_PAYMENT"'),
      !cancel.includes("PART_CANCEL_PAYMENT"),
      migration.includes("pg_advisory_xact_lock"),
      migration.includes("finalize_kakaopay_one_time_payment"),
      migration.includes("revoke_kakaopay_one_time_payment"),
      migration.includes(
        "GRANT EXECUTE ON FUNCTION public.claim_kakaopay_one_time_order",
      ) &&
      migration.includes("TO service_role"),
    ];
    if (checks.some((check) => !check)) {
      throw new Error(
        "one-time payment authority or full-refund invariant regressed",
      );
    }
  },
});
