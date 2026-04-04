"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearWorkbenchState,
  readWorkbenchState,
  writeWorkbenchState,
  type AddSuccessSummary,
  type AuthSessionContext,
} from "@/lib/client/auth-session";
import { buildRandomProfileName } from "@/lib/shared/profile-data";

interface CodeResult {
  code: string;
  subject: string;
  from: string;
  mailId: string | number | null;
  createdAt: string | null;
}

interface ActionFeedback {
  kind: "success" | "error";
  message: string;
}

interface AddResponse {
  email: string;
  status: string;
  isActive: boolean;
  summary?: AddSuccessSummary;
}

interface BatchAccount {
  id: number;
  email: string;
}

type BatchStatus = "pending" | "running" | "banned" | "passed" | "failed";
type BatchFilter = "all" | "banned" | "passed" | "failed";
type TabKey = "add-account" | "batch-test";

interface BatchResultRow extends BatchAccount {
  status: BatchStatus;
  lastError: string | null;
  lastTestedAt: string | null;
}

interface BatchStatusPayload {
  jobId: string;
  status: "idle" | "running" | "completed";
  current: number;
  total: number;
  banned: number;
  failed: number;
  passed: number;
  rows: BatchResultRow[];
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="copy-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function statusLabel(status: BatchStatus) {
  switch (status) {
    case "banned":
      return "已封禁";
    case "passed":
      return "测试成功";
    case "failed":
      return "测试失败";
    case "running":
      return "测试中";
    default:
      return "待测试";
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export function SemiAutoWorkbench() {
  const [activeTab, setActiveTab] = useState<TabKey>("add-account");
  const [email, setEmail] = useState("");
  const [authContext, setAuthContext] = useState<AuthSessionContext | null>(null);
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [successSummary, setSuccessSummary] = useState<AddSuccessSummary | null>(null);
  const [generateFeedback, setGenerateFeedback] = useState<ActionFeedback | null>(null);
  const [codeFeedback, setCodeFeedback] = useState<ActionFeedback | null>(null);
  const [addFeedback, setAddFeedback] = useState<ActionFeedback | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [batchAccounts, setBatchAccounts] = useState<BatchAccount[]>([]);
  const [loadedAccountCount, setLoadedAccountCount] = useState(0);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [allTestedAccounts, setAllTestedAccounts] = useState<BatchResultRow[]>([]);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<BatchFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isRunningBatchTest, setIsRunningBatchTest] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<ActionFeedback | null>(null);

  const pageSize = 10;

  useEffect(() => {
    const storedState = readWorkbenchState();
    if (storedState.authContext) {
      setAuthContext(storedState.authContext);
      setEmail(storedState.authContext.email);
    }
    if (storedState.successSummary) {
      setSuccessSummary(storedState.successSummary);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!authContext && !successSummary) {
      clearWorkbenchState();
      return;
    }

    writeWorkbenchState({ authContext, successSummary });
  }, [authContext, hasHydrated, successSummary]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const canAdd = useMemo(
    () => Boolean(authContext && callbackUrl.trim()) && !isAdding,
    [authContext, callbackUrl, isAdding],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return allTestedAccounts;
    }

    return allTestedAccounts.filter((row) => row.status === statusFilter);
  }, [allTestedAccounts, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const visibleRowIds = paginatedRows.map((row) => row.id);
  const allVisibleSelected =
    visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedIds.includes(id));

  function resetFlowState(nextEmail: string) {
    setAuthContext(null);
    setCodeResult(null);
    setCallbackUrl("");
    setGenerateFeedback(null);
    setCodeFeedback(null);
    setAddFeedback(null);
    setSuccessSummary(null);
    setCopiedToken(null);
    clearWorkbenchState();
    setEmail(nextEmail);
  }

  function resetBatchData() {
    setBatchJobId(null);
    setAllTestedAccounts([]);
    setCurrent(0);
    setTotal(0);
    setFailedCount(0);
    setPassedCount(0);
    setBannedCount(0);
    setSelectedIds([]);
    setStatusFilter("all");
    setPage(1);
    setBatchFeedback(null);
  }

  function applyBatchStatus(payload: BatchStatusPayload) {
    setBatchJobId(payload.jobId);
    setCurrent(payload.current);
    setTotal(payload.total);
    setFailedCount(payload.failed);
    setPassedCount(payload.passed);
    setBannedCount(payload.banned);
    setAllTestedAccounts(payload.rows);
  }

  function removeDeletedRows(deletedIds: number[]) {
    if (deletedIds.length === 0) {
      return;
    }

    setAllTestedAccounts((currentRows) =>
      currentRows.filter((row) => !deletedIds.includes(row.id)),
    );
    setBatchAccounts((currentAccounts) =>
      currentAccounts.filter((row) => !deletedIds.includes(row.id)),
    );
    setSelectedIds((currentIds) => currentIds.filter((id) => !deletedIds.includes(id)));
  }

  async function copyText(value: string, token: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(token);
      window.setTimeout(() => {
        setCopiedToken((currentToken) => (currentToken === token ? null : currentToken));
      }, 1600);
    } catch {
      setCopiedToken(null);
    }
  }

