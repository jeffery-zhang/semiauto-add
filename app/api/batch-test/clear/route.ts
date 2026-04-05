import { NextResponse } from "next/server";
import {
  createUnauthorizedResponse,
  isUnauthorizedError,
  requireAuthenticatedRequest,
} from "@/lib/server/auth/guard";
import { clearBatchTestJob } from "@/lib/server/batch-test/job-store";
import { toSafeErrorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
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
