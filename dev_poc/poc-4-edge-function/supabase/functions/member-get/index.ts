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

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    return errorResponse(error.message, 500)
  }

  if (!data) return jsonResponse({ member: null })

  const member = {
    id: data.id,
    type: data.type,
    plan: data.plan,
    wordsToday: data.words_today,
    wordsThisMonth: data.words_this_month,
    wordsTotal: data.words_total,
    tokensToday: data.tokens_today,
    tokensThisMonth: data.tokens_this_month,
    tokensTotal: data.tokens_total,
    todayResetAt: data.today_reset_at,
    thisMonthResetAt: data.this_month_reset_at,
    isOnTrial: data.is_on_trial,
    trialEndsAt: data.trial_ends_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return jsonResponse({ member })
})
