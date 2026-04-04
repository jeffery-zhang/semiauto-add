import { ProxyAgent } from "undici";

type RequestOptions = RequestInit & { dispatcher?: ProxyAgent };

export async function fetchWithOptionalProxy(
  url: string,
  requestOptions: RequestOptions,
) {
  try {
    return await fetch(url, requestOptions);
  } catch (error) {
    if (!requestOptions.dispatcher) {
      throw error;
    }

    console.warn("[fetchWithOptionalProxy] proxy fetch failed, retrying direct", {
      url,
      message: error instanceof Error ? error.message : String(error),
    });

    const fallbackOptions = { ...requestOptions };
    delete fallbackOptions.dispatcher;

    try {
      return await fetch(url, fallbackOptions);
    } catch (fallbackError) {
      console.error("[fetchWithOptionalProxy] direct retry failed", {
        url,
        message:
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      throw fallbackError;
    }
  }
}
