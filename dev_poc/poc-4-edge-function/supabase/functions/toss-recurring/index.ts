import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import {
  newOrderId,
  nextBillingAt,
  TOSS_ORDER_NAMES,
  TOSS_PRICES,
  tossRequest,
  type TossPlan,
} from "../_shared/toss.ts";

type DueSubscription = {
  user_id: string;
  plan: TossPlan;
  customer_key: string;
  billing_key: string;
  next_billing_at: string;
  cancel_at_period_end: boolean;
  retry_count: number;
};

type TossPayment = { paymentKey?: string };
type TossError = { code?: string; message?: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  const cronSecret = Deno.env.get("TOSS_CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return errorResponse("Unauthorized", 401);
  }

  const secretKey = Deno.env.get("TOSS_SECRET_KEY");
  if (!secretKey) return errorResponse("Toss secret key not configured", 500);

  const supabase = createServiceClient();
  const { data: subscriptions, error } = await supabase
    .from("toss_subscriptions")
    .select(
      "user_id, plan, customer_key, billing_key, next_billing_at, cancel_at_period_end, retry_count",
    )
    .lte("next_billing_at", new Date().toISOString())
    .limit(100)
    .returns<DueSubscription[]>();

  if (error) return errorResponse("Failed to load due subscriptions", 500);

  const results: Array<{ userId: string; status: string }> = [];
  for (const subscription of subscriptions ?? []) {
    if (subscription.cancel_at_period_end) {
      await tossRequest(
        secretKey,
        `/billing/${encodeURIComponent(subscription.billing_key)}`,
        { method: "DELETE" },
      );
      await supabase
        .from("toss_subscriptions")
        .delete()
        .eq("user_id", subscription.user_id);
      await supabase.rpc("recompute_member_plan", {
        p_member_id: subscription.user_id,
      });
      results.push({ userId: subscription.user_id, status: "canceled" });
      continue;
    }

    const orderId = newOrderId("vocally-renewal");
    const amount = TOSS_PRICES[subscription.plan];
    const orderName = TOSS_ORDER_NAMES[subscription.plan];
    await supabase.from("toss_payment_orders").insert({
      order_id: orderId,
      user_id: subscription.user_id,
      plan: subscription.plan,
      amount,
      currency: "KRW",
      order_name: orderName,
      customer_key: subscription.customer_key,
      due_at: subscription.next_billing_at,
    });

    const paymentResult = await tossRequest<TossPayment>(
      secretKey,
      `/billing/${encodeURIComponent(subscription.billing_key)}`,
      {
        method: "POST",
        headers: { "Idempotency-Key": orderId },
        body: JSON.stringify({
          customerKey: subscription.customer_key,
          amount,
          orderId,
          orderName,
        }),
      },
    );
    const paymentKey = paymentResult.data.paymentKey;

    if (paymentResult.ok && paymentKey) {
      const paidAt = new Date().toISOString();
      await supabase
        .from("toss_payment_orders")
        .update({
          status: "paid",
          payment_key: paymentKey,
          paid_at: paidAt,
          due_at: nextBillingAt(subscription.plan, new Date(paidAt)),
        })
        .eq("order_id", orderId);
      await supabase
        .from("toss_subscriptions")
        .update({
          status: "active",
          next_billing_at: nextBillingAt(subscription.plan, new Date(paidAt)),
          retry_count: 0,
        })
        .eq("user_id", subscription.user_id);
      results.push({ userId: subscription.user_id, status: "paid" });
      continue;
    }

    const failure = paymentResult.data as TossError;
    const retryCount = subscription.retry_count + 1;
    await supabase
      .from("toss_payment_orders")
      .update({
        status: "failed",
        failure_code: failure.code ?? "BILLING_PAYMENT_FAILED",
        failure_message: failure.message ?? "Failed to renew subscription",
      })
      .eq("order_id", orderId);

    if (retryCount >= 3) {
      await tossRequest(
        secretKey,
        `/billing/${encodeURIComponent(subscription.billing_key)}`,
        { method: "DELETE" },
      );
      await supabase
        .from("toss_subscriptions")
        .delete()
        .eq("user_id", subscription.user_id);
      await supabase.rpc("recompute_member_plan", {
        p_member_id: subscription.user_id,
      });
      results.push({
        userId: subscription.user_id,
        status: "failed_after_retries",
      });
    } else {
      const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("toss_subscriptions")
        .update({
          status: "past_due",
          next_billing_at: retryAt,
          retry_count: retryCount,
        })
        .eq("user_id", subscription.user_id);
      results.push({ userId: subscription.user_id, status: "retry_scheduled" });
    }
  }

  return jsonResponse({ processed: results.length, results });
});
