export type StepError = Error & {
  step?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
};

export function createStepError(
  step: string,
  message: string,
  context: Record<string, unknown> = {},
  cause?: unknown,
) {
  const error = new Error(`[${step}] ${message}`) as StepError;
  error.step = step;
  error.context = context;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

export async function ensureStep<T>(
  step: string,
  action: () => Promise<T>,
  context: Record<string, unknown> = {},
) {
  try {
    return await action();
  } catch (error) {
    if ((error as StepError)?.step) {
      throw error;
    }

    throw createStepError(
      step,
      error instanceof Error ? error.message : String(error),
      context,
      error,
    );
  }
}

export function toSafeErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "请求失败，请稍后重试";

  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/access_token["']?\s*[:=]\s*["'][^"']+["']/gi, 'access_token:"[REDACTED]"')
    .replace(/refresh_token["']?\s*[:=]\s*["'][^"']+["']/gi, 'refresh_token:"[REDACTED]"')
    .replace(/code=([A-Za-z0-9._-]+)/gi, "code=[REDACTED]");
}
