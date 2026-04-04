import { ProxyAgent } from "undici";
import type { RuntimeConfig } from "@/lib/server/config";
import { createStepError, ensureStep } from "@/lib/server/errors";
import { fetchWithOptionalProxy } from "@/lib/server/fetch-with-proxy";

function buildGenAuthUrl(config: RuntimeConfig) {
  const host = config.baseRouterHost.replace(/\/+$/g, "");
  const path = config.genAuthPath.replace(/^\/+/g, "");
  return `${host}/${path}`;
}

export function extractAuthUrl(result: Record<string, unknown>) {
  const authUrl =
    (result as { data?: { auth_url?: string; data?: { auth_url?: string }; url?: string } })
      ?.data?.auth_url ??
    (result as { data?: { data?: { auth_url?: string } } })?.data?.data?.auth_url ??
    (result as { auth_url?: string }).auth_url ??
    (result as { data?: { url?: string } }).data?.url;

  if (!authUrl) {
    throw createStepError("解析 auth_url 响应", "接口响应中缺少 auth_url", { result });
  }

  return authUrl;
}

export function extractSessionId(result: Record<string, unknown>) {
  const sessionId =
    (result as { data?: { data?: { session_id?: string }; session_id?: string } })?.data?.data
      ?.session_id ??
    (result as { data?: { session_id?: string } })?.data?.session_id ??
    (result as { session_id?: string }).session_id;

  if (!sessionId) {
    throw new Error("gen_auth 响应中缺少 session_id");
  }

  return sessionId;
}

export function extractStateFromAuthUrl(authUrl: string) {
  const state = new URL(authUrl).searchParams.get("state");

  if (!state) {
    throw new Error("auth_url 中缺少 state 参数");
  }

  return state;
}

export async function requestGenAuthUrl({
  config,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildGenAuthUrl(config);

  return ensureStep(
    "请求 gen_auth_url 接口",
    async () => {
      const requestOptions: RequestInit & { dispatcher?: ProxyAgent } = {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.adminToken}`,
        },
      };

      if (config.localProxy) {
        requestOptions.dispatcher = new ProxyAgentImpl(config.localProxy);
      }

      const response =
        fetchImpl === fetch
          ? await fetchWithOptionalProxy(url, requestOptions)
          : await fetchImpl(url, requestOptions);
      const text = await response.text();
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? JSON.parse(text) : text;

      if (!response.ok) {
        throw new Error(`接口请求失败，状态码: ${response.status}`);
      }

      return {
        ok: response.ok,
        status: response.status,
        url,
        data,
      };
    },
    { url },
  );
}
