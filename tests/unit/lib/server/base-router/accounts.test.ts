import {
  requestAccountsPage,
  requestAccountTestStream,
  requestDeleteAccount,
} from "@/lib/server/base-router/accounts";
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

describe("accounts base-router client", () => {
  it("requests one accounts page with page_size=100", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            items: [{ id: 1, email: "user@example.com" }],
            total_pages: 2,
            total: 101,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await requestAccountsPage({
      config,
      page: 1,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/api/v1/admin/accounts?page=1&page_size=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(result.totalPages).toBe(2);
    expect(result.accounts[0].email).toBe("user@example.com");
  });

  it("requests the test event stream with fixed payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("data: ok\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const streamText = await requestAccountTestStream({
      config,
      accountId: 8,
      fetchImpl,
      timeoutMs: 30_000,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/api/v1/admin/accounts/8/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model_id: "gpt-5.4", prompt: "" }),
      }),
    );
    expect(streamText).toContain("ok");
  });

  it("deletes one account", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 200 }));

    const result = await requestDeleteAccount({
      config,
      accountId: 8,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://router.example.com/api/v1/admin/accounts/8",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
    expect(result.ok).toBe(true);
  });
});
