import type { AuthConfig } from "@/lib/server/config";

export const AUTH_COOKIE_NAME = "semiauto-add-auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const textEncoder = new TextEncoder();

export interface AuthCookiePayload {
  username: string;
  issuedAt: number;
}

function encodePayload(payload: AuthCookiePayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodePayload(value: string) {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AuthCookiePayload>;
    const issuedAt = parsed.issuedAt;

    if (typeof parsed.username !== "string" || typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) {
      return null;
    }

    return {
      username: parsed.username,
      issuedAt: Math.trunc(issuedAt),
    } satisfies AuthCookiePayload;
  } catch {
    return null;
  }
}

function isExpired(issuedAt: number, now = Date.now()) {
  return issuedAt + AUTH_COOKIE_MAX_AGE_SECONDS * 1000 <= now;
}

async function buildSignature(secret: string, value: string) {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await globalThis.crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return Array.from(new Uint8Array(signatureBuffer), (item) => item.toString(16).padStart(2, "0")).join("");
}

export async function createAuthCookieValue(
  config: Pick<AuthConfig, "authCookieSecret">,
  payload: AuthCookiePayload,
) {
  const encodedPayload = encodePayload(payload);
  const signature = await buildSignature(config.authCookieSecret, encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAuthCookieValue(
  config: Pick<AuthConfig, "authCookieSecret" | "authUsername">,
  cookieValue: string | undefined,
) {
  if (!cookieValue) {
    return null;
  }

  const separatorIndex = cookieValue.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const payload = decodePayload(encodedPayload);

  if (!payload || !signature || payload.username !== config.authUsername) {
    return null;
  }

  const expectedSignature = await buildSignature(config.authCookieSecret, encodedPayload);

  if (signature !== expectedSignature || isExpired(payload.issuedAt)) {
    return null;
  }

  return payload;
}

export function buildAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function buildExpiredAuthCookieOptions() {
  return {
    ...buildAuthCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  };
}
