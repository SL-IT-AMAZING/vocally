# Plan: Double-Tap Fn Key to Toggle Recording

> **Revision 2** — Updated after Momus review. Fixes: critical double-tap-then-stop bug (secondTapConsumed flag), scope clarification (both controllers), timer field honesty, Step 4 accuracy, visual accessibility (lock icon), and additional test cases.

## Requirements Summary

- **Double-tap Fn** (two taps within 400ms window) enters **toggle mode**: recording starts, stays on without holding
- **Single Fn press** while in toggle mode stops recording
- **Push-to-talk (hold)** behavior remains unchanged: hold Fn = record, release = stop
- **Single quick tap** (without a second tap) should NOT lock recording (this CHANGES current behavior)
- **Pill click** continues to toggle recording as before
- **Visual feedback** in the pill overlay clearly differentiates toggle mode from push-to-talk mode (color change + lock icon)
- **HARD RULE**: Never modify `stopRecording()` control flow in `RootSideEffects.ts`

## Scope & Constraints

### In Scope

- `ActivationController` state machine changes in `activation.utils.ts` — applies to **both** dictation and agent controllers (same class, shared behavior)
- New `isDictationLocked` field in `AppState` for cross-window communication (dictation pill overlay only)
- Visual indicator in `PillOverlayRoot.tsx` (waveform color change + lock icon)
- Overlay sync mechanism to propagate lock state to pill overlay window
- Unit tests for the new state machine

### Out of Scope

- Agent overlay visual changes (agent overlay has its own separate UI; the agent controller inherits double-tap behavior from the shared class, but no visual feedback is wired for it)
- Rust-side changes (no changes to `keyboard.rs`, `overlay.rs`, or `commands.rs`)
- Settings UI (no user-configurable double-tap window for now)
- Changes to `startRecording()` or `stopRecording()` in `RootSideEffects.ts`

### Technical Constraints

- **ABSOLUTE HARD RULE**: Do NOT modify `stopRecording()` control flow in `RootSideEffects.ts` (L371-508). A previous attempt (v1.0.9) caused a critical text deletion regression.
- **ABSOLUTE HARD RULE**: Do NOT modify `startRecording()` control flow in `RootSideEffects.ts` (L241-369).
- The overlay phase communication goes through Rust (`set_phase` command → `overlay_phase` event). We will NOT add a new Rust command. Instead we use the existing `OverlaySyncPayload` TypeScript-to-TypeScript event system.
- The 60ms keyboard polling interval means double-tap detection must have tolerance for timing jitter.

## Behavioral Specification

### Current Behavior (Being Changed)

| Action                        | Result                        |
| ----------------------------- | ----------------------------- |
| Press Fn                      | Start recording immediately   |
| Release Fn quickly (<500ms)   | **Lock recording** (stays on) |
| Press Fn while locked         | Stop recording                |
| Hold Fn, release after >500ms | Stop recording (PTT)          |

### New Behavior (Target)

| Action                             | Result                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Press Fn                           | Start recording immediately                                                                      |
| Release Fn quickly (<500ms)        | Start pending-deactivation timer (400ms)                                                         |
| Timer expires (no second tap)      | **Stop recording** (single tap = stop)                                                           |
| Second press within 400ms          | **Lock recording immediately** (double-tap = toggle mode, green waveform appears on 2nd keydown) |
| Second release after double-tap    | **No-op** (consumed by `_secondTapConsumed` flag)                                                |
| Press Fn while locked (subsequent) | Stop recording                                                                                   |
| Hold Fn, release after >500ms      | Stop recording (PTT, unchanged)                                                                  |
| Pill click                         | Toggle as before (enters locked mode)                                                            |

### Key Behavior Change

The **single quick tap** goes from "lock recording" to "stop recording after a brief delay." This is the fundamental behavioral shift. Users who currently rely on single-tap-to-lock will need to double-tap instead.

## State Machine Design

### States

```
INACTIVE           → Not recording
ACTIVE_PTT         → Recording, key is held down (push-to-talk)
ACTIVE_PENDING     → Recording, first tap released, waiting for possible 2nd tap
ACTIVE_LOCKED      → Recording, in toggle mode (key not held)
```

