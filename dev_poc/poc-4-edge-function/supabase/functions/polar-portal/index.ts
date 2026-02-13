import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

const POLAR_API_BASE = "https://api.polar.sh";

async function polarFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${POLAR_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });
}

/**
 * Look up a Polar customer by external_id first,
 * then fall back to email lookup.
 * Returns the Polar customer_id or null.
 */
async function resolveCustomerId(
  userId: string,
  email: string,
  accessToken: string,
): Promise<string | null> {
  // 1) Try by external ID
  const byExternal = await polarFetch(
    `/v1/customers/?external_id=${encodeURIComponent(userId)}&limit=1`,
    accessToken,
  );
  if (byExternal.ok) {
    const data = await byExternal.json();
    const items = (data as { items?: { id: string }[] }).items;
    if (items && items.length > 0) {
      return items[0].id;
    }
  }

  // 2) Fall back to email
  const byEmail = await polarFetch(
    `/v1/customers/?email=${encodeURIComponent(email)}&limit=1`,
    accessToken,
  );
  if (byEmail.ok) {
    const data = await byEmail.json();
    const items = (data as { items?: { id: string }[] }).items;
    if (items && items.length > 0) {
      const customerId = items[0].id;
      // Backfill external_id so future lookups are fast
      await polarFetch(`/v1/customers/${customerId}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ external_id: userId }),
      });
      console.log(
        `Backfilled external_id for customer ${customerId} (user ${userId})`,
      );
      return customerId;
    }
  }

  return null;
}

/**
 * Set the customer locale so the portal renders in the correct language.
 */
async function updateCustomerLocale(
  customerId: string,
  locale: string,
  accessToken: string,
): Promise<void> {
  const res = await polarFetch(`/v1/customers/${customerId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.warn(
      `Failed to update customer locale to ${locale}: ${res.status} ${errText}`,
    );
  }
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
  const fallbackPortalUrl = Deno.env.get("POLAR_PORTAL_URL");

  let returnUrl: string | undefined;
  let locale: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.returnUrl === "string") {
      returnUrl = body.returnUrl;
    }
    if (body && typeof body.locale === "string") {
      locale = body.locale;
    }
  } catch {
    // Optional request body
  }

  // Resolve Polar customer ID (external_id → email fallback)
  const email = user.email ?? "";
  const customerId = await resolveCustomerId(user.id, email, accessToken);

  if (!customerId) {
    console.error(
      `Could not find Polar customer for user ${user.id} (${email})`,
    );
    if (fallbackPortalUrl) {
      return jsonResponse({ portalUrl: fallbackPortalUrl, fallback: true });
    }
    return errorResponse("Customer not found in billing system", 404);
  }

  // Set locale on the customer so the portal renders correctly
  if (locale) {
    await updateCustomerLocale(customerId, locale, accessToken);
  }

  // Create the customer session using resolved customer_id
  const sessionPayload: Record<string, string> = {
    customer_id: customerId,
  };
  if (returnUrl) {
    sessionPayload.return_url = returnUrl;
  }

  const polarRes = await polarFetch(`/v1/customer-sessions/`, accessToken, {
    method: "POST",
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
