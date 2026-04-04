export type BatchTestAccountStatus = "pending" | "running" | "banned" | "passed" | "failed";

export interface BatchTestAccount {
  id: number;
  email: string;
}

export interface BatchTestResultRow extends BatchTestAccount {
  status: BatchTestAccountStatus;
  lastError: string | null;
  lastTestedAt: string | null;
}

export interface BatchTestJobState {
  jobId: string;
  status: "idle" | "running" | "completed";
  current: number;
  total: number;
  banned: number;
  failed: number;
  passed: number;
  rows: BatchTestResultRow[];
}
