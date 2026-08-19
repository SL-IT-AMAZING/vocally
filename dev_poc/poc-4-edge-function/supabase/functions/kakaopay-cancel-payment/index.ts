import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hasSharedSecret } from "../_shared/auth.ts";
import {
  getKakaoPayConfig,
  isKakaoPayPaymentEnabled,
  kakaoPayRequest,
  withCidSecret,
} from "../_shared/kakaopay.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type Order = {
  order_id: string;
  user_id: string;
  tid: string | null;
  status: string;
  sid: string | null;
};
type ProviderOrder = {
  status?: string;
  cancel_available_amount?: { total?: number; tax_free?: number; vat?: number };
};
type Cancellation = {
  status?: string;
  canceled_at?: string;
  error_code?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!isKakaoPayPaymentEnabled()) {
    return errorResponse("Kakao Pay is not available", 503);
  }
  if (
    !hasSharedSecret(req, "x-kakaopay-admin-secret", "KAKAOPAY_ADMIN_SECRET")
  ) {
    return errorResponse("Unauthorized", 401);
  }
  const body = (await req.json().catch(() => ({}))) as { orderId?: unknown };
  if (typeof body.orderId !== "string") {
    return errorResponse("Missing order ID", 400);
  }
  const config = getKakaoPayConfig();
  if (!config) return errorResponse("Kakao Pay is not configured", 503);
  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from("kakaopay_payment_orders")
    .select("order_id, user_id, tid, status, sid")
    .eq("order_id", body.orderId)
    .maybeSingle<Order>();
  if (
    error ||
    !order ||
    !order.tid ||
    !["paid", "partially_refunded"].includes(order.status)
  ) {
    return errorResponse("Refundable payment order not found", 404);
  }
  const detail = await kakaoPayRequest<ProviderOrder>(
    config.secretKey,
    "/order",
    withCidSecret(config, {
      cid: config.subscriptionCid,
      tid: order.tid,
    }),
  );
  const cancellable = detail.data.cancel_available_amount;
  if (!detail.ok || !cancellable?.total || cancellable.total <= 0) {
    return errorResponse("Kakao Pay did not return a refundable amount", 409);
  }
  const cancellation = await kakaoPayRequest<Cancellation>(
    config.secretKey,
    "/cancel",
    withCidSecret(config, {
      cid: config.subscriptionCid,
      tid: order.tid,
      cancel_amount: cancellable.total,
      cancel_tax_free_amount: cancellable.tax_free ?? 0,
      cancel_vat_amount: cancellable.vat ?? undefined,
      cancel_available_amount: cancellable.total,
    }),
  );
  if (
    !cancellation.ok ||
    !["CANCEL_PAYMENT", "PART_CANCEL_PAYMENT"].includes(
      cancellation.data.status ?? "",
    )
  ) {
    return errorResponse("Kakao Pay could not cancel this payment", 502);
  }
  const refunded = cancellation.data.status === "CANCEL_PAYMENT";
  await supabase
    .from("kakaopay_payment_orders")
    .update({
      status: refunded ? "refunded" : "partially_refunded",
      provider_status: cancellation.data.status,
      canceled_at: cancellation.data.canceled_at ?? new Date().toISOString(),
    })
    .eq("order_id", order.order_id);
  if (refunded && order.sid) {
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
        "Payment was refunded but subscription cancellation needs reconciliation",
        502,
      );
    }
    await supabase
      .from("kakaopay_subscriptions")
      .update({
        status: "canceled",
        sid_status: "INACTIVE",
        current_period_end: new Date().toISOString(),
        next_billing_at: new Date().toISOString(),
      })
      .eq("user_id", order.user_id);
    await supabase.rpc("recompute_member_plan", { p_member_id: order.user_id });
  }
  return jsonResponse({ success: true, status: cancellation.data.status });
});
