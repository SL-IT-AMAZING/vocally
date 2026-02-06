import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors } from "../_shared/cors.ts"
import { getUser } from "../_shared/auth.ts"
import { createServiceClient } from "../_shared/supabase.ts"
import { jsonResponse, errorResponse } from "../_shared/response.ts"

const camelToSnake: Record<string, string> = {
  name: "name",
  bio: "bio",
  company: "company",
  title: "title",
  onboarded: "onboarded",
  onboardedAt: "onboarded_at",
  timezone: "timezone",
  preferredLanguage: "preferred_language",
  preferredMicrophone: "preferred_microphone",
  playInteractionChime: "play_interaction_chime",
  hasFinishedTutorial: "has_finished_tutorial",
  wordsThisMonth: "words_this_month",
  wordsThisMonthMonth: "words_this_month_month",
  wordsTotal: "words_total",
  cohort: "cohort",
  shouldShowUpgradeDialog: "should_show_upgrade_dialog",
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const user = await getUser(req)
  if (!user) return errorResponse("Unauthorized", 401)

  const { value } = await req.json()
  if (!value || typeof value !== "object") {
    return errorResponse("value is required")
  }

  const dbFields: Record<string, unknown> = { id: user.id }
  for (const [key, val] of Object.entries(value)) {
    const dbKey = camelToSnake[key]
    if (dbKey) dbFields[dbKey] = val
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from("profiles")
    .upsert(dbFields, { onConflict: "id" })

  if (error) return errorResponse(error.message, 500)

  return jsonResponse({})
})
