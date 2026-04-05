import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { requestAddAccount } from "@/lib/server/base-router/add-account";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import { requestExchangeCode } from "@/lib/server/base-router/exchange-code";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { buildAddAccountPayload } from "@/lib/shared/account-payload";
import { extractCodeFromCallbackUrl } from "@/lib/shared/callback-url";

function extractExchangeData(result: Record<string, unknown>) {
  const exchangeData =
    (result as { data?: Record<string, unknown> }).data ??
    (result as { data?: { data?: Record<string, unknown> } }).data?.data ??
    result;

  if (!exchangeData || typeof exchangeData !== "object") {
    throw new Error("exchange_code 响应中缺少 data");
  }

  return exchangeData;
}

function extractAccountStatus(result: Record<string, unknown>) {
  const status =
    (result as { status?: string }).status ??
    (result as { data?: { data?: { status?: string }; status?: string } }).data?.data?.status ??
    (result as { data?: { status?: string } }).data?.status;

  if (!status) {
    throw new Error("add_account 响应中缺少 status");
  }

  return status;
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const payload = (await request.json()) as {
      email?: string;
      sessionId?: string;
      state?: string;
      callbackUrl?: string;
    };

    const email = String(payload?.email ?? "").trim();
    const sessionId = String(payload?.sessionId ?? "").trim();
    const state = String(payload?.state ?? "").trim();
    const callbackUrl = String(payload?.callbackUrl ?? "").trim();

    if (!email || !sessionId || !state || !callbackUrl) {
      return NextResponse.json(
        { error: { message: "缺少添加账号所需的上下文字段" } },
        { status: 400 },
      );
    }

    const code = extractCodeFromCallbackUrl(callbackUrl);
    const config = loadRuntimeConfig();

    await ensureAdminTokenReady({ config });

    const exchangeResult = await requestExchangeCode({
      config,
      payload: {
        code,
        session_id: sessionId,
        state,
      },
    });
    const exchangeData = extractExchangeData(exchangeResult.data as Record<string, unknown>);
    const addPayload = buildAddAccountPayload({ email, exchangeData });
    const addResult = await requestAddAccount({ config, payload: addPayload });
    const status = extractAccountStatus(addResult.data as Record<string, unknown>);

    return NextResponse.json({
      email,
      status,
      isActive: status === "active",
      summary: {
        email,
        status,
        isActive: status === "active",
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return createUnauthorizedResponse(error.message);
    }

    const message = toSafeErrorMessage(error);
    const isValidationError =
      message.includes("回调 URL 必须以") || message.includes("回调 URL 中缺少 code 参数");

    return NextResponse.json(
      { error: { message } },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