### Transitions

```
INACTIVE + handlePress()
  → ACTIVE_PTT, call doActivate()
  (onActivate called exactly ONCE here; no subsequent doActivate calls during double-tap)

ACTIVE_PTT + handleRelease() [elapsed < TAP_THRESHOLD]
  → ACTIVE_PENDING, start pendingDeactivation timer (DOUBLE_TAP_WINDOW_MS)

ACTIVE_PTT + handleRelease() [elapsed >= TAP_THRESHOLD]
  → INACTIVE, call doDeactivate() (long hold = PTT stop, unchanged)

ACTIVE_PENDING + handlePress()
  → ACTIVE_LOCKED, cancel timer, set _secondTapConsumed = true
  (double-tap detected! Lock immediately on 2nd keydown for instant visual feedback)
  (onActivate is NOT called again — recording was already active from 1st press)

ACTIVE_PENDING + timer expires
  → INACTIVE, call doDeactivate() (single tap = stop after delay)

ACTIVE_LOCKED + handleRelease() [_secondTapConsumed = true]
  → ACTIVE_LOCKED (stay locked), clear _secondTapConsumed flag
  (the release completing the double-tap is consumed, NOT treated as a stop)

ACTIVE_LOCKED + handleRelease() [_secondTapConsumed = false, elapsed < TAP_THRESHOLD]
  → INACTIVE, call doDeactivate() (subsequent tap while locked = stop)

ACTIVE_LOCKED + handleRelease() [elapsed >= TAP_THRESHOLD]
  → no-op (long hold while locked = ignore, stay locked)

ACTIVE_LOCKED + toggle() [from pill click]
  → INACTIVE, call doDeactivate()

INACTIVE + toggle() [from pill click]
  → ACTIVE_LOCKED, call doActivate() (pill click goes directly to locked)
```

### Critical Fix: The `_secondTapConsumed` Flag

**Problem (identified by Momus)**: Without this flag, locking on 2nd press causes an immediate deactivation when the 2nd release arrives (<500ms later), because `handleRelease` sees `_isLocked && elapsed < TAP_THRESHOLD → doDeactivate()`.

**Solution**: When `handlePress()` detects a double-tap (2nd tap while pending), it sets `_secondTapConsumed = true`. When `handleRelease()` fires for that same press, it checks the flag first: if true, it clears the flag and returns early (no deactivation). The NEXT press-release cycle will deactivate normally.

**Why lock on press (not release)**: Locking on 2nd keydown gives faster perceived responsiveness — the green waveform appears immediately when the user presses the key the second time, not after they lift it. The flag is a simple, predictable mechanism to prevent the subsequent release from undoing the lock.

### New Constants

```typescript
const DOUBLE_TAP_WINDOW_MS = 400; // Time window for second tap (300-500ms range)
const TAP_THRESHOLD_MS = 500; // Existing, unchanged
```

### New Instance Fields

```typescript
private _secondTapConsumed = false;  // Prevents 2nd release from undoing double-tap lock
```

### State Tracking

The `ACTIVE_PENDING` state is implicit: `_isActive && !_isLocked && deactivateTimer !== null`.

**Important note**: While the `deactivateTimer` field exists in the current codebase, **it is never actually set today**. The `clearPendingDeactivation()` method exists and clears it, but no code path currently assigns a timeout to it. This plan introduces the **first real usage** of `deactivateTimer` for the pending-deactivation timer. The field and cleanup method are pre-existing infrastructure, but the timer behavior itself is entirely new and must be tested thoroughly.

## Implementation Steps

### Step 1: Add `isDictationLocked` to AppState

**File**: `apps/desktop/src/state/app.state.ts`

- Add `isDictationLocked: boolean` field to `AppState` type (after `activeRecordingMode`)
- Set initial value to `false` in `INITIAL_APP_STATE`

**Rationale**: The pill overlay runs in a separate Tauri window. It needs to know whether the dictation is in locked/toggle mode to change its visual appearance. The existing `OverlaySyncPayload` mechanism syncs state from the main window to overlay windows.

