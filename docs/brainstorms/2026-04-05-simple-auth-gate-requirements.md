---
date: 2026-04-05
topic: simple-auth-gate
---

# Simple Auth Gate

## Problem Frame

[`semiauto-add`](/D:/Code/Projects/semiauto-add) 已经部署到 VPS 并可通过域名访问。当前任何拿到地址的人都可以直接打开工具并操作内部管理员能力，这个风险过高。现在需要给整个站点补一层最简鉴权，目标不是做完整账号系统，而是用最低复杂度阻止未授权访问。

## Requirements

**Access Model**
- R1. 站点必须增加一个最简登录门，凭共享的 `用户名 + 密码` 才能进入工具页面。
- R2. 未登录用户访问首页时，不能直接看到现有工作台，而应先进入登录界面。
- R3. 未登录用户直接请求内部 API 时，必须返回未授权响应，而不是继续执行业务逻辑。
- R4. 登录成功后，服务端必须通过 cookie 维持登录态。
- R5. 已登录用户再次访问站点时，不应重复看到登录页，除非登录态已失效或被退出。
- R6. 页面必须提供显式退出按钮，退出后立即清除登录态并返回登录界面。

**Credentials and Secrets**
- R7. 登录门使用固定的共享凭据，不做注册、用户列表、找回密码或多角色模型。
- R8. 共享凭据必须通过环境变量配置，至少包含 `AUTH_USERNAME`、`AUTH_PASSWORD`、`AUTH_COOKIE_SECRET`。
- R9. 登录态校验所需的签名或密钥只能放在服务端，不能暴露到前端。

**Protected Surface**
- R10. 现有两个主要页签 `添加账号` 和 `批量测试` 都必须处于同一鉴权保护之下。
- R11. 当前所有内部 API 都必须统一受登录态保护，包括：
  - `auth-url`
  - `code`
  - `add`
  - `batch-test/*`
- R12. 保护逻辑必须足够集中，避免后续新增一个 API 就忘了单独补鉴权。

**User Experience**
- R13. 登录页只需要最小字段：用户名输入框、密码输入框、登录按钮、错误提示。
- R14. 登录失败时，要给出明确但简短的失败提示；不要泄露究竟是用户名错还是密码错。
- R15. 登录过程要有明确的 loading 和 disabled 状态。
- R16. 登录成功后，默认进入现有工作台首页。
- R17. 登录态失效后，如果用户继续操作页面，前端要能感知未授权并引导回登录界面。

## Success Criteria

- 未持有共享凭据的人无法直接使用站点页面和内部 API。
- 已登录用户可以像现在一样继续使用 `添加账号` 和 `批量测试`，不需要重复登录。
- 退出后再次访问页面需要重新登录。
- 这层鉴权不会演变成完整用户系统，也不会给当前项目引入明显的长期维护负担。

## Scope Boundaries

- 不做数据库用户表。
- 不做注册、忘记密码、邮件找回、验证码登录。
- 不做多用户、多角色、权限矩阵。
- 不做 OAuth 或第三方登录。
- 不要求这次实现审计日志，只做最小可用访问控制。

## Key Decisions

- 共享凭据登录门：这是当前最小、最便宜、最符合目标的方案。
- Cookie 维持登录态：比每次重新输密码更可用，也比前端只存 localStorage 更稳。
- 页面和 API 一起保护：只挡页面不挡 API 没意义。
- 单一保护层：最好集中在 middleware / 统一校验 helper，而不是每个接口手写一遍。

## Dependencies / Assumptions

- 站点当前由同一个 Next.js 应用承载页面与内部 API。
- 部署环境允许新增 3 个环境变量：`AUTH_USERNAME`、`AUTH_PASSWORD`、`AUTH_COOKIE_SECRET`。

## Outstanding Questions

### Deferred to Planning
- [Affects R12][Technical] 最适合的保护入口是 Next.js middleware、layout redirect，还是 middleware + route helper 组合。
- [Affects R4][Technical] cookie 的最小实现应采用签名 cookie 还是服务端 session token。
- [Affects R17][Technical] 前端遇到 401 时，是全局跳转登录页，还是先清 cookie 再跳转。

## Next Steps

→ /prompts:ce-plan for structured implementation planning
