import { POST } from "@/app/api/auth/logout/route";

describe("/api/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("semiauto-add-auth=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
