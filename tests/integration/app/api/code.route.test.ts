const mockConfig = {
  mocked: true,
  tempEmailAddresses: ["selected@penaldo.top", "backup@penaldo.top"],
};

vi.mock("@/lib/server/auth/guard", () => ({
  requireAuthenticatedRequest: vi.fn().mockResolvedValue({
    username: "admin",
    issuedAt: Date.now(),
  }),
  isUnauthorizedError: vi.fn(() => false),
  createUnauthorizedResponse: vi.fn((message = "未授权访问，请先登录") =>
    Response.json({ error: { message } }, { status: 401 }),
  ),
}));
vi.mock("@/lib/server/config", () => ({
  loadRuntimeConfig: vi.fn(() => mockConfig),
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

import { POST } from "@/app/api/code/route";
import { loadRuntimeConfig } from "@/lib/server/config";
import { fetchTempEmailCodeJson } from "@/lib/server/temp-email/fetch-code";

describe("/api/code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadRuntimeConfig).mockReturnValue(mockConfig);
    vi.mocked(fetchTempEmailCodeJson).mockResolvedValue({
      code: "654321",
      subject: "验证码",
      from: "otp@tm1.openai.com",
      mailId: 8,
      createdAt: "2026-04-04 20:00:00",
      address: "selected@penaldo.top",
    });
  });

  it("uses the selected temp email address from request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        body: JSON.stringify({ address: "selected@penaldo.top" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(fetchTempEmailCodeJson).toHaveBeenCalledWith("selected@penaldo.top", {
      config: mockConfig,
    });
    expect(payload.code).toBe("654321");
    expect(payload.mailId).toBe(8);
  });

  it("returns 400 when address is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: { message: "缺少邮箱地址，请先选择临时邮箱" },
    });
    expect(fetchTempEmailCodeJson).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is json null", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        body: "null",
        headers: { "content-type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: { message: "缺少邮箱地址，请先选择临时邮箱" },
    });
    expect(fetchTempEmailCodeJson).not.toHaveBeenCalled();
  });

  it("returns 400 when address is not in the allowed list", async () => {
    const response = await POST(
      new Request("http://localhost/api/code", {
        method: "POST",
        body: JSON.stringify({ address: "unknown@penaldo.top" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: { message: "邮箱地址不在允许列表中，请重新选择" },
    });
    expect(fetchTempEmailCodeJson).not.toHaveBeenCalled();
  });
});
