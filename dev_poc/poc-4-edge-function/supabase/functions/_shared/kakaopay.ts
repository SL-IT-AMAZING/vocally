export type KakaoPayPlan = "monthly";

export const KAKAOPAY_API_BASE =
  "https://open-api.kakaopay.com/online/v1/payment";

export const KAKAOPAY_PRICES: Record<KakaoPayPlan, number> = {
  monthly: 7_000,
};

export const KAKAOPAY_ORDER_NAMES: Record<KakaoPayPlan, string> = {
  monthly: "Vocally Pro 월간 이용권",
};

export function isKakaoPayPlan(value: unknown): value is KakaoPayPlan {
  return value === "monthly";
}

export function isKakaoPayPaymentEnabled(): boolean {
  return Deno.env.get("KAKAOPAY_ENABLED") === "true";
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
  config: KakaoPayConfig,
  values: Record<string, unknown>,
): Record<string, unknown> {
  return config.cidSecret
    ? { ...values, cid_secret: config.cidSecret }
    : values;
}
