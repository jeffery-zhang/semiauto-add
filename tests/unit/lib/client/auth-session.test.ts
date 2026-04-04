import {
  clearWorkbenchState,
  readWorkbenchState,
  writeWorkbenchState,
} from "@/lib/client/auth-session";

describe("auth session storage helpers", () => {
  it("writes and reads stored state", () => {
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      removeItem(key: string) {
        this.data.delete(key);
      },
    };

    writeWorkbenchState(
      {
        authContext: {
          email: "user@example.com",
          authUrl: "https://example.com",
          sessionId: "session-123",
          state: "state-123",
          generatedName: "James Lucas Rowan",
        },
        successSummary: {
          email: "user@example.com",
          status: "active",
          isActive: true,
        },
      },
      storage,
    );

    expect(readWorkbenchState(storage).authContext?.sessionId).toBe("session-123");
    expect(readWorkbenchState(storage).authContext?.generatedName).toBe("James Lucas Rowan");

    clearWorkbenchState(storage);
    expect(readWorkbenchState(storage).authContext).toBeNull();
  });
});
