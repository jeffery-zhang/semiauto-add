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
vi.mock("@/lib/server/temp-email/fetch-code", () => ({
  fetchTempEmailCodeJson: vi.fn().mockResolvedValue({
    code: "654321",
    subject: "验证码",
    from: "otp@tm1.openai.com",
    mailId: 8,
    createdAt: "2026-04-04 20:00:00",
  }),
}));

import { POST } from "@/app/api/code/route";

describe("/api/code", () => {
  it("returns the latest code payload", async () => {
    const response = await POST(new Request("http://localhost/api/code", { method: "POST" }));
    const payload = await response.json();

    expect(payload.code).toBe("654321");
    expect(payload.mailId).toBe(8);
  });
});