  async function handleGenerateUrl() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setGenerateFeedback({ kind: "error", message: "请先输入邮箱" });
      return;
    }

    setIsGenerating(true);
    setGenerateFeedback(null);
    setAddFeedback(null);

    try {
      const response = await fetch("/api/auth-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "生成 URL 失败");
      }

      setAuthContext({
        email: payload.email,
        authUrl: payload.authUrl,
        sessionId: payload.sessionId,
        state: payload.state,
        generatedName: buildRandomProfileName(),
      });
      setCodeResult(null);
      setCallbackUrl("");
      setSuccessSummary(null);
      setGenerateFeedback({ kind: "success", message: "授权 URL 已生成" });
    } catch (error) {
      setGenerateFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "生成 URL 失败",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFetchCode() {
    setIsFetchingCode(true);
    setCodeFeedback(null);

    try {
      const response = await fetch("/api/code", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "获取验证码失败");
      }

      setCodeResult(payload);
      setCodeFeedback({ kind: "success", message: "已读取最新验证码" });
    } catch (error) {
      setCodeFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "获取验证码失败",
      });
    } finally {
      setIsFetchingCode(false);
    }
  }

  async function handleAddAccount() {
    if (!authContext) {
      setAddFeedback({ kind: "error", message: "请先生成授权 URL" });
      return;
    }

    setIsAdding(true);
    setAddFeedback(null);

    try {
      const response = await fetch("/api/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authContext.email,
          sessionId: authContext.sessionId,
          state: authContext.state,
          callbackUrl: callbackUrl.trim(),
        }),
      });
      const payload = (await response.json()) as AddResponse & { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "添加账号失败");
      }

      setSuccessSummary(
        payload.summary ?? {
          email: payload.email,
          status: payload.status,
          isActive: payload.isActive,
        },
      );
      setAddFeedback({ kind: "success", message: "添加成功" });
    } catch (error) {
      setAddFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "添加账号失败",
      });
    } finally {
      setIsAdding(false);
    }
  }

  async function pollBatchJob(jobId: string) {
    setIsRunningBatchTest(true);

    try {
      for (;;) {
        const response = await fetch(`/api/batch-test/status/${jobId}`);
        const payload = (await response.json()) as
          | BatchStatusPayload
          | { error?: { message?: string } };

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "读取批量测试状态失败");
        }

        applyBatchStatus(payload as BatchStatusPayload);

        if ((payload as BatchStatusPayload).status === "completed") {
          setBatchFeedback({ kind: "success", message: "批量测试已完成" });
          break;
        }

        await sleep(800);
      }
    } finally {
      setIsRunningBatchTest(false);
    }
  }

  async function loadBatchAccounts() {
    setIsLoadingAccounts(true);
    setBatchFeedback(null);

    try {
      const response = await fetch("/api/batch-test/accounts", { method: "POST" });
      const payload = (await response.json()) as
        | { accounts: BatchAccount[]; totalCount: number }
        | { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "加载账号列表失败");
      }

      setBatchAccounts((payload as { accounts: BatchAccount[] }).accounts);
      setLoadedAccountCount((payload as { totalCount: number }).totalCount);
      setBatchFeedback({
        kind: "success",
        message: `已加载 ${String((payload as { totalCount: number }).totalCount)} 个账号`,
      });
    } catch (error) {
      setBatchFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "加载账号列表失败",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  async function startBatchRun(accountIds: number[], jobId?: string) {
    if (accountIds.length === 0) {
      setBatchFeedback({ kind: "error", message: "没有可测试的账号" });
      return;
    }

    setBatchFeedback(null);

    const response = await fetch("/api/batch-test/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountIds, jobId }),
    });
    const payload = (await response.json()) as { jobId?: string; error?: { message?: string } };

    if (!response.ok || !payload.jobId) {
      throw new Error(payload?.error?.message ?? "启动批量测试失败");
    }

    await pollBatchJob(payload.jobId);
  }

  async function handleStartBatchTest() {
    try {
      await startBatchRun(
        batchAccounts.map((account) => account.id),
        batchJobId ?? undefined,
      );
    } catch (error) {
      setBatchFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "启动批量测试失败",
      });
      setIsRunningBatchTest(false);
    }
  }

  async function handleRetest(accountId: number) {
    try {
      await startBatchRun([accountId], batchJobId ?? undefined);
    } catch (error) {
      setBatchFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "重新测试失败",
      });
      setIsRunningBatchTest(false);
    }
  }

  async function handleDelete(accountIds: number[]) {
    if (!batchJobId) {
      setBatchFeedback({ kind: "error", message: "当前没有可删除的测试结果" });
      return;
    }

    const confirmMessage =
      accountIds.length === 1 ? "确认删除这个账号吗？" : `确认批量删除 ${accountIds.length} 个账号吗？`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeletingBatch(true);

    try {
      const response = await fetch("/api/batch-test/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: batchJobId,
          accountIds,
        }),
      });
      const payload = (await response.json()) as
        | { deletedIds: number[]; failed: Array<{ id: number; message: string }> }
        | { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "删除账号失败");
      }

      const { deletedIds, failed } = payload as {
        deletedIds: number[];
        failed: Array<{ id: number; message: string }>;
      };

      removeDeletedRows(deletedIds);

      if (failed.length > 0) {
        setBatchFeedback({
          kind: "error",
          message: `已删除 ${deletedIds.length} 个账号，${failed.length} 个删除失败`,
        });
      } else {
        setBatchFeedback({
          kind: "success",
          message: `已删除 ${deletedIds.length} 个账号`,
        });
      }
    } catch (error) {
      setBatchFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "删除账号失败",
      });
    } finally {
      setIsDeletingBatch(false);
    }
  }

  async function handleClearBatchData() {
    if (batchJobId) {
      try {
        await fetch("/api/batch-test/clear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId: batchJobId }),
        });
      } catch {
        // 清理失败也允许前端先清空本地状态
      }
    }

    resetBatchData();
    setBatchFeedback({ kind: "success", message: "已清除当前批量测试数据" });
  }

  function toggleSelected(accountId: number) {
    setSelectedIds((currentIds) =>
      currentIds.includes(accountId)
        ? currentIds.filter((id) => id !== accountId)
        : [...currentIds, accountId],
    );
  }

  function toggleSelectedOnPage() {
    if (allVisibleSelected) {
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !visibleRowIds.includes(id)),
      );
      return;
    }

    setSelectedIds((currentIds) => Array.from(new Set([...currentIds, ...visibleRowIds])));
  }

  return (
    <main className="workbench-shell">
      <section className="workbench-panel" aria-label="semi-auto workbench">
        <div className="tab-row" role="tablist" aria-label="workbench tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "add-account"}
            className={`tab-button ${activeTab === "add-account" ? "active" : ""}`}
            onClick={() => setActiveTab("add-account")}
          >
            添加账号
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "batch-test"}
            className={`tab-button ${activeTab === "batch-test" ? "active" : ""}`}
            onClick={() => setActiveTab("batch-test")}
          >
            批量测试
          </button>
        </div>

        {activeTab === "add-account" ? (
          <>
            <label className="field-block" htmlFor="email-input">
              <span className="field-label">邮箱</span>
              <div className="input-with-action">
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const nextEmail = event.target.value;
                    if (authContext && nextEmail !== authContext.email) {
                      resetFlowState(nextEmail);
                      return;
                    }
                    setEmail(nextEmail);
                  }}
                  placeholder="your-email@example.com"
                />
                {email.trim() ? (
                  <button
                    type="button"
                    className="copy-icon-button"
                    aria-label={copiedToken === "email" ? "已复制邮箱" : "复制邮箱"}
                    title={copiedToken === "email" ? "已复制邮箱" : "复制邮箱"}
                    onClick={() => copyText(email.trim(), "email")}
                  >
                    <CopyIcon />
                  </button>
                ) : null}
              </div>
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={handleGenerateUrl}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating URL..." : "生成 URL"}
            </button>

            {authContext ? (
              <section className="result-panel" aria-label="generated auth url">
                <div>
                  <p className="section-label">授权 URL</p>
                  <div className="copy-row copy-row-stretch">
                    <a href={authContext.authUrl} target="_blank" rel="noreferrer">
                      {authContext.authUrl}
                    </a>
                    <button
                      type="button"
                      className="copy-icon-button"
                      aria-label={copiedToken === "auth-url" ? "已复制授权 URL" : "复制授权 URL"}
                      title={copiedToken === "auth-url" ? "已复制授权 URL" : "复制授权 URL"}
                      onClick={() => copyText(authContext.authUrl, "auth-url")}
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="section-label">随机姓名</p>
                  <div className="copy-row">
                    <strong className="text-chip">{authContext.generatedName}</strong>
                    <button
                      type="button"
                      className="copy-icon-button"
                      aria-label={
                        copiedToken === "generated-name" ? "已复制随机姓名" : "复制随机姓名"
                      }
                      title={
                        copiedToken === "generated-name" ? "已复制随机姓名" : "复制随机姓名"
                      }
                      onClick={() => copyText(authContext.generatedName, "generated-name")}
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleGenerateUrl}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Regenerating..." : "重新生成"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => resetFlowState(email)}
                  >
                    清除当前 session
                  </button>
                </div>
              </section>
            ) : null}

            <button
              type="button"
              className="primary-button"
              onClick={handleFetchCode}
              disabled={isFetchingCode}
            >
              {isFetchingCode ? "Fetching code..." : "获取 code"}
            </button>

            {codeResult ? (
              <section className="result-panel" aria-label="latest code result">
                <p className="section-label">最新验证码</p>
                <div className="copy-row">
                  <strong className="code-chip">{codeResult.code}</strong>
                  <button
                    type="button"
                    className="copy-icon-button"
                    aria-label={copiedToken === "latest-code" ? "已复制验证码" : "复制验证码"}
                    title={copiedToken === "latest-code" ? "已复制验证码" : "复制验证码"}
                    onClick={() => copyText(codeResult.code, "latest-code")}
                  >
                    <CopyIcon />
                  </button>
                </div>
                <dl className="meta-grid">
                  <div>
                    <dt>Subject</dt>
                    <dd>{codeResult.subject || "-"}</dd>
                  </div>
                  <div>
                    <dt>From</dt>
                    <dd>{codeResult.from || "-"}</dd>
                  </div>
                  <div>
                    <dt>Mail ID</dt>
                    <dd>{String(codeResult.mailId ?? "-")}</dd>
                  </div>
                  <div>
                    <dt>Created At</dt>
                    <dd>{codeResult.createdAt || "-"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <label className="field-block" htmlFor="callback-url-input">
              <span className="field-label">回调 URL</span>
              <textarea
                id="callback-url-input"
                name="callback-url"
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
                placeholder="http://localhost:1455/auth/callback?code=..."
                rows={4}
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={handleAddAccount}
              disabled={!canAdd}
            >
              {isAdding ? "Adding..." : "添加"}
            </button>

            <div className="feedback-stack" aria-live="polite">
              {generateFeedback ? (
                <p className={`feedback ${generateFeedback.kind}`}>{generateFeedback.message}</p>
              ) : null}
              {codeFeedback ? (
                <p className={`feedback ${codeFeedback.kind}`}>{codeFeedback.message}</p>
              ) : null}
              {addFeedback ? (
                <p className={`feedback ${addFeedback.kind}`}>{addFeedback.message}</p>
              ) : null}
            </div>

            {successSummary ? (
              <section className="success-panel" aria-label="add account success summary">
                <p className="section-label">最近一次成功结果</p>
                <p>
                  <strong>{successSummary.email}</strong>
                </p>
                <p>状态：{successSummary.status}</p>
                <p>{successSummary.isActive ? "当前账号已激活" : "当前账号未激活"}</p>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <div className="batch-toolbar">
              <button
                type="button"
                className="primary-button"
                onClick={loadBatchAccounts}
                disabled={isLoadingAccounts}
              >
                {isLoadingAccounts ? "Loading..." : "加载账号列表"}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleStartBatchTest}
                disabled={isRunningBatchTest || batchAccounts.length === 0}
              >
                {isRunningBatchTest ? "Testing..." : "开始批量测试"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleDelete(selectedIds)}
                disabled={isDeletingBatch || selectedIds.length === 0}
              >
                {isDeletingBatch ? "Deleting..." : "批量删除"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleClearBatchData}
                disabled={!batchJobId && allTestedAccounts.length === 0}
              >
                清除批量测试数据
              </button>
            </div>

            <section className="batch-summary" aria-label="batch test summary">
              <div className="summary-chip">
                <span>已加载账号</span>
                <strong>{loadedAccountCount}</strong>
              </div>
              <div className="summary-chip">
                <span>当前 / 总计</span>
                <strong>
                  {current} / {total}
                </strong>
              </div>
              <div className="summary-chip">
                <span>已封禁</span>
                <strong>{bannedCount}</strong>
              </div>
              <div className="summary-chip">
                <span>测试成功</span>
                <strong>{passedCount}</strong>
              </div>
              <div className="summary-chip">
                <span>测试失败</span>
                <strong>{failedCount}</strong>
              </div>
            </section>

            <div className="batch-filter-row">
              <label className="field-block" htmlFor="status-filter">
                <span className="field-label">状态筛选</span>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as BatchFilter)}
                >
                  <option value="all">全部</option>
                  <option value="banned">已封禁</option>
                  <option value="passed">测试成功</option>
                  <option value="failed">测试失败</option>
                </select>
              </label>
            </div>

            <div className="feedback-stack" aria-live="polite">
              {batchFeedback ? (
                <p className={`feedback ${batchFeedback.kind}`}>{batchFeedback.message}</p>
              ) : null}
            </div>

            {allTestedAccounts.length > 0 ? (
              <>
                <div className="batch-table-wrap">
                  <table className="batch-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            aria-label="选择当前页全部账号"
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectedOnPage}
                          />
                        </th>
                        <th>ID</th>
                        <th>账号</th>
                        <th>状态</th>
                        <th>最近测试</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              aria-label={`选择账号 ${row.id}`}
                              type="checkbox"
                              checked={selectedIds.includes(row.id)}
                              onChange={() => toggleSelected(row.id)}
                            />
                          </td>
                          <td>{row.id}</td>
                          <td>{row.email}</td>
                          <td>
                            <span className={`status-badge ${row.status}`}>
                              {statusLabel(row.status)}
                            </span>
                            {row.lastError ? (
                              <span className="status-note">{row.lastError}</span>
                            ) : null}
                          </td>
                          <td>{row.lastTestedAt ?? "-"}</td>
                          <td>
                            <div className="table-action-row">
                              <button
                                type="button"
                                className="secondary-button compact"
                                onClick={() => handleRetest(row.id)}
                                disabled={isRunningBatchTest}
                              >
                                测试
                              </button>
                              <button
                                type="button"
                                className="ghost-button compact"
                                onClick={() => handleDelete([row.id])}
                                disabled={isDeletingBatch}
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-row">
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </button>
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    type="button"
                    className="ghost-button compact"
                    onClick={() =>
                      setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                    }
                    disabled={page >= totalPages}
                  >
                    下一页
                  </button>
                </div>
              </>
            ) : (
              <section className="placeholder-panel" aria-label="batch test placeholder">
                <p className="section-label">批量测试</p>
                <h2>批量测试页面</h2>
                <p>先加载账号列表，再开始批量测试。</p>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
