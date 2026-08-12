import type { Context } from "@netlify/edge-functions";

/**
 * Hub gate.
 *
 * Guards the presentation hub itself with HTTP Basic Auth, while leaving every
 * individual presentation open. Clients get a direct deck link and see no prompt.
 * Anyone who trims the URL back to the site root hits a password box and cannot
 * enumerate the other decks.
 *
 * The gate covers the three surfaces that expose the catalogue:
 *   /              the hub page
 *   /index.html    the same page by its explicit filename
 *   /manifest.js   the list of every deck, its title and its URL
 *
 * Credentials come from the Netlify UI (Site configuration, Environment variables)
 * and never live in this repository. If they are not set, the gate deliberately
 * stays open rather than locking the hub behind a password nobody knows.
 */

export default async (request: Request, context: Context) => {
  const user = Deno.env.get("HUB_USER");
  const pass = Deno.env.get("HUB_PASS");

  // Fail open when unconfigured: the hub is then exactly as reachable as it is today.
  if (!user || !pass) return context.next();

  const expected = "Basic " + btoa(`${user}:${pass}`);
  const offered = request.headers.get("authorization");

  if (offered !== expected) {
    return new Response("Restricted.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Presentations hub", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  return context.next();
};

export const config = {
  path: ["/", "/index.html", "/manifest.js"],
};