**Why `isDictationLocked` and not a generic name**: Only the dictation controller's lock state needs to be synced to the pill overlay for visual feedback. The agent controller also inherits double-tap behavior (same `ActivationController` class), but the agent overlay has its own separate UI and doesn't need this signal. If agent overlay needs lock visuals later, add `isAgentLocked` separately.

### Step 2: Add `isDictationLocked` to OverlaySyncPayload

**File**: `apps/desktop/src/types/overlay.types.ts`

- Add `"isDictationLocked"` to the `Pick` type parameters in `OverlaySyncPayload`

**File**: `apps/desktop/src/components/root/OverlaySyncSideEffects.ts`

- Add `isDictationLocked` to `buildFullSyncPayload`
- Add a new `useOverlaySync` call that watches `isDictationLocked` and syncs it to all overlay targets

### Step 3: Modify ActivationController State Machine

**File**: `apps/desktop/src/utils/activation.utils.ts`

This is the core change. All changes are within the `ActivationController` class and the `getOrCreateController` factory function.

#### 3a: Add the double-tap window constant

```typescript
const DOUBLE_TAP_WINDOW_MS = 400;
```

#### 3b: Add new instance field

```typescript
private _secondTapConsumed = false;
```

This flag is set when `handlePress()` detects a double-tap and cleared when the corresponding `handleRelease()` fires. It prevents the release from the 2nd tap of a double-tap from immediately deactivating.

#### 3c: Add an `onLockChange` callback

Add a third callback parameter to the controller for notifying the outside world when locked state changes:

```typescript
private onLockChangeRef: ((locked: boolean) => void) | null = null;

constructor(
  onActivate: () => void,
  onDeactivate: () => void,
  onLockChange?: (locked: boolean) => void,
) {
  this.onActivateRef = onActivate;
  this.onDeactivateRef = onDeactivate;
  this.onLockChangeRef = onLockChange ?? null;
}

setCallbacks(
  onActivate: () => void,
  onDeactivate: () => void,
  onLockChange?: (locked: boolean) => void,
): void {
  this.onActivateRef = onActivate;
  this.onDeactivateRef = onDeactivate;
  this.onLockChangeRef = onLockChange ?? null;
}
```

Also update `getOrCreateController` signature to accept and pass through the optional third callback.

#### 3d: Emit lock change notifications

In `doDeactivate()`, before resetting `_isLocked`, emit if it was true:

```typescript
private doDeactivate(): void {
  const wasActive = this._isActive;
  const wasLocked = this._isLocked;

  this.clearPendingDeactivation();
  this._isActive = false;
  this._isLocked = false;
  this._secondTapConsumed = false; // always clear on deactivate
  this.ignoreNextActivation = false;
  this.pressTimestamp = null;

  if (wasLocked) {
    this.onLockChangeRef?.(false);
  }

  if (wasActive) {
    this.onDeactivateRef?.();
  }
}
```

When `_isLocked` becomes true, emit:

```typescript
// wherever _isLocked = true:
this._isLocked = true;
this.onLockChangeRef?.(true);
```

In `forceReset()`, also emit lock change if was locked:

```typescript
forceReset(): void {
  const wasLocked = this._isLocked;
  this._isActive = false;
  this._isLocked = false;
  this._secondTapConsumed = false;
  this.ignoreNextActivation = false;
  this.pressTimestamp = null;
  this.clearPendingDeactivation();
  if (wasLocked) {
    this.onLockChangeRef?.(false);
  }
}
```

In `reset()`, no change needed — it already calls `doDeactivate()` which handles the emission.

#### 3e: Rewrite `handleRelease()` for double-tap detection + secondTapConsumed

