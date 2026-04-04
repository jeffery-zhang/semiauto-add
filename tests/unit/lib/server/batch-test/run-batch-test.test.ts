import { getBatchTestJob, resetBatchTestJobs } from "@/lib/server/batch-test/job-store";
import { startBatchTestJob } from "@/lib/server/batch-test/run-batch-test";
import type { RuntimeConfig } from "@/lib/server/config";

const config: RuntimeConfig = {
  baseRouterHost: "https://router.example.com",
  baseRouterAdminEmail: "admin@example.com",
  baseRouterAdminPassword: "secret",
  genAuthPath: "/gen-auth",
  authPath: "/auth/check",
  loginPath: "/auth/login",
  exchangeCodePath: "/exchange",
  addAccountPath: "/accounts",
  adminToken: "token-123",
  tempEmailAdminPassword: "temp-secret",
  localProxy: "",
};

describe("startBatchTestJob", () => {
  beforeEach(() => {
    resetBatchTestJobs();
  });

  it("marks banned, passed and failed rows and updates progress", async () => {
    const requestAccountTestStreamImpl = vi
      .fn()
      .mockImplementationOnce(async () => "401 ... deactived")
      .mockImplementationOnce(async () => "all good")
      .mockImplementationOnce(async () => {
        throw new Error("timeout");
      });

    const { jobId } = await startBatchTestJob({
      config,
      accounts: [
        { id: 1, email: "a@example.com" },
        { id: 2, email: "b@example.com" },
        { id: 3, email: "c@example.com" },
      ],
      concurrency: 2,
      requestAccountTestStreamImpl,
      now: () => "2026-04-05T10:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(getBatchTestJob(jobId)?.status).toBe("completed");
    });

    const job = getBatchTestJob(jobId);
    expect(job?.current).toBe(3);
    expect(job?.banned).toBe(1);
    expect(job?.passed).toBe(1);
    expect(job?.failed).toBe(1);
  });

  it("merges retest success back into the existing job", async () => {
    const firstRun = await startBatchTestJob({
      config,
      accounts: [{ id: 1, email: "a@example.com" }],
      requestAccountTestStreamImpl: vi.fn().mockResolvedValue("401 deactived"),
      now: () => "2026-04-05T10:00:00.000Z",
    });

    await vi.waitFor(() => {
      expect(getBatchTestJob(firstRun.jobId)?.status).toBe("completed");
    });

    await startBatchTestJob({
      config,
      accounts: [{ id: 1, email: "a@example.com" }],
      existingJobId: firstRun.jobId,
      requestAccountTestStreamImpl: vi.fn().mockResolvedValue("all good"),
      now: () => "2026-04-05T10:01:00.000Z",
    });

    await vi.waitFor(() => {
      expect(getBatchTestJob(firstRun.jobId)?.status).toBe("completed");
      expect(getBatchTestJob(firstRun.jobId)?.rows[0].status).toBe("passed");
    });
  });
});
