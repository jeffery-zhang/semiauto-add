import { requestAddAccount } from "@/lib/server/base-router/add-account";
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

describe("requestAddAccount", () => {
  it("posts the add-account payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: "active" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await requestAddAccount({
      config,
      payload: { name: "user@example.com" },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/accounts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "user@example.com" }),
      }),
    );
  });
});
