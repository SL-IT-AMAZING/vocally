import {
  isKakaoPayPaymentEnabled,
  isKakaoPayPlan,
  kakaoPayPartnerUserId,
  nextKakaoPayBillingAt,
  withCidSecret,
  type KakaoPayConfig,
} from "./kakaopay.ts";

Deno.test("accepts only supported Kakao Pay subscription plans", () => {
  if (!isKakaoPayPlan("monthly") || !isKakaoPayPlan("yearly")) {
    throw new Error("supported plans were rejected");
  }
  if (isKakaoPayPlan("pro") || isKakaoPayPlan(undefined)) {
    throw new Error("unsupported plan was accepted");
  }
});

Deno.test("keeps Kakao Pay disabled unless the managed flag is exactly true", () => {
  const original = Deno.env.get("KAKAOPAY_ENABLED");
  try {
    Deno.env.delete("KAKAOPAY_ENABLED");
    if (isKakaoPayPaymentEnabled()) {
      throw new Error("Kakao Pay must be disabled when the flag is absent");
    }
    Deno.env.set("KAKAOPAY_ENABLED", "false");
    if (isKakaoPayPaymentEnabled()) {
      throw new Error("Kakao Pay must be disabled for a non-true value");
    }
    Deno.env.set("KAKAOPAY_ENABLED", "true");
    if (!isKakaoPayPaymentEnabled()) {
      throw new Error("Kakao Pay must be enabled for the explicit true value");
    }
  } finally {
    if (original === undefined) Deno.env.delete("KAKAOPAY_ENABLED");
    else Deno.env.set("KAKAOPAY_ENABLED", original);
  }
});

Deno.test("calculates recurring dates in UTC", () => {
  const base = new Date("2026-01-15T12:00:00.000Z");
  if (nextKakaoPayBillingAt("monthly", base) !== "2026-02-15T12:00:00.000Z") {
    throw new Error("monthly renewal date is incorrect");
  }
  if (nextKakaoPayBillingAt("yearly", base) !== "2027-01-15T12:00:00.000Z") {
    throw new Error("yearly renewal date is incorrect");
  }
});

Deno.test("uses a stable non-PII partner user identifier", async () => {
  const userId = "9b7b79c2-c605-4cdf-96c4-ff577b5b57e3";
  const first = await kakaoPayPartnerUserId(userId);
  const second = await kakaoPayPartnerUserId(userId);
  if (first !== second || first.includes(userId) || !first.startsWith("vocally-")) {
    throw new Error("partner user identifier is not private and deterministic");
  }
});

Deno.test("adds CID secret only when one was issued", () => {
  const config: KakaoPayConfig = {
    secretKey: "test",
    subscriptionCid: "TCSUBSCRIP",
    siteUrl: "https://vocally.site",
  };
  const withoutSecret = withCidSecret(config, { cid: config.subscriptionCid });
  if ("cid_secret" in withoutSecret) throw new Error("unexpected CID secret");
  const withSecret = withCidSecret({ ...config, cidSecret: "issued-secret" }, { cid: config.subscriptionCid });
  if (withSecret.cid_secret !== "issued-secret") throw new Error("missing CID secret");
});
