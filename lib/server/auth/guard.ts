import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthCookieValue } from "@/lib/server/auth/cookie";
import { loadAuthConfig } from "@/lib/server/config";

const DEFAULT_UNAUTHORIZED_MESSAGE = "未授权访问，请先登录";

export class UnauthorizedError extends Error {
  status = 401;

  constructor(message = DEFAULT_UNAUTHORIZED_MESSAGE) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function getHeaders(headers: Headers | HeadersInit | undefined) {
  return headers instanceof Headers ? headers : new Headers(headers);
}

function extractCookieValue(cookieHeader: string, name: string) {
  const prefix = `${name}=`;

  for (const chunk of cookieHeader.split(";")) {
    const cookie = chunk.trim();

    if (cookie.startsWith(prefix)) {
      return cookie.slice(prefix.length);
    }
  }

  return undefined;
}

export async function requireAuthenticatedRequest(
  requestLike: Pick<Request, "headers"> | { headers?: Headers | HeadersInit },
  env: NodeJS.ProcessEnv = process.env,
) {
  const config = loadAuthConfig(env);
  const cookieHeader = getHeaders(requestLike.headers).get("cookie") ?? "";
  const authCookieValue = extractCookieValue(cookieHeader, AUTH_COOKIE_NAME);
  const payload = await verifyAuthCookieValue(config, authCookieValue);

  if (!payload) {
    throw new UnauthorizedError();
  }

  return payload;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function createUnauthorizedResponse(message = DEFAULT_UNAUTHORIZED_MESSAGE) {
  return NextResponse.json({ error: { message } }, { status: 401 });
}
