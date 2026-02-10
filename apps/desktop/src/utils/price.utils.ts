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
  if (plan === "pro_monthly" || plan === "pro_yearly") {
    return "pro";
  }
  return "free";
};

export const getUSDPrices = () => ({
  pro_monthly: { unitAmount: 5, currency: "USD" },
  pro_yearly: { unitAmount: 50, currency: "USD" },
});

export const getDollarPriceFromKey = (_state: any, priceKey: PriceKey) => {
  const prices = getUSDPrices();
  const price = prices[priceKey];
  return price?.unitAmount ?? 0;
};
