import { NextResponse } from "next/server";
import { getBatchTestJob } from "@/lib/server/batch-test/job-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getBatchTestJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: { message: "job 不存在" } },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}
