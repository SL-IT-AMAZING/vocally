import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivationController } from "../activation.utils";

const TAP_THRESHOLD_MS = 500;
const DOUBLE_TAP_WINDOW_MS = 400;

describe("ActivationController (double-tap toggle mode)", () => {
  let onActivate: ReturnType<typeof vi.fn>;
  let onDeactivate: ReturnType<typeof vi.fn>;
  let onLockChange: ReturnType<typeof vi.fn>;
  let controller: ActivationController;

  const setNow = (value: number) => {
    vi.spyOn(Date, "now").mockReturnValue(value);
  };

  const quickTap = (instance: ActivationController, pressTime: number) => {
    setNow(pressTime);
    instance.handlePress();
    setNow(pressTime + 100);
    instance.handleRelease();
  };

  const longHold = (instance: ActivationController, pressTime: number) => {
    setNow(pressTime);
    instance.handlePress();
    vi.advanceTimersByTime(600);
    setNow(pressTime + 600);
    instance.handleRelease();
  };

  const doubleTap = (instance: ActivationController, startTime: number) => {
    setNow(startTime);
    instance.handlePress();
    setNow(startTime + 100);
    instance.handleRelease();

    setNow(startTime + 200);
    instance.handlePress();
    setNow(startTime + 300);
    instance.handleRelease();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    onActivate = vi.fn();
    onDeactivate = vi.fn();
    onLockChange = vi.fn();
    controller = new ActivationController(
      onActivate,
      onDeactivate,
      onLockChange,
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("Push-to-talk (hold): press, hold > 500ms, release deactivates", () => {
    setNow(0);
    controller.handlePress();

    vi.advanceTimersByTime(TAP_THRESHOLD_MS + 100);
    setNow(TAP_THRESHOLD_MS + 100);
    controller.handleRelease();

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
  });

  it("Single quick tap stops after 400ms delay", () => {
    quickTap(controller, 0);

    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW_MS);

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
  });

  it("Single quick tap does not stop immediately", () => {
    quickTap(controller, 0);

    vi.advanceTimersByTime(0);

    expect(onDeactivate).not.toHaveBeenCalled();
    expect(controller.isActive).toBe(true);
  });

  it("Double-tap locks when second press occurs within window", () => {
    setNow(0);
    controller.handlePress();
    setNow(100);
    controller.handleRelease();

    setNow(200);
    controller.handlePress();

    expect(controller.isLocked).toBe(true);
    expect(controller.isActive).toBe(true);
  });

  it("Double-tap does not call onDeactivate", () => {
    doubleTap(controller, 0);

    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW_MS + 50);

    expect(onDeactivate).not.toHaveBeenCalled();
    expect(controller.isActive).toBe(true);
  });

  it("Second release after double-tap is consumed and remains locked", () => {
    setNow(0);
    controller.handlePress();
    setNow(100);
    controller.handleRelease();

    setNow(200);
    controller.handlePress();
    setNow(300);
    controller.handleRelease();

    expect(controller.isActive).toBe(true);
    expect(controller.isLocked).toBe(true);
    expect(onDeactivate).not.toHaveBeenCalled();
  });

  it("onActivate is called exactly once during full double-tap", () => {
    doubleTap(controller, 0);

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Subsequent quick tap while locked deactivates", () => {
    doubleTap(controller, 0);

    quickTap(controller, 1000);

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
  });

  it("Long hold while locked keeps controller active and locked", () => {
    doubleTap(controller, 0);

    longHold(controller, 1000);

    expect(onDeactivate).not.toHaveBeenCalled();
    expect(controller.isActive).toBe(true);
    expect(controller.isLocked).toBe(true);
  });

  it("Pill toggle on from inactive activates locked mode", () => {
    controller.toggle();

    expect(controller.isActive).toBe(true);
    expect(controller.isLocked).toBe(true);
  });

  it("Pill toggle off from locked mode deactivates", () => {
    controller.toggle();
    controller.toggle();

    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
    expect(onDeactivate).toHaveBeenCalledTimes(1);
  });

  it("Timer cancellation: second press within 400ms prevents deactivation", () => {
    quickTap(controller, 0);

    setNow(200);
    controller.handlePress();

    vi.advanceTimersByTime(DOUBLE_TAP_WINDOW_MS + 50);

    expect(onDeactivate).not.toHaveBeenCalled();
    expect(controller.isActive).toBe(true);
    expect(controller.isLocked).toBe(true);
  });

  it("Lock change callback fires on lock", () => {
    doubleTap(controller, 0);

    expect(onLockChange).toHaveBeenCalledWith(true);
  });

  it("Lock change callback fires on unlock", () => {
    doubleTap(controller, 0);
    quickTap(controller, 1000);

    expect(onLockChange).toHaveBeenCalledWith(false);
  });

  it("reset clears everything and unlocks", () => {
    controller.toggle();

    controller.reset();

    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
    expect(onLockChange).toHaveBeenCalledWith(false);
  });

  it("forceReset emits lock change and clears locked state", () => {
    controller.toggle();

    controller.forceReset();

    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
    expect(onLockChange).toHaveBeenCalledWith(false);
  });

  it("Rapid triple-tap: second tap locks, third tap deactivates", () => {
    setNow(0);
    controller.handlePress();
    setNow(100);
    controller.handleRelease();

    setNow(200);
    controller.handlePress();
    setNow(300);
    controller.handleRelease();

    setNow(400);
    controller.handlePress();
    setNow(500);
    controller.handleRelease();

    expect(controller.isActive).toBe(false);
    expect(controller.isLocked).toBe(false);
    expect(onDeactivate).toHaveBeenCalledTimes(1);
  });

  it("Double-tap then long hold remains locked", () => {
    doubleTap(controller, 0);

    longHold(controller, 1000);

    expect(controller.isActive).toBe(true);
    expect(controller.isLocked).toBe(true);
    expect(onDeactivate).not.toHaveBeenCalled();
  });
});
