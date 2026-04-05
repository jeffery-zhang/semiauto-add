import { POST } from "@/app/api/auth/login/route";

describe("/api/auth/login", () => {
  beforeEach(() => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "password";
    process.env.AUTH_COOKIE_SECRET = "cookie-secret";
  });

  afterEach(() => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD;
    delete process.env.AUTH_COOKIE_SECRET;
  });

  it("returns 401 for invalid credentials", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "wrong",
          password: "password",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("用户名或密码错误");
  });

  it("sets the auth cookie when credentials are valid", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "admin",
          password: "password",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("semiauto-add-auth=");
  });
});
