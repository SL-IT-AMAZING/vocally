import { Member, Nullable } from "@repo/types";
import { getMemberExceedsLimits, getWordLimit, getRec } from "@repo/utilities";
import { getIntl } from "../i18n";
import type { AppState } from "../state/app.state";
import { EffectivePlan } from "../types/member.types";
import { getMyUser } from "./user.utils";

export const getMyMember = (state: AppState): Nullable<Member> => {
  return getRec(state.memberById, state.auth?.id) ?? null;
};

export const getEffectivePlan = (state: AppState): EffectivePlan => {
  if (state.userPrefs?.isEnterprise) {
    return "enterprise";
  }
  return getMyMember(state)?.plan ?? "community";
};

export const planToDisplayName = (plan: EffectivePlan): string => {
  if (plan === "enterprise") {
    return getIntl().formatMessage({ defaultMessage: "Enterprise" });
  } else if (plan === "community") {
    return getIntl().formatMessage({ defaultMessage: "Community" });
  } else if (plan === "free") {
    return getIntl().formatMessage({ defaultMessage: "Trial" });
  } else {
    return getIntl().formatMessage({ defaultMessage: "Pro" });
  }
};

export const getIsPaying = (state: AppState): boolean => {
  const member = getMyMember(state);
  if (!member) {
    return false;
  }

  return member.plan !== "free";
};

export const getMemberExceedsLimitByState = (state: AppState): boolean => {
  const member = getMyMember(state);
  const config = state.config;
  if (!config) {
    return false;
  }

  const plan = member?.plan ?? "free";
  const monthlyLimit = getWordLimit(config, plan).perMonth;

  const serverWords = member?.wordsThisMonth ?? 0;
  const localUser = getMyUser(state);
  const localWords = localUser?.wordsThisMonth ?? 0;
  const effectiveWords = Math.max(serverWords, localWords);

  if (effectiveWords >= monthlyLimit) {
    return true;
  }

  if (member) {
    return getMemberExceedsLimits(member, config);
  }

  return false;
};
