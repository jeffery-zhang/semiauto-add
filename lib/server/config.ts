export interface AuthConfig {
  authUsername: string;
  authPassword: string;
  authCookieSecret: string;
}

export interface RuntimeConfig extends AuthConfig {
  baseRouterHost: string;
  baseRouterAdminEmail: string;
  baseRouterAdminPassword: string;
  genAuthPath: string;
  authPath: string;
  loginPath: string;
  exchangeCodePath: string;
  addAccountPath: string;
  adminToken: string;
  localProxy: string;
}

function normalizeEnvValue(value: string | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.replace(/^['"]|['"]$/g, "");
}

function requireEnvValue(name: string, value: string | undefined, message: string) {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return {
    authUsername: requireEnvValue(
      "AUTH_USERNAME",
      env.AUTH_USERNAME,
      "缺少 AUTH_USERNAME，请先在 .env 中配置登录用户名",
    ),
    authPassword: requireEnvValue(
      "AUTH_PASSWORD",
      env.AUTH_PASSWORD,
      "缺少 AUTH_PASSWORD，请先在 .env 中配置登录密码",
    ),
    authCookieSecret: requireEnvValue(
      "AUTH_COOKIE_SECRET",
      env.AUTH_COOKIE_SECRET,
      "缺少 AUTH_COOKIE_SECRET，请先在 .env 中配置登录 cookie 密钥",
    ),
  };
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    ...loadAuthConfig(env),
    baseRouterHost: requireEnvValue(
      "BASE_ROUTER_HOST",
      env.BASE_ROUTER_HOST,
      "缺少 BASE_ROUTER_HOST，请先在 .env 中配置站点地址",
    ),
    baseRouterAdminEmail: requireEnvValue(
      "BASE_ROUTER_ADMIN_EMAIL",
      env.BASE_ROUTER_ADMIN_EMAIL ?? env.BASE_ROUTER_ADMIN,
      "缺少 BASE_ROUTER_ADMIN_EMAIL，请先在 .env 中配置管理员邮箱",
    ),
    baseRouterAdminPassword: requireEnvValue(
      "BASE_ROUTER_ADMIN_PASSWORD",
      env.BASE_ROUTER_ADMIN_PASSWORD,
      "缺少 BASE_ROUTER_ADMIN_PASSWORD，请先在 .env 中配置管理员密码",
    ),
    genAuthPath: requireEnvValue(
      "GEN_AUTH_URL",
      env.GEN_AUTH_URL,
      "缺少 GEN_AUTH_URL，请先在 .env 中配置接口路径",
    ),
    authPath: requireEnvValue(
      "AUTH_URL",
      env.AUTH_URL,
      "缺少 AUTH_URL，请先在 .env 中配置管理员鉴权校验接口路径",
    ),
    loginPath: requireEnvValue(
      "LOGIN_URL",
      env.LOGIN_URL,
      "缺少 LOGIN_URL，请先在 .env 中配置管理员登录接口路径",
    ),
    exchangeCodePath: requireEnvValue(
      "EXCHANGE_CODE_URL",
      env.EXCHANGE_CODE_URL,
      "缺少 EXCHANGE_CODE_URL，请先在 .env 中配置 exchange 接口路径",
    ),
    addAccountPath: requireEnvValue(
      "ADD_ACCOUNT_URL",
      env.ADD_ACCOUNT_URL,
      "缺少 ADD_ACCOUNT_URL，请先在 .env 中配置 add account 接口路径",
    ),
    adminToken: normalizeEnvValue(env.ADMIN_TOKEN),
    localProxy: normalizeEnvValue(env.LOCAL_PROXY),
  };
}
