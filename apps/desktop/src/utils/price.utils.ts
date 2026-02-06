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

export const getKoreaPrices = () => ({
  pro_monthly: { unitAmount: 9900, currency: "KRW" },
  pro_yearly: { unitAmount: 99000, currency: "KRW" },
});

export const unitAmountToKRW = (
  unitAmount: number | null | undefined,
): number => {
  if (unitAmount == null) {
    return 0;
  }
  return unitAmount;
};

export const getKRWPriceFromKey = (priceKey: PriceKey) => {
  const prices = getKoreaPrices();
  const price = prices[priceKey];
  return unitAmountToKRW(price?.unitAmount);
};

export const getPriceIdFromKey = (key: string) => key;

export const getPricesWithRuntimeCaching = async (): Promise<
  Record<
    string,
    Record<
      string,
      {
        unitAmount: number | null;
        unitAmountDecimal: string | null;
        currency: string;
      }
    >
  >
> => {
  const koreaPrices = getKoreaPrices();
  const result: Record<
    string,
    Record<
      string,
      {
        unitAmount: number | null;
        unitAmountDecimal: string | null;
        currency: string;
      }
    >
  > = {};

  for (const [key, value] of Object.entries(koreaPrices)) {
    result[key] = {
      [key]: {
        unitAmount: value.unitAmount,
        unitAmountDecimal: value.unitAmount.toString(),
        currency: value.currency,
      },
    };
  }

  return result;
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
