import {
  isKakaoPayPaymentEnabled,
  isKakaoPayOneTimeProductKey,
  isKakaoPayPlan,
  KAKAOPAY_ONE_TIME_PRODUCTS,
  KAKAOPAY_ORDER_NAMES,
  KAKAOPAY_PRICES,
  type KakaoPayConfig,
  kakaoPayPartnerUserId,
  nextKakaoPayBillingAt,
  withCidSecret,
} from "./kakaopay.ts";

Deno.test("accepts only the Kakao Pay monthly subscription plan", () => {
  if (!isKakaoPayPlan("monthly")) {
    throw new Error("monthly plan was rejected");
  }
  if (
    isKakaoPayPlan("semiannual") ||
    isKakaoPayPlan("yearly") ||
    isKakaoPayPlan("pro") ||
    isKakaoPayPlan(undefined)
  ) {
    throw new Error("a non-monthly plan was accepted");
  }
});

Deno.test("keeps Kakao Pay prices and product names server-owned", () => {
  if (
    KAKAOPAY_PRICES.monthly !== 7_000 ||
    KAKAOPAY_ORDER_NAMES.monthly !== "Vocally Pro 월간 이용권"
  ) {
    throw new Error("Kakao Pay product catalog is incorrect");
  }
});

Deno.test("keeps the one-time product key, price, and duration server-owned", () => {
  const product = KAKAOPAY_ONE_TIME_PRODUCTS.pro_30_day_once;
  if (
    !isKakaoPayOneTimeProductKey("pro_30_day_once") ||
    isKakaoPayOneTimeProductKey("monthly") ||
    isKakaoPayOneTimeProductKey(undefined) ||
    product.amount !== 7_000 ||
    product.currency !== "KRW" ||
    product.durationDays !== 30 ||
    product.orderName !== "Vocally Pro 30일 이용권"
  ) {
    throw new Error("one-time product catalog is incorrect");
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

Deno.test("calculates the monthly recurring date in UTC", () => {
  const base = new Date("2026-01-15T12:00:00.000Z");
  if (nextKakaoPayBillingAt("monthly", base) !== "2026-02-15T12:00:00.000Z") {
    throw new Error("monthly renewal date is incorrect");
  }
});

Deno.test("uses a stable non-PII partner user identifier", async () => {
  const userId = "9b7b79c2-c605-4cdf-96c4-ff577b5b57e3";
  const first = await kakaoPayPartnerUserId(userId);
  const second = await kakaoPayPartnerUserId(userId);
  if (
    first !== second || first.includes(userId) || !first.startsWith("vocally-")
  ) {
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
  const withSecret = withCidSecret({ ...config, cidSecret: "issued-secret" }, {
    cid: config.subscriptionCid,
  });
  if (withSecret.cid_secret !== "issued-secret") {
    throw new Error("missing CID secret");
  }
});
