vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => ({ mocked: true })),
}));
vi.mock("@/lib/server/base-router/admin-token", () => ({
  ensureAdminTokenReady: vi.fn().mockResolvedValue({ adminToken: "fresh-token" }),
}));
vi.mock("@/lib/server/base-router/auth-url", () => ({
  requestGenAuthUrl: vi.fn().mockResolvedValue({ data: { ok: true } }),
  extractAuthUrl: vi.fn(() => "https://auth.example.com?state=state-123"),
  extractSessionId: vi.fn(() => "session-123"),
  extractStateFromAuthUrl: vi.fn(() => "state-123"),
}));

import { POST } from "@/app/api/auth-url/route";

describe("/api/auth-url", () => {
  it("returns 400 when email is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth-url", {
        method: "POST",
        body: JSON.stringify({ email: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns auth context on success", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth-url", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
    const payload = await response.json();

    expect(payload.sessionId).toBe("session-123");
    expect(payload.state).toBe("state-123");
  });
});
