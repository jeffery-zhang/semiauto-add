import { NextResponse } from "next/server";
import { clearBatchTestJob } from "@/lib/server/batch-test/job-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as { jobId?: string };
  const jobId = String(payload?.jobId ?? "").trim();

  if (!jobId) {
    return NextResponse.json(
      { error: { message: "jobId 不能为空" } },
      { status: 400 },
    );
  }

  const cleared = clearBatchTestJob(jobId);
  return NextResponse.json({ cleared });
}
