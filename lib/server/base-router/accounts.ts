import { ProxyAgent } from "undici";
import type { RuntimeConfig } from "@/lib/server/config";
import { ensureStep } from "@/lib/server/errors";
import { fetchWithOptionalProxy } from "@/lib/server/fetch-with-proxy";

export interface BaseRouterAccount {
  id: number;
  email: string;
}

export interface AccountsPageResult {
  accounts: BaseRouterAccount[];
  totalPages: number;
  totalCount: number;
}

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_TEST_TIMEOUT_MS = 30_000;

function buildAccountsUrl(config: RuntimeConfig, page: number, pageSize: number) {
  const url = new URL(
    `/api/v1/admin/accounts?page=${page}&page_size=${pageSize}`,
    config.baseRouterHost,
  );
  return url.toString();
}

function buildAccountTestUrl(config: RuntimeConfig, accountId: number) {
  return new URL(`/api/v1/admin/accounts/${accountId}/test`, config.baseRouterHost).toString();
}

function buildDeleteAccountUrl(config: RuntimeConfig, accountId: number) {
  return new URL(`/api/v1/admin/accounts/${accountId}`, config.baseRouterHost).toString();
}

function buildRequestOptions(
  config: RuntimeConfig,
  method: "GET" | "POST" | "DELETE",
  ProxyAgentImpl: typeof ProxyAgent,
  body?: string,
) {
  const requestOptions: RequestInit & { dispatcher?: ProxyAgent } = {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.adminToken}`,
    },
  };

  if (body !== undefined) {
    requestOptions.headers = {
      ...requestOptions.headers,
      "Content-Type": "application/json",
    };
    requestOptions.body = body;
  }

  if (config.localProxy) {
    requestOptions.dispatcher = new ProxyAgentImpl(config.localProxy);
  }

  return requestOptions;
}

function extractAccountsArray(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload as Array<Record<string, unknown>>;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const dataPayload = payload as {
    data?: unknown;
    items?: unknown;
    list?: unknown;
    results?: unknown;
  };

  for (const candidate of [
    dataPayload.data,
    dataPayload.items,
    dataPayload.list,
    dataPayload.results,
  ]) {
    const accounts = extractAccountsArray(candidate);
    if (accounts.length > 0) {
      return accounts;
    }
  }

  return [];
}

function normalizeAccounts(payload: unknown) {
  return extractAccountsArray(payload)
    .map((item) => {
      const id = Number(item.id);
      const email = String(item.email ?? item.account ?? item.name ?? "").trim();

      if (!Number.isFinite(id) || !email) {
        return null;
      }

      return { id, email };
    })
    .filter((item): item is BaseRouterAccount => item !== null);
}

function extractNumericField(payload: unknown, keys: string[]): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  for (const nestedKey of ["data", "pagination", "meta", "page"]) {
    const nestedValue = record[nestedKey];
    const extracted = extractNumericField(nestedValue, keys);
    if (extracted !== null) {
      return extracted;
    }
  }

  return null;
}

function resolveTotalCount(payload: unknown, accountsLength: number) {
  return (
    extractNumericField(payload, ["total", "total_count", "count", "totalCount"]) ?? accountsLength
  );
}

function resolveTotalPages(payload: unknown, totalCount: number, pageSize: number) {
  return (
    extractNumericField(payload, ["total_pages", "totalPages", "pages", "page_count"]) ??
    Math.max(1, Math.ceil(totalCount / pageSize))
  );
}

export async function requestAccountsPage({
  config,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  page: number;
  pageSize?: number;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildAccountsUrl(config, page, pageSize);

  return ensureStep(
    "请求账号列表",
    async () => {
      const requestOptions = buildRequestOptions(config, "GET", ProxyAgentImpl);
      const response =
        fetchImpl === fetch
          ? await fetchWithOptionalProxy(url, requestOptions)
          : await fetchImpl(url, requestOptions);

      const text = await response.text();
      const contentType = response.headers.get("content-type") ?? "";
      const parsed = contentType.includes("application/json") ? JSON.parse(text) : text;

      if (!response.ok) {
        throw new Error(`接口请求失败，状态码: ${response.status}`);
      }

      const accounts = normalizeAccounts(parsed);
      const totalCount = resolveTotalCount(parsed, accounts.length);
      const totalPages = resolveTotalPages(parsed, totalCount, pageSize);

      return {
        accounts,
        totalCount,
        totalPages,
      } satisfies AccountsPageResult;
    },
    { url, page, pageSize },
  );
}

export async function requestAccountTestStream({
  config,
  accountId,
  timeoutMs = DEFAULT_TEST_TIMEOUT_MS,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  accountId: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildAccountTestUrl(config, accountId);

  return ensureStep(
    "请求账号测试接口",
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestOptions = buildRequestOptions(
          config,
          "POST",
          ProxyAgentImpl,
          JSON.stringify({ model_id: "gpt-5.4", prompt: "" }),
        );
        requestOptions.signal = controller.signal;

        const response =
          fetchImpl === fetch
            ? await fetchWithOptionalProxy(url, requestOptions)
            : await fetchImpl(url, requestOptions);

        if (!response.ok) {
          throw new Error(`接口请求失败，状态码: ${response.status}`);
        }

        return await response.text();
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(`接口请求超时（${timeoutMs}ms）`);
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    { url, accountId, timeoutMs },
  );
}

export async function requestDeleteAccount({
  config,
  accountId,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  accountId: number;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildDeleteAccountUrl(config, accountId);

  return ensureStep(
    "请求删除账号接口",
    async () => {
      const requestOptions = buildRequestOptions(config, "DELETE", ProxyAgentImpl);
      const response =
        fetchImpl === fetch
          ? await fetchWithOptionalProxy(url, requestOptions)
          : await fetchImpl(url, requestOptions);

      if (!response.ok) {
        throw new Error(`接口请求失败，状态码: ${response.status}`);
      }

      return { ok: true, status: response.status };
    },
    { url, accountId },
  );
}
