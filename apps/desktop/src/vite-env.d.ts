/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FLAVOR?: string;
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_PADDLE_CLIENT_TOKEN?: string;
  readonly VITE_PADDLE_PRICE_MONTHLY?: string;
  readonly VITE_PADDLE_PRICE_YEARLY?: string;
  readonly VITE_GPU_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
