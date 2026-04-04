import {
  extractAuthUrl,
  extractSessionId,
  extractStateFromAuthUrl,
  requestGenAuthUrl,
} from "@/lib/server/base-router/auth-url";
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

describe("auth url helpers", () => {
  it("sends POST + bearer when requesting auth url", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { auth_url: "https://example.com?state=abc" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await requestGenAuthUrl({ config, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/gen-auth",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("extracts auth url, session id and state from response data", () => {
    const response = {
      data: {
        data: {
          auth_url: "http://auth.example.com/callback?state=state-123",
          session_id: "session-123",
        },
      },
    };

    expect(extractAuthUrl(response)).toBe("http://auth.example.com/callback?state=state-123");
    expect(extractSessionId(response)).toBe("session-123");
    expect(extractStateFromAuthUrl("http://auth.example.com/callback?state=state-123")).toBe(
      "state-123",
    );
  });
});
