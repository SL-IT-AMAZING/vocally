import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createHmac, timingSafeEqual } from "node:crypto"
import { createServiceClient } from "../_shared/supabase.ts"
import { jsonResponse, errorResponse } from "../_shared/response.ts"

function verifySignature(signature: string, rawBody: string, secret: string): boolean {
  const parts = signature.split(";")
  let ts = ""
  let h1 = ""

  for (const part of parts) {
    const [key, value] = part.split("=")
    if (key === "ts") ts = value
    if (key === "h1") h1 = value
  }

  if (!ts || !h1) return false

  const payload = `${ts}:${rawBody}`
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  const computed = hmac.digest("hex")

  const computedBuffer = Buffer.from(computed, "utf8")
  const signatureBuffer = Buffer.from(h1, "utf8")

  if (computedBuffer.length !== signatureBuffer.length) return false

  return timingSafeEqual(computedBuffer, signatureBuffer)
}

Deno.serve(async (req) => {
  const signature = req.headers.get("paddle-signature")
  if (!signature) return errorResponse("Missing signature", 401)

  const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET")
  if (!secret) return errorResponse("Webhook secret not configured", 500)

  const rawBody = await req.text()

  if (!verifySignature(signature, rawBody, secret)) {
    return errorResponse("Invalid signature", 401)
  }

  const event = JSON.parse(rawBody)
  const supabase = createServiceClient()

  if (event.event_type === "transaction.completed") {
    const userId = event.data?.custom_data?.userId
    const subscriptionId = event.data?.subscription_id

    if (!userId) {
      return jsonResponse({ received: true })
    }

    const updateData: Record<string, unknown> = {
      plan: "pro",
      is_on_trial: false,
    }

    if (subscriptionId) {
      updateData.paddle_subscription_id = subscriptionId
    }

    await supabase
      .from("members")
      .update(updateData)
      .eq("id", userId)
  }

  if (event.event_type === "subscription.canceled") {
    const subscriptionId = event.data?.subscription_id

    if (subscriptionId) {
      await supabase
        .from("members")
        .update({ plan: "free" })
        .eq("paddle_subscription_id", subscriptionId)
    }
  }

  return jsonResponse({ received: true })
})
