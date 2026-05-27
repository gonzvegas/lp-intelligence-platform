/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_AUTH_DISABLED?: string
  readonly VITE_ENTRA_CLIENT_ID?: string
  readonly VITE_ENTRA_AUTHORITY?: string
  readonly VITE_ENTRA_API_SCOPE?: string
  readonly VITE_PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.mjs?url' {
  const src: string
  export default src
}
