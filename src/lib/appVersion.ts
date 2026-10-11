/**
 * The version of the build currently running. Next.js inlines the same value
 * into both the client bundle and the server code (see `env` in next.config.ts).
 * The client compares its own copy with `/api/version` to detect a new deploy.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
