import { NextRequest } from "next/server";
import { POST as postAdd } from "@/app/api/add/route";
import {
  AUTH_COOKIE_NAME,
  createAuthCookieValue,
} from "@/lib/server/auth/cookie";
import { proxy } from "@/proxy";

describe("auth protection", () => {
  beforeEach(() => {
    process.env.AUTH_USERNAME="***";
    process.env.AUTH_PASSWORD="***";
    process.env.AUTH_COOKIE_SECRET="***";
    process.env.BASE_ROUTER_HOST = "https://router.example.com";
    process.env.BASE_ROUTER_ADMIN_EMAIL = "admin@example.com";
    process.env.BASE_ROUTER_ADMIN_PASSWORD="***";
    process.env.GEN_AUTH_URL="***";
    process.env.AUTH_URL="***";
    process.env.LOGIN_URL = "/auth/login";
    process.env.EXCHANGE_CODE_URL = "/exchange-code";
    process.env.ADD_ACCOUNT_URL = "/accounts";
  });

  afterEach(() => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD;
    delete process.env.AUTH_COOKIE_SECRET;
    delete process.env.BASE_ROUTER_HOST;
    delete process.env.BASE_ROUTER_ADMIN_EMAIL;
    delete process.env.BASE_ROUTER_ADMIN_PASSWORD;
    delete process.env.GEN_AUTH_URL;
    delete process.env.AUTH_URL;
    delete process.env.LOGIN_URL;
    delete process.env.EXCHANGE_CODE_URL;
    delete process.env.ADD_ACCOUNT_URL;
  });

  it("redirects unauthenticated page requests to /login", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows authenticated page requests through middleware", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: "***" },
      { username: "***", issuedAt: Date.now() },
    );
    const request = new NextRequest("http://localhost/");
    request.cookies.set(AUTH_COOKIE_NAME, cookieValue);
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("returns 401 for unauthenticated API access", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/api/add", { method: "POST" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("未授权访问，请先登录");
  });

  it("lets the login route pass through middleware", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects direct protected route access without a valid cookie", async () => {
    const response = await postAdd(
      new Request("http://localhost/api/add", { method: "POST" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("未授权访问，请先登录");
  });

  it("allows direct protected route access with a valid cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: "***" },
      { username: "***", issuedAt: Date.now() },
    );
    const response = await postAdd(
      new Request("http://localhost/api/add", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${AUTH_COOKIE_NAME}=${cookieValue}`,
        },
        body: JSON.stringify({
          email: "user@example.com",
          sessionId: "session-123",
          state: "state-123",
          callbackUrl: "http://localhost:1455/auth/callback?code=callback-123",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(600);
    expect(payload.error?.message).toBeDefined();
    expect(payload.error?.message).not.toBe("未授权访问，请先登录");
  });
});
