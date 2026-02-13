import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifyWebhookSignature(
  body: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const rawSecret = secret.replace(/^(whsec_|polar_whs_)/, "");
  const secretBytes = Uint8Array.from(base64ToUint8Array(rawSecret));

  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedContent),
  );

  const computed = uint8ArrayToBase64(new Uint8Array(signatureBytes));

  const signatures = webhookSignature.split(" ");
  for (const sig of signatures) {
    const [version, hash] = sig.split(",");
    if (version !== "v1") continue;

    if (constantTimeEqual(computed, hash)) {
      return true;
    }
  }

  return false;
}

async function ensureMemberExists(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  const { error } = await supabase.from("members").upsert(
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
  if (error) {
    console.error("ensureMemberExists failed:", error);
  }
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

async function promoteToPro(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  subscriptionId: string | undefined,
  eventType: string,
) {
  await ensureMemberExists(supabase, userId);

  const updateData: Record<string, unknown> = {
    plan: "pro",
    is_on_trial: false,
  };

  if (subscriptionId) {
    updateData.polar_subscription_id = subscriptionId;
  }

  const { error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error(`[${eventType}] Failed to update member:`, error);
  } else {
    console.log(`[${eventType}] Updated member ${userId} to pro`);
  }
}

async function downgradeToFree(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptionId: string | undefined,
  userId: string | null,
  eventType: string,
) {
  const updateData = { plan: "free", polar_subscription_id: null };

  if (subscriptionId) {
    const { error } = await supabase
      .from("members")
      .update(updateData)
      .eq("polar_subscription_id", subscriptionId);

    if (error) {
      console.error(
        `[${eventType}] Failed to downgrade member by subscription:`,
        error,
      );
      return;
    }

    console.log(`[${eventType}] Downgraded subscription ${subscriptionId}`);
    return;
  }

  if (userId) {
    const { error } = await supabase
      .from("members")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error(
        `[${eventType}] Failed to downgrade member by user id:`,
        error,
      );
    } else {
      console.log(`[${eventType}] Downgraded member ${userId}`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const secret = Deno.env.get("POLAR_WEBHOOK_SECRET");
  if (!secret) return errorResponse("Webhook secret not configured", 500);

  const rawBody = await req.text();

  if (!(await verifyWebhookSignature(rawBody, req.headers, secret))) {
    console.error("Polar webhook: invalid signature");
    return errorResponse("Invalid signature", 401);
  }

  const event = JSON.parse(rawBody);
  const eventType = event.type as string;
  console.log("Polar webhook event:", eventType);

  const supabase = createServiceClient();

  if (eventType === "checkout.updated" || eventType === "order.paid") {
    const userId = extractUserId(event);
    console.log(`[${eventType}] userId:`, userId);
    if (!userId) {
      console.warn(
        `[${eventType}] No supabase_user_id found in event metadata`,
      );
      return jsonResponse({ received: true });
    }

    const data = event.data as Record<string, unknown>;
    const status = data.status as string;

    if (eventType === "checkout.updated" && status !== "succeeded") {
      console.log(`[checkout.updated] status=${status}, skipping`);
      return jsonResponse({ received: true });
    }

    const subscriptionId = data.subscription_id as string | undefined;
    await promoteToPro(supabase, userId, subscriptionId, eventType);
  }

  if (eventType === "subscription.active") {
    const userId = extractUserId(event);
    console.log("[subscription.active] userId:", userId);
    if (!userId) {
      console.warn(
        "[subscription.active] No supabase_user_id found in event metadata",
      );
      return jsonResponse({ received: true });
    }

    const data = event.data as Record<string, unknown>;
    const subscriptionId = data.id as string;

    await promoteToPro(supabase, userId, subscriptionId, eventType);
  }

  if (
    eventType === "subscription.updated" ||
    eventType === "subscription.past_due"
  ) {
    const userId = extractUserId(event);
    const data = event.data as Record<string, unknown>;
    const subscriptionId = data.id as string | undefined;
    const status = data.status as string | undefined;

    console.log(`[${eventType}] status=${status} userId=${userId}`);

    if (status === "active") {
      if (!userId) {
        console.warn(
          `[${eventType}] No supabase_user_id found for active subscription`,
        );
        return jsonResponse({ received: true });
      }
      await promoteToPro(supabase, userId, subscriptionId, eventType);
      return jsonResponse({ received: true });
    }

    if (
      status === "past_due" ||
      status === "canceled" ||
      status === "revoked" ||
      status === "incomplete" ||
      status === "incomplete_expired"
    ) {
      await downgradeToFree(supabase, subscriptionId, userId, eventType);
      return jsonResponse({ received: true });
    }
  }

  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.revoked"
  ) {
    const data = event.data as Record<string, unknown>;
    const userId = extractUserId(event);
    const subscriptionId = data.id as string | undefined;
    const status = data.status as string | undefined;
    const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);

    if (
      eventType === "subscription.canceled" &&
      status === "active" &&
      cancelAtPeriodEnd
    ) {
      console.log(
        "[subscription.canceled] scheduled at period end; keeping pro until revoked",
      );
      return jsonResponse({ received: true });
    }

    await downgradeToFree(supabase, subscriptionId, userId, eventType);
  }

  if (eventType === "order.refunded") {
    const userId = extractUserId(event);
    if (userId) {
      await downgradeToFree(supabase, undefined, userId, eventType);
    }
  }

  return jsonResponse({ received: true });
});
