import { connection } from "next/server";

import { APP_VERSION } from "@/lib/appVersion";

/**
 * Reports the version of the build currently serving requests. The client
 * compares this with its own `APP_VERSION`; a difference means a new deployment
 * is live and the running (possibly suspended PWA) page should refresh.
 *
 * `connection()` opts out of prerendering so the value is read at request time
 * and the response is never cached.
 */
export async function GET(): Promise<Response> {
  await connection();

  return Response.json(
    { version: APP_VERSION },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
  );
}
