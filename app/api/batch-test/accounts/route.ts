import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { loadAllAccounts } from "@/lib/server/batch-test/load-accounts";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const config = loadRuntimeConfig();
    await ensureAdminTokenReady({ config });
    const result = await loadAllAccounts({ config });

    return NextResponse.json({
      accounts: result.accounts,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
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
