import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

const POLAR_API_BASE = "https://api.polar.sh";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const accessToken = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!accessToken) return errorResponse("Polar not configured", 500);

  let body: { productId?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { productId } = body;
  if (!productId) return errorResponse("productId is required", 400);

  const locale = body.locale || "en";

  const checkoutBody = {
    product_id: productId,
    payment_processor: "stripe",
    ...(user.email ? { customer_email: user.email } : {}),
    external_customer_id: user.id,
    metadata: { supabase_user_id: user.id },
    success_url: "https://vocally-web.vercel.app/checkout/success",
    allow_discount_codes: true,
    locale,
  };

  const polarRes = await fetch(`${POLAR_API_BASE}/v1/checkouts/custom/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(checkoutBody),
  });

  if (!polarRes.ok) {
    const errorText = await polarRes.text();
    console.error("Polar checkout error:", polarRes.status, errorText);
    return errorResponse(`Failed to create checkout: ${polarRes.status}`, 502);
  }

  const checkout = await polarRes.json();

  return jsonResponse({ checkoutUrl: checkout.url });
});
