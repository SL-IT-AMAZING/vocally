import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const supabase = createServiceClient();

  const { error } = await supabase.from("members").upsert(
    {
      id: user.id,
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

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({});
});
