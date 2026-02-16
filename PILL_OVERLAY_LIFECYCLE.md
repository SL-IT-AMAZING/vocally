# Pill Overlay Window Lifecycle During Onboarding/Login

## EXECUTIVE SUMMARY

The pill overlay window is created **at app startup** (not lazily) and its visibility is controlled by the `dictationOverrideEnabled` flag during onboarding. The flag is set AFTER `submitOnboarding()` resolves but BEFORE `finishOnboarding()` is called.

---

## 1. PILL OVERLAY WINDOW CREATION

### 1.1 Window Label Definition
**File:** `apps/desktop/src-tauri/src/overlay.rs`
- **Line 4:** `pub const PILL_OVERLAY_LABEL: &str = "pill-overlay";`

### 1.2 Window Creation Function
**File:** `apps/desktop/src-tauri/src/overlay.rs`
- **Lines 105-120:** `pub fn ensure_pill_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()>`
  - Checks if window exists (line 106)
  - Creates webview with query param `"pill-overlay"=1` (line 110)
  - Calls `create_overlay_window()` to build the window (lines 111-117)
  - Window is **non-focusable**, **click-through**, **always-on-top**, **transparent** (lines 74-85)
  - **Initially invisible** on non-Linux platforms (line 88)

### 1.3 Window Creation at App Startup
**File:** `apps/desktop/src-tauri/src/app.rs`
- **Line 132:** `crate::overlay::ensure_pill_overlay_window(&app_handle)` — called during app setup
- **Lines 142-146:** Window is shown with `show_overlay_no_focus()` and set to click-through
- Context: Called in the `.setup()` closure of the Tauri builder (lines 44-166)

---

## 2. PILL OVERLAY VISIBILITY CONTROL

### 2.1 Dictation Unlock Flag
**File:** `apps/desktop/src/utils/user.utils.ts`
- **Lines 32-34:** 
  ```typescript
  export const getIsDictationUnlocked = (state: AppState): boolean => {
    return getIsOnboarded(state) || state.onboarding.dictationOverrideEnabled;
  };
  ```
  - Returns `true` if user is onboarded OR override flag is enabled
  - This flag controls whether dictation (and pill visibility) is active

### 2.2 Pill Visibility Logic
**File:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx`
- **Lines 103-112:**
  ```typescript
  const dictationPillVisibility = useAppStore((state) =>
    getEffectivePillVisibility(state.userPrefs?.dictationPillVisibility),
  );
  const isDictationUnlocked = useAppStore(getIsDictationUnlocked);
  
  const isOverlayActive = !isIdle;
  const isVisible =
    isDictationUnlocked &&
    dictationPillVisibility !== "hidden" &&
    (isOverlayActive || dictationPillVisibility !== "while_active");
  ```
  - Pill is visible only if `isDictationUnlocked` is true AND visibility prefs allow

### 2.3 Override Flag in Onboarding State
**File:** `apps/desktop/src/state/onboarding.state.ts`
- **Line 31:** `dictationOverrideEnabled: boolean;` — part of `OnboardingState` type
- **Line 49:** `dictationOverrideEnabled: false,` — initial value is false

---

## 3. ONBOARDING FLOW - WHEN FLAGS ARE SET

### 3.1 TutorialForm Component Entry (Initial Setup)
**File:** `apps/desktop/src/components/onboarding/TutorialForm.tsx`
- **Lines 95-119:** useEffect that runs on component mount:
  ```typescript
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await submitOnboarding();  // Line 99
        if (cancelled) {
          return;
        }
        produceAppState((draft) => {
          draft.onboarding.dictationOverrideEnabled = true;  // Line 104 — SET AFTER submitOnboarding
        });
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };
    init();
    return () => {
      cancelled = true;
      produceAppState((draft) => {
        draft.onboarding.dictationOverrideEnabled = false;  // Line 116 — UNSET on cleanup
      });
    };
  }, []);
  ```
  - **Timing:** `dictationOverrideEnabled` is set AFTER `submitOnboarding()` resolves
  - **Cleanup:** Unset when component unmounts (e.g., when user finishes onboarding)

### 3.2 Submit Onboarding (Creates User & Preferences)
**File:** `apps/desktop/src/actions/onboarding.actions.ts`
- **Lines 85-203:** `export const submitOnboarding = async ()`
  - **Line 105-108:** Sets `submitting: true` in state
  - **Lines 116-136:** Creates `User` object with `onboarded: false`
  - **Lines 138-181:** Creates `UserPreferences` object
  - **Lines 183-186:** Saves both to repos
  - **Lines 188-193:** Updates app state with saved user & preferences
  - **Line 195:** Calls `refreshMember()` to sync membership data
  - Does NOT set `onboarded: true` yet

### 3.3 Finish Onboarding (Sets onboarded: true)
**File:** `apps/desktop/src/actions/onboarding.actions.ts`
- **Lines 205-236:** `export const finishOnboarding = async ()`
  - **Lines 216-222:** Creates updated `User` object with:
    - `onboarded: true`
    - `onboardedAt: now`
    - `hasFinishedTutorial: true`
  - **Line 224:** Saves user
  - **Lines 225-227:** Updates app state with saved user
  - **Line 229:** Calls `setAutoLaunchEnabled(true)`

---

## 4. OVERLAY STATE SYNCHRONIZATION

### 4.1 Overlay Ready Event
**File:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx`
- **Lines 97-101:**
  ```typescript
  useEffect(() => {
    emitTo("main", "overlay_ready", { windowLabel: "pill-overlay" }).catch(
      console.error,
    );
  }, []);
  ```
  - Pill overlay window emits `overlay_ready` event to main window
  - Payload contains `windowLabel: "pill-overlay"`

