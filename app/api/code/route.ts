import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";

const FIXED_EMAIL_ADDRESS = "crystiano@penaldo.top";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const config = loadRuntimeConfig();
    const result = await fetchTempEmailCodeJson(FIXED_EMAIL_ADDRESS, { config });

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
