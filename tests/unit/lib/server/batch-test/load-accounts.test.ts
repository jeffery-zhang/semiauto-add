import { loadAllAccounts, pickAccountsByIds } from "@/lib/server/batch-test/load-accounts";
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

describe("loadAllAccounts", () => {
  it("loads every page and keeps only id/email", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              items: [{ id: 1, email: "a@example.com" }],
              total_pages: 2,
              total: 2,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              items: [{ id: 2, email: "b@example.com" }],
              total_pages: 2,
              total: 2,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await loadAllAccounts({ config, fetchImpl });

    expect(result.accounts).toEqual([
      { id: 1, email: "a@example.com" },
      { id: 2, email: "b@example.com" },
    ]);
  });
});

describe("pickAccountsByIds", () => {
  it("filters loaded accounts by id", () => {
    expect(
      pickAccountsByIds(
        [
          { id: 1, email: "a@example.com" },
          { id: 2, email: "b@example.com" },
        ],
        [2],
      ),
    ).toEqual([{ id: 2, email: "b@example.com" }]);
  });
});
