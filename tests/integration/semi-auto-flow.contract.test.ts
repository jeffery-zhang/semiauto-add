import { buildAddAccountPayload } from "@/lib/shared/account-payload";
import {
  clearBatchTestJob,
  createBatchTestJob,
  getBatchTestJob,
  removeBatchTestJobRows,
} from "@/lib/server/batch-test/job-store";
import { extractCodeFromCallbackUrl } from "@/lib/shared/callback-url";

describe("semi-auto contract", () => {
  it("keeps generated context and callback parsing aligned", () => {
    const code = extractCodeFromCallbackUrl(
      "http://localhost:1455/auth/callback?code=callback-123",
    );
    const payload = buildAddAccountPayload({
      email: "user@example.com",
      exchangeData: {
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        expires_at: 123,
        client_id: "client",
        chatgpt_account_id: "account",
        chatgpt_user_id: "user",
        organization_id: "org",
      },
    });

    expect(code).toBe("callback-123");
    expect(payload.extra.email).toBe("user@example.com");
  });

  it("keeps batch-test results keyed by job and removable by id", () => {
    const job = createBatchTestJob([
      { id: 1, email: "a@example.com" },
      { id: 2, email: "b@example.com" },
    ]);

    expect(getBatchTestJob(job.jobId)?.rows).toHaveLength(2);

    removeBatchTestJobRows(job.jobId, [1]);

    expect(getBatchTestJob(job.jobId)?.rows).toEqual([
      expect.objectContaining({ id: 2, email: "b@example.com" }),
    ]);

    clearBatchTestJob(job.jobId);
    expect(getBatchTestJob(job.jobId)).toBeNull();
  });
});
