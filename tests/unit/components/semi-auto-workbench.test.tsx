import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";
import * as profileData from "@/lib/shared/profile-data";

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Response>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("SemiAutoWorkbench", () => {
  const tempEmailAddresses = ["selected@penaldo.top", "backup@penaldo.top"];

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("hides the generated url section before generation", () => {
    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "添加账号", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量测试", selected: false })).toBeInTheDocument();
    expect(screen.queryByLabelText("generated auth url")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制邮箱" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成 URL" })).toBeInTheDocument();
    expect(screen.getByLabelText("获取 code 邮箱")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "获取 code" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加" })).toBeDisabled();
  });

  it("switches to the batch test tab", () => {
    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.click(screen.getByRole("tab", { name: "批量测试" }));

    expect(screen.getByRole("tab", { name: "批量测试", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加载账号列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始批量测试" })).toBeDisabled();
  });

  it("shows auth url after generating and resets when email changes", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
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

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));

    expect(await screen.findByLabelText("generated auth url")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
    expect(screen.getByText("James Lucas Rowan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制邮箱" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制授权 URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制随机姓名" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "another@example.com" },
    });

    await waitFor(() => {
      expect(screen.queryByLabelText("generated auth url")).not.toBeInTheDocument();
    });
  });

  it("fetches code and keeps success summary after add succeeds", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              email: "user@example.com",
              authUrl: "https://auth.example.com",
              sessionId: "session-123",
              state: "state-123",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        )
      .mockResolvedValueOnce(
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
        )
      .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              email: "user@example.com",
              status: "active",
              isActive: true,
              summary: {
                email: "user@example.com",
                status: "active",
                isActive: true,
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "selected@penaldo.top" },
    });
    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));
    expect(await screen.findByText("654321")).toBeInTheDocument();
    expect(
      vi.mocked(fetch).mock.calls.some(
        ([input, init]) =>
          input === "/api/code" &&
          init?.method === "POST" &&
          init?.body === JSON.stringify({ address: "selected@penaldo.top" }),
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "复制邮箱" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制授权 URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制随机姓名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制验证码" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "复制随机姓名" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("James Lucas Rowan");
    });

    fireEvent.click(screen.getByRole("button", { name: "复制验证码" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("654321");
    });

    fireEvent.change(screen.getByLabelText("回调 URL"), {
      target: { value: "http://localhost:1455/auth/callback?code=callback-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加" }));

    expect(await screen.findByLabelText("add account success summary")).toBeInTheDocument();
    expect(screen.getByText("当前账号已激活")).toBeInTheDocument();
  });

  it("clears the previous code result when switching temp email", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "user@example.com",
            authUrl: "https://auth.example.com",
            sessionId: "session-123",
            state: "state-123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
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

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "selected@penaldo.top" },
    });
    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));

    expect(await screen.findByText("654321")).toBeInTheDocument();
    expect(screen.getByText("已读取最新验证码")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "backup@penaldo.top" },
    });

    await waitFor(() => {
      expect(screen.queryByLabelText("latest code result")).not.toBeInTheDocument();
      expect(screen.queryByText("已读取最新验证码")).not.toBeInTheDocument();
    });
  });

  it("drops stale code responses after switching temp email before the request resolves", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
    const pendingCodeResponse = createDeferredResponse();

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            email: "user@example.com",
            authUrl: "https://auth.example.com",
            sessionId: "session-123",
            state: "state-123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockImplementationOnce(() => pendingCodeResponse.promise);

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "selected@penaldo.top" },
    });
    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));
    expect(screen.getByRole("button", { name: "Fetching code..." })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "backup@penaldo.top" },
    });

    pendingCodeResponse.resolve(
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "获取 code" })).toBeEnabled();
    });

    await waitFor(() => {
      expect(screen.getByLabelText("获取 code 邮箱")).toHaveValue("backup@penaldo.top");
      expect(screen.queryByLabelText("latest code result")).not.toBeInTheDocument();
      expect(screen.queryByText("654321")).not.toBeInTheDocument();
      expect(screen.queryByText("已读取最新验证码")).not.toBeInTheDocument();
    });
  });

  it("keeps the selected temp email after clearing the current session", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
    vi.mocked(fetch).mockResolvedValueOnce(
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

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "backup@penaldo.top" },
    });

    fireEvent.click(screen.getByRole("button", { name: "清除当前 session" }));

    expect(screen.getByLabelText("获取 code 邮箱")).toHaveValue("backup@penaldo.top");
  });

  it("restores generated name from session storage", () => {
    sessionStorage.setItem(
      "semiauto-add/session",
      JSON.stringify({
        authContext: {
          email: "user@example.com",
          authUrl: "https://auth.example.com",
          sessionId: "session-123",
          state: "state-123",
          generatedName: "James Lucas Rowan",
        },
        successSummary: null,
      }),
    );

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    expect(screen.getByText("James Lucas Rowan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制授权 URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制随机姓名" })).toBeInTheDocument();
  });

  it("redirects to the login page when a request returns 401", async () => {
    const router = useRouter();
    sessionStorage.setItem(
      "semiauto-add/session",
      JSON.stringify({
        authContext: {
          email: "user@example.com",
          authUrl: "https://auth.example.com",
          sessionId: "session-123",
          state: "state-123",
          generatedName: "James Lucas Rowan",
        },
        successSummary: null,
      }),
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: "未授权访问，请先登录",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.change(screen.getByLabelText("获取 code 邮箱"), {
      target: { value: "selected@penaldo.top" },
    });
    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login");
    });
    expect(sessionStorage.getItem("semiauto-add/session")).toBeNull();
  });

  it("calls logout and redirects back to the login page", async () => {
    const router = useRouter();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(router.replace).toHaveBeenCalledWith("/login");
    });
  });
});
