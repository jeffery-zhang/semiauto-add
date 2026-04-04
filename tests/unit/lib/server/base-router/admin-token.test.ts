import {
  ensureAdminTokenReady,
  resetAdminTokenCache,
} from "@/lib/server/base-router/admin-token";
import type { RuntimeConfig } from "@/lib/server/config";

const baseConfig: RuntimeConfig = {
  baseRouterHost: "https://router.example.com",
  baseRouterAdminEmail: "admin@example.com",
  baseRouterAdminPassword: "secret",
  genAuthPath: "/gen-auth",
  authPath: "/auth/check",
  loginPath: "/auth/login",
  exchangeCodePath: "/exchange",
  addAccountPath: "/accounts",
  adminToken: "stale-token",
  tempEmailAdminPassword: "temp-secret",
  localProxy: "",
};

describe("ensureAdminTokenReady", () => {
  beforeEach(() => {
    resetAdminTokenCache();
  });

  it("logs in immediately when memory token is missing", async () => {
    const config = { ...baseConfig, adminToken: "" };
    const verifyAdminTokenImpl = vi.fn();
    const loginAdminImpl = vi.fn().mockResolvedValue({ accessToken: "fresh-token" });

    const result = await ensureAdminTokenReady({
      config,
      verifyAdminTokenImpl,
      loginAdminImpl,
    });

    expect(result.adminToken).toBe("fresh-token");
    expect(config.adminToken).toBe("fresh-token");
    expect(loginAdminImpl).toHaveBeenCalledOnce();
    expect(verifyAdminTokenImpl).not.toHaveBeenCalled();
  });

  it("keeps the cached token when verification succeeds", async () => {
    await ensureAdminTokenReady({
      config: { ...baseConfig, adminToken: "" },
      loginAdminImpl: vi.fn().mockResolvedValue({ accessToken: "fresh-token" }),
      verifyAdminTokenImpl: vi.fn(),
    });

    const result = await ensureAdminTokenReady({
      config: { ...baseConfig },
      verifyAdminTokenImpl: vi.fn().mockResolvedValue({ status: 200 }),
      loginAdminImpl: vi.fn(),
    });

    expect(result.adminToken).toBe("fresh-token");
  });

  it("logs in again and updates the token when verification returns 401", async () => {
    await ensureAdminTokenReady({
      config: { ...baseConfig, adminToken: "" },
      loginAdminImpl: vi.fn().mockResolvedValue({ accessToken: "stale-cached-token" }),
      verifyAdminTokenImpl: vi.fn(),
    });

    const config = { ...baseConfig, adminToken: "" };

    const result = await ensureAdminTokenReady({
      config,
      verifyAdminTokenImpl: vi.fn().mockResolvedValue({ status: 401 }),
      loginAdminImpl: vi.fn().mockResolvedValue({ accessToken: "fresh-token" }),
    });

    expect(result.adminToken).toBe("fresh-token");
    expect(config.adminToken).toBe("fresh-token");
  });
});
