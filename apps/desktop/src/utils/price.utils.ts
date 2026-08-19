import { PRICE_KEYS, type PriceKey } from "@repo/pricing";
import { MemberPlan } from "@repo/types";

export const PRICING_PLANS = [
  "community",
  "free",
  "enterprise",
  ...PRICE_KEYS,
] as const;
export type PricingPlan = (typeof PRICING_PLANS)[number];

export const convertPricingPlanToMemberPlan = (
  plan: PricingPlan,
): MemberPlan => {
  if (
    plan === "pro_monthly" ||
    plan === "pro_semiannual" ||
    plan === "pro_yearly"
  ) {
    return "pro";
  }
  return "free";
};

export const getKRWPrices = () => ({
  pro_monthly: { unitAmount: 7000, currency: "KRW" },
  pro_semiannual: { unitAmount: 39000, currency: "KRW" },
  pro_yearly: { unitAmount: 70000, currency: "KRW" },
});

export const getKrwPriceFromKey = (_state: any, priceKey: PriceKey) => {
  const prices = getKRWPrices();
  const price = prices[priceKey];
  return price?.unitAmount ?? 0;
};
