import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { ensureAdminTokenReady } from "@/lib/server/base-router/admin-token";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { loadAllAccounts, pickAccountsByIds } from "@/lib/server/batch-test/load-accounts";
import { getBatchTestJob } from "@/lib/server/batch-test/job-store";
import { startBatchTestJob } from "@/lib/server/batch-test/run-batch-test";

function resolveAccountsFromExistingJob(jobId: string | undefined, accountIds: number[]) {
  if (!jobId) {
    return null;
  }

  const job = getBatchTestJob(jobId);
  if (!job) {
    return null;
  }

  return pickAccountsByIds(job.rows, accountIds);
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const payload = (await request.json()) as {
      accountIds?: number[];
      jobId?: string;
    };

    const accountIds = Array.isArray(payload?.accountIds)
      ? payload.accountIds.map((item) => Number(item)).filter(Number.isFinite)
      : [];

    if (accountIds.length === 0) {
      return NextResponse.json(
        { error: { message: "accountIds 不能为空" } },
        { status: 400 },
      );
    }

    const config = loadRuntimeConfig();
    await ensureAdminTokenReady({ config });

    let accounts = resolveAccountsFromExistingJob(payload.jobId, accountIds);

    if (!accounts || accounts.length === 0) {
      const allAccounts = await loadAllAccounts({ config });
      accounts = pickAccountsByIds(allAccounts.accounts, accountIds);
    }

    if (!accounts.length) {
      return NextResponse.json(
        { error: { message: "没有找到可测试的账号" } },
        { status: 400 },
      );
    }

    const result = await startBatchTestJob({
      config,
      accounts,
      existingJobId: payload.jobId,
    });

    return NextResponse.json(result);
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