```typescript
handleRelease(): void {
  this.ignoreNextActivation = false;
  this.lastReleaseTimestamp = Date.now();

  if (!this._isActive) return;

  // If this release completes the 2nd tap of a double-tap, consume it.
  // The lock was already set in handlePress(). Do NOT deactivate.
  if (this._secondTapConsumed) {
    this._secondTapConsumed = false;
    return;
  }

  const now = Date.now();
  const pressedAt = this.pressTimestamp ?? now;
  const elapsed = now - pressedAt;

  if (elapsed < TAP_THRESHOLD_MS) {
    // Quick tap
    if (this._isLocked) {
      // Already in toggle mode (from a previous double-tap or pill click) → stop
      this.doDeactivate();
    } else {
      // Not locked: this is a quick release after the 1st tap.
      // Start a pending-deactivation timer. If a 2nd tap arrives
      // within DOUBLE_TAP_WINDOW_MS, we lock. Otherwise, deactivate.
      this.deactivateTimer = setTimeout(() => {
        this.deactivateTimer = null;
        this.doDeactivate();
      }, DOUBLE_TAP_WINDOW_MS);
    }
  } else {
    // Long hold released
    if (!this._isLocked) {
      this.doDeactivate();
    }
  }
}
```

#### 3f: Update `handlePress()` to detect second tap

```typescript
handlePress(): void {
  if (this.ignoreNextActivation) {
    return;
  }

  const now = Date.now();
  this.pressTimestamp = now;

  if (this._isActive && this.deactivateTimer) {
    // 2nd tap while pending-deactivation → double-tap detected!
    // Lock immediately (green waveform appears now, on keydown).
    this.clearPendingDeactivation();
    this._isLocked = true;
    this._secondTapConsumed = true; // prevent the upcoming release from deactivating
    this.onLockChangeRef?.(true);
    // Do NOT call doActivate — recording is already active from 1st press.
    return;
  }

  this.clearPendingDeactivation();

  if (!this._isActive) {
    this.doActivate(now);
  }
}
```

#### 3g: `toggle()` — add lock change notification

The `toggle()` method (called by pill click) already sets `_isLocked = true` directly. Just add the lock change notification:

```typescript
toggle(): void {
  if (this.toggleInProgress) return;
  this.toggleInProgress = true;
  try {
    if (this._isActive) {
      this.doDeactivate(); // emits onLockChange(false) via doDeactivate
    } else {
      this._isLocked = true;
      this.onLockChangeRef?.(true);
      this.lastReleaseTimestamp = Date.now();
      this.doActivate(Date.now());
    }
  } finally {
    this.toggleInProgress = false;
  }
}
```

### Step 4: Wire Up Lock State in RootSideEffects.ts

**File**: `apps/desktop/src/components/root/RootSideEffects.ts`

**CRITICAL**: Only add the `onLockChange` callback wiring to the `getOrCreateController` calls. Do NOT modify `startRecording`, `stopRecording`, `startDictationRecording`, or `stopDictationRecording`.

There are **TWO** `getOrCreateController` call sites in this file:

#### 4a: Dictation controller (L135-143) — add lock state sync callback

```typescript
const dictationController = useMemo(
  () =>
    getOrCreateController(
      "dictation",
      () => startDictationRef.current?.(),
      () => stopDictationRef.current?.(),
      (locked) => {
        produceAppState((draft) => {
          draft.isDictationLocked = locked;
        });
      },
    ),
  [],
);
```

#### 4b: Agent controller (L145-153) — no lock state sync needed

The agent controller uses the same `ActivationController` class and inherits double-tap behavior. However, we do NOT need to sync agent lock state to any overlay. Pass `undefined` (or omit) for the 4th argument:

```typescript
const agentController = useMemo(
  () =>
    getOrCreateController(
      "agent",
      () => startAgentRef.current?.(),
      () => stopAgentRef.current?.(),
      // No onLockChange callback — agent overlay has its own UI
    ),
  [],
);
```

**What changes in RootSideEffects.ts**:

- Dictation `getOrCreateController` call gets a 4th argument (lock state sync callback)
- Agent `getOrCreateController` call remains unchanged (3rd callback param is optional)
- **NOTHING else changes**. Zero modifications to `startRecording`, `stopRecording`, or any other function.

### Step 5: Visual Feedback in Pill Overlay

**File**: `apps/desktop/src/components/overlay/PillOverlayRoot.tsx`

