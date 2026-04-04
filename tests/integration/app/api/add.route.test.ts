vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => ({ mocked: true })),
}));
vi.mock("@/lib/server/base-router/admin-token", () => ({
  ensureAdminTokenReady: vi.fn().mockResolvedValue({ adminToken: "fresh-token" }),
}));
vi.mock("@/lib/server/base-router/exchange-code", () => ({
  requestExchangeCode: vi.fn().mockResolvedValue({
    data: {
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      expires_at: 123,
      client_id: "client",
      chatgpt_account_id: "account",
      chatgpt_user_id: "user",
      organization_id: "org",
    },
  }),
}));
vi.mock("@/lib/server/base-router/add-account", () => ({
  requestAddAccount: vi.fn().mockResolvedValue({
    data: {
      status: "active",
    },
  }),
}));

import { POST } from "@/app/api/add/route";

describe("/api/add", () => {
  it("returns 400 when callback url is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/add", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          sessionId: "session-123",
          state: "state-123",
          callbackUrl: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns the success summary when add succeeds", async () => {
    const response = await POST(
      new Request("http://localhost/api/add", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          sessionId: "session-123",
          state: "state-123",
          callbackUrl: "http://localhost:1455/auth/callback?code=callback-123",
        }),
      }),
    );
    const payload = await response.json();

    expect(payload.status).toBe("active");
    expect(payload.summary.email).toBe("user@example.com");
  });
});
