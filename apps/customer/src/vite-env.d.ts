/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SprintGo API (e.g. https://api.sprintgo.app). Empty = same-origin /api proxy in dev. */
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
