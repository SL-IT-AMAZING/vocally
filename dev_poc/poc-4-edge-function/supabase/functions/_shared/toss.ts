export type TossPlan = "monthly" | "semiannual" | "yearly";

export const TOSS_API_BASE = "https://api.tosspayments.com/v1";
export const TOSS_SITE_URL =
  Deno.env.get("TOSS_SITE_URL") ?? "https://vocally-web.vercel.app";

export const TOSS_PRICES: Record<TossPlan, number> = {
  monthly: Number(Deno.env.get("TOSS_PRICE_MONTHLY_KRW") ?? "7000"),
  semiannual: Number(Deno.env.get("TOSS_PRICE_SEMIANNUAL_KRW") ?? "39000"),
  yearly: Number(Deno.env.get("TOSS_PRICE_YEARLY_KRW") ?? "70000"),
};

export const TOSS_ORDER_NAMES: Record<TossPlan, string> = {
  monthly: "Vocally Pro 월간 이용권",
  semiannual: "Vocally Pro 반기 이용권",
  yearly: "Vocally Pro 연간 이용권",
};

export function isTossPlan(value: unknown): value is TossPlan {
  return value === "monthly" || value === "semiannual" || value === "yearly";
}

export function nextBillingAt(plan: TossPlan, from = new Date()): string {
  const next = new Date(from);
  if (plan === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else if (plan === "semiannual") {
    next.setUTCMonth(next.getUTCMonth() + 6);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }
  return next.toISOString();
}

export function tossAuthHeader(secretKey: string): string {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

export async function tossRequest<T>(
  secretKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(`${TOSS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: tossAuthHeader(secretKey),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, data };
}

export function newOrderId(prefix = "vocally"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function newCustomerKey(): string {
  return `vocally-${crypto.randomUUID()}`;
}