### 4.2 Overlay Ready Listener (Main Window)
**File:** `apps/desktop/src/components/root/OverlaySyncSideEffects.ts`
- **Lines 50-59:**
  ```typescript
  useTauriListen<OverlayReadyPayload>("overlay_ready", (payload) => {
    const { windowLabel } = payload;
    if (!OVERLAY_TARGETS.includes(windowLabel)) {
      return;
    }
    
    const state = getAppState();
    const fullPayload = buildFullSyncPayload(state);
    emitTo(windowLabel, "overlay_sync", fullPayload).catch(console.error);
  });
  ```
  - Listener at lines 50-59
  - Sends full app state to overlay windows

### 4.3 Full Payload Includes Onboarding State
**File:** `apps/desktop/src/components/root/OverlaySyncSideEffects.ts`
- **Lines 15-23:**
  ```typescript
  const buildFullSyncPayload = (state: AppState): OverlaySyncPayload => ({
    hotkeyById: state.hotkeyById,
    agent: state.agent,
    userPrefs: state.userPrefs,
    userById: state.userById,
    auth: state.auth,
    memberById: state.memberById,
    onboarding: state.onboarding,  // Line 22 — includes dictationOverrideEnabled
  });
  ```
  - Includes `onboarding` state (with `dictationOverrideEnabled`)

### 4.4 Overlay Sync Listener (Pill Window)
**File:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx`
- **Lines 91-95:**
  ```typescript
  useTauriListen<OverlaySyncPayload>("overlay_sync", (payload) => {
    produceAppState((draft) => {
      Object.assign(draft, payload);
    });
  });
  ```
  - Receives synced state, applies to pill overlay's app state
  - Now pill window has `onboarding.dictationOverrideEnabled` flag

---

## 5. WINDOW LABEL REFERENCES

### All Pill Overlay Label References:
- **Rust constants:** `apps/desktop/src-tauri/src/overlay.rs:4`
- **Rust usage in app.rs:** `apps/desktop/src-tauri/src/app.rs:142`
- **TypeScript main window:** `apps/desktop/src/main.tsx:34`
- **OverlaySyncSideEffects:** `apps/desktop/src/components/root/OverlaySyncSideEffects.ts:13`
- **PillOverlayRoot emit:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx:98`

---

## 6. DICTATION OVERRIDE ENABLED REFERENCES

