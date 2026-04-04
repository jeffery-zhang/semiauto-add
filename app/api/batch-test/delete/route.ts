import { NextResponse } from "next/server";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import { requestDeleteAccount } from "@/lib/server/base-router/accounts";
import { removeBatchTestJobRows } from "@/lib/server/batch-test/job-store";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      jobId?: string;
      accountIds?: number[];
    };
    const jobId = String(payload?.jobId ?? "").trim();
    const accountIds = Array.isArray(payload?.accountIds)
      ? payload.accountIds.map((item) => Number(item)).filter(Number.isFinite)
      : [];

    if (!jobId || accountIds.length === 0) {
      return NextResponse.json(
        { error: { message: "jobId 和 accountIds 不能为空" } },
        { status: 400 },
      );
    }

    const config = loadRuntimeConfig();
    await ensureAdminTokenReady({ config });

    const deletedIds: number[] = [];
    const failed: Array<{ id: number; message: string }> = [];

    for (const accountId of accountIds) {
      try {
        await requestDeleteAccount({ config, accountId });
        deletedIds.push(accountId);
      } catch (error) {
        failed.push({
          id: accountId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (deletedIds.length > 0) {
      removeBatchTestJobRows(jobId, deletedIds);
    }

    return NextResponse.json({ deletedIds, failed });
  } catch (error) {
    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
