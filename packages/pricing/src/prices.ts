export type PriceInfo = {
  currency: "KRW";
  unitAmount: number;
};

export const SUBSCRIPTION_PRICE_KEYS = [] as const;

export type SubscriptionPriceKey = (typeof SUBSCRIPTION_PRICE_KEYS)[number];

export const ONE_TIME_PRICE_KEYS = ["pro_monthly", "pro_yearly"] as const;

export type OneTimePriceKey = (typeof ONE_TIME_PRICE_KEYS)[number];

export const PRICE_KEYS = [
  ...SUBSCRIPTION_PRICE_KEYS,
  ...ONE_TIME_PRICE_KEYS,
] as const;

export type PriceKey = (typeof PRICE_KEYS)[number];

export const Prices: Record<PriceKey, PriceInfo> = {
  pro_monthly: {
    currency: "KRW",
    unitAmount: 7000,
  },
  pro_yearly: {
    currency: "KRW",
    unitAmount: 70000,
  },
};

// Kept as an empty compatibility map for the retired Firebase/Stripe path.
// Current checkout resolves prices by plan on the Toss edge function.
export const priceKeyById: Record<string, PriceKey> = {};
