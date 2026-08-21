import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/auth.ts";
import { handleCors } from "../_shared/cors.ts";
import {
  getKakaoPayOneTimeConfig,
  isKakaoPayOneTimePaymentEnabled,
  kakaoPayRequest,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type OneTimeOrder = {
  order_id: string;
  user_id: string;
  amount: number;
  partner_user_id: string;
  tid: string | null;
  status: string;
};
type Approval = {
  tid?: string;
  aid?: string;
  partner_order_id?: string;
  partner_user_id?: string;
  status?: string;
  payment_method_type?: string;
  amount?: { total?: number };
  error_code?: string;
};

function hasApprovalFields(
  body: unknown,
): body is { orderId: string; pgToken: string } {
  return typeof body === "object" && body !== null && !Array.isArray(body) &&
    Object.keys(body).length === 2 &&
    typeof body.orderId === "string" &&
    typeof body.pgToken === "string";
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayOneTimePaymentEnabled()) {
    return errorResponse("Kakao Pay one-time payment is not available", 503);
  }

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const body: unknown = await req.json().catch(() => ({}));
  if (!hasApprovalFields(body)) {
    return errorResponse("Missing payment approval", 400);
  }
  const config = getKakaoPayOneTimeConfig();
  if (!config) {
    return errorResponse("Kakao Pay one-time payment is not configured", 503);
  }

  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("kakaopay_one_time_orders")
    .select("order_id, user_id, amount, partner_user_id, tid, status")
    .eq("order_id", body.orderId)
    .maybeSingle<OneTimeOrder>();
  if (orderError || !order || order.user_id !== user.id) {
    return errorResponse("Payment order not found", 404);
  }
  if (order.status === "paid") {
    return jsonResponse({ success: true, alreadyPaid: true });
  }
  if (order.status !== "ready" || !order.tid) {
    return errorResponse("Payment order is not payable", 409);
  }

  const { data: claimed, error: claimError } = await supabase
    .from("kakaopay_one_time_orders")
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
      cid: config.oneTimeCid,
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
  if (!result.ok || !matchesOrder || !approval.aid) {
    await supabase
      .from("kakaopay_one_time_orders")
      .update({
        status: result.status === 0 ? "reconciliation_required" : "failed",
        failure_code: approval.error_code ??
          (result.status === 0
            ? "KAKAOPAY_APPROVAL_UNKNOWN"
            : "KAKAOPAY_APPROVAL_FAILED"),
        failure_message: "Kakao Pay could not approve this one-time payment",
      })
      .eq("order_id", order.order_id)
      .eq("status", "approving");
    return errorResponse("Kakao Pay could not approve this payment", 502);
  }

  const { data: finalized, error: finalizeError } = await supabase.rpc(
    "finalize_kakaopay_one_time_payment",
    {
      p_order_id: order.order_id,
      p_aid: approval.aid,
      p_provider_status: approval.status ?? "SUCCESS_PAYMENT",
      p_payment_method_type: approval.payment_method_type ?? null,
      p_paid_at: new Date().toISOString(),
    },
  );
  if (finalizeError || !finalized) {
    await supabase
      .from("kakaopay_one_time_orders")
      .update({
        status: "reconciliation_required",
        failure_code: "KAKAOPAY_ENTITLEMENT_FINALIZE_FAILED",
        failure_message: "Kakao Pay payment needs entitlement reconciliation",
      })
      .eq("order_id", order.order_id)
      .eq("status", "approving");
    return errorResponse("Payment requires reconciliation", 502);
  }
  const finalState = Array.isArray(finalized) ? finalized[0] : finalized;
  return jsonResponse({
    success: true,
    alreadyPaid: finalState?.already_paid === true,
  });
});
