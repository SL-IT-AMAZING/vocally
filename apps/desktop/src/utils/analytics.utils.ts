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

// === P0: Revenue ===

export function trackPaymentSubscribeClicked(selectedPlan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Payment Subscribe Clicked", { selectedPlan });
}

export function trackPaymentCheckoutOpened(selectedPlan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Payment Checkout Opened", { selectedPlan });
}

export function trackPlanSelected(plan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Plan Selected", { plan });
}

// === P0: Auth ===

export function trackSignInSuccess(method: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign In Success", { method });
}

export function trackSignUpSuccess() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign Up Success");
}

export function trackSignInFailed(method: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign In Failed", { method });
}

export function trackSignOut() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign Out");
}

export function trackPasswordResetRequested() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Password Reset Requested");
}

export function trackAccountDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Account Deleted");
}

// === P1: Dictation Lifecycle ===

export function trackDictationCompleted(props: {
  durationMs?: number | null;
  wordCount: number;
  appName?: string | null;
  mode: string;
  toneApplied: boolean;
}) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Completed", props);
}

export function trackDictationEmpty() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Empty");
}

export function trackDictationError(props: { stage: string; error: string }) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Error", props);
}

export function trackPostProcessingCompleted(props: {
  durationMs?: number | null;
}) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Post Processing Completed", props);
}

export function trackTranscriptionRetried() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcription Retried");
}

// === P1: Settings ===

export function trackSettingChanged(settingName: string, value?: unknown) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Setting Changed", {
    settingName,
    ...(value !== undefined ? { value: String(value) } : {}),
  });
}

// === P2: Feature Engagement ===

export function trackTermCreated() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Term Created");
}

export function trackTermDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Term Deleted");
}

export function trackToneCreated() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Created");
}

export function trackToneDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Deleted");
}

export function trackToneSelected(toneId: string | null) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Selected", { toneId });
}

export function trackTranscriptDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcript Deleted");
}

export function trackTranscriptViewed() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcript Viewed");
}

export function trackApiKeyAdded() {
  if (!isMixpanelReady()) return;
  mixpanel.track("API Key Added");
}

export function trackApiKeyDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("API Key Deleted");
}

export function trackHelpAction(action: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Help Action", { action });
}

export function trackBillingPortalOpened() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Billing Portal Opened");
}

export function trackOnboardingCompleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Onboarding Completed");
}
