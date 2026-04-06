import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";

const TEST_TEMP_EMAIL_ADDRESSES = ["temp-1@example.com", "temp-2@example.com"];

function openBatchTestTab() {
  render(<SemiAutoWorkbench tempEmailAddresses={TEST_TEMP_EMAIL_ADDRESSES} />);
  fireEvent.click(screen.getByRole("tab", { name: "批量测试" }));
}

describe("SemiAutoWorkbench batch-test tab", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads accounts and enables batch testing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accounts: [
            { id: 1, email: "a@example.com" },
            { id: 2, email: "b@example.com" },
          ],
          totalCount: 2,
          totalPages: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    openBatchTestTab();
    fireEvent.click(screen.getByRole("button", { name: "加载账号列表" }));

    expect(await screen.findByText("已加载 2 个账号")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始批量测试" })).toBeEnabled();
  });

  it("renders progress, filters and pagination after batch test completes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accounts: Array.from({ length: 11 }, (_, index) => ({
              id: index + 1,
              email: `user-${index + 1}@example.com`,
            })),
            totalCount: 11,
            totalPages: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: "job-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobId: "job-123",
            status: "completed",
            current: 11,
            total: 11,
            banned: 1,
            failed: 1,
            passed: 9,
            rows: Array.from({ length: 11 }, (_, index) => ({
              id: index + 1,
              email: `user-${index + 1}@example.com`,
              status: index === 0 ? "banned" : index === 1 ? "failed" : "passed",
              lastError: index === 1 ? "timeout" : null,
              lastTestedAt: "2026-04-05T12:00:00.000Z",
            })),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    openBatchTestTab();
    fireEvent.click(screen.getByRole("button", { name: "加载账号列表" }));
    await screen.findByText("已加载 11 个账号");

    fireEvent.click(screen.getByRole("button", { name: "开始批量测试" }));
    expect(await screen.findByText("11 / 11")).toBeInTheDocument();
    expect(screen.getByText("第 1 / 2 页")).toBeInTheDocument();
    expect(screen.getByText("user-1@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("状态筛选"), {
      target: { value: "banned" },
    });
    expect(await screen.findByText("user-1@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user-3@example.com")).not.toBeInTheDocument();
  });

  it("supports switching page size", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accounts: Array.from({ length: 11 }, (_, index) => ({
              id: index + 1,
              email: `user-${index + 1}@example.com`,
            })),
            totalCount: 11,
            totalPages: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: "job-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobId: "job-123",
            status: "completed",
            current: 11,
            total: 11,
            banned: 0,
            failed: 0,
            passed: 11,
            rows: Array.from({ length: 11 }, (_, index) => ({
              id: index + 1,
              email: `user-${index + 1}@example.com`,
              status: "passed",
              lastError: null,
              lastTestedAt: "2026-04-05T12:00:00.000Z",
            })),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    openBatchTestTab();
    fireEvent.click(screen.getByRole("button", { name: "加载账号列表" }));
    await screen.findByText("已加载 11 个账号");

    fireEvent.click(screen.getByRole("button", { name: "开始批量测试" }));
    expect(await screen.findByText("第 1 / 2 页")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("每页条数"), {
      target: { value: "20" },
    });

    expect(await screen.findByText("第 1 / 1 页")).toBeInTheDocument();
  });

  it("deletes selected rows and clears stored batch data", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accounts: [{ id: 1, email: "a@example.com" }],
            totalCount: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: "job-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobId: "job-123",
            status: "completed",
            current: 1,
            total: 1,
            banned: 1,
            failed: 0,
            passed: 0,
            rows: [
              {
                id: 1,
                email: "a@example.com",
                status: "banned",
                lastError: null,
                lastTestedAt: "2026-04-05T12:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deletedIds: [1], failed: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cleared: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    openBatchTestTab();
    fireEvent.click(screen.getByRole("button", { name: "加载账号列表" }));
    await screen.findByText("已加载 1 个账号");

    fireEvent.click(screen.getByRole("button", { name: "开始批量测试" }));
    await screen.findByText("a@example.com");

    fireEvent.click(screen.getByLabelText("选择账号 1"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));

    await waitFor(() => {
      expect(screen.queryByText("a@example.com")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "清除批量测试数据" }));
    expect(await screen.findByText("已清除当前批量测试数据")).toBeInTheDocument();
  });

  it("renders icon action buttons with labels", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accounts: [{ id: 1, email: "a@example.com" }],
            totalCount: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: "job-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobId: "job-123",
            status: "completed",
            current: 1,
            total: 1,
            banned: 1,
            failed: 0,
            passed: 0,
            rows: [
              {
                id: 1,
                email: "a@example.com",
                status: "banned",
                lastError: null,
                lastTestedAt: "2026-04-05T12:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    openBatchTestTab();
    fireEvent.click(screen.getByRole("button", { name: "加载账号列表" }));
    await screen.findByText("已加载 1 个账号");

    fireEvent.click(screen.getByRole("button", { name: "开始批量测试" }));
    await screen.findByText("a@example.com");

    expect(screen.getByRole("button", { name: "测试账号 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除账号 1" })).toBeInTheDocument();
  });
});
