import { ProxyAgent } from "undici";
import type { RuntimeConfig } from "@/lib/server/config";
import { createStepError, ensureStep } from "@/lib/server/errors";
import { fetchWithOptionalProxy } from "@/lib/server/fetch-with-proxy";

let cachedAdminToken: string | null = null;

function buildAdminUrl(baseRouterHost: string, path: string) {
  const host = baseRouterHost.replace(/\/+$/g, "");
  const suffix = path.replace(/^\/+/g, "");
  return `${host}/${suffix}`;
}

function resolveAdminToken(config: RuntimeConfig) {
  return cachedAdminToken ?? config.adminToken;
}

export function resetAdminTokenCache() {
  cachedAdminToken = null;
}

export async function verifyAdminToken({
  config,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildAdminUrl(config.baseRouterHost, config.authPath);

  return ensureStep(
    "管理员 Token 校验",
    async () => {
      const requestOptions: RequestInit & { dispatcher?: ProxyAgent } = {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${resolveAdminToken(config)}`,
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

      return {
        ok: response.ok,
        status: response.status,
        url,
        data: contentType.includes("application/json") ? JSON.parse(text) : text,
      };
    },
    { url },
  );
}

export async function loginAdmin({
  config,
  fetchImpl = fetch,
  ProxyAgentImpl = ProxyAgent,
}: {
  config: RuntimeConfig;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
}) {
  const url = buildAdminUrl(config.baseRouterHost, config.loginPath);

  return ensureStep(
    "管理员登录获取新 Token",
    async () => {
      const requestOptions: RequestInit & { dispatcher?: ProxyAgent } = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: config.baseRouterAdminEmail,
          password: config.baseRouterAdminPassword,
        }),
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
      const data = contentType.includes("application/json") ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(`管理员登录失败，状态码: ${response.status}`);
      }

      const accessToken =
        data?.access_token ?? data?.data?.access_token ?? data?.token;

      if (!accessToken) {
        throw new Error("登录响应中缺少 access_token");
      }

      return { accessToken };
    },
    { url },
  );
}

export async function ensureAdminTokenReady({
  config,
  fetchImpl,
  ProxyAgentImpl,
  verifyAdminTokenImpl = verifyAdminToken,
  loginAdminImpl = loginAdmin,
}: {
  config: RuntimeConfig;
  fetchImpl?: typeof fetch;
  ProxyAgentImpl?: typeof ProxyAgent;
  verifyAdminTokenImpl?: typeof verifyAdminToken;
  loginAdminImpl?: typeof loginAdmin;
}) {
  if (!config) {
    throw new Error("ensureAdminTokenReady 需要传入 config");
  }

  if (!cachedAdminToken) {
    const loginResult = await loginAdminImpl({
      config,
      fetchImpl,
      ProxyAgentImpl,
    });

    if (!loginResult.accessToken) {
      throw createStepError(
        "管理员登录获取新 Token",
        "登录接口未返回 access_token",
        { loginPath: config.loginPath },
      );
    }

    cachedAdminToken = loginResult.accessToken;
    config.adminToken = loginResult.accessToken;
    return { adminToken: loginResult.accessToken };
  }

  config.adminToken = resolveAdminToken(config);
  const verification = await verifyAdminTokenImpl({
    config,
    fetchImpl,
    ProxyAgentImpl,
  });

  if (verification.status === 200) {
    cachedAdminToken = config.adminToken;
    return { adminToken: config.adminToken };
  }

  if (verification.status === 401) {
    const loginResult = await loginAdminImpl({
      config,
      fetchImpl,
      ProxyAgentImpl,
    });

    if (!loginResult.accessToken) {
      throw createStepError(
        "管理员登录获取新 Token",
        "登录接口未返回 access_token",
        { loginPath: config.loginPath },
      );
    }

    cachedAdminToken = loginResult.accessToken;
    config.adminToken = loginResult.accessToken;
    return { adminToken: loginResult.accessToken };
  }

  throw createStepError(
    "管理员 Token 校验",
    `校验接口返回异常状态码: ${verification.status}`,
    { status: verification.status },
  );
}
