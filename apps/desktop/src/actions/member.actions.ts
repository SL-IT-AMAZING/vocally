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
