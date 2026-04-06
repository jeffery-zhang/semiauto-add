export interface AuthConfig {
  authUsername: string;
  authPassword: string;
  authCookieSecret: string;
}

export interface TempEmailSelectionConfig {
  tempEmailAddresses: string[];
}

export interface RuntimeConfig extends AuthConfig, TempEmailSelectionConfig {
  baseRouterHost: string;
  baseRouterAdminEmail: string;
  baseRouterAdminPassword: string;
  genAuthPath: string;
  authPath: string;
  loginPath: string;
  exchangeCodePath: string;
  addAccountPath: string;
  adminToken: string;
  tempEmailAdminPassword: string;
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

function parseTempEmailAddresses(value: string | undefined) {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    throw new Error(
      "缺少 TEMP_EMAIL_ADDRESSES，请先在 .env 中配置临时邮箱列表，格式如 [123@321.com, 444@666.com]",
    );
  }

  if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
    throw new Error(
      "TEMP_EMAIL_ADDRESSES 格式错误，必须使用方括号数组格式，如 [123@321.com, 444@666.com]",
    );
  }

  const entries = normalized
    .slice(1, -1)
    .split(",")
    .map((item) => item.trim());

  if (entries.length === 0 || entries.every((item) => !item)) {
    throw new Error(
      "TEMP_EMAIL_ADDRESSES 不能为空数组，格式如 [123@321.com, 444@666.com]",
    );
  }

  if (entries.some((item) => !item)) {
    throw new Error("TEMP_EMAIL_ADDRESSES 不能包含空邮箱项");
  }

  if (
    entries.some(
      (item) =>
        item.startsWith('"') ||
        item.endsWith('"') ||
        item.startsWith("'") ||
        item.endsWith("'"),
    )
  ) {
    throw new Error(
      "TEMP_EMAIL_ADDRESSES 不能包含带引号的邮箱项，请使用 [a@example.com, b@example.com] 格式",
    );
  }

  return entries;
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

export function loadTempEmailSelectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): TempEmailSelectionConfig {
  return {
    tempEmailAddresses: parseTempEmailAddresses(env.TEMP_EMAIL_ADDRESSES),
  };
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    ...loadAuthConfig(env),
    ...loadTempEmailSelectionConfig(env),
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
    tempEmailAdminPassword: requireEnvValue(
      "TEMP_EMAIL_ADMIN_PWD",
      env.TEMP_EMAIL_ADMIN_PWD,
      "缺少 TEMP_EMAIL_ADMIN_PWD，请先在 .env 中配置 temp-email 管理员密码",
    ),
    localProxy: normalizeEnvValue(env.LOCAL_PROXY),
  };
}
