import { buildAddAccountPayload } from "@/lib/shared/account-payload";

describe("buildAddAccountPayload", () => {
  it("uses email in name and extra.email", () => {
    const payload = buildAddAccountPayload({
      email: "user@example.com",
      exchangeData: {
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        expires_at: 123,
        client_id: "client",
        chatgpt_account_id: "account",
        chatgpt_user_id: "user",
        organization_id: "org",
      },
    });

    expect(payload.name).toBe("user@example.com");
    expect(payload.extra.email).toBe("user@example.com");
    expect(payload.platform).toBe("openai");
  });
});
