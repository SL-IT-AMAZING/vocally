import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, jsonResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const supabase = createServiceClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  if (memberError) return errorResponse("Failed to load subscription", 500);
  const { data: subscription, error: subscriptionError } = await supabase
    .from("toss_subscriptions")
    .select("billing_key, next_billing_at, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError)
    return errorResponse("Failed to load subscription", 500);
  if (!member || member.plan !== "pro" || !subscription) {
    return errorResponse("No active Toss subscription", 404);
  }
  if (subscription.cancel_at_period_end) {
    return jsonResponse({
      success: true,
      cancelAtPeriodEnd: true,
      nextBillingAt: subscription.next_billing_at,
    });
  }

  const { error } = await supabase
    .from("toss_subscriptions")
    .update({
      cancel_at_period_end: true,
      status: "canceled",
    })
    .eq("user_id", user.id);

  if (error) return errorResponse("Failed to cancel subscription", 500);

  return jsonResponse({
    success: true,
    cancelAtPeriodEnd: true,
    nextBillingAt: subscription.next_billing_at,
  });
});
