import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  createAuthCookieValue,
  verifyAuthCookieValue,
} from "@/lib/server/auth/cookie";

describe("auth cookie helpers", () => {
  const config = {
    authCookieSecret: "cookie-secret",
    authUsername: "admin",
  };

  it("creates and verifies a valid auth cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: config.authCookieSecret },
      {
        username: "admin",
        issuedAt: Date.now(),
      },
    );

    await expect(verifyAuthCookieValue(config, cookieValue)).resolves.toMatchObject({
      username: "admin",
    });
  });

  it("rejects a tampered auth cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: config.authCookieSecret },
      {
        username: "admin",
        issuedAt: Date.now(),
      },
    );

    await expect(
      verifyAuthCookieValue(config, `${cookieValue.slice(0, -1)}x`),
    ).resolves.toBeNull();
  });

  it("rejects an expired auth cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: config.authCookieSecret },
      {
        username: "admin",
        issuedAt: Date.now() - (AUTH_COOKIE_MAX_AGE_SECONDS * 1000 + 1),
      },
    );

    await expect(verifyAuthCookieValue(config, cookieValue)).resolves.toBeNull();
  });
});
