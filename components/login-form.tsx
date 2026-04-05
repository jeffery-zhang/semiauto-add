"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  error?: {
    message?: string;
  };
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = !username.trim() || !password || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "登录失败");
      }

      startTransition(() => {
        router.replace("/");
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" aria-label="simple auth gate" onSubmit={handleSubmit}>
      <label className="field-block" htmlFor="auth-username">
        <span className="field-label">用户名</span>
        <input
          id="auth-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="请输入共享用户名"
        />
      </label>

      <label className="field-block" htmlFor="auth-password">
        <span className="field-label">密码</span>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="请输入共享密码"
        />
      </label>

      <button type="submit" className="primary-button login-submit" disabled={isDisabled}>
        {isSubmitting ? "登录中..." : "进入工作台"}
      </button>

      <div className="feedback-stack" aria-live="polite">
        {errorMessage ? <p className="feedback error">{errorMessage}</p> : null}
      </div>
    </form>
  );
}
