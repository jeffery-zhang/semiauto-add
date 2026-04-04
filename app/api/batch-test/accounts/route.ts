import { NextResponse } from "next/server";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { loadAllAccounts } from "@/lib/server/batch-test/load-accounts";

export async function POST() {
  try {
    const config = loadRuntimeConfig();
    await ensureAdminTokenReady({ config });
    const result = await loadAllAccounts({ config });

    return NextResponse.json({
      accounts: result.accounts,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