#### 5a: Read lock state from store

```typescript
const isDictationLocked = useAppStore((state) => state.isDictationLocked);
```

#### 5b: Change waveform color based on mode

Define two colors:

- PTT mode (default): `#90CAF9` (existing blue)
- Toggle/locked mode: `#81C784` (green, from Material UI green[300])

```typescript
const waveformColor = isDictationLocked ? "#81C784" : "#90CAF9";
```

Then pass to AudioWaveform:

```tsx
<AudioWaveform
  levels={levels}
  active={isListening}
  processing={isProcessing}
  strokeColor={waveformColor}
  width={EXPANDED_PILL_WIDTH}
  height={EXPANDED_PILL_HEIGHT}
  baselineOffset={0}
/>
```

#### 5c: Add lock icon for accessibility (REQUIRED, not optional)

Color-only differentiation is insufficient for accessibility. Add a small lock icon (MUI `LockOutlined`, already used elsewhere in the project — see `SettingsPage.tsx`) that appears when in toggle/locked mode during recording.

Position the icon at the right edge of the pill, inside the inner content container, only visible when `isDictationLocked && isListening`:

```tsx
import { LockOutlined } from "@mui/icons-material";

{
  /* Lock indicator for toggle mode */
}
<Box
  sx={{
    position: "absolute",
    right: 4,
    top: "50%",
    transform: "translateY(-50%)",
    opacity: isDictationLocked && isListening ? 1 : 0,
    transition: "opacity 150ms ease-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 1,
  }}
>
  <LockOutlined
    sx={{
      fontSize: 12,
      color: alpha(theme.palette.common.white, 0.7),
    }}
  />
</Box>;
```

Place this inside the inner content container `Box` (the one with `width: EXPANDED_PILL_WIDTH - 8`), alongside the existing waveform and processing indicator elements.

**Visual result**: When in toggle mode, the user sees both a **green waveform** AND a **small lock icon** at the right edge of the pill. This provides both color and non-color cues.

### Step 6: Reset Lock State on Recording End

When recording ends (transitions to idle or loading), ensure `isDictationLocked` resets to `false`. This is already handled because:

1. `doDeactivate()` sets `_isLocked = false` and calls `onLockChangeRef?.(false)`
2. `reset()` calls `doDeactivate()` which handles the emission
3. `forceReset()` now also emits `onLockChangeRef?.(false)` if was locked (added in Step 3d)

Verify that the auto-stop timer path (L331-347 in RootSideEffects.ts) also clears lock state. It calls `dictationController.reset()` which calls `doDeactivate()`, so this is covered.

### Step 7: Write Unit Tests for ActivationController

**File**: `apps/desktop/src/utils/__tests__/activation.utils.test.ts` (new file)

Use `jest.useFakeTimers()` for timer control.

Test cases:

1. **Push-to-talk (hold)**: Press → advance time >500ms → release → verify `onDeactivate` called, `isActive` is false
2. **Single quick tap stops after delay**: Press → release <500ms → advance 400ms → verify `onDeactivate` called
3. **Single quick tap does NOT stop immediately**: Press → release <500ms → verify `onDeactivate` NOT called yet (timer still pending)
4. **Double-tap locks**: Press → release <500ms → press within 400ms → verify `isLocked` is true, `isActive` is true
5. **Double-tap does NOT call onDeactivate during the second tap sequence**: Perform full double-tap (press-release-press-release) → verify `onDeactivate` was never called
6. **Second release after double-tap does not trigger deactivation (secondTapConsumed flag)**: Press → release → press (locks, sets flag) → release → verify still active+locked, `_secondTapConsumed` is cleared
7. **onActivate is called exactly ONCE during double-tap**: Perform full double-tap → verify `onActivate` was called exactly 1 time (on 1st press only, NOT on 2nd press)
8. **Stop while locked (subsequent tap)**: Enter locked state via double-tap → press → release <500ms → verify `onDeactivate` called
9. **Long hold while locked**: Enter locked state → hold >500ms → release → verify still locked, still active
10. **Pill toggle on**: Inactive → `toggle()` → verify `isActive` is true, `isLocked` is true
11. **Pill toggle off**: Active + locked → `toggle()` → verify `isActive` is false, `isLocked` is false
12. **Timer cancellation**: Start pending deactivation → `handlePress()` (2nd tap) → advance 400ms → verify `onDeactivate` was NOT called (timer was cancelled)
13. **Lock change callback fires on lock**: Double-tap → verify `onLockChange` called with `true`
14. **Lock change callback fires on unlock**: Lock via double-tap → stop via tap → verify `onLockChange` called with `false`
15. **Reset clears everything**: Active + locked → `reset()` → verify inactive, unlocked, `onLockChange(false)` fired
16. **forceReset emits lock change**: Active + locked → `forceReset()` → verify `onLockChange(false)` fired
17. **Rapid triple-tap**: tap-tap-tap → should lock on 2nd tap, 3rd tap's release should deactivate (the 2nd release is consumed by `_secondTapConsumed`, the 3rd tap enters `ACTIVE_LOCKED + handleRelease [quick] → INACTIVE`)
18. **Double-tap then long hold (3rd press)**: Double-tap to lock → hold Fn >500ms → release → verify still locked (long hold while locked = no-op)

