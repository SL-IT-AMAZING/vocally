const functionPaths = [
  "kakaopay-ready",
  "kakaopay-approve",
  "kakaopay-recurring",
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
  name: "payment-mutating Kakao Pay endpoints reject requests while disabled",
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
        env: { ...Deno.env.toObject(), KAKAOPAY_ENABLED: "false" },
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
