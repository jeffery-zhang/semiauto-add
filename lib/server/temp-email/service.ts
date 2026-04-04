import { ProxyAgent } from "undici";
import type { RuntimeConfig } from "@/lib/server/config";
import { ensureStep } from "@/lib/server/errors";
import { fetchWithOptionalProxy } from "@/lib/server/fetch-with-proxy";

const DEFAULT_BASE_URL = "https://temp-email-api.jingo1.xyz";
const DEFAULT_LIMIT = 20;

function buildRequestOptions(
  config: RuntimeConfig,
  ProxyAgentImpl: typeof ProxyAgent,
) {
  const options: RequestInit & { dispatcher?: ProxyAgent } = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-admin-auth": config.tempEmailAdminPassword,
    },
  };

  if (config.localProxy) {
    options.dispatcher = new ProxyAgentImpl(config.localProxy);
  }

  return options;
}

export function buildTempEmailListUrl(
  address: string,
  { baseUrl = DEFAULT_BASE_URL, limit = DEFAULT_LIMIT } = {},
) {
  const url = new URL("/admin/mails", baseUrl);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("address", address);
  return url.toString();
}

async function requestTempEmailJson(
  url: string,
  {
    config,
    fetchImpl = fetch,
    ProxyAgentImpl = ProxyAgent,
  }: {
    config: RuntimeConfig;
    fetchImpl?: typeof fetch;
    ProxyAgentImpl?: typeof ProxyAgent;
  },
) {
  const requestOptions = buildRequestOptions(config, ProxyAgentImpl);
  const response =
    fetchImpl === fetch
      ? await fetchWithOptionalProxy(url, requestOptions)
      : await fetchImpl(url, requestOptions);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码: ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`接口返回不是合法 JSON: ${url}`);
  }
}

export async function requestTempEmailList(
  address: string,
  {
    config,
    fetchImpl = fetch,
    ProxyAgentImpl = ProxyAgent,
    baseUrl = DEFAULT_BASE_URL,
    limit = DEFAULT_LIMIT,
  }: {
    config: RuntimeConfig;
    fetchImpl?: typeof fetch;
    ProxyAgentImpl?: typeof ProxyAgent;
    baseUrl?: string;
    limit?: number;
  },
) {
  return ensureStep(
    "请求临时邮箱列表",
    async () => {
      const url = buildTempEmailListUrl(address, { baseUrl, limit });
      return requestTempEmailJson(url, { config, fetchImpl, ProxyAgentImpl });
    },
    { address, limit },
  );
}

export async function requestTempEmailDetail(
  detailUrl: string,
  {
    config,
    fetchImpl = fetch,
    ProxyAgentImpl = ProxyAgent,
  }: {
    config: RuntimeConfig;
    fetchImpl?: typeof fetch;
    ProxyAgentImpl?: typeof ProxyAgent;
  },
) {
  return ensureStep(
    "请求临时邮箱详情",
    async () =>
      requestTempEmailJson(detailUrl, {
        config,
        fetchImpl,
        ProxyAgentImpl,
      }),
    { detailUrl },
  );
}
