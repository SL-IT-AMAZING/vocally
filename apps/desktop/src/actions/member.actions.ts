import { supabase } from "../supabase";
import { listify } from "@repo/utilities";
import { getAppState, produceAppState } from "../store";
import { registerMembers } from "../utils/app.utils";

export async function refreshMember(): Promise<void> {
  const state = getAppState();
  const userId = state.auth?.id;
  if (!userId) {
    return;
  }

  try {
    const res = await supabase.functions.invoke("member-get", { body: {} });
    if (res.error) {
      console.error("member-get returned error:", res.error);
      return;
    }
    const member = res.data?.member;
    produceAppState((draft) => {
      registerMembers(draft, listify(member));
    });
  } catch (error) {
    console.error("Failed to refresh member", error);
  }
}

export async function reportWordUsage(
  words: number,
  tokens: number = 0,
): Promise<void> {
  if (words <= 0 && tokens <= 0) {
    return;
  }

  const state = getAppState();
  const userId = state.auth?.id;
  if (!userId) {
    return;
  }

  try {
    const { error } = await supabase.rpc("increment_member_usage", {
      p_member_id: userId,
      p_words: words,
      p_tokens: tokens,
    });
    if (error) {
      console.error("Failed to report word usage to server:", error);
      return;
    }
    await refreshMember();
  } catch (error) {
    console.error("Failed to report word usage to server:", error);
  }
}
