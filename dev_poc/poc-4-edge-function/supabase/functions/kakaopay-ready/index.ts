import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/auth.ts";
import { handleCors } from "../_shared/cors.ts";
import {
  getKakaoPayConfig,
  isKakaoPayPlan,
  kakaoPayPartnerUserId,
  kakaoPayRequest,
  KAKAOPAY_ORDER_NAMES,
  KAKAOPAY_PRICES,
  isKakaoPayPaymentEnabled,
  newKakaoPayOrderId,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type ReadyResponse = {
  tid?: string;
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
  next_redirect_app_url?: string;
  error_code?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayPaymentEnabled()) {
    return errorResponse("Kakao Pay is not available", 503);
  }

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  if (!isKakaoPayPlan(body.plan)) return errorResponse("Invalid plan", 400);

  const config = getKakaoPayConfig();
  if (!config) return errorResponse("Kakao Pay is not configured", 503);
  const supabase = createServiceClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  if (memberError) return errorResponse("Failed to load membership", 500);
  if (member?.plan === "pro")
    return errorResponse("An active Pro plan already exists", 409);

  const orderId = newKakaoPayOrderId();
  const amount = KAKAOPAY_PRICES[body.plan];
  const orderName = KAKAOPAY_ORDER_NAMES[body.plan];
  const partnerUserId = await kakaoPayPartnerUserId(user.id);
  const { error: orderError } = await supabase
    .from("kakaopay_payment_orders")
    .insert({
      order_id: orderId,
      user_id: user.id,
      plan: body.plan,
      amount,
      order_name: orderName,
      partner_user_id: partnerUserId,
    });
  if (orderError) return errorResponse("Failed to create payment order", 500);

  const approvalUrl = new URL("/checkout/kakaopay/success", config.siteUrl);
  approvalUrl.searchParams.set("orderId", orderId);
  const cancelUrl = new URL("/checkout/kakaopay/cancel", config.siteUrl);
  cancelUrl.searchParams.set("orderId", orderId);
  const failUrl = new URL("/checkout/kakaopay/fail", config.siteUrl);
  failUrl.searchParams.set("orderId", orderId);
  const result = await kakaoPayRequest<ReadyResponse>(
    config.secretKey,
    "/ready",
    withCidSecret(config, {
      cid: config.subscriptionCid,
      partner_order_id: orderId,
      partner_user_id: partnerUserId,
      item_name: orderName,
      quantity: 1,
      total_amount: amount,
      tax_free_amount: 0,
      approval_url: approvalUrl.toString(),
      cancel_url: cancelUrl.toString(),
      fail_url: failUrl.toString(),
    }),
  );
  if (!result.ok || !result.data.tid || !result.data.next_redirect_pc_url) {
    await supabase
      .from("kakaopay_payment_orders")
      .update({
        status: "failed",
        failure_code: result.data.error_code ?? "KAKAOPAY_READY_FAILED",
        failure_message: "Kakao Pay could not prepare this payment",
      })
      .eq("order_id", orderId);
    return errorResponse("Kakao Pay could not prepare this payment", 502);
  }

  const { error: updateError } = await supabase
    .from("kakaopay_payment_orders")
    .update({ tid: result.data.tid })
    .eq("order_id", orderId)
    .eq("status", "ready");
  if (updateError) return errorResponse("Failed to save payment state", 500);

  return jsonResponse({
    orderId,
    checkoutUrl: result.data.next_redirect_pc_url,
    mobileCheckoutUrl: result.data.next_redirect_mobile_url,
  });
});
