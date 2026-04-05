import {
  UnauthorizedError,
  createUnauthorizedResponse,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { createAuthCookieValue, AUTH_COOKIE_NAME } from "@/lib/server/auth/cookie";

describe("requireAuthenticatedRequest", () => {
  const env = {
    AUTH_USERNAME: "admin",
    AUTH_PASSWORD: "password",
    AUTH_COOKIE_SECRET: "cookie-secret",
  } satisfies NodeJS.ProcessEnv;

  it("returns the auth payload when the request has a valid cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: env.AUTH_COOKIE_SECRET },
      {
        username: env.AUTH_USERNAME,
        issuedAt: Date.now(),
      },
    );

    const payload = await requireAuthenticatedRequest(
      new Request("http://localhost/api/auth-url", {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${cookieValue}`,
        },
      }),
      env,
    );

    expect(payload.username).toBe("admin");
  });

  it("throws when the auth cookie is missing", async () => {
    await expect(
      requireAuthenticatedRequest(new Request("http://localhost/api/auth-url"), env),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws when the auth cookie is invalid", async () => {
    await expect(
      requireAuthenticatedRequest(
        new Request("http://localhost/api/auth-url", {
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=invalid`,
          },
        }),
        env,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("builds a standard unauthorized response", async () => {
    const response = createUnauthorizedResponse();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("未授权访问，请先登录");
  });
});
