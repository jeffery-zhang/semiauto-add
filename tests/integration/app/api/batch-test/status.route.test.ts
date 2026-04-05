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
vi.mock("@/lib/server/batch-test/job-store", () => ({
  getBatchTestJob: vi.fn((jobId: string) =>
    jobId === "job-123"
      ? {
          jobId: "job-123",
          status: "completed",
          current: 1,
          total: 1,
          banned: 1,
          failed: 0,
          passed: 0,
          rows: [{ id: 1, email: "a@example.com", status: "banned", lastError: null, lastTestedAt: "2026-04-05" }],
        }
      : null,
  ),
}));

import { GET } from "@/app/api/batch-test/status/[jobId]/route";

describe("/api/batch-test/status/[jobId]", () => {
  it("returns 404 for an unknown job", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns current stats and rows for an existing job", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "job-123" }),
    });
    const payload = await response.json();

    expect(payload.current).toBe(1);
    expect(payload.rows).toHaveLength(1);
  });
});
