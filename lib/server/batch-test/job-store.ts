import type { BatchTestAccount, BatchTestJobState, BatchTestResultRow } from "@/lib/server/batch-test/types";

const jobs = new Map<string, BatchTestJobState>();

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function countByStatus(rows: BatchTestResultRow[], status: BatchTestResultRow["status"]) {
  return rows.filter((row) => row.status === status).length;
}

function rebuildCounts(job: BatchTestJobState) {
  job.banned = countByStatus(job.rows, "banned");
  job.failed = countByStatus(job.rows, "failed");
  job.passed = countByStatus(job.rows, "passed");
}

export function createBatchTestJob(accounts: BatchTestAccount[]) {
  const jobId = randomId();
  const job: BatchTestJobState = {
    jobId,
    status: "idle",
    current: 0,
    total: accounts.length,
    banned: 0,
    failed: 0,
    passed: 0,
    rows: accounts.map((account) => ({
      ...account,
      status: "pending",
      lastError: null,
      lastTestedAt: null,
    })),
  };

  jobs.set(jobId, job);
  return job;
}

export function getBatchTestJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function markBatchTestJobRunning(jobId: string, total: number) {
  const job = getBatchTestJob(jobId);
  if (!job) {
    return null;
  }

  job.status = "running";
  job.current = 0;
  job.total = total;
  return job;
}

export function updateBatchTestJobRow(
  jobId: string,
  rowUpdate: {
    id: number;
    status: BatchTestResultRow["status"];
    lastError?: string | null;
    lastTestedAt: string;
  },
) {
  const job = getBatchTestJob(jobId);
  if (!job) {
    return null;
  }

  const existing = job.rows.find((row) => row.id === rowUpdate.id);
  if (!existing) {
    return null;
  }

  existing.status = rowUpdate.status;
  existing.lastError = rowUpdate.lastError ?? null;
  existing.lastTestedAt = rowUpdate.lastTestedAt;
  job.current += 1;
  rebuildCounts(job);
  return job;
}

export function markBatchTestJobCompleted(jobId: string) {
  const job = getBatchTestJob(jobId);
  if (!job) {
    return null;
  }

  job.status = "completed";
  rebuildCounts(job);
  return job;
}

export function removeBatchTestJobRows(jobId: string, ids: number[]) {
  const job = getBatchTestJob(jobId);
  if (!job) {
    return null;
  }

  job.rows = job.rows.filter((row) => !ids.includes(row.id));
  rebuildCounts(job);
  return job;
}

export function clearBatchTestJob(jobId: string) {
  return jobs.delete(jobId);
}

export function resetBatchTestJobs() {
  jobs.clear();
}
