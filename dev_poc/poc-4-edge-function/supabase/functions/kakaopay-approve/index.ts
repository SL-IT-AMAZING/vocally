import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/auth.ts";
import { handleCors } from "../_shared/cors.ts";
import {
  getKakaoPayConfig,
  isKakaoPayPaymentEnabled,
  isKakaoPayPlan,
  type KakaoPayPlan,
  kakaoPayRequest,
  nextKakaoPayBillingAt,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type Order = {
  order_id: string;
  user_id: string;
  plan: unknown;
  amount: number;
  partner_user_id: string;
  tid: string | null;
  sid: string | null;
  paid_at: string | null;
  status: string;
};
type Approval = {
  tid?: string;
  sid?: string;
  partner_order_id?: string;
  partner_user_id?: string;
  payment_method_type?: string;
  amount?: { total?: number };
  error_code?: string;
};

async function ensureInitialEntitlement(
  supabase: ReturnType<typeof createServiceClient>,
  order: Order & { plan: KakaoPayPlan },
  sid: string,
  paidAt = new Date().toISOString(),
): Promise<string | null> {
  const periodEnd = nextKakaoPayBillingAt(order.plan, new Date(paidAt));
  const { error: memberError } = await supabase.from("members").upsert(
    {
      id: order.user_id,
      type: "user",
      plan: "free",
      is_on_trial: false,
      words_today: 0,
      words_this_month: 0,
      words_total: 0,
      tokens_today: 0,
      tokens_this_month: 0,
      tokens_total: 0,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (memberError) return "Failed to initialize membership";

  const { error: subscriptionError } = await supabase
    .from("kakaopay_subscriptions")
    .upsert(
      {
        user_id: order.user_id,
        sid,
        plan: order.plan,
        status: "active",
        sid_status: "ACTIVE",
        current_period_end: periodEnd,
        next_billing_at: periodEnd,
        cancel_at_period_end: false,
        retry_count: 0,
      },
      { onConflict: "user_id" },
    );
  if (subscriptionError) return "Failed to save subscription";

  const { error: entitlementError } = await supabase.rpc(
    "recompute_member_plan",
    { p_member_id: order.user_id },
  );
  return entitlementError ? "Failed to activate account" : null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayPaymentEnabled()) {
    return errorResponse("Kakao Pay is not available", 503);
  }
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: unknown;
    pgToken?: unknown;
  };
  if (typeof body.orderId !== "string" || typeof body.pgToken !== "string") {
    return errorResponse("Missing payment approval", 400);
  }
  const config = getKakaoPayConfig();
  if (!config) return errorResponse("Kakao Pay is not configured", 503);
  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("kakaopay_payment_orders")
    .select(
      "order_id, user_id, plan, amount, partner_user_id, tid, sid, paid_at, status",
    )
    .eq("order_id", body.orderId)
    .maybeSingle<Order>();
  if (orderError || !order) {
    return errorResponse("Payment order not found", 404);
  }
  if (order.user_id !== user.id) {
    return errorResponse("Payment order not found", 404);
  }
  if (!isKakaoPayPlan(order.plan)) {
    return errorResponse("Payment order requires manual review", 409);
  }
  if (order.status === "paid") {
    if (!order.sid) {
      return errorResponse("Paid order needs manual reconciliation", 409);
    }
    const recoveryError = await ensureInitialEntitlement(
      supabase,
      order,
      order.sid,
      order.paid_at ?? undefined,
    );
    if (recoveryError) return errorResponse(recoveryError, 500);
    return jsonResponse({ success: true, alreadyPaid: true });
  }
  if (order.status !== "ready" || !order.tid) {
    return errorResponse("Payment order is not payable", 409);
  }

  const { data: claimed, error: claimError } = await supabase
    .from("kakaopay_payment_orders")
    .update({ status: "approving" })
    .eq("order_id", order.order_id)
    .eq("status", "ready")
    .select("order_id")
    .maybeSingle();
  if (claimError) return errorResponse("Failed to claim payment approval", 500);
  if (!claimed) {
    return errorResponse("Payment approval is already in progress", 409);
  }

  const result = await kakaoPayRequest<Approval>(
    config.secretKey,
    "/approve",
    withCidSecret(config, {
      cid: config.subscriptionCid,
      tid: order.tid,
      partner_order_id: order.order_id,
      partner_user_id: order.partner_user_id,
      pg_token: body.pgToken,
      total_amount: order.amount,
    }),
  );
  const approval = result.data;
  const matchesOrder = approval.tid === order.tid &&
    approval.partner_order_id === order.order_id &&
    approval.partner_user_id === order.partner_user_id &&
    approval.amount?.total === order.amount;
  if (!result.ok || !matchesOrder || !approval.sid) {
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: result.status === 0 ? "reconciliation_required" : "failed",
        failure_code: approval.error_code ??
          (result.status === 0
            ? "KAKAOPAY_APPROVAL_UNKNOWN"
            : "KAKAOPAY_APPROVAL_FAILED"),
        failure_message: "Kakao Pay could not approve this payment",
      })
      .eq("order_id", order.order_id);
    return errorResponse("Kakao Pay could not approve this payment", 502);
  }

  const paidAt = new Date().toISOString();
  const { error: paidError } = await supabase
    .from("kakaopay_payment_orders")
    .update({
      status: "paid",
      sid: approval.sid,
      provider_status: "SUCCESS_PAYMENT",
      payment_method_type: approval.payment_method_type ?? null,
      paid_at: paidAt,
    })
    .eq("order_id", order.order_id)
    .eq("status", "approving");
  if (paidError) return errorResponse("Failed to save approved payment", 500);

  const activationError = await ensureInitialEntitlement(
    supabase,
    { ...order, sid: approval.sid },
    approval.sid,
    paidAt,
  );
  if (activationError) return errorResponse(activationError, 500);
  return jsonResponse({ success: true });
});
