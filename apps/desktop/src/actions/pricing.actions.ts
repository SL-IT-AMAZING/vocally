import { getAppState, produceAppState } from "../store";
import { getUSDPrices, PricingPlan } from "../utils/price.utils";
import { setMode } from "./login.actions";

export const loadPrices = () => {
  const prices = getUSDPrices();
  const mapped: Record<
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
  for (const [key, value] of Object.entries(prices)) {
    mapped[key] = {
      [key]: {
        unitAmount: value.unitAmount,
        unitAmountDecimal: value.unitAmount.toString(),
        currency: value.currency,
      },
    };
  }

  produceAppState((draft) => {
    draft.pricing.initialized = true;
    draft.priceValueByKey = mapped;
  });
};

export const openUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = true;
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const closeUpgradePlanDialog = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialog = false;
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const showUpgradePlanList = () => {
  produceAppState((draft) => {
    draft.pricing.upgradePlanDialogView = "plans";
    draft.pricing.upgradePlanPendingPlan = null;
  });
};

export const selectUpgradePlan = (plan: PricingPlan) => {
  const state = getAppState();
  if (!state.auth) {
    produceAppState((draft) => {
      draft.pricing.upgradePlanDialogView = "login";
      draft.pricing.upgradePlanPendingPlan = plan;
    });
    setMode("signIn");
  } else {
    produceAppState((draft) => {
      draft.pricing.upgradePlanPendingPlan = plan;
    });
  }
};
