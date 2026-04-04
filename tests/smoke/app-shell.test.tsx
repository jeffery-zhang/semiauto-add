import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the workbench shell", () => {
    render(<HomePage />);

    expect(screen.getByLabelText("semi-auto workbench")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成 URL" })).toBeInTheDocument();
  });
});
