import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/auth.ts";
import { handleCors } from "../_shared/cors.ts";
import {
  getKakaoPayOneTimeConfig,
  isKakaoPayOneTimePaymentEnabled,
  isKakaoPayOneTimeProductKey,
  KAKAOPAY_ONE_TIME_PRODUCTS,
  kakaoPayPartnerUserId,
  kakaoPayRequest,
  newKakaoPayOrderId,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type ReadyResponse = {
  tid?: string;
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
  error_code?: string;
};

function hasOnlyProductKey(body: Record<string, unknown>) {
  return Object.keys(body).length === 1 && "productKey" in body;
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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (
    !hasOnlyProductKey(body) || !isKakaoPayOneTimeProductKey(body.productKey)
  ) {
    return errorResponse("Invalid one-time product", 400);
  }
  const config = getKakaoPayOneTimeConfig();
  if (!config) {
    return errorResponse("Kakao Pay one-time payment is not configured", 503);
  }

  const product = KAKAOPAY_ONE_TIME_PRODUCTS[body.productKey];
  const orderId = newKakaoPayOrderId("vocally-kp-once");
  const partnerUserId = await kakaoPayPartnerUserId(user.id);
  const supabase = createServiceClient();
  const { data: claimedOrders, error: claimError } = await supabase.rpc(
    "claim_kakaopay_one_time_order",
    {
      p_user_id: user.id,
      p_order_id: orderId,
      p_partner_user_id: partnerUserId,
      p_product_key: body.productKey,
    },
  );
  const claimedOrder = Array.isArray(claimedOrders)
    ? claimedOrders[0]
    : claimedOrders;
  if (claimError || !claimedOrder) {
    return errorResponse(
      "A one-time purchase is already unavailable for this account",
      409,
    );
  }

  const approvalUrl = new URL(
    "/checkout/kakaopay/one-time/success",
    config.siteUrl,
  );
  approvalUrl.searchParams.set("orderId", orderId);
  const cancelUrl = new URL(
    "/checkout/kakaopay/one-time/cancel",
    config.siteUrl,
  );
  cancelUrl.searchParams.set("orderId", orderId);
  const failUrl = new URL("/checkout/kakaopay/one-time/fail", config.siteUrl);
  failUrl.searchParams.set("orderId", orderId);
  const result = await kakaoPayRequest<ReadyResponse>(
    config.secretKey,
    "/ready",
    withCidSecret(config, {
      cid: config.oneTimeCid,
      partner_order_id: orderId,
      partner_user_id: partnerUserId,
      item_name: product.orderName,
      quantity: 1,
      total_amount: product.amount,
      tax_free_amount: 0,
      approval_url: approvalUrl.toString(),
      cancel_url: cancelUrl.toString(),
      fail_url: failUrl.toString(),
    }),
  );
  if (!result.ok || !result.data.tid || !result.data.next_redirect_pc_url) {
    await supabase
      .from("kakaopay_one_time_orders")
      .update({
        status: result.status === 0 ? "reconciliation_required" : "failed",
        failure_code: result.data.error_code ??
          (result.status === 0
            ? "KAKAOPAY_READY_UNKNOWN"
            : "KAKAOPAY_READY_FAILED"),
        failure_message: "Kakao Pay could not prepare this one-time payment",
      })
      .eq("order_id", orderId)
      .eq("status", "ready");
    return errorResponse("Kakao Pay could not prepare this payment", 502);
  }

  const { data: savedTid, error: saveTidError } = await supabase
    .from("kakaopay_one_time_orders")
    .update({ tid: result.data.tid })
    .eq("order_id", orderId)
    .eq("status", "ready")
    .select("order_id")
    .maybeSingle();
  if (saveTidError || !savedTid) {
    return errorResponse("Failed to save payment state", 500);
  }

  return jsonResponse({
    orderId,
    checkoutUrl: result.data.next_redirect_pc_url,
    mobileCheckoutUrl: result.data.next_redirect_mobile_url,
  });
});
