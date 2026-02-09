import mixpanel from "mixpanel-browser";

export const CURRENT_COHORT = "2025-01-b";

/**
 * Returns true if Mixpanel has been initialized with a valid token.
 * When VITE_MIXPANEL_TOKEN is empty (e.g. in CI builds), mixpanel.init()
 * is never called and all tracking methods must be skipped.
 */
export function isMixpanelReady(): boolean {
  try {
    return (
      typeof mixpanel.get_distinct_id === "function" &&
      !!mixpanel.get_distinct_id()
    );
  } catch {
    return false;
  }
}

export function trackPageView(pageName: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Page View", { page: pageName });
}

export function trackOnboardingStep(step: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Onboarding Step", { step });
}

export function trackDictationStart() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Activate Dictation Mode");
}

export function trackAgentStart() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Activate Agent Mode");
}

export function trackPaymentComplete() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Payment Complete");
}

export function trackButtonClick(
  name: string,
  props?: Record<string, unknown>,
) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Button Click", { name, ...props });
}

export function trackAppUsed(appName: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("App Used", { appName });
}
