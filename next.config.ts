import { execSync } from "node:child_process";

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Origins the browser needs to reach for Supabase REST/Auth/Realtime. */
function supabaseConnectSources(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const origin = new URL(url).origin;
    return [origin, origin.replace(/^https:/, "wss:")];
  } catch {
    return [];
  }
}

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * Per-build version shared by the client bundle and `/api/version`. The client
 * compares the two to detect a new deployment and refresh an installed PWA.
 *
 * It must be identical for every compilation in a build, so it is derived from
 * a stable source (the deploy's git SHA) rather than `Date.now()`, which would
 * differ between the client and server bundles.
 */
function resolveAppVersion(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.SOURCE_VERSION;
  if (fromEnv) return fromEnv;

  try {
    const sha = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (sha) return sha;
  } catch {
    // Not a git checkout; fall through to the package version.
  }

  return process.env.npm_package_version || "dev";
}

const appVersion = resolveAppVersion();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `frame-src 'self'${turnstileEnabled ? ` ${TURNSTILE_ORIGIN}` : ""}`,
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${
    turnstileEnabled ? ` ${TURNSTILE_ORIGIN}` : ""
  }`,
  [
    "connect-src 'self'",
    ...supabaseConnectSources(),
    ...(turnstileEnabled ? [TURNSTILE_ORIGIN] : []),
    ...(isDev ? ["ws:", "wss:"] : []),
  ].join(" "),
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  allowedDevOrigins: ["192.168.1.97"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
