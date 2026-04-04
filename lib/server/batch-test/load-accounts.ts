import type { RuntimeConfig } from "@/lib/server/config";
import { requestAccountsPage, type BaseRouterAccount } from "@/lib/server/base-router/accounts";

export async function loadAllAccounts({
  config,
  fetchImpl,
}: {
  config: RuntimeConfig;
  fetchImpl?: typeof fetch;
}) {
  const firstPage = await requestAccountsPage({
    config,
    page: 1,
    pageSize: 100,
    fetchImpl,
  });

  const accounts = [...firstPage.accounts];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await requestAccountsPage({
      config,
      page,
      pageSize: 100,
      fetchImpl,
    });
    accounts.push(...nextPage.accounts);
  }

  return {
    accounts,
    totalCount: firstPage.totalCount,
    totalPages: firstPage.totalPages,
  };
}

export function pickAccountsByIds(accounts: BaseRouterAccount[], accountIds: number[]) {
  const wanted = new Set(accountIds);
  return accounts.filter((account) => wanted.has(account.id));
}
