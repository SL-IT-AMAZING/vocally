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
  const fallbackPortalUrl = Deno.env.get("POLAR_PORTAL_URL");

  let returnUrl: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.returnUrl === "string") {
      returnUrl = body.returnUrl;
    }
  } catch {
    // Optional request body
  }

  const sessionPayload: Record<string, string> = {
    external_customer_id: user.id,
  };
  if (returnUrl) {
    sessionPayload.return_url = returnUrl;
  }

  const polarRes = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(sessionPayload),
  });

  if (!polarRes.ok) {
    const errorText = await polarRes.text();
    console.error("Polar portal session error:", polarRes.status, errorText);
    if (fallbackPortalUrl) {
      return jsonResponse({ portalUrl: fallbackPortalUrl, fallback: true });
    }
    return errorResponse("Failed to create customer portal session", 502);
  }

  const data = await polarRes.json();
  const portalUrl =
    (data as { customer_portal_url?: string }).customer_portal_url ??
    (data as { customerPortalUrl?: string }).customerPortalUrl;

  if (!portalUrl) {
    return errorResponse("Customer portal URL missing from response", 502);
  }

  return jsonResponse({ portalUrl });
});