## Edge Cases

| Edge Case                                                | Expected Behavior                                                                                                                                                                                                                                                     | Handling                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Double-tap 2nd release**                               | Does NOT deactivate. The `_secondTapConsumed` flag prevents it.                                                                                                                                                                                                       | `handleRelease` checks `_secondTapConsumed` first; if true, clears flag and returns early. |
| **Double-tap then hold (3rd press held)**                | Already locked. 3rd press: `handlePress` sees `_isActive` is true, no `deactivateTimer` → falls through to `if (!this._isActive)` which is false → no-op. 3rd release (long): `handleRelease` sees `_isLocked` and `elapsed >= TAP_THRESHOLD` → no-op (stays locked). | Correct by construction.                                                                   |
| **Triple-tap**                                           | 1st tap starts recording, 2nd tap locks (sets `_secondTapConsumed`), 2nd release consumed, 3rd press: `_isActive=true`, no `deactivateTimer`, falls through to no-op. 3rd release: `_isLocked=true`, quick tap → deactivates.                                         | Verified through test case #17.                                                            |
| **Double-tap while already recording (from pill click)** | Already locked from pill → Fn press: `_isActive=true`, no `deactivateTimer` → no-op. Fn release: `_isLocked=true`, quick → deactivates.                                                                                                                               | Correct — same as "stop while locked."                                                     |
| **Key repeat (OS key repeat events)**                    | `handlePress` called multiple times while held — idempotent since `_isActive` is true and no `deactivateTimer` exists → falls through to no-op.                                                                                                                       | Already handled by existing guards.                                                        |
| **Double-tap with one long hold (2nd press held)**       | 1st: press-release quick → starts timer. 2nd: press within 400ms → locks, sets `_secondTapConsumed`. 2nd: release long (>500ms) → `_secondTapConsumed` is true → consumed, stays locked.                                                                              | `_secondTapConsumed` check happens before elapsed check.                                   |
| **Connection lost during pending**                       | Timer fires, deactivates normally.                                                                                                                                                                                                                                    | No special handling needed.                                                                |
| **Very rapid double-tap (<60ms)**                        | Keyboard listener polls at 60ms. If both taps happen within one poll cycle, only one press-release pair may be detected.                                                                                                                                              | Accept this limitation. 400ms window is generous for normal double-taps.                   |
| **Overlay window not loaded**                            | Lock state fails to sync.                                                                                                                                                                                                                                             | No crash — `emitTo` catches errors. Overlay shows default blue color (safe fallback).      |

## Risk Assessment

