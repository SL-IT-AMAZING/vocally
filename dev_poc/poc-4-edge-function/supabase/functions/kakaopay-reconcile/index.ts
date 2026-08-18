import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hasSharedSecret } from "../_shared/auth.ts";
import {
  getKakaoPayConfig,
  kakaoPayRequest,
  nextKakaoPayBillingAt,
  type KakaoPayPlan,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type Order = {
  order_id: string;
  user_id: string;
  tid: string | null;
  sid: string | null;
  status: string;
  plan: KakaoPayPlan;
  billing_period_start: string | null;
};
type ProviderOrder = {
  status?: string;
  payment_method_type?: string;
  canceled_at?: string;
  approved_at?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (
    !hasSharedSecret(req, "x-kakaopay-admin-secret", "KAKAOPAY_ADMIN_SECRET")
  ) {
    return errorResponse("Unauthorized", 401);
  }
  const body = (await req.json().catch(() => ({}))) as { orderId?: unknown };
  if (typeof body.orderId !== "string")
    return errorResponse("Missing order ID", 400);
  const config = getKakaoPayConfig();
  if (!config) return errorResponse("Kakao Pay is not configured", 503);
  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from("kakaopay_payment_orders")
    .select("order_id, user_id, tid, sid, status, plan, billing_period_start")
    .eq("order_id", body.orderId)
    .maybeSingle<Order>();
  if (error || !order || !order.tid)
    return errorResponse("Reconciliation order not found", 404);
  const provider = await kakaoPayRequest<ProviderOrder>(
    config.secretKey,
    "/order",
    withCidSecret(config, {
      cid: config.subscriptionCid,
      tid: order.tid,
    }),
  );
  if (!provider.ok || !provider.data.status)
    return errorResponse("Kakao Pay order lookup failed", 502);
  const status = provider.data.status;
  if (status === "SUCCESS_PAYMENT" && order.billing_period_start) {
    const paidAt = provider.data.approved_at ?? new Date().toISOString();
    const nextBillingAt = nextKakaoPayBillingAt(order.plan, new Date(paidAt));
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: "paid",
        provider_status: status,
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
      .eq("user_id", order.user_id);
    await supabase.rpc("recompute_member_plan", { p_member_id: order.user_id });
    return jsonResponse({
      success: true,
      status,
      action: "renewal_marked_paid",
    });
  }
  if (status === "CANCEL_PAYMENT") {
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: "refunded",
        provider_status: status,
        canceled_at: provider.data.canceled_at ?? new Date().toISOString(),
      })
      .eq("order_id", order.order_id);
    if (order.sid) {
      const inactive = await kakaoPayRequest(
        config.secretKey,
        "/manage/subscription/inactive",
        withCidSecret(config, {
          cid: config.subscriptionCid,
          sid: order.sid,
        }),
      );
      if (!inactive.ok) {
        await supabase
          .from("kakaopay_payment_orders")
          .update({ provider_status: "CANCEL_PAYMENT_SID_PENDING" })
          .eq("order_id", order.order_id);
        return errorResponse(
          "Refund confirmed but subscription cancellation needs reconciliation",
          502,
        );
      }
      const now = new Date().toISOString();
      await supabase
        .from("kakaopay_subscriptions")
        .update({
          status: "canceled",
          sid_status: "INACTIVE",
          current_period_end: now,
          next_billing_at: now,
        })
        .eq("user_id", order.user_id);
    }
    await supabase.rpc("recompute_member_plan", { p_member_id: order.user_id });
    return jsonResponse({ success: true, status, action: "marked_refunded" });
  }
  if (["QUIT_PAYMENT", "FAIL_AUTH_PASSWORD", "FAIL_PAYMENT"].includes(status)) {
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: "failed",
        provider_status: status,
        failure_code: "KAKAOPAY_PROVIDER_STATUS",
      })
      .eq("order_id", order.order_id);
    return jsonResponse({ success: true, status, action: "marked_failed" });
  }
  await supabase
    .from("kakaopay_payment_orders")
    .update({ status: "reconciliation_required", provider_status: status })
    .eq("order_id", order.order_id);
  return jsonResponse({
    success: true,
    status,
    action: "manual_follow_up_required",
  });
});
