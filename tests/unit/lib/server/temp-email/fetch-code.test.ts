import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";
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

describe("fetchTempEmailCodeJson", () => {
  it("returns the best code from the latest email", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: 8,
                created_at: "2026-04-04 20:00:00",
                raw: "Subject: ChatGPT 验证码\r\nFrom: otp@tm1.openai.com\r\n\r\n验证码 654321",
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );

    const result = await fetchTempEmailCodeJson("crystiano@penaldo.top", {
      config,
      fetchImpl,
    });

    expect(result.code).toBe("654321");
    expect(result.mailId).toBe(8);
  });
});