| Risk                                                 | Severity | Probability              | Mitigation                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single-tap behavior change breaks existing users** | Medium   | High (deliberate change) | Document in changelog. 400ms delay is short. Consider making configurable in follow-up.                                                                                                                                                                                                            |
| **400ms delay feels sluggish for PTT stop**          | Medium   | Medium                   | Only affects single-tap-release (not long hold). If feedback is negative, reduce to 300ms.                                                                                                                                                                                                         |
| **`deactivateTimer` race condition**                 | Medium   | Low                      | `deactivateTimer` is being used for the FIRST TIME. While `clearPendingDeactivation()` exists, no code path has previously set this timer. Thorough testing is required. The cleanup method is simple and reliable (`clearTimeout`), but the overall timer flow is new and untested in production. |
| **`_secondTapConsumed` flag out of sync**            | Low      | Low                      | Flag is cleared in three places: (1) `handleRelease` on consume, (2) `doDeactivate`, (3) `forceReset`. All exit paths covered.                                                                                                                                                                     |
| **Lock state out of sync with overlay**              | Low      | Low                      | `OverlaySyncPayload` uses the same mechanism that syncs hotkeys, user prefs, etc. Proven reliable.                                                                                                                                                                                                 |
| **Accidentally modifying stopRecording**             | Critical | None (if plan followed)  | Plan calls for ZERO changes to `stopRecording()` or `startRecording()`. Only `getOrCreateController` calls change in RootSideEffects.ts.                                                                                                                                                           |
| **Both controllers get double-tap**                  | Low      | N/A (intended)           | Double-tap logic is in the shared `ActivationController` class. Both dictation and agent benefit. Only dictation syncs lock state to overlay. If agent needs different behavior later, subclass or add a config flag.                                                                              |

## Files Modified (Complete List)

