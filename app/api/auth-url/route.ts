import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
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
    await requireAuthenticatedRequest(request);
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
    if (isUnauthorizedError(error)) {
      return createUnauthorizedResponse(error.message);
    }

    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
