import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import { isTossPlan, nextBillingAt, tossRequest } from "../_shared/toss.ts";

type PaymentOrder = {
  order_id: string;
  user_id: string;
  plan: "monthly" | "yearly";
  amount: number;
  order_name: string;
  customer_key: string | null;
  status: string;
};

type TossBilling = { billingKey?: string };
type TossPayment = { paymentKey?: string };
type TossError = { code?: string; message?: string };

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const body = (await req.json().catch(() => ({}))) as {
    orderId?: unknown;
    customerKey?: unknown;
    authKey?: unknown;
  };
  if (
    typeof body.orderId !== "string" ||
    typeof body.customerKey !== "string" ||
    typeof body.authKey !== "string"
  ) {
    return errorResponse("Missing billing authorization", 400);
  }

  const secretKey = Deno.env.get("TOSS_SECRET_KEY");
  if (!secretKey) return errorResponse("Toss secret key not configured", 500);

  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("toss_payment_orders")
    .select("order_id, user_id, plan, amount, order_name, customer_key, status")
    .eq("order_id", body.orderId)
    .maybeSingle<PaymentOrder>();

  if (orderError || !order)
    return errorResponse("Payment order not found", 404);
  if (order.status === "paid")
    return jsonResponse({ success: true, alreadyPaid: true });
  if (order.status !== "pending")
    return errorResponse("Payment order is not payable", 409);
  if (order.customer_key !== body.customerKey)
    return errorResponse("Invalid customer key", 403);
  if (!isTossPlan(order.plan))
    return errorResponse("Invalid payment plan", 500);

  const billingResult = await tossRequest<TossBilling>(
    secretKey,
    "/billing/authorizations/issue",
    {
      method: "POST",
      body: JSON.stringify({
        authKey: body.authKey,
        customerKey: body.customerKey,
      }),
    },
  );
  const billingKey = billingResult.data.billingKey;
  if (!billingResult.ok || !billingKey) {
    const failure = billingResult.data as TossError;
    await supabase
      .from("toss_payment_orders")
      .update({
        status: "failed",
        failure_code: failure.code ?? "BILLING_KEY_ISSUE_FAILED",
        failure_message: failure.message ?? "Failed to issue billing key",
      })
      .eq("order_id", order.order_id);
    return errorResponse(failure.message ?? "Failed to issue billing key", 502);
  }

  const paymentResult = await tossRequest<TossPayment>(
    secretKey,
    `/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      body: JSON.stringify({
        customerKey: body.customerKey,
        amount: order.amount,
        orderId: order.order_id,
        orderName: order.order_name,
      }),
    },
  );
  const paymentKey = paymentResult.data.paymentKey;
  if (!paymentResult.ok || !paymentKey) {
    const failure = paymentResult.data as TossError;
    await tossRequest(secretKey, `/billing/${encodeURIComponent(billingKey)}`, {
      method: "DELETE",
    });
    await supabase
      .from("toss_payment_orders")
      .update({
        status: "failed",
        failure_code: failure.code ?? "BILLING_PAYMENT_FAILED",
        failure_message: failure.message ?? "Failed to charge payment",
      })
      .eq("order_id", order.order_id);
    return errorResponse(failure.message ?? "Failed to charge payment", 502);
  }

  const paidAt = new Date().toISOString();
  const { error: paymentUpdateError } = await supabase
    .from("toss_payment_orders")
    .update({
      status: "paid",
      payment_key: paymentKey,
      paid_at: paidAt,
      due_at: nextBillingAt(order.plan, new Date(paidAt)),
    })
    .eq("order_id", order.order_id)
    .eq("status", "pending");

  if (paymentUpdateError) {
    console.error("Failed to mark Toss order paid:", paymentUpdateError);
    return errorResponse("Payment succeeded but account update failed", 500);
  }

  await supabase.from("members").upsert(
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

  const { error: subscriptionError } = await supabase
    .from("toss_subscriptions")
    .upsert(
      {
        user_id: order.user_id,
        customer_key: body.customerKey,
        billing_key: billingKey,
        plan: order.plan,
        status: "active",
        next_billing_at: nextBillingAt(order.plan, new Date(paidAt)),
        cancel_at_period_end: false,
        retry_count: 0,
      },
      { onConflict: "user_id" },
    );

  if (subscriptionError) {
    console.error("Failed to save Toss subscription:", subscriptionError);
    return errorResponse(
      "Payment succeeded but subscription setup failed",
      500,
    );
  }

  const { error: memberError } = await supabase
    .from("members")
    .update({
      plan: "pro",
      is_on_trial: false,
    })
    .eq("id", order.user_id);

  if (memberError) {
    console.error("Failed to activate Toss member:", memberError);
    return errorResponse(
      "Payment succeeded but account activation failed",
      500,
    );
  }

  return jsonResponse({ success: true, paymentKey });
});
