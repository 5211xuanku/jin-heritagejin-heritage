/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROXY_URL?: string
  readonly VITE_CLOUD_API_BASE?: string
  readonly VITE_CLOUDBASE_ENV_ID?: string
  readonly VITE_CLOUDBASE_REGION?: string
  readonly VITE_TCB_ENV?: string
  readonly VITE_TCB_PUBLISHABLE_KEY?: string
  readonly VITE_AMAP_KEY_1?: string
  readonly VITE_AMAP_SECURITY_JSCODE_1?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
