import {
  clearBatchTestJob,
  createBatchTestJob,
  getBatchTestJob,
  markBatchTestJobCompleted,
  markBatchTestJobRunning,
  removeBatchTestJobRows,
  resetBatchTestJobs,
  updateBatchTestJobRow,
} from "@/lib/server/batch-test/job-store";

describe("batch-test job store", () => {
  beforeEach(() => {
    resetBatchTestJobs();
  });

  it("creates, updates and clears one job", () => {
    const job = createBatchTestJob([{ id: 1, email: "a@example.com" }]);

    expect(job.rows).toHaveLength(1);
    markBatchTestJobRunning(job.jobId, 1);
    updateBatchTestJobRow(job.jobId, {
      id: 1,
      status: "banned",
      lastTestedAt: "2026-04-05T10:00:00.000Z",
      lastError: null,
    });
    markBatchTestJobCompleted(job.jobId);

    const stored = getBatchTestJob(job.jobId);
    expect(stored?.banned).toBe(1);

    removeBatchTestJobRows(job.jobId, [1]);
    expect(getBatchTestJob(job.jobId)?.rows).toHaveLength(0);

    expect(clearBatchTestJob(job.jobId)).toBe(true);
  });
});
