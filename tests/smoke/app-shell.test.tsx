import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the workbench shell", () => {
    render(<HomePage />);

    expect(screen.getByLabelText("semi-auto workbench")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "添加账号", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量测试", selected: false })).toBeInTheDocument();
  });
});
