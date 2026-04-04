import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";
import * as profileData from "@/lib/shared/profile-data";

describe("SemiAutoWorkbench", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("hides the generated url section before generation", () => {
    render(<SemiAutoWorkbench />);

    expect(screen.getByRole("tab", { name: "添加账号", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量测试", selected: false })).toBeInTheDocument();
    expect(screen.queryByLabelText("generated auth url")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制邮箱" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成 URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "获取 code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加" })).toBeDisabled();
  });

  it("switches to the batch test tab", () => {
    render(<SemiAutoWorkbench />);

    fireEvent.click(screen.getByRole("tab", { name: "批量测试" }));

    expect(screen.getByRole("tab", { name: "批量测试", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加载账号列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始批量测试" })).toBeDisabled();
  });

  it("shows auth url after generating and resets when email changes", async () => {
    vi.spyOn(profileData, "buildRandomProfileName").mockReturnValue("James Lucas Rowan");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            email: "user@example.com",
            authUrl: "https://auth.example.com",
            sessionId: "session-123",
            state: "state-123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<SemiAutoWorkbench />);

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
    vi.stubGlobal(
      "fetch",
      vi.fn()
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
        ),
    );

    render(<SemiAutoWorkbench />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 URL" }));
    await screen.findByLabelText("generated auth url");

    fireEvent.click(screen.getByRole("button", { name: "获取 code" }));
    expect(await screen.findByText("654321")).toBeInTheDocument();
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

    render(<SemiAutoWorkbench />);

    expect(screen.getByText("James Lucas Rowan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制授权 URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制随机姓名" })).toBeInTheDocument();
  });
});
