vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => ({ mocked: true })),
}));
vi.mock("@/lib/server/base-router/admin-token", () => ({
  ensureAdminTokenReady: vi.fn().mockResolvedValue({ adminToken: "fresh-token" }),
}));
vi.mock("@/lib/server/base-router/accounts", () => ({
  requestDeleteAccount: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
}));
vi.mock("@/lib/server/batch-test/job-store", () => ({
  removeBatchTestJobRows: vi.fn(),
}));

import { POST } from "@/app/api/batch-test/delete/route";

describe("/api/batch-test/delete", () => {
  it("returns 400 when jobId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/delete", {
        method: "POST",
        body: JSON.stringify({ accountIds: [1] }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns deletedIds when the delete succeeds", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/delete", {
        method: "POST",
        body: JSON.stringify({ jobId: "job-123", accountIds: [1] }),
      }),
    );
    const payload = await response.json();

    expect(payload.deletedIds).toEqual([1]);
  });
});
