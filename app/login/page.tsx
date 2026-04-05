import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="hero-panel login-hero">
        <p className="eyebrow">Simple Auth Gate</p>
        <h1>先登录，再进 semiauto-add。</h1>
        <p className="lede">
          这里只做一层最简共享凭据访问控制，挡住未授权访问，不改现有工作流。
        </p>
      </section>

      <section className="workbench-panel login-panel" aria-label="login gate">
        <div className="login-copy">
          <p className="section-label">共享凭据</p>
          <h2>输入用户名和密码</h2>
          <p>登录成功后会使用 cookie 维持登录态。退出登录会立即清除当前登录状态。</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
