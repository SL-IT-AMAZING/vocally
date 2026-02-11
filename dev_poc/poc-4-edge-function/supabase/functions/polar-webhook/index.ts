import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

function verifyWebhookSignature(
  body: string,
  headers: Headers,
  secret: string,
): boolean {
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const rawSecret = secret.replace(/^(whsec_|polar_whs_)/, "");
  const secretBytes = Buffer.from(rawSecret, "base64");

  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
  const computed = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const signatures = webhookSignature.split(" ");
  for (const sig of signatures) {
    const [version, hash] = sig.split(",");
    if (version !== "v1") continue;

    const computedBuf = Buffer.from(computed, "utf8");
    const expectedBuf = Buffer.from(hash, "utf8");

    if (
      computedBuf.length === expectedBuf.length &&
      timingSafeEqual(computedBuf, expectedBuf)
    ) {
      return true;
    }
  }

  return false;
}

async function ensureMemberExists(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  await supabase.from("members").upsert(
    {
      id: userId,
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
}

function extractUserId(event: Record<string, unknown>): string | null {
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const metadata = data.metadata as Record<string, string> | undefined;
  if (metadata?.supabase_user_id) return metadata.supabase_user_id;

  const customer = data.customer as Record<string, unknown> | undefined;
  const customerMetadata = customer?.metadata as
    | Record<string, string>
    | undefined;
  if (customerMetadata?.supabase_user_id)
    return customerMetadata.supabase_user_id;

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const secret = Deno.env.get("POLAR_WEBHOOK_SECRET");
  if (!secret) return errorResponse("Webhook secret not configured", 500);

  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, req.headers, secret)) {
    return errorResponse("Invalid signature", 401);
  }

  const event = JSON.parse(rawBody);
  const eventType = event.type as string;
  console.log("Polar webhook event:", eventType);

  const supabase = createServiceClient();

  if (eventType === "checkout.updated" || eventType === "order.created") {
    const userId = extractUserId(event);
    if (!userId) return jsonResponse({ received: true });

    const data = event.data as Record<string, unknown>;
    const status = data.status as string;

    if (eventType === "checkout.updated" && status !== "succeeded") {
      return jsonResponse({ received: true });
    }

    const subscriptionId = data.subscription_id as string | undefined;

    await ensureMemberExists(supabase, userId);

    const updateData: Record<string, unknown> = {
      plan: "pro",
      is_on_trial: false,
    };

    if (subscriptionId) {
      updateData.polar_subscription_id = subscriptionId;
    }

    await supabase.from("members").update(updateData).eq("id", userId);
  }

  if (eventType === "subscription.active") {
    const userId = extractUserId(event);
    if (!userId) return jsonResponse({ received: true });

    const data = event.data as Record<string, unknown>;
    const subscriptionId = data.id as string;

    await ensureMemberExists(supabase, userId);

    const updateData: Record<string, unknown> = {
      plan: "pro",
      is_on_trial: false,
    };

    if (subscriptionId) {
      updateData.polar_subscription_id = subscriptionId;
    }

    await supabase.from("members").update(updateData).eq("id", userId);
  }

  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.revoked"
  ) {
    const data = event.data as Record<string, unknown>;
    const subscriptionId = data.id as string;

    if (subscriptionId) {
      await supabase
        .from("members")
        .update({ plan: "free", polar_subscription_id: null })
        .eq("polar_subscription_id", subscriptionId);
    }
  }

  if (eventType === "order.refunded") {
    const userId = extractUserId(event);
    if (userId) {
      await supabase.from("members").update({ plan: "free" }).eq("id", userId);
    }
  }

  return jsonResponse({ received: true });
});
