# Configurable Temp Email Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让验证码读取邮箱改为通过 env var 配置的数组，并在前端用下拉框选择目标邮箱；未选择前不显示 `获取 code` 按钮，点击 `清除当前 session` 不清空下拉框选中项。

**Architecture:** 服务端把 `TEMP_EMAIL_ADDRESSES` 解析为唯一事实源，`/api/code` 只接受并校验用户选中的邮箱。首页服务端组件只读取“邮箱列表配置”并透传给客户端组件，避免页面渲染时误依赖整套运行时后端配置。客户端组件新增独立的下拉框状态，这个状态不并入现有 `sessionStorage`，因此清 session 时不会被重置。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Vitest 4, Testing Library

---

## File Structure

- Modify: `lib/server/config.ts`
  责任：新增 temp email 地址列表解析和只读配置加载函数，继续作为服务端唯一事实源。
- Modify: `app/api/code/route.ts`
  责任：从请求体接收选中的邮箱，并校验它必须属于配置列表。
- Modify: `app/page.tsx`
  责任：服务端读取配置好的邮箱列表并传给客户端工作台组件。
- Modify: `components/semi-auto-workbench.tsx`
  责任：渲染下拉框，只有选中邮箱时才显示 `获取 code` 按钮，并在请求时带上选中的邮箱。
- Modify: `tests/unit/lib/server/config.test.ts`
  责任：覆盖 env 数组解析和错误提示。
- Modify: `tests/integration/app/api/code.route.test.ts`
  责任：覆盖 `/api/code` 使用选中邮箱、拒绝未选择邮箱、拒绝非法邮箱。
- Modify: `tests/unit/components/semi-auto-workbench.test.tsx`
  责任：覆盖下拉框显示逻辑、按钮显隐、请求体和“清除当前 session”后的保留行为。
- Modify: `.env.example`
  责任：记录新的 env var 格式。
- Modify: `README.md`
  责任：更新配置说明和操作顺序。

### Task 1: Parse Configured Temp Email Addresses

**Files:**
- Modify: `lib/server/config.ts`
- Modify: `tests/unit/lib/server/config.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing config tests**

```ts
import {
  loadAuthConfig,
  loadRuntimeConfig,
  loadTempEmailSelectionConfig,
} from "@/lib/server/config";

