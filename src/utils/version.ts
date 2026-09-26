/**
 * Which release this is: package.json's "version", stamped in at build time by
 * vite.config.ts (see appVersion there for how to raise it).
 *
 * "dev" where nothing stamped it — the tests, which run without that config.
 * Paired in the About panel with BUILD_ID from errorReport, the exact commit,
 * so a report can name both the release and the deploy.
 */
declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
