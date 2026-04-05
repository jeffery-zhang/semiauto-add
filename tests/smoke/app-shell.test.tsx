import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";

describe("HomePage", () => {
  it("renders the workbench shell", () => {
    render(<HomePage />);

    expect(screen.getByLabelText("semi-auto workbench")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "添加账号", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量测试", selected: false })).toBeInTheDocument();
  });
});

describe("LoginPage", () => {
  it("renders the login gate", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("login gate")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "输入用户名和密码" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入工作台" })).toBeDisabled();
  });
});
