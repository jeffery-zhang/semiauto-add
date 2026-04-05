import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthCookieValue } from "@/lib/server/auth/cookie";
import { createUnauthorizedResponse } from "@/lib/server/auth/guard";
import { loadAuthConfig } from "@/lib/server/config";

const LOGIN_PATH = "/login";
const HOME_PATH = "/";
const AUTH_API_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);

async function getAuthSession(request: NextRequest, env: NodeJS.ProcessEnv = process.env) {
  const config = loadAuthConfig(env);
  return verifyAuthCookieValue(config, request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !AUTH_API_PATHS.has(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getAuthSession(request);

  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL(HOME_PATH, request.url));
    }

    return NextResponse.next();
  }

  if (AUTH_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  if (isProtectedApiPath(pathname)) {
    return createUnauthorizedResponse();
  }

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
