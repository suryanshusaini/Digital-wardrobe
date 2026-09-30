// proxy.ts — Next.js 16 auth gate (replaces deprecated middleware.ts)
//
// Runs on every request matched by `config.matcher`.
// Unauthenticated visitors are redirected to /login.
// Authenticated visitors and the excluded paths (static assets, auth API,
// the login page itself) pass through without change.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *   _next/static  — compiled JS/CSS bundles
     *   _next/image   — Next.js image optimiser
     *   favicon.ico   — browser icon
     *   api/auth      — NextAuth's own endpoints (sign-in, callback, etc.)
     *   login         — the sign-in page itself (would create an infinite loop)
     *   share         — public read-only shared wardrobe views
     *   api/share     — public share endpoint
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|api/auth|login|signup|share|api/share).*)",
  ],
};
