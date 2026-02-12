import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase } from "../supabase";
import { produceAppState } from "../store";
import { registerMembers } from "../utils/app.utils";
import { listify } from "@repo/utilities";

interface KakaoAuthCodePayload {
  code: string;
}

const tryInit = async () => {
  try {
    await supabase.functions.invoke("member-init", { body: {} });
  } catch {
    try {
      await supabase.functions.invoke("member-init", { body: {} });
    } catch {}
  }
  const member = await supabase.functions
    .invoke("member-get", { body: {} })
    .then((res) => res.data?.member)
    .catch(() => null);
  produceAppState((state) => {
    registerMembers(state, listify(member));
  });
};

export const submitSignInWithKakao = async (): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });

    const port = await invoke<number>("start_kakao_sign_in");
    const redirectTo = `http://127.0.0.1:${port}/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: "login" },
      },
    });

    if (error || !data.url) {
      throw error || new Error("Failed to get Kakao OAuth URL");
    }

    const codePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Kakao sign-in timed out")),
        120_000,
      );
      const unlisten = listen<KakaoAuthCodePayload>(
        "voquill:kakao-auth",
        (event) => {
          clearTimeout(timeout);
          unlisten.then((fn) => fn());
          resolve(event.payload.code);
        },
      );
    });

    await openUrl(data.url);

    const code = await codePromise;

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;

    await tryInit();

    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch (error) {
    console.error("Kakao auth error:", error);
    produceAppState((state) => {
      state.login.errorMessage =
        "An error occurred while signing in with Kakao.";
      state.login.status = "idle";
    });
  }
};
