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

  const { transactionId } = await req.json()
  if (!transactionId) return errorResponse("Missing transactionId", 400)

  const apiKey = Deno.env.get("PADDLE_API_KEY")
  if (!apiKey) return errorResponse("Paddle API key not configured", 500)

  const environment = Deno.env.get("PADDLE_ENVIRONMENT") || "sandbox"
  const baseUrl = environment === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com"

  const paddleResponse = await fetch(`${baseUrl}/transactions/${transactionId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  })

  if (!paddleResponse.ok) {
    return errorResponse("Failed to verify transaction with Paddle", 500)
  }

  const transactionData = await paddleResponse.json()

  if (transactionData.data.status !== "completed" && transactionData.data.status !== "paid") {
    return errorResponse("Transaction not completed", 400)
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
