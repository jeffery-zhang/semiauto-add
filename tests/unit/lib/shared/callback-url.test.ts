import {
  FINAL_CALLBACK_URL_PREFIX,
  extractCodeFromCallbackUrl,
} from "@/lib/shared/callback-url";

describe("extractCodeFromCallbackUrl", () => {
  it("extracts the code from the localhost callback url", () => {
    expect(
      extractCodeFromCallbackUrl(`${FINAL_CALLBACK_URL_PREFIX}/auth/callback?code=code-123`),
    ).toBe("code-123");
  });

  it("rejects non-localhost callback urls", () => {
    expect(() => extractCodeFromCallbackUrl("https://example.com/callback?code=abc")).toThrow(
      /localhost:1455/,
    );
  });
});
