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
import { POST } from "@/app/api/batch-test/clear/route";

vi.mock("@/lib/server/batch-test/job-store", () => ({
  clearBatchTestJob: vi.fn().mockReturnValue(true),
}));

describe("/api/batch-test/clear", () => {
  it("returns 400 when jobId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/clear", {
        method: "POST",
        body: JSON.stringify({ jobId: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns cleared=true when clear succeeds", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/clear", {
        method: "POST",
        body: JSON.stringify({ jobId: "job-123" }),
      }),
    );
    const payload = await response.json();

    expect(payload.cleared).toBe(true);
  });
});
