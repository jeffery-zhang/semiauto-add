export const FINAL_CALLBACK_URL_PREFIX = "http://localhost:1455";

export function assertCallbackUrlPrefix(callbackUrl: string) {
  const normalized = String(callbackUrl ?? "").trim();

  if (!normalized.startsWith(FINAL_CALLBACK_URL_PREFIX)) {
    throw new Error(`回调 URL 必须以 ${FINAL_CALLBACK_URL_PREFIX} 开头`);
  }

  return normalized;
}

export function extractCodeFromCallbackUrl(callbackUrl: string) {
  const normalized = assertCallbackUrlPrefix(callbackUrl);
  const url = new URL(normalized);
  const code = url.searchParams.get("code");

  if (!code) {
    throw new Error("回调 URL 中缺少 code 参数");
  }

  return code;
}
