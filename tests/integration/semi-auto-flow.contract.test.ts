import { buildAddAccountPayload } from "@/lib/shared/account-payload";
import { extractCodeFromCallbackUrl } from "@/lib/shared/callback-url";

describe("semi-auto contract", () => {
  it("keeps generated context and callback parsing aligned", () => {
    const code = extractCodeFromCallbackUrl(
      "http://localhost:1455/auth/callback?code=callback-123",
    );
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

    expect(code).toBe("callback-123");
    expect(payload.extra.email).toBe("user@example.com");
  });
});
