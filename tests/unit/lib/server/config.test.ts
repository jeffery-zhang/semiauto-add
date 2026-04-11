import {
  loadAuthConfig,
  loadRuntimeConfig,
} from "@/lib/server/config";

describe("loadRuntimeConfig", () => {
  it("reads required environment values", () => {
    const config = loadRuntimeConfig({
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "password",
      AUTH_COOKIE_SECRET: "cookie-secret",
      BASE_ROUTER_HOST: "https://router.example.com",
      BASE_ROUTER_ADMIN_EMAIL: "admin@example.com",
      BASE_ROUTER_ADMIN_PASSWORD: "secret",
      GEN_AUTH_URL: "/gen-auth",
      AUTH_URL: "/auth/check",
      LOGIN_URL: "/auth/login",
      EXCHANGE_CODE_URL: "/exchange-code",
      ADD_ACCOUNT_URL: "/accounts",
      LOCAL_PROXY: "http://127.0.0.1:7890",
    });

    expect(config.baseRouterHost).toBe("https://router.example.com");
    expect(config.localProxy).toBe("http://127.0.0.1:7890");
    expect(config.authUsername).toBe("admin");
    expect(config.adminToken).toBe("");
  });

  it("throws a clear error when a required value is missing", () => {
    expect(() =>
      loadRuntimeConfig({
        AUTH_USERNAME: "admin",
        AUTH_PASSWORD: "password",
        AUTH_COOKIE_SECRET: "cookie-secret",
        BASE_ROUTER_HOST: "https://router.example.com",
      }),
    ).toThrow(/BASE_ROUTER_ADMIN_EMAIL/);
  });
});

describe("loadAuthConfig", () => {
  it("reads auth environment values", () => {
    const config = loadAuthConfig({
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "password",
      AUTH_COOKIE_SECRET: "cookie-secret",
    });

    expect(config.authUsername).toBe("admin");
    expect(config.authPassword).toBe("password");
    expect(config.authCookieSecret).toBe("cookie-secret");
  });

  it("throws a clear error when auth config is missing", () => {
    expect(() =>
      loadAuthConfig({
        AUTH_USERNAME: "admin",
      }),
    ).toThrow(/AUTH_PASSWORD/);
  });
});
