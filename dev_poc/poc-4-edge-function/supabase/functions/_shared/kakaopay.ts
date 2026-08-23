export type KakaoPayPlan = "monthly";
export type KakaoPayOneTimeProductKey = "pro_30_day_once";

export const KAKAOPAY_API_BASE =
  "https://open-api.kakaopay.com/online/v1/payment";

export const KAKAOPAY_PRICES: Record<KakaoPayPlan, number> = {
  monthly: 7_000,
};

export const KAKAOPAY_ORDER_NAMES: Record<KakaoPayPlan, string> = {
  monthly: "Vocally Pro 월간 이용권",
};

export const KAKAOPAY_ONE_TIME_PRODUCTS: Record<
  KakaoPayOneTimeProductKey,
  { amount: number; currency: "KRW"; durationDays: number; orderName: string }
> = {
  pro_30_day_once: {
    amount: 7_000,
    currency: "KRW",
    durationDays: 30,
    orderName: "Vocally Pro 30일 이용권",
  },
};

export function isKakaoPayPlan(value: unknown): value is KakaoPayPlan {
  return value === "monthly";
}

export function isKakaoPayOneTimeProductKey(
  value: unknown,
): value is KakaoPayOneTimeProductKey {
  return value === "pro_30_day_once";
}

export function isKakaoPayPaymentEnabled(): boolean {
  return Deno.env.get("KAKAOPAY_ENABLED") === "true";
}

export function isKakaoPayOneTimePaymentEnabled(): boolean {
  return Deno.env.get("KAKAOPAY_ONETIME_ENABLED") === "true";
}

export function nextKakaoPayBillingAt(
  plan: KakaoPayPlan,
  from = new Date(),
): string {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

export function newKakaoPayOrderId(prefix = "vocally-kp"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function kakaoPayPartnerUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(userId),
  );
  const encoded = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `vocally-${encoded.slice(0, 32)}`;
}

export type KakaoPayConfig = {
  secretKey: string;
  subscriptionCid: string;
  siteUrl: string;
  cidSecret?: string;
};

export type KakaoPayOneTimeConfig = {
  secretKey: string;
  oneTimeCid: string;
  siteUrl: string;
  cidSecret?: string;
};

export function getKakaoPayConfig(): KakaoPayConfig | null {
  const secretKey = Deno.env.get("KAKAOPAY_SECRET_KEY");
  const subscriptionCid = Deno.env.get("KAKAOPAY_CID_SUBSCRIPTION");
  const siteUrl = Deno.env.get("KAKAOPAY_SITE_URL") ?? "https://vocally.site";
  if (!secretKey || !subscriptionCid) return null;
  return {
    secretKey,
    subscriptionCid,
    siteUrl,
    cidSecret: Deno.env.get("KAKAOPAY_CID_SECRET") ?? undefined,
  };
}

export function getKakaoPayOneTimeConfig(): KakaoPayOneTimeConfig | null {
  const secretKey = Deno.env.get("KAKAOPAY_SECRET_KEY");
  const oneTimeCid = Deno.env.get("KAKAOPAY_CID_ONETIME");
  const siteUrl = Deno.env.get("KAKAOPAY_SITE_URL") ?? "https://vocally.site";
  if (!secretKey || !oneTimeCid) return null;
  return {
    secretKey,
    oneTimeCid,
    siteUrl,
    cidSecret: Deno.env.get("KAKAOPAY_CID_ONETIME_SECRET") ?? undefined,
  };
}

export type KakaoPayResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export async function kakaoPayRequest<T>(
  secretKey: string,
  path: string,
  body: Record<string, unknown>,
): Promise<KakaoPayResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${KAKAOPAY_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `SECRET_KEY ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: {} as T };
  } finally {
    clearTimeout(timeout);
  }
}

export function withCidSecret(
  config:
    | Pick<KakaoPayConfig, "cidSecret">
    | Pick<KakaoPayOneTimeConfig, "cidSecret">,
  values: Record<string, unknown>,
): Record<string, unknown> {
  return config.cidSecret
    ? { ...values, cid_secret: config.cidSecret }
    : values;
}
