import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  buildExpiredAuthCookieOptions,
} from "@/lib/server/auth/cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    ...buildExpiredAuthCookieOptions(),
  });

  return response;
}
