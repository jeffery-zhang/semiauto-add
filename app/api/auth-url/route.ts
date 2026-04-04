import { NextResponse } from "next/server";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import {
  extractAuthUrl,
  extractSessionId,
  extractStateFromAuthUrl,
  requestGenAuthUrl,
} from "@/lib/server/base-router/auth-url";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = String(payload?.email ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { error: { message: "邮箱不能为空" } },
        { status: 400 },
      );
    }

    const config = loadRuntimeConfig();
    await ensureAdminTokenReady({ config });
    const authResult = await requestGenAuthUrl({ config });
    const authUrl = extractAuthUrl(authResult.data as Record<string, unknown>);
    const sessionId = extractSessionId(authResult.data as Record<string, unknown>);
    const state = extractStateFromAuthUrl(authUrl);

    return NextResponse.json({
      email,
      authUrl,
      sessionId,
      state,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
