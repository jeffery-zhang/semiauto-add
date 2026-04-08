import type { RuntimeConfig } from "@/lib/server/config";
import { requestAccountTestStream } from "@/lib/server/base-router/accounts";
import {
  createBatchTestJob,
  getBatchTestJob,
  markBatchTestJobCompleted,
  markBatchTestJobRunning,
  updateBatchTestJobRow,
} from "@/lib/server/batch-test/job-store";
import type { BatchTestAccount, BatchTestResultRow } from "@/lib/server/batch-test/types";

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TIMEOUT_MS = 30_000;

function resolveRowStatus(streamText: string) {
  const has401 = streamText.includes("401");
  const hasAccountDeactivated = streamText.includes("account_deactivated");

  if (has401 && hasAccountDeactivated) {
    return "banned" as const;
  }

  return "passed" as const;
}

async function testSingleAccount({
  config,
  account,
  requestAccountTestStreamImpl = requestAccountTestStream,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => new Date().toISOString(),
}: {
  config: RuntimeConfig;
  account: BatchTestAccount;
  requestAccountTestStreamImpl?: typeof requestAccountTestStream;
  timeoutMs?: number;
  now?: () => string;
}) {
  try {
    const streamText = await requestAccountTestStreamImpl({
      config,
      accountId: account.id,
      timeoutMs,
    });

    return {
      id: account.id,
      status: resolveRowStatus(streamText),
      lastError: null,
      lastTestedAt: now(),
    } satisfies Pick<BatchTestResultRow, "id" | "status" | "lastError" | "lastTestedAt">;
  } catch (error) {
    return {
      id: account.id,
      status: "failed" as const,
      lastError: error instanceof Error ? error.message : String(error),
      lastTestedAt: now(),
    };
  }
}

export async function startBatchTestJob({
  config,
  accounts,
  existingJobId,
  concurrency = DEFAULT_CONCURRENCY,
  requestAccountTestStreamImpl,
  now,
}: {
  config: RuntimeConfig;
  accounts: BatchTestAccount[];
  existingJobId?: string;
  concurrency?: number;
  requestAccountTestStreamImpl?: typeof requestAccountTestStream;
  now?: () => string;
}) {
  const existingJob = existingJobId ? getBatchTestJob(existingJobId) : null;
  const job = existingJob ?? createBatchTestJob(accounts);

  markBatchTestJobRunning(job.jobId, accounts.length);

  const queue = [...accounts];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length || 1));

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const account = queue.shift();
      if (!account) {
        return;
      }

      const row = await testSingleAccount({
        config,
        account,
        requestAccountTestStreamImpl,
        now,
      });

      updateBatchTestJobRow(job.jobId, row);
    }
  });

  void Promise.all(workers).then(() => {
    markBatchTestJobCompleted(job.jobId);
  });

  return { jobId: job.jobId };
}
