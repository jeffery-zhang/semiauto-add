import { requestExchangeCode } from "@/lib/server/base-router/exchange-code";
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

describe("requestExchangeCode", () => {
  it("posts code, session_id and state", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { access_token: "abc" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await requestExchangeCode({
      config,
      payload: {
        code: "code-123",
        session_id: "session-123",
        state: "state-123",
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/exchange",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "code-123",
          session_id: "session-123",
          state: "state-123",
        }),
      }),
    );
  });
});
