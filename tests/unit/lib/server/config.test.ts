import {
  loadAuthConfig,
  loadRuntimeConfig,
  loadTempEmailSelectionConfig,
} from "@/lib/server/config";

describe("loadTempEmailSelectionConfig", () => {
  it("parses bracket array email addresses", () => {
    const config = loadTempEmailSelectionConfig({
      TEMP_EMAIL_ADDRESSES: "[123@321.com, 444@666.com]",
    });

    expect(config.tempEmailAddresses).toEqual(["123@321.com", "444@666.com"]);
  });

  it("throws a clear error when email addresses are not a bracket array", () => {
    expect(() =>
      loadTempEmailSelectionConfig({
        TEMP_EMAIL_ADDRESSES: "123@321.com, 444@666.com",
      }),
    ).toThrow(/TEMP_EMAIL_ADDRESSES/);
  });

  it("throws a clear error when email addresses contain quoted items", () => {
    expect(() =>
      loadTempEmailSelectionConfig({
        TEMP_EMAIL_ADDRESSES: '["a@example.com", "b@example.com"]',
      }),
    ).toThrow(/不能包含带引号的邮箱项/);
  });
});

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
      TEMP_EMAIL_ADMIN_PWD: "temp-secret",
      TEMP_EMAIL_ADDRESSES: "[123@321.com, 444@666.com]",
      LOCAL_PROXY: "http://127.0.0.1:7890",
    });

    expect(config.baseRouterHost).toBe("https://router.example.com");
    expect(config.localProxy).toBe("http://127.0.0.1:7890");
    expect(config.adminToken).toBe("");
    expect(config.authUsername).toBe("admin");
    expect(config.tempEmailAddresses).toEqual(["123@321.com", "444@666.com"]);
  });

  it("throws a clear error when a required value is missing", () => {
    expect(() =>
      loadRuntimeConfig({
        AUTH_USERNAME: "admin",
        AUTH_PASSWORD: "password",
        AUTH_COOKIE_SECRET: "cookie-secret",
        BASE_ROUTER_HOST: "https://router.example.com",
        TEMP_EMAIL_ADDRESSES: "[123@321.com, 444@666.com]",
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
