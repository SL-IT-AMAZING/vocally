import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors } from "../_shared/cors.ts"
import { getUser } from "../_shared/auth.ts"
import { createServiceClient } from "../_shared/supabase.ts"
import { jsonResponse, errorResponse } from "../_shared/response.ts"

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
  }
  return map[mime] || "wav"
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const user = await getUser(req)
  if (!user) return errorResponse("Unauthorized", 401)

  try {
    const { audioBase64, audioMimeType, prompt, language } = await req.json()

    if (!audioBase64) return errorResponse("audioBase64 is required", 400)

    const groqApiKey = Deno.env.get("GROQ_API_KEY")
    if (!groqApiKey) return errorResponse("GROQ_API_KEY not configured", 500)

    const supabase = createServiceClient()

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("words_today, words_this_month, words_total, plan")
      .eq("id", user.id)
      .single()

    if (memberError || !member) {
      return errorResponse("Member not initialized. Call member-init first.", 403)
    }

    const monthlyLimit = member.plan === "pro" ? 100_000 : 500
    if (member.words_this_month >= monthlyLimit) {
      return errorResponse("Monthly word limit reached", 429)
    }

    const binaryString = atob(audioBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const ext = mimeToExt(audioMimeType || "audio/wav")
    const blob = new Blob([bytes], { type: audioMimeType || "audio/wav" })

    const formData = new FormData()
    formData.append("file", blob, `audio.${ext}`)
    formData.append("model", "whisper-large-v3-turbo")
    formData.append("language", language || "ko")
    if (prompt) formData.append("prompt", prompt)

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      },
    )

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      return errorResponse(`Groq API error: ${groqResponse.status} ${errorText}`, 502)
    }

    const result = await groqResponse.json()
    const text = result.text || ""
    const wordsUsed = countWords(text)

    await supabase.rpc("increment_member_usage", {
      p_member_id: user.id,
      p_words: wordsUsed,
      p_tokens: 0,
    })

    return jsonResponse({ text })
  } catch (err) {
    return errorResponse(err.message, 500)
  }
})
