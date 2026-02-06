import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors } from "../_shared/cors.ts"
import { getUser } from "../_shared/auth.ts"
import { createServiceClient } from "../_shared/supabase.ts"
import { jsonResponse, errorResponse } from "../_shared/response.ts"

const MODEL_MAP: Record<string, string> = {
  medium: "meta-llama/llama-4-scout-17b-16e-instruct",
  large: "openai/gpt-oss-120b",
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const user = await getUser(req)
  if (!user) return errorResponse("Unauthorized", 401)

  try {
    const { prompt, system, model, jsonResponse: jsonSchema } = await req.json()

    if (!prompt) return errorResponse("prompt is required")

    const groqApiKey = Deno.env.get("GROQ_API_KEY")
    if (!groqApiKey) return errorResponse("GROQ_API_KEY not configured", 500)

    const supabase = createServiceClient()

    // Check member exists and token limits
    const { data: member } = await supabase
      .from("members")
      .select("tokens_today, tokens_this_month, tokens_total, plan")
      .eq("id", user.id)
      .single()

    if (!member) return errorResponse("Member not initialized. Call member-init first.", 403)

    const resolvedModel = MODEL_MAP[model || "medium"] || MODEL_MAP.medium

    const messages: Array<{ role: string; content: string }> = []
    if (system) {
      messages.push({ role: "system", content: system })
    }
    messages.push({ role: "user", content: prompt })

    const requestBody: Record<string, unknown> = {
      messages,
      model: resolvedModel,
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
    }

    if (jsonSchema) {
      requestBody.response_format = {
        type: "json_schema",
        json_schema: {
          name: jsonSchema.name,
          description: jsonSchema.description,
          schema: jsonSchema.schema,
        },
      }
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      return errorResponse(`Groq API error: ${groqResponse.status} ${errorText}`, 502)
    }

    const result = await groqResponse.json()

    if (!result.choices || result.choices.length === 0) {
      return errorResponse("No response from Groq", 502)
    }

    const text = result.choices[0].message?.content || ""
    const tokensUsed = result.usage?.total_tokens || 0

    // Increment token counters
    await supabase
      .from("members")
      .update({
        tokens_today: member.tokens_today + tokensUsed,
        tokens_this_month: member.tokens_this_month + tokensUsed,
        tokens_total: member.tokens_total + tokensUsed,
      })
      .eq("id", user.id)

    return jsonResponse({ text })
  } catch (err) {
    return errorResponse(err.message, 500)
  }
})
