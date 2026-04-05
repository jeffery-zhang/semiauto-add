import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("keeps submit disabled until both fields are filled", () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole("button", { name: "进入工作台" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "secret" },
    });
    expect(submitButton).toBeEnabled();
  });

  it("redirects to the workbench after a successful login", async () => {
    const router = useRouter();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "进入工作台" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("shows the backend error message when login fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: "用户名或密码错误",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "进入工作台" }));

    expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
  });

  it("shows loading state while the request is pending", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("用户名"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "进入工作台" }));

    expect(screen.getByRole("button", { name: "登录中..." })).toBeDisabled();

    resolveResponse(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "进入工作台" })).toBeEnabled();
    });
  });
});
