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

type TabKey = "add-account" | "batch-test";

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

  const canAdd = useMemo(
    () => Boolean(authContext && callbackUrl.trim()) && !isAdding,
    [authContext, callbackUrl, isAdding],
  );

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

  async function copyText(value: string, token: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(token);
      window.setTimeout(() => {
        setCopiedToken((current) => (current === token ? null : current));
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
          <section className="placeholder-panel" aria-label="batch test placeholder">
            <p className="section-label">批量测试</p>
            <h2>批量测试页面</h2>
            <p>先留空，后续功能从这里继续扩展。</p>
          </section>
        )}
      </section>
    </main>
  );
}
