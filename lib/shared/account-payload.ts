const DEFAULT_MODEL_MAPPING = {
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125": "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106": "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-16k": "gpt-3.5-turbo-16k",
  "gpt-4": "gpt-4",
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-4-turbo-preview": "gpt-4-turbo-preview",
  "gpt-4o": "gpt-4o",
  "gpt-4o-2024-08-06": "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20": "gpt-4o-2024-11-20",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini-2024-07-18",
  "gpt-4.5-preview": "gpt-4.5-preview",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
  o1: "o1",
  "o1-preview": "o1-preview",
  "o1-mini": "o1-mini",
  "o1-pro": "o1-pro",
  o3: "o3",
  "o3-mini": "o3-mini",
  "o3-pro": "o3-pro",
  "o4-mini": "o4-mini",
  "gpt-5": "gpt-5",
  "gpt-5-2025-08-07": "gpt-5-2025-08-07",
  "gpt-5-chat": "gpt-5-chat",
  "gpt-5-chat-latest": "gpt-5-chat-latest",
  "gpt-5-codex": "gpt-5-codex",
  "gpt-5.3-codex-spark": "gpt-5.3-codex-spark",
  "gpt-5-pro": "gpt-5-pro",
  "gpt-5-pro-2025-10-06": "gpt-5-pro-2025-10-06",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-mini-2025-08-07": "gpt-5-mini-2025-08-07",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5-nano-2025-08-07": "gpt-5-nano-2025-08-07",
  "gpt-5.1": "gpt-5.1",
  "gpt-5.1-2025-11-13": "gpt-5.1-2025-11-13",
  "gpt-5.1-chat-latest": "gpt-5.1-chat-latest",
  "gpt-5.1-codex": "gpt-5.1-codex",
  "gpt-5.1-codex-max": "gpt-5.1-codex-max",
  "gpt-5.1-codex-mini": "gpt-5.1-codex-mini",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.2-2025-12-11": "gpt-5.2-2025-12-11",
  "gpt-5.2-chat-latest": "gpt-5.2-chat-latest",
  "gpt-5.2-codex": "gpt-5.2-codex",
  "gpt-5.2-pro": "gpt-5.2-pro",
  "gpt-5.2-pro-2025-12-11": "gpt-5.2-pro-2025-12-11",
  "gpt-5.4": "gpt-5.4",
  "gpt-5.4-2026-03-05": "gpt-5.4-2026-03-05",
  "gpt-5.3-codex": "gpt-5.3-codex",
  "chatgpt-4o-latest": "chatgpt-4o-latest",
  "gpt-4o-audio-preview": "gpt-4o-audio-preview",
  "gpt-4o-realtime-preview": "gpt-4o-realtime-preview",
} as const;

const DEFAULT_GROUP_IDS = [3];

function resolveGroupIds(env: NodeJS.ProcessEnv = process.env) {
  const rawValue =
    typeof env.ACCOUNT_GROUP_IDS === "string" ? env.ACCOUNT_GROUP_IDS.trim() : "";

  if (!rawValue) {
    return DEFAULT_GROUP_IDS;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((item) => Number.isInteger(item) && item > 0)
    ) {
      return parsed;
    }
  } catch {
    return DEFAULT_GROUP_IDS;
  }

  return DEFAULT_GROUP_IDS;
}

export function buildAddAccountPayload({
  email,
  exchangeData,
}: {
  email: string;
  exchangeData: Record<string, unknown>;
}) {
  return {
    name: email,
    notes: "",
    platform: "openai",
    type: "oauth",
    credentials: {
      access_token: exchangeData.access_token,
      refresh_token: exchangeData.refresh_token,
      expires_in: exchangeData.expires_in,
      expires_at: exchangeData.expires_at,
      client_id: exchangeData.client_id,
      chatgpt_account_id: exchangeData.chatgpt_account_id,
      chatgpt_user_id: exchangeData.chatgpt_user_id,
      organization_id: exchangeData.organization_id,
      model_mapping: DEFAULT_MODEL_MAPPING,
    },
    extra: {
      email,
      openai_oauth_responses_websockets_v2_mode: "off",
      openai_oauth_responses_websockets_v2_enabled: false,
    },
    proxy_id: null,
    concurrency: 10,
    priority: 1,
    rate_multiplier: 1,
    group_ids: resolveGroupIds(),
    expires_at: null,
    auto_pause_on_expired: true,
  };
}