describe("loadTempEmailSelectionConfig", () => {
  it("reads temp email addresses from bracket array syntax", () => {
    const config = loadTempEmailSelectionConfig({
      TEMP_EMAIL_ADDRESSES: "[123@321.com, 444@666.com]",
    });

    expect(config.tempEmailAddresses).toEqual(["123@321.com", "444@666.com"]);
  });

  it("throws a clear error when the value is not bracket array syntax", () => {
    expect(() =>
      loadTempEmailSelectionConfig({
        TEMP_EMAIL_ADDRESSES: "123@321.com, 444@666.com",
      }),
    ).toThrow(/TEMP_EMAIL_ADDRESSES.*\[/);
  });
});

describe("loadRuntimeConfig", () => {
  it("reads required environment values", () => {
    const config = loadRuntimeConfig({
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "password",
      AUTH_COOKIE_SECRET: "cookie-secret",
      BASE_ROUTER_HOST: "https://router.example.com",
      BASE_ROUTER_ADMIN_EMAIL: "admin@example.com",
      BASE_ROUTER_ADMIN_PASSWORD: "secret",
      GEN_AUTH_URL: "/gen-auth",
      AUTH_URL: "/auth/check",
      LOGIN_URL: "/auth/login",
      EXCHANGE_CODE_URL: "/exchange-code",
      ADD_ACCOUNT_URL: "/accounts",
      TEMP_EMAIL_ADMIN_PWD: "temp-secret",
      TEMP_EMAIL_ADDRESSES: "[123@321.com, 444@666.com]",
      LOCAL_PROXY: "http://127.0.0.1:7890",
    });

    expect(config.tempEmailAddresses).toEqual(["123@321.com", "444@666.com"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lib/server/config.test.ts`
Expected: FAIL with `loadTempEmailSelectionConfig is not exported` or `tempEmailAddresses` missing.

- [ ] **Step 3: Write the minimal config parser and shared loader**

```ts
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

function parseTempEmailAddresses(value: string | undefined) {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    throw new Error("缺少 TEMP_EMAIL_ADDRESSES，请先在 .env 中配置验证码邮箱列表");
  }

  if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
    throw new Error(
      "TEMP_EMAIL_ADDRESSES 必须使用数组格式，例如 [123@321.com, 444@666.com]",
    );
  }

  const addresses = normalized
    .slice(1, -1)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (addresses.length === 0) {
    throw new Error("TEMP_EMAIL_ADDRESSES 至少要配置一个邮箱");
  }

  return addresses;
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
```

- [ ] **Step 4: Add the new env example entry**

```env
TEMP_EMAIL_ADMIN_PWD=
TEMP_EMAIL_ADDRESSES=[123@321.com, 444@666.com]
LOCAL_PROXY=
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/lib/server/config.test.ts`
Expected: PASS with all config tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/server/config.ts tests/unit/lib/server/config.test.ts .env.example
git commit -m "feat: add configurable temp email address list"
```

### Task 2: Validate Selected Email in `/api/code`

**Files:**
- Modify: `app/api/code/route.ts`
- Modify: `tests/integration/app/api/code.route.test.ts`

- [ ] **Step 1: Write the failing API route tests**

```ts
vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => ({
    mocked: true,
    tempEmailAddresses: ["123@321.com", "444@666.com"],
  })),
}));

vi.mock("@/lib/server/temp-email/fetch-code", () => ({
  fetchTempEmailCodeJson: vi.fn().mockResolvedValue({
    code: "654321",
    subject: "验证码",
    from: "otp@tm1.openai.com",
    mailId: 8,
    createdAt: "2026-04-04 20:00:00",
  }),
}));

import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";
import { POST } from "@/app/api/code/route";

describe("/api/code", () => {
  it("uses the selected email address from the request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: "444@666.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchTempEmailCodeJson).toHaveBeenCalledWith(
      "444@666.com",
      expect.objectContaining({ config: expect.anything() }),
    );
  });

  it("returns 400 when address is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when address is outside configured list", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: "999@888.com" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/app/api/code.route.test.ts`
Expected: FAIL because `/api/code` still ignores request body and still uses hard-coded email.

- [ ] **Step 3: Update the route to read and validate the selected email**

```ts
import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { loadRuntimeConfig } from "@/lib/server/config";
import { toSafeErrorMessage } from "@/lib/server/errors";
import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);

    const payload = (await request.json().catch(() => ({}))) as {
      address?: string;
    };
    const address = String(payload.address ?? "").trim();
    const config = loadRuntimeConfig();

    if (!address) {
      return NextResponse.json(
        { error: { message: "请先选择获取验证码的邮箱" } },
        { status: 400 },
      );
    }

    if (!config.tempEmailAddresses.includes(address)) {
      return NextResponse.json(
        { error: { message: "所选邮箱不在允许列表中" } },
        { status: 400 },
      );
    }

    const result = await fetchTempEmailCodeJson(address, { config });

    return NextResponse.json({
      code: result.code,
      subject: result.subject,
      from: result.from,
      mailId: result.mailId,
      createdAt: result.createdAt,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return createUnauthorizedResponse(error.message);
    }

    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/app/api/code.route.test.ts`
Expected: PASS with one success case and two `400` validation cases.

- [ ] **Step 5: Commit**

```bash
git add app/api/code/route.ts tests/integration/app/api/code.route.test.ts
git commit -m "feat: validate selected temp email on code fetch"
```

### Task 3: Add the Selector UI and Preserve It Across Session Clears

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/semi-auto-workbench.tsx`
- Modify: `tests/unit/components/semi-auto-workbench.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";

describe("SemiAutoWorkbench", () => {
  it("hides the fetch button until a temp email is selected", () => {
    render(<SemiAutoWorkbench tempEmailAddresses={["123@321.com", "444@666.com"]} />);

    expect(screen.getByLabelText("获取 code 邮箱")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "获取 code" })).not.toBeInTheDocument();
  });

  it("shows the fetch button after selecting a temp email and posts that address", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "654321",
          subject: "验证码",
          from: "otp@tm1.openai.com",
          mailId: 8,
          createdAt: "2026-04-04 20:00:00",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<SemiAutoWorkbench tempEmailAddresses={["123@321.com", "444@666.com"]} />);

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "444@666.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/code",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: "444@666.com" }),
        }),
      );
    });
  });

  it("keeps the selected temp email after clearing current session", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          email: "user@example.com",
          authUrl: "https://auth.example.com",
          sessionId: "session-123",
          state: "state-123",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<SemiAutoWorkbench tempEmailAddresses={["123@321.com", "444@666.com"]} />);

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "123@321.com" },
    });
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.click(screen.getByRole("button", { name: "清除当前 session" }));

    expect(screen.getByLabelText("获取 code 邮箱")).toHaveValue("123@321.com");
    expect(screen.getByRole("button", { name: "获取 code" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/semi-auto-workbench.test.tsx`
Expected: FAIL because the component does not accept `tempEmailAddresses`, has no selector, and always renders the button.

- [ ] **Step 3: Pass the configured addresses from the server page**

```tsx
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";
import { loadTempEmailSelectionConfig } from "@/lib/server/config";

export default function HomePage() {
  const { tempEmailAddresses } = loadTempEmailSelectionConfig();

  return <SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />;
}
```

- [ ] **Step 4: Add selector state and conditional button rendering in the client component**

```tsx
interface SemiAutoWorkbenchProps {
  tempEmailAddresses: string[];
}

export function SemiAutoWorkbench({ tempEmailAddresses }: SemiAutoWorkbenchProps) {
  const [selectedCodeEmail, setSelectedCodeEmail] = useState("");

  function resetFlowState(nextEmail: string) {
    setAuthContext(null);
    setCodeResult(null);
    setCallbackUrl("");
    setGenerateFeedback(null);
    setCodeFeedback(null);
    setAddFeedback(null);
    setSuccessSummary(null);
    setCopiedToken(null);
    clearWorkbenchState();
    setEmail(nextEmail);
  }

  async function handleFetchCode() {
    if (!selectedCodeEmail) {
      setCodeFeedback({ kind: "error", message: "请先选择获取验证码的邮箱" });
      return;
    }

    setIsFetchingCode(true);
    setCodeFeedback(null);

    try {
      const response = await fetchWithAuth("/api/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: selectedCodeEmail }),
      });
      const payload = await response.json();

      if (!response.ok) {
        const errorPayload = payload as { error?: { message?: string } };
        throw new Error(errorPayload.error?.message ?? "获取验证码失败");
      }

      setCodeResult(payload);
      setCodeFeedback({ kind: "success", message: "已读取最新验证码" });
    } catch (error) {
      setCodeFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "获取验证码失败",
      });
    } finally {
      setIsFetchingCode(false);
    }
  }

  return (
    <>
      <label className="field-block" htmlFor="code-email-select">
        <span className="field-label">获取 code 邮箱</span>
        <select
          id="code-email-select"
          value={selectedCodeEmail}
          onChange={(event) => setSelectedCodeEmail(event.target.value)}
        >
          <option value="">请选择邮箱</option>
          {tempEmailAddresses.map((address) => (
            <option key={address} value={address}>
              {address}
            </option>
          ))}
        </select>
      </label>

      {selectedCodeEmail ? (
        <button
          type="button"
          className="primary-button"
          onClick={handleFetchCode}
          disabled={isFetchingCode}
        >
          {isFetchingCode ? "Fetching code..." : "获取 code"}
        </button>
      ) : null}
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/semi-auto-workbench.test.tsx`
Expected: PASS with selector, request body, and clear-session preservation all covered.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/semi-auto-workbench.tsx tests/unit/components/semi-auto-workbench.test.tsx
git commit -m "feat: add temp email selector to workbench"
```

### Task 4: Update Docs and Run Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README config and usage text**

````md
复制 `.env.example` 到 `.env`，并填入实际值：

```env
TEMP_EMAIL_ADMIN_PWD=
TEMP_EMAIL_ADDRESSES=[123@321.com, 444@666.com]
```

- `TEMP_EMAIL_ADMIN_PWD`: temp-email 管理员密码
- `TEMP_EMAIL_ADDRESSES`: 验证码邮箱列表，只支持 `[a@b.com, c@d.com]` 这种数组形式

### 添加账号

1. 输入邮箱
2. 点击“生成 URL”
3. 手动打开生成出来的授权 URL
4. 在外部页面完成操作
5. 在“获取 code 邮箱”下拉框中选择目标邮箱
6. 点击“获取 code”读取该邮箱里的最新验证码
7. 把最终回调 URL 粘贴回页面
8. 点击“添加”
````

- [ ] **Step 2: Run targeted test suite**

Run: `npx vitest run tests/unit/lib/server/config.test.ts tests/integration/app/api/code.route.test.ts tests/unit/components/semi-auto-workbench.test.tsx`
Expected: PASS with all new selector and config coverage green.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS with no new TypeScript or ESLint errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe configurable temp email selection"
```

## Self-Review

- Spec coverage:
  - `env var` 配置实际读信邮箱：Task 1
  - 只支持数组形式 `[123@321.com, 444@666.com]`：Task 1
  - 下拉框选择邮箱：Task 3
  - 选中才显示 `获取 code` 按钮：Task 3
  - `清除当前 session` 不清空下拉框选中邮箱：Task 3
- Placeholder scan:
  - 无 `TODO`、`TBD`、`类似 Task N` 之类占位描述。
- Type consistency:
  - 统一使用 `tempEmailAddresses` 表示配置列表。
  - 统一使用 `address` 作为 `/api/code` 请求体字段。
  - 统一使用 `selectedCodeEmail` 作为前端选中值状态。
