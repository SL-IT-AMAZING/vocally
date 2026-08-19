import {
  isTossPlan,
  nextBillingAt,
  TOSS_ORDER_NAMES,
  TOSS_PRICES,
} from "./toss.ts";

Deno.test("accepts only supported Toss subscription plans", () => {
  if (
    !isTossPlan("monthly") ||
    !isTossPlan("semiannual") ||
    !isTossPlan("yearly")
  ) {
    throw new Error("supported plans were rejected");
  }
  if (isTossPlan("pro") || isTossPlan(undefined)) {
    throw new Error("unsupported plan was accepted");
  }
});

Deno.test("keeps Toss prices and product names server-owned", () => {
  if (
    TOSS_PRICES.monthly !== 7_000 ||
    TOSS_PRICES.semiannual !== 39_000 ||
    TOSS_PRICES.yearly !== 70_000 ||
    TOSS_ORDER_NAMES.semiannual !== "Vocally Pro 반기 이용권"
  ) {
    throw new Error("Toss product catalog is incorrect");
  }
});

Deno.test("calculates Toss billing dates in UTC", () => {
  const base = new Date("2026-01-15T12:00:00.000Z");
  if (nextBillingAt("monthly", base) !== "2026-02-15T12:00:00.000Z") {
    throw new Error("monthly renewal date is incorrect");
  }
  if (nextBillingAt("semiannual", base) !== "2026-07-15T12:00:00.000Z") {
    throw new Error("semiannual renewal date is incorrect");
  }
  if (nextBillingAt("yearly", base) !== "2027-01-15T12:00:00.000Z") {
    throw new Error("yearly renewal date is incorrect");
  }
});
