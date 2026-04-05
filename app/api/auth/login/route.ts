import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  createAuthCookieValue,
} from "@/lib/server/auth/cookie";
import { loadAuthConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";

const INVALID_CREDENTIALS_MESSAGE = "用户名或密码错误";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = String(payload?.username ?? "").trim();
    const password = String(payload?.password ?? "");
    const config = loadAuthConfig();

    if (username !== config.authUsername || password !== config.authPassword) {
      return NextResponse.json(
        { error: { message: INVALID_CREDENTIALS_MESSAGE } },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    const cookieValue = await createAuthCookieValue(config, {
      username: config.authUsername,
      issuedAt: Date.now(),
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: cookieValue,
      ...buildAuthCookieOptions(),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
