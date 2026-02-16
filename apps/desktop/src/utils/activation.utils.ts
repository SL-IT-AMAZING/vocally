const TAP_THRESHOLD_MS = 500;
const DOUBLE_TAP_WINDOW_MS = 400;

const singletonControllers = new Map<string, ActivationController>();

export class ActivationController {
  private _isActive = false;
  private _isLocked = false;
  private ignoreNextActivation = false;
  private deactivateTimer: NodeJS.Timeout | null = null;
  private pressTimestamp: number | null = null;
  private lastReleaseTimestamp: number | null = null;
  private toggleInProgress = false;
  private onActivateRef: (() => void) | null = null;
  private onDeactivateRef: (() => void) | null = null;
  private onLockChangeRef: ((locked: boolean) => void) | null = null;
  private _secondTapConsumed = false;

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

  get isActive(): boolean {
    return this._isActive;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  get shouldIgnoreActivation(): boolean {
    return this.ignoreNextActivation;
  }

  get hasHadRelease(): boolean {
    return this.lastReleaseTimestamp !== null;
  }

  private clearPendingDeactivation(): void {
    if (this.deactivateTimer) {
      clearTimeout(this.deactivateTimer);
      this.deactivateTimer = null;
    }
  }

  private doActivate(timestamp: number): void {
    if (this._isActive) return;

    this.clearPendingDeactivation();
    this._isActive = true;
    this.pressTimestamp = timestamp;
    this.onActivateRef?.();
  }

  private doDeactivate(): void {
    const wasActive = this._isActive;
    const wasLocked = this._isLocked;

    this.clearPendingDeactivation();
    this._isActive = false;
    this._isLocked = false;
    this._secondTapConsumed = false;
    this.ignoreNextActivation = false;
    this.pressTimestamp = null;

    if (wasLocked) {
      this.onLockChangeRef?.(false);
    }

    if (wasActive) {
      this.onDeactivateRef?.();
    }
  }

  handlePress(): void {
    if (this.ignoreNextActivation) {
      return;
    }

    const now = Date.now();
    this.pressTimestamp = now;

    if (this._isActive && this.deactivateTimer) {
      // 2nd tap while pending-deactivation -> double-tap detected!
      this.clearPendingDeactivation();
      this._isLocked = true;
      this._secondTapConsumed = true;
      this.onLockChangeRef?.(true);
      return;
    }

    this.clearPendingDeactivation();

    if (!this._isActive) {
      this.doActivate(now);
    }
  }

  handleRelease(): void {
    this.ignoreNextActivation = false;
    this.lastReleaseTimestamp = Date.now();

    if (!this._isActive) return;

    // If this release completes the 2nd tap of a double-tap, consume it.
    if (this._secondTapConsumed) {
      this._secondTapConsumed = false;
      return;
    }

    const now = Date.now();
    const pressedAt = this.pressTimestamp ?? now;
    const elapsed = now - pressedAt;

    if (elapsed < TAP_THRESHOLD_MS) {
      if (this._isLocked) {
        this.doDeactivate();
      } else {
        // First quick release: start pending-deactivation timer
        this.deactivateTimer = setTimeout(() => {
          this.deactivateTimer = null;
          this.doDeactivate();
        }, DOUBLE_TAP_WINDOW_MS);
      }
    } else {
      if (!this._isLocked) {
        this.doDeactivate();
      }
    }
  }

  toggle(): void {
    if (this.toggleInProgress) {
      return;
    }
    this.toggleInProgress = true;
    try {
      if (this._isActive) {
        this.doDeactivate();
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

  reset(): void {
    this.ignoreNextActivation = false;
    this.lastReleaseTimestamp = null;
    this.clearPendingDeactivation();
    this.doDeactivate();
  }

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

  clearIgnore(): void {
    this.ignoreNextActivation = false;
  }

  dispose(): void {
    this.clearPendingDeactivation();
  }
}

export function getOrCreateController(
  key: string,
  onActivate: () => void,
  onDeactivate: () => void,
  onLockChange?: (locked: boolean) => void,
): ActivationController {
  let controller = singletonControllers.get(key);
  if (!controller) {
    controller = new ActivationController(
      onActivate,
      onDeactivate,
      onLockChange,
    );
    singletonControllers.set(key, controller);
  } else {
    controller.setCallbacks(onActivate, onDeactivate, onLockChange);
  }
  return controller;
}

const lastToggleByKey = new Map<string, number>();

export function debouncedToggle(
  key: string,
  controller: ActivationController,
): void {
  const now = Date.now();
  const lastToggle = lastToggleByKey.get(key) ?? 0;
  if (now - lastToggle < 100) {
    return;
  }
  lastToggleByKey.set(key, now);
  controller.toggle();
}
