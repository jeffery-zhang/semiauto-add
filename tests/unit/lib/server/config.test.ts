import { loadRuntimeConfig } from "@/lib/server/config";

describe("loadRuntimeConfig", () => {
  it("reads required environment values", () => {
    const config = loadRuntimeConfig({
      BASE_ROUTER_HOST: "https://router.example.com",
      BASE_ROUTER_ADMIN_EMAIL: "admin@example.com",
      BASE_ROUTER_ADMIN_PASSWORD: "secret",
      GEN_AUTH_URL: "/gen-auth",
      AUTH_URL: "/auth/check",
      LOGIN_URL: "/auth/login",
      EXCHANGE_CODE_URL: "/exchange-code",
      ADD_ACCOUNT_URL: "/accounts",
      TEMP_EMAIL_ADMIN_PWD: "temp-secret",
      LOCAL_PROXY: "http://127.0.0.1:7890",
    });

    expect(config.baseRouterHost).toBe("https://router.example.com");
    expect(config.localProxy).toBe("http://127.0.0.1:7890");
    expect(config.adminToken).toBe("");
  });

  it("throws a clear error when a required value is missing", () => {
    expect(() =>
      loadRuntimeConfig({
        BASE_ROUTER_HOST: "https://router.example.com",
      }),
    ).toThrow(/BASE_ROUTER_ADMIN_EMAIL/);
  });
});
