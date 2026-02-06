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
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    return errorResponse(error.message, 500)
  }

  if (!data) return jsonResponse({ user: null })

  const profile = {
    id: data.id,
    name: data.name,
    bio: data.bio ?? null,
    company: data.company ?? null,
    title: data.title ?? null,
    onboarded: data.onboarded,
    onboardedAt: data.onboarded_at ?? null,
    timezone: data.timezone ?? null,
    preferredLanguage: data.preferred_language ?? null,
    preferredMicrophone: data.preferred_microphone ?? null,
    playInteractionChime: data.play_interaction_chime,
    hasFinishedTutorial: data.has_finished_tutorial,
    wordsThisMonth: data.words_this_month,
    wordsThisMonthMonth: data.words_this_month_month ?? null,
    wordsTotal: data.words_total,
    cohort: data.cohort ?? null,
    shouldShowUpgradeDialog: data.should_show_upgrade_dialog ?? false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return jsonResponse({ user: profile })
})
