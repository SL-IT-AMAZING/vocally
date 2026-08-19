import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hasSharedSecret } from "../_shared/auth.ts";
import {
  getKakaoPayConfig,
  isKakaoPayPaymentEnabled,
  kakaoPayPartnerUserId,
  kakaoPayRequest,
  KAKAOPAY_ORDER_NAMES,
  KAKAOPAY_PRICES,
  newKakaoPayOrderId,
  nextKakaoPayBillingAt,
  type KakaoPayPlan,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type Subscription = {
  user_id: string;
  sid: string;
  plan: KakaoPayPlan;
  status: "active" | "past_due" | "cancel_requested";
  current_period_end: string;
  next_billing_at: string;
  retry_count: number;
};
type Payment = {
  tid?: string;
  partner_order_id?: string;
  partner_user_id?: string;
  payment_method_type?: string;
  amount?: { total?: number };
  error_code?: string;
};
type ProviderOrder = {
  status?: string;
  approved_at?: string;
  payment_method_type?: string;
};

async function reconcileClaimedRenewal(
  supabase: ReturnType<typeof createServiceClient>,
  config: NonNullable<ReturnType<typeof getKakaoPayConfig>>,
  subscription: Subscription,
): Promise<"reconciled" | "manual_reconciliation_required"> {
  const { data: order } = await supabase
    .from("kakaopay_payment_orders")
    .select("order_id, tid, status")
    .eq("user_id", subscription.user_id)
    .eq("billing_period_start", subscription.next_billing_at)
    .maybeSingle<{ order_id: string; tid: string | null; status: string }>();
  if (!order || order.status !== "reconciliation_required" || !order.tid) {
    return "manual_reconciliation_required";
  }
  const provider = await kakaoPayRequest<ProviderOrder>(
    config.secretKey,
    "/order",
    withCidSecret(config, { cid: config.subscriptionCid, tid: order.tid }),
  );
  if (!provider.ok || provider.data.status !== "SUCCESS_PAYMENT") {
    return "manual_reconciliation_required";
  }
  const paidAt = provider.data.approved_at ?? new Date().toISOString();
  const nextBillingAt = nextKakaoPayBillingAt(
    subscription.plan,
    new Date(paidAt),
  );
  await supabase
    .from("kakaopay_payment_orders")
    .update({
      status: "paid",
      provider_status: "SUCCESS_PAYMENT",
      payment_method_type: provider.data.payment_method_type ?? null,
      paid_at: paidAt,
    })
    .eq("order_id", order.order_id);
  await supabase
    .from("kakaopay_subscriptions")
    .update({
      status: "active",
      current_period_end: nextBillingAt,
      next_billing_at: nextBillingAt,
      retry_count: 0,
    })
    .eq("user_id", subscription.user_id);
  await supabase.rpc("recompute_member_plan", {
    p_member_id: subscription.user_id,
  });
  return "reconciled";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayPaymentEnabled()) {
    return errorResponse("Kakao Pay is not available", 503);
  }
  if (!hasSharedSecret(req, "x-cron-secret", "KAKAOPAY_CRON_SECRET")) {
    return errorResponse("Unauthorized", 401);
  }
  const config = getKakaoPayConfig();
  if (!config) return errorResponse("Kakao Pay is not configured", 503);
  const supabase = createServiceClient();
  const now = new Date();
  const { data: subscriptions, error } = await supabase
    .from("kakaopay_subscriptions")
    .select(
      "user_id, sid, plan, status, current_period_end, next_billing_at, retry_count",
    )
    .lte("next_billing_at", now.toISOString())
    .in("status", ["active", "past_due", "cancel_requested"])
    .limit(100)
    .returns<Subscription[]>();
  if (error) return errorResponse("Failed to load due subscriptions", 500);

  const results: Array<{ userId: string; status: string }> = [];
  for (const subscription of subscriptions ?? []) {
    if (subscription.status === "cancel_requested") {
      await supabase
        .from("kakaopay_subscriptions")
        .update({ status: "canceled", sid_status: "INACTIVE" })
        .eq("user_id", subscription.user_id)
        .eq("status", "cancel_requested");
      await supabase.rpc("recompute_member_plan", {
        p_member_id: subscription.user_id,
      });
      results.push({ userId: subscription.user_id, status: "canceled" });
      continue;
    }

    const orderId = newKakaoPayOrderId("vocally-kp-renewal");
    const amount = KAKAOPAY_PRICES[subscription.plan];
    const orderName = KAKAOPAY_ORDER_NAMES[subscription.plan];
    const partnerUserId = await kakaoPayPartnerUserId(subscription.user_id);
    const { error: claimError } = await supabase
      .from("kakaopay_payment_orders")
      .insert({
        order_id: orderId,
        user_id: subscription.user_id,
        plan: subscription.plan,
        amount,
        order_name: orderName,
        partner_user_id: partnerUserId,
        sid: subscription.sid,
        billing_period_start: subscription.next_billing_at,
        status: "approving",
      });
    if (claimError) {
      const status = await reconcileClaimedRenewal(
        supabase,
        config,
        subscription,
      );
      results.push({ userId: subscription.user_id, status });
      continue;
    }

    const result = await kakaoPayRequest<Payment>(
      config.secretKey,
      "/subscription",
      withCidSecret(config, {
        cid: config.subscriptionCid,
        sid: subscription.sid,
        partner_order_id: orderId,
        partner_user_id: partnerUserId,
        item_name: orderName,
        quantity: 1,
        total_amount: amount,
        tax_free_amount: 0,
      }),
    );
    const payment = result.data;
    const matchesOrder =
      payment.partner_order_id === orderId &&
      payment.partner_user_id === partnerUserId &&
      payment.amount?.total === amount;
    if (result.ok && matchesOrder && payment.tid) {
      const paidAt = new Date().toISOString();
      const nextBillingAt = nextKakaoPayBillingAt(
        subscription.plan,
        new Date(paidAt),
      );
      await supabase
        .from("kakaopay_payment_orders")
        .update({
          status: "paid",
          tid: payment.tid,
          provider_status: "SUCCESS_PAYMENT",
          payment_method_type: payment.payment_method_type ?? null,
          paid_at: paidAt,
        })
        .eq("order_id", orderId)
        .eq("status", "approving");
      await supabase
        .from("kakaopay_subscriptions")
        .update({
          status: "active",
          current_period_end: nextBillingAt,
          next_billing_at: nextBillingAt,
          retry_count: 0,
        })
        .eq("user_id", subscription.user_id)
        .in("status", ["active", "past_due"]);
      results.push({ userId: subscription.user_id, status: "paid" });
      continue;
    }

    const nextRetry = subscription.retry_count + 1;
    const unknown = result.status === 0;
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: unknown ? "reconciliation_required" : "failed",
        failure_code:
          payment.error_code ??
          (unknown ? "KAKAOPAY_RENEWAL_UNKNOWN" : "KAKAOPAY_RENEWAL_FAILED"),
        failure_message: "Kakao Pay renewal was not confirmed",
      })
      .eq("order_id", orderId);
    if (unknown) {
      results.push({
        userId: subscription.user_id,
        status: "reconciliation_required",
      });
      continue;
    }
    if (nextRetry < 3) {
      const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("kakaopay_subscriptions")
        .update({
          status: "past_due",
          next_billing_at: retryAt,
          retry_count: nextRetry,
        })
        .eq("user_id", subscription.user_id);
      results.push({ userId: subscription.user_id, status: "retry_scheduled" });
      continue;
    }
    await kakaoPayRequest(
      config.secretKey,
      "/manage/subscription/inactive",
      withCidSecret(config, {
        cid: config.subscriptionCid,
        sid: subscription.sid,
      }),
    );
    await supabase
      .from("kakaopay_subscriptions")
      .update({
        status: "canceled",
        sid_status: "INACTIVE",
        retry_count: nextRetry,
      })
      .eq("user_id", subscription.user_id);
    await supabase.rpc("recompute_member_plan", {
      p_member_id: subscription.user_id,
    });
    results.push({
      userId: subscription.user_id,
      status: "failed_after_retries",
    });
  }
  return jsonResponse({ processed: results.length, results });
});
