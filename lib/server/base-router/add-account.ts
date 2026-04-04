import { ProxyAgent } from "undici";
import type { RuntimeConfig } from "@/lib/server/config";
import { ensureStep } from "@/lib/server/errors";
import { fetchWithOptionalProxy } from "@/lib/server/fetch-with-proxy";

const DEFAULT_ADD_ACCOUNT_TIMEOUT_MS = 20_000;

function buildAddAccountUrl(config: RuntimeConfig) {
  const host = config.baseRouterHost.replace(/\/+$/g, "");
  const path = config.addAccountPath.replace(/^\/+/g, "");
  return `${host}/${path}`;
}

function isTimeoutError(error: unknown, signal?: AbortSignal) {
  return Boolean(
    signal?.aborted ||
      (error as Error)?.name === "AbortError" ||
      (error as Error)?.name === "TimeoutError",
  );
}

export async function requestAddAccount({
  config,
  payload,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
  createTimeoutSignalImpl,
}: {
  config: RuntimeConfig;
  payload: Record<string, unknown>;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
  createTimeoutSignalImpl?: (timeoutMs: number) => AbortSignal;
}) {
  const url = buildAddAccountUrl(config);

  return ensureStep(
    "请求 add_account 接口",
    async () => {
      const requestOptions: RequestInit & { dispatcher?: ProxyAgent } = {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };

      const createSignal =
        createTimeoutSignalImpl ??
        ((timeoutMs: number) => AbortSignal.timeout(timeoutMs));
      requestOptions.signal = createSignal(DEFAULT_ADD_ACCOUNT_TIMEOUT_MS);

      if (config.localProxy) {
        requestOptions.dispatcher = new ProxyAgentImpl(config.localProxy);
      }

      let response: Response;

      try {
        response =
          fetchImpl === fetch
            ? await fetchWithOptionalProxy(url, requestOptions)
            : await fetchImpl(url, requestOptions);
      } catch (error) {
        if (isTimeoutError(error, requestOptions.signal)) {
          throw new Error(`接口请求超时（${DEFAULT_ADD_ACCOUNT_TIMEOUT_MS}ms）`);
        }

        throw error;
      }

      const text = await response.text();
      const contentType = response.headers.get("content-type") ?? "";
      const parsed = contentType.includes("application/json") ? JSON.parse(text) : text;

      if (!response.ok) {
        throw new Error(`接口请求失败，状态码: ${response.status}`);
      }

      return {
        ok: response.ok,
        status: response.status,
        url,
        data: parsed?.data ?? parsed,
      };
    },
    { url, timeoutMs: DEFAULT_ADD_ACCOUNT_TIMEOUT_MS },
  );
}
