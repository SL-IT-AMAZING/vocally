import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors } from "../_shared/cors.ts"
import { getUser } from "../_shared/auth.ts"
import { createServiceClient } from "../_shared/supabase.ts"
import { jsonResponse, errorResponse } from "../_shared/response.ts"

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const user = await getUser(req)
  if (!user) return errorResponse("Unauthorized", 401)

  const { paymentId } = await req.json()
  if (!paymentId) return errorResponse("Missing paymentId", 400)

  const apiSecret = Deno.env.get("PORTONE_API_SECRET")
  if (!apiSecret) return errorResponse("PortOne API secret not configured", 500)

  const portoneResponse = await fetch(`https://api.portone.io/payments/${paymentId}`, {
    headers: {
      "Authorization": `PortOne ${apiSecret}`,
    },
  })

  if (!portoneResponse.ok) {
    return errorResponse("Failed to verify payment with PortOne", 500)
  }

  const paymentData = await portoneResponse.json()

  if (paymentData.status !== "PAID") {
    return errorResponse("Payment not confirmed", 400)
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from("members")
    .update({
      plan: "pro",
      is_on_trial: false,
    })
    .eq("id", user.id)

  if (error) return errorResponse(error.message, 500)

  return jsonResponse({ success: true })
})
