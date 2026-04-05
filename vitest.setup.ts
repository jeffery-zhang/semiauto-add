import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";
import { beforeEach, vi } from "vitest";

const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: mockRouterReplace,
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
}

beforeEach(() => {
  mockRouterReplace.mockReset();
});
