import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

const POLAR_API_BASE = "https://api.polar.sh";

interface PolarOrder {
  id: string;
  status: string;
  subscription_id?: string;
  metadata?: Record<string, string>;
  customer?: {
    metadata?: Record<string, string>;
  };
}

interface PolarListResponse {
  items: PolarOrder[];
  pagination: {
    total_count: number;
    max_page: number;
  };
}

function extractUserId(order: PolarOrder): string | null {
  if (order.metadata?.supabase_user_id) return order.metadata.supabase_user_id;
  if (order.customer?.metadata?.supabase_user_id)
    return order.customer.metadata.supabase_user_id;
  return null;
}

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

  const supabase = createServiceClient();

  let page = 1;
  let totalReconciled = 0;
  let totalOrders = 0;
  const errors: string[] = [];
  const reconciled: string[] = [];

  while (true) {
    const url = `${POLAR_API_BASE}/v1/orders?page=${page}&limit=100&sorting=-created_at`;
    const polarRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!polarRes.ok) {
      const errorText = await polarRes.text();
      console.error("Polar API error:", polarRes.status, errorText);
      return errorResponse(`Polar API error: ${polarRes.status}`, 502);
    }

    const data: PolarListResponse = await polarRes.json();
    const orders = data.items;

    if (orders.length === 0) break;

    for (const order of orders) {
      totalOrders++;
      const userId = extractUserId(order);

      if (!userId) {
        errors.push(`Order ${order.id}: no supabase_user_id in metadata`);
        continue;
      }

      const { data: member } = await supabase
        .from("members")
        .select("id, plan")
        .eq("id", userId)
        .single();

      if (!member) {
        const { error: upsertError } = await supabase.from("members").upsert(
          {
            id: userId,
            type: "user",
            plan: "pro",
            is_on_trial: false,
            words_today: 0,
            words_this_month: 0,
            words_total: 0,
            tokens_today: 0,
            tokens_this_month: 0,
            tokens_total: 0,
            ...(order.subscription_id
              ? { polar_subscription_id: order.subscription_id }
              : {}),
          },
          { onConflict: "id" },
        );

        if (upsertError) {
          errors.push(
            `Order ${order.id}: failed to create member ${userId}: ${upsertError.message}`,
          );
        } else {
          totalReconciled++;
          reconciled.push(userId);
          console.log(`Reconciled: created member ${userId} as pro`);
        }
        continue;
      }

      if (member.plan !== "pro") {
        const updateData: Record<string, unknown> = {
          plan: "pro",
          is_on_trial: false,
        };
        if (order.subscription_id) {
          updateData.polar_subscription_id = order.subscription_id;
        }

        const { error: updateError } = await supabase
          .from("members")
          .update(updateData)
          .eq("id", userId);

        if (updateError) {
          errors.push(
            `Order ${order.id}: failed to update member ${userId}: ${updateError.message}`,
          );
        } else {
          totalReconciled++;
          reconciled.push(userId);
          console.log(`Reconciled: upgraded member ${userId} to pro`);
        }
      }
    }

    if (page >= data.pagination.max_page) break;
    page++;
  }

  console.log(
    `Reconciliation complete: ${totalReconciled} fixed out of ${totalOrders} orders`,
  );

  return jsonResponse({
    totalOrders,
    totalReconciled,
    reconciledUserIds: reconciled,
    errors,
  });
});
