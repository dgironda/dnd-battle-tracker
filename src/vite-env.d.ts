/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_POSTHOG_HOST: string
  readonly VITE_PUBLIC_POSTHOG_KEY: string
  // add other env vars here if you want
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