| File                                                         | Change Type                                                                                                                                         | Risk Level                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/desktop/src/utils/activation.utils.ts`                 | **CORE**: State machine rewrite of `handlePress`/`handleRelease`, new `_secondTapConsumed` field, new `onLockChange` callback, `forceReset` updated | **High** — must be tested thoroughly                   |
| `apps/desktop/src/state/app.state.ts`                        | Add `isDictationLocked: boolean`                                                                                                                    | **Trivial**                                            |
| `apps/desktop/src/types/overlay.types.ts`                    | Add `isDictationLocked` to `OverlaySyncPayload`                                                                                                     | **Trivial**                                            |
| `apps/desktop/src/components/root/OverlaySyncSideEffects.ts` | Add sync for `isDictationLocked`                                                                                                                    | **Low** — follows existing pattern                     |
| `apps/desktop/src/components/root/RootSideEffects.ts`        | Add 4th arg to dictation `getOrCreateController` call (agent call unchanged)                                                                        | **Low** — minimal change, no control flow modification |
| `apps/desktop/src/components/overlay/PillOverlayRoot.tsx`    | Conditional waveform color + lock icon (`LockOutlined`)                                                                                             | **Low** — visual only                                  |
| `apps/desktop/src/utils/__tests__/activation.utils.test.ts`  | **NEW**: 18 unit test cases                                                                                                                         | **None** — test-only                                   |

## Files NOT Modified (Explicit Exclusions)

| File                                                        | Reason                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `RootSideEffects.ts` `stopRecording()`                      | **HARD RULE** — v1.0.9 regression                                                     |
| `RootSideEffects.ts` `startRecording()`                     | No changes needed                                                                     |
| `RootSideEffects.ts` `startDictationRecording()`            | No changes needed                                                                     |
| `RootSideEffects.ts` `stopDictationRecording()`             | No changes needed                                                                     |
| Any Rust files (`keyboard.rs`, `overlay.rs`, `commands.rs`) | No Rust changes needed                                                                |
| `hotkey.hooks.ts`                                           | No changes needed — it calls `handlePress`/`handleRelease` which we modify internally |
| `AudioWaveform.tsx`                                         | No changes needed — already accepts `strokeColor` prop                                |

## Acceptance Criteria

- [ ] **Double-tap locks**: Press-release-press Fn within 400ms → recording starts on first press and continues (locked mode)
- [ ] **Second release after double-tap is consumed**: The release completing the 2nd tap does NOT stop recording
- [ ] **onActivate called once**: During a double-tap sequence, `onActivate` fires exactly once (on 1st press)
- [ ] **Single tap stops**: Press-release Fn (no second tap) → recording starts on press, stops ~400ms after release
- [ ] **Push-to-talk unchanged**: Hold Fn >500ms → release → recording stops immediately
- [ ] **Stop from locked**: In locked mode (after 2nd release consumed), next press-release Fn → recording stops
- [ ] **Pill click toggle works**: Click pill → recording starts (locked). Click again → stops
- [ ] **Visual: PTT color**: During push-to-talk recording, waveform is blue (#90CAF9)
- [ ] **Visual: Toggle color**: During locked/toggle recording, waveform is green (#81C784)
- [ ] **Visual: Lock icon**: During locked/toggle recording, a small lock icon appears on the pill
- [ ] **Visual resets**: When recording stops, waveform returns to blue and lock icon disappears
- [ ] **Lock state syncs to overlay**: `isDictationLocked` propagates from main window to pill overlay window
- [ ] **Agent double-tap works**: Agent controller also supports double-tap (inherits from same class)
- [ ] **No stopRecording changes**: Verified via `git diff` that `stopRecording()` function body is untouched
- [ ] **No startRecording changes**: Verified via `git diff` that `startRecording()` function body is untouched
- [ ] **All existing tests pass**: `npm run test` passes
- [ ] **Type check passes**: `npm run check-types` passes
- [ ] **Unit tests pass**: New `activation.utils.test.ts` — all 18 test cases pass
- [ ] **Auto-stop timer works**: 5-minute auto-stop still triggers correctly in both PTT and toggle mode

## Verification Steps

### Automated

1. Run `npm run check-types` — must pass with zero errors
2. Run `npm run test` — all existing tests must pass
3. Run new `activation.utils.test.ts` — all 18 test cases pass
4. Run `git diff apps/desktop/src/components/root/RootSideEffects.ts` — verify only the dictation `getOrCreateController` call changed (4th argument added)

### Manual Testing Script

1. **PTT Hold**: Hold Fn for 2 seconds → verify recording → release → verify recording stops immediately
2. **Single Quick Tap**: Tap Fn briefly → verify recording starts → wait ~500ms → verify recording stops (new behavior!)
3. **Double Tap**: Tap Fn, release, tap Fn again within ~400ms → verify recording starts and stays on (locked)
4. **Double Tap Visual**: On 2nd keydown, observe **green** waveform + lock icon appear immediately
5. **Double Tap Release**: After double-tap, release 2nd key → verify recording does NOT stop (2nd release consumed)
6. **Stop from Locked**: After double-tap lock → tap Fn → verify recording stops
7. **Pill Click Toggle**: Click pill → verify recording starts (locked, green, lock icon) → click pill → verify stops
8. **Visual PTT**: Hold Fn → observe **blue** waveform, NO lock icon
9. **Triple Tap**: Tap-tap-tap → verify locks on 2nd tap, 2nd release consumed, stops on 3rd tap release
10. **Auto-Stop**: Start recording in toggle mode → wait 5 minutes → verify auto-stop fires
11. **Text Insertion**: After recording stops in toggle mode, verify text is correctly inserted into the focused field (regression test for v1.0.9 bug)
12. **Agent Double-Tap**: Configure agent hotkey → double-tap → verify agent recording locks (no green pill change expected, just verify it stays recording)

## Implementation Order

Execute steps in this order to minimize risk:

1. **Step 7** (Tests first) — Write test file with all 18 test cases targeting new behavior. Tests will fail initially (TDD approach).
2. **Step 1** (AppState) — Trivial, no functional impact
3. **Step 2** (OverlaySync) — Trivial, no functional impact (just plumbing)
4. **Step 3** (ActivationController) — Core logic change. After this step, run tests — all 18 should pass.
5. **Step 4** (RootSideEffects wiring) — Connect lock callback to dictation controller
6. **Step 5** (Pill visual) — Visual feedback (color + lock icon)
7. **Step 6** (Verification) — Run all automated checks + manual testing script

This order means each step builds on the previous, and the riskiest change (Step 3) has tests ready before implementation.
