vi.mock("@/lib/server/auth/guard", () => ({
  requireAuthenticatedRequest: vi.fn().mockResolvedValue({
    username: "admin",
    issuedAt: Date.now(),
  }),
  isUnauthorizedError: vi.fn(() => false),
  createUnauthorizedResponse: vi.fn((message = "未授权访问，请先登录") =>
    Response.json({ error: { message } }, { status: 401 }),
  ),
}));
vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => ({ mocked: true })),
}));
vi.mock("@/lib/server/base-router/admin-token", () => ({
  ensureAdminTokenReady: vi.fn().mockResolvedValue({ adminToken: "fresh-token" }),
}));
vi.mock("@/lib/server/batch-test/load-accounts", () => ({
  loadAllAccounts: vi.fn().mockResolvedValue({
    accounts: [{ id: 1, email: "a@example.com" }],
    totalCount: 1,
    totalPages: 1,
  }),
  pickAccountsByIds: vi.fn((_accounts, ids: number[]) =>
    ids.includes(1) ? [{ id: 1, email: "a@example.com" }] : [],
  ),
}));
vi.mock("@/lib/server/batch-test/job-store", () => ({
  getBatchTestJob: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/server/batch-test/run-batch-test", () => ({
  startBatchTestJob: vi.fn().mockResolvedValue({ jobId: "job-123" }),
}));

import { POST } from "@/app/api/batch-test/run/route";

describe("/api/batch-test/run", () => {
  it("returns 400 when accountIds are missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/run", {
        method: "POST",
        body: JSON.stringify({ accountIds: [] }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns a jobId when a run starts", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/run", {
        method: "POST",
        body: JSON.stringify({ accountIds: [1] }),
      }),
    );
    const payload = await response.json();

    expect(payload.jobId).toBe("job-123");
  });
});
