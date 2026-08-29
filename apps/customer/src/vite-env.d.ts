/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SprintGo API (e.g. https://api.sprintgo.app). Empty = same-origin /api proxy in dev. */
  readonly VITE_API_BASE?: string;
  /**
   * "1" only when this build was packaged with a google-services.json. Calling
   * the FCM plugin without one is a NATIVE crash, which no JS try/catch can
   * catch, so the app must know at build time whether push exists at all.
   */
  readonly VITE_PUSH_ENABLED?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
