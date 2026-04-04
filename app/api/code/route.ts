import { NextResponse } from "next/server";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";

const FIXED_EMAIL_ADDRESS = "crystiano@penaldo.top";

export async function POST() {
  try {
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
    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
