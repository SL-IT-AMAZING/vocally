import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/auth.ts";
import { handleCors } from "../_shared/cors.ts";
import {
  getKakaoPayConfig,
  isKakaoPayPaymentEnabled,
  kakaoPayRequest,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const supabase = createServiceClient();
  const { data: kakaoSubscription, error: kakaoError } = await supabase
    .from("kakaopay_subscriptions")
    .select("sid, current_period_end, cancel_at_period_end, status")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "cancel_requested"])
    .maybeSingle();
  if (kakaoError) return errorResponse("Failed to load subscription", 500);
  if (kakaoSubscription) {
    if (!isKakaoPayPaymentEnabled()) {
      return errorResponse("Kakao Pay is not available", 503);
    }
    if (kakaoSubscription.cancel_at_period_end) {
      return jsonResponse({
        success: true,
        cancelAtPeriodEnd: true,
        nextBillingAt: kakaoSubscription.current_period_end,
      });
    }
    const config = getKakaoPayConfig();
    if (!config) return errorResponse("Kakao Pay is not configured", 503);
    const result = await kakaoPayRequest(
      config.secretKey,
      "/manage/subscription/inactive",
      withCidSecret(config, {
        cid: config.subscriptionCid,
        sid: kakaoSubscription.sid,
      }),
    );
    if (!result.ok) {
      return errorResponse("Kakao Pay could not cancel the subscription", 502);
    }
    const { error: updateError } = await supabase
      .from("kakaopay_subscriptions")
      .update({
        status: "cancel_requested",
        sid_status: "INACTIVE",
        cancel_requested_at: new Date().toISOString(),
        cancel_at_period_end: true,
      })
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"]);
    if (updateError) return errorResponse("Failed to save cancellation", 500);
    return jsonResponse({
      success: true,
      cancelAtPeriodEnd: true,
      nextBillingAt: kakaoSubscription.current_period_end,
    });
  }

  const { data: tossSubscription, error: tossError } = await supabase
    .from("toss_subscriptions")
    .select("next_billing_at, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (tossError || !tossSubscription) {
    return errorResponse("No active subscription", 404);
  }
  if (!tossSubscription.cancel_at_period_end) {
    const { error: tossUpdateError } = await supabase
      .from("toss_subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("user_id", user.id);
    if (tossUpdateError) {
      return errorResponse("Failed to save cancellation", 500);
    }
  }
  return jsonResponse({
    success: true,
    cancelAtPeriodEnd: true,
    nextBillingAt: tossSubscription.next_billing_at,
  });
});
