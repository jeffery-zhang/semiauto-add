import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { getBatchTestJob } from "@/lib/server/batch-test/job-store";
import { toSafeErrorMessage } from "@/lib/server/errors";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    await requireAuthenticatedRequest(request);
    const { jobId } = await context.params;
    const job = getBatchTestJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: { message: "job 不存在" } },
        { status: 404 },
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return createUnauthorizedResponse(error.message);
    }

    return NextResponse.json(
      { error: { message: toSafeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
