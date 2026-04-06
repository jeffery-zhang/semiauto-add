import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    let body: Record<string, unknown> = {};

    try {
      const parsedBody: unknown = await request.json();

      if (
        typeof parsedBody === "object" &&
        parsedBody !== null &&
        !Array.isArray(parsedBody)
      ) {
        body = parsedBody as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    const address = String(body.address ?? "").trim();

    if (!address) {
      return NextResponse.json(
        { error: { message: "缺少邮箱地址，请先选择临时邮箱" } },
        { status: 400 },
      );
    }

    const config = loadRuntimeConfig();

    if (!config.tempEmailAddresses.includes(address)) {
      return NextResponse.json(
        { error: { message: "邮箱地址不在允许列表中，请重新选择" } },
        { status: 400 },
      );
    }

    const result = await fetchTempEmailCodeJson(address, { config });

    return NextResponse.json({
      code: result.code,
      subject: result.subject,
      from: result.from,
      mailId: result.mailId,
      createdAt: result.createdAt,
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