### All dictationOverrideEnabled References:
- **State definition:** `apps/desktop/src/state/onboarding.state.ts:31`
- **Initial value:** `apps/desktop/src/state/onboarding.state.ts:49`
- **Set after submit:** `apps/desktop/src/components/onboarding/TutorialForm.tsx:104`
- **Unset on cleanup:** `apps/desktop/src/components/onboarding/TutorialForm.tsx:116`
- **Used in getIsDictationUnlocked:** `apps/desktop/src/utils/user.utils.ts:33`
- **Used in pill visibility:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx:106`

---

## 7. LOGIN/AUTH FLOW (High Level)

### 7.1 Auth Commands (Rust)
**File:** `apps/desktop/src-tauri/src/commands.rs`
- `pub async fn start_google_sign_in(...)` — initiates Google OAuth
- `pub async fn start_kakao_sign_in(app_handle: AppHandle)` — initiates Kakao OAuth

### 7.2 Login Actions (TypeScript)
**File:** `apps/desktop/src/actions/login.actions.ts`
- `handleGoogleAuthPayload()` — processes Google auth response

### 7.3 User State Setup (After Login)
**File:** `apps/desktop/src/actions/user.actions.ts`
- `setCurrentUser(draft: AppState, user: User)` — updates app state with user
  - Line 189 in onboarding.actions.ts: called after `submitOnboarding()`
  - Line 226 in onboarding.actions.ts: called after `finishOnboarding()`

---

## 8. GETISDICTATIONUNLOCKED USAGE FLOW

**File:** `apps/desktop/src/utils/user.utils.ts:32-34`
```
getIsDictationUnlocked() → checks:
  ├─ getIsOnboarded(state) → checks: state.userById[userId]?.onboarded === true
  └─ state.onboarding.dictationOverrideEnabled
```

**Usage locations:**
1. **Pill Overlay Visibility:** `apps/desktop/src/components/overlay/PillOverlayRoot.tsx:106`
   - Controls if pill is rendered at all

2. **Dictation Start Checks:** `apps/desktop/src/components/root/RootSideEffects.ts:512,529,671`
   - Lines 512, 529, 671: Prevent dictation if not unlocked

3. **Waveform Section:** `apps/desktop/src/components/overlay/WaveformSection.tsx:38`
   - Part of overlay UI

---

## 9. PILL OVERLAY WINDOW LIFECYCLE TIMELINE

```
T0: App Startup (Tauri setup)
    ├─ app.rs:132 → ensure_pill_overlay_window() called
    └─ overlay.rs:105-120 → window created (invisible, click-through)

T1: Pills overlay window ready
    ├─ main.tsx:34 → pill-overlay window loads
    └─ PillOverlayRoot.tsx:98 → emits overlay_ready event

T2: Main window receives overlay_ready
    ├─ OverlaySyncSideEffects.ts:50 → listens for overlay_ready
    └─ OverlaySyncSideEffects.ts:57 → sends overlay_sync with full state

T3: User navigates to onboarding/tutorial
    ├─ TutorialForm.tsx:95-119 → useEffect runs on mount
    └─ TutorialForm.tsx:99 → calls submitOnboarding()

T4: After submitOnboarding() resolves
    ├─ TutorialForm.tsx:103-105 → sets dictationOverrideEnabled = true
    ├─ OverlaySyncSideEffects.ts:61-95 → syncs changed onboarding state
    └─ PillOverlayRoot.tsx:106 → reads getIsDictationUnlocked()
        → getIsDictationUnlocked() = true (override flag is set)
        → Pill becomes visible in overlay window

T5: User completes onboarding
    ├─ TutorialForm.tsx:149 → calls finishOnboarding()
    └─ onboarding.actions.ts:219 → sets user.onboarded = true

T6: After finishOnboarding() resolves
    ├─ TutorialForm.tsx:113-118 → cleanup: unsets dictationOverrideEnabled = false
    └─ But now getIsOnboarded() = true (because user.onboarded is set)
        → getIsDictationUnlocked() still = true
        → Pill remains visible
```

---

## 10. KEY TAKEAWAYS

| Aspect | Answer |
|--------|--------|
| **When is pill overlay created?** | **At app startup** (app.rs:132) |
| **When is it shown?** | **At app startup** (app.rs:144) — but visibility controlled by `getIsDictationUnlocked()` |
| **When is dictationOverrideEnabled set?** | **After submitOnboarding() resolves** (TutorialForm.tsx:104) |
| **When is it unset?** | **When TutorialForm component unmounts** (TutorialForm.tsx:116) |
| **Does override flag exist BEFORE finishOnboarding?** | **YES** — set after submit, but before finish |
| **Is the window created lazily?** | **NO** — created at app startup |
| **What controls pill visibility?** | **getIsDictationUnlocked()** which checks: onboarded OR dictationOverrideEnabled |
| **Window label in code?** | `"pill-overlay"` (overlay.rs:4) |
