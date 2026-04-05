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
}));

import { POST } from "@/app/api/batch-test/accounts/route";

describe("/api/batch-test/accounts", () => {
  it("returns loaded accounts", async () => {
    const response = await POST(
      new Request("http://localhost/api/batch-test/accounts", { method: "POST" }),
    );
    const payload = await response.json();

    expect(payload.accounts).toEqual([{ id: 1, email: "a@example.com" }]);
    expect(payload.totalPages).toBe(1);
  });
});
