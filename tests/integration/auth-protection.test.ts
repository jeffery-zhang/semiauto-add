vi.mock("@/lib/server/temp-email/fetch-code", () => ({
  fetchTempEmailCodeJson: vi.fn().mockResolvedValue({
    code: "654321",
    subject: "验证码",
    from: "otp@tm1.openai.com",
    mailId: 8,
    createdAt: "2026-04-04 20:00:00",
  }),
}));

import { NextRequest } from "next/server";
import { POST as postCode } from "@/app/api/code/route";
import {
  AUTH_COOKIE_NAME,
  createAuthCookieValue,
} from "@/lib/server/auth/cookie";
import { middleware } from "@/middleware";

describe("auth protection", () => {
  beforeEach(() => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "password";
    process.env.AUTH_COOKIE_SECRET = "cookie-secret";
    process.env.BASE_ROUTER_HOST = "https://router.example.com";
    process.env.BASE_ROUTER_ADMIN_EMAIL = "admin@example.com";
    process.env.BASE_ROUTER_ADMIN_PASSWORD = "secret";
    process.env.GEN_AUTH_URL = "/gen-auth";
    process.env.AUTH_URL = "/auth/check";
    process.env.LOGIN_URL = "/auth/login";
    process.env.EXCHANGE_CODE_URL = "/exchange-code";
    process.env.ADD_ACCOUNT_URL = "/accounts";
    process.env.TEMP_EMAIL_ADMIN_PWD = "temp-secret";
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
    delete process.env.TEMP_EMAIL_ADMIN_PWD;
  });

  it("redirects unauthenticated page requests to /login", async () => {
    const response = await middleware(new NextRequest("http://localhost/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows authenticated page requests through middleware", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: "cookie-secret" },
      { username: "admin", issuedAt: Date.now() },
    );
    const request = new NextRequest("http://localhost/");
    request.cookies.set(AUTH_COOKIE_NAME, cookieValue);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("returns 401 for unauthenticated API access", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/api/code", { method: "POST" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("未授权访问，请先登录");
  });

  it("lets the login route pass through middleware", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects direct protected route access without a valid cookie", async () => {
    const response = await postCode(
      new Request("http://localhost/api/code", { method: "POST" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("未授权访问，请先登录");
  });

  it("allows direct protected route access with a valid cookie", async () => {
    const cookieValue = await createAuthCookieValue(
      { authCookieSecret: "cookie-secret" },
      { username: "admin", issuedAt: Date.now() },
    );
    const response = await postCode(
      new Request("http://localhost/api/code", {
        method: "POST",
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${cookieValue}`,
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe("654321");
  });
});
