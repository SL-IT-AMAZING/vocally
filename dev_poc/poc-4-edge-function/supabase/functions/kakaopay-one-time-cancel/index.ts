import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hasSharedSecret } from "../_shared/auth.ts";
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
  amount: number;
  tid: string | null;
  status: string;
};
type ProviderOrder = {
  cancel_available_amount?: { total?: number; tax_free?: number; vat?: number };
};
type Cancellation = {
  status?: string;
  canceled_at?: string;
  error_code?: string;
};

function hasOnlyOrderId(body: Record<string, unknown>) {
  return Object.keys(body).length === 1 && typeof body.orderId === "string";
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayOneTimePaymentEnabled()) {
    return errorResponse("Kakao Pay one-time payment is not available", 503);
  }
  if (
    !hasSharedSecret(req, "x-kakaopay-admin-secret", "KAKAOPAY_ADMIN_SECRET")
  ) {
    return errorResponse("Unauthorized", 401);
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!hasOnlyOrderId(body)) return errorResponse("Missing order ID", 400);
  const config = getKakaoPayOneTimeConfig();
  if (!config) {
    return errorResponse("Kakao Pay one-time payment is not configured", 503);
  }

  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("kakaopay_one_time_orders")
    .select("order_id, amount, tid, status")
    .eq("order_id", body.orderId)
    .maybeSingle<OneTimeOrder>();
  if (orderError || !order || !order.tid || order.status !== "paid") {
    return errorResponse("Refundable payment order not found", 404);
  }

  const detail = await kakaoPayRequest<ProviderOrder>(
    config.secretKey,
    "/order",
    withCidSecret(config, { cid: config.oneTimeCid, tid: order.tid }),
  );
  const cancellable = detail.data.cancel_available_amount;
  if (!detail.ok || cancellable?.total !== order.amount) {
    return errorResponse(
      "Kakao Pay did not return the full refundable amount",
      409,
    );
  }
  const cancellation = await kakaoPayRequest<Cancellation>(
    config.secretKey,
    "/cancel",
    withCidSecret(config, {
      cid: config.oneTimeCid,
      tid: order.tid,
      cancel_amount: order.amount,
      cancel_tax_free_amount: cancellable.tax_free ?? 0,
      cancel_vat_amount: cancellable.vat ?? undefined,
      cancel_available_amount: order.amount,
    }),
  );
  if (!cancellation.ok || cancellation.data.status !== "CANCEL_PAYMENT") {
    return errorResponse("Kakao Pay could not fully cancel this payment", 502);
  }

  const { error: revokeError } = await supabase.rpc(
    "revoke_kakaopay_one_time_payment",
    {
      p_order_id: order.order_id,
      p_provider_status: cancellation.data.status,
      p_canceled_at: cancellation.data.canceled_at ?? new Date().toISOString(),
    },
  );
  if (revokeError) {
    await supabase
      .from("kakaopay_one_time_orders")
      .update({
        status: "reconciliation_required",
        failure_code: "KAKAOPAY_REFUND_FINALIZE_FAILED",
        failure_message: "Kakao Pay refund needs entitlement reconciliation",
      })
      .eq("order_id", order.order_id)
      .eq("status", "paid");
    return errorResponse("Refund requires reconciliation", 502);
  }
  return jsonResponse({ success: true, status: cancellation.data.status });
});
