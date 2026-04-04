export interface AuthSessionContext {
  email: string;
  authUrl: string;
  sessionId: string;
  state: string;
  generatedName: string;
}

export interface AddSuccessSummary {
  email: string;
  status: string;
  isActive: boolean;
}

export interface StoredWorkbenchState {
  authContext: AuthSessionContext | null;
  successSummary: AddSuccessSummary | null;
}

export const AUTH_SESSION_STORAGE_KEY = "semiauto-add/session";

export function getEmptyWorkbenchState(): StoredWorkbenchState {
  return {
    authContext: null,
    successSummary: null,
  };
}

export function readWorkbenchState(
  storage: Pick<Storage, "getItem"> | undefined = globalThis.sessionStorage,
) {
  if (!storage) {
    return getEmptyWorkbenchState();
  }

  const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!raw) {
    return getEmptyWorkbenchState();
  }

  try {
    const parsed = JSON.parse(raw) as StoredWorkbenchState;
    const authContext = parsed?.authContext;

    if (
      authContext &&
      typeof authContext.email === "string" &&
      typeof authContext.authUrl === "string" &&
      typeof authContext.sessionId === "string" &&
      typeof authContext.state === "string" &&
      typeof authContext.generatedName === "string"
    ) {
      return {
        authContext,
        successSummary:
          parsed.successSummary &&
          typeof parsed.successSummary.email === "string" &&
          typeof parsed.successSummary.status === "string" &&
          typeof parsed.successSummary.isActive === "boolean"
            ? parsed.successSummary
            : null,
      };
    }
  } catch {
    return getEmptyWorkbenchState();
  }

  return getEmptyWorkbenchState();
}

export function writeWorkbenchState(
  state: StoredWorkbenchState,
  storage: Pick<Storage, "setItem"> | undefined = globalThis.sessionStorage,
) {
  storage?.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(state));
}

export function clearWorkbenchState(
  storage: Pick<Storage, "removeItem"> | undefined = globalThis.sessionStorage,
) {
  storage?.removeItem(AUTH_SESSION_STORAGE_KEY);
}
