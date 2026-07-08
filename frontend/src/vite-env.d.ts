/// <reference types="vite/client" />

// Explicit fallback so `tsc` types import.meta.env even if vite/client types
// fail to resolve in a given build environment.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
