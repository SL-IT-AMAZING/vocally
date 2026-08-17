import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";
import {
  isTossPlan,
  newCustomerKey,
  newOrderId,
  TOSS_ORDER_NAMES,
  TOSS_PRICES,
  TOSS_SITE_URL,
} from "../_shared/toss.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const plan = body.plan;
  if (!isTossPlan(plan)) return errorResponse("Invalid plan", 400);

  const orderId = newOrderId();
  const customerKey = newCustomerKey();
  const amount = TOSS_PRICES[plan];
  const orderName = TOSS_ORDER_NAMES[plan];
  if (!Number.isInteger(amount) || amount <= 0) {
    return errorResponse("Toss price is not configured", 500);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("toss_payment_orders").insert({
    order_id: orderId,
    user_id: user.id,
    plan,
    amount,
    currency: "KRW",
    order_name: orderName,
    customer_key: customerKey,
  });

  if (error) {
    console.error("Failed to create Toss payment order:", error);
    return errorResponse("Failed to create payment order", 500);
  }

  const checkoutUrl = new URL("/checkout/toss", TOSS_SITE_URL);
  checkoutUrl.searchParams.set("orderId", orderId);
  checkoutUrl.searchParams.set("customerKey", customerKey);
  checkoutUrl.searchParams.set("amount", String(amount));
  checkoutUrl.searchParams.set("orderName", orderName);

  return jsonResponse({
    checkoutUrl: checkoutUrl.toString(),
    orderId,
    amount,
    currency: "KRW",
    orderName,
  });
});
