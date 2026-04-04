# semiauto-add

一个单体 Next.js 内部操作台，用来半自动完成 OpenAI 账号接入流程。

它只做三件事：

- 生成授权 URL
- 从固定邮箱 `crystiano@penaldo.top` 读取最新验证码
- 解析 `http://localhost:1455...?...code=...` 回调 URL，并完成 `exchange_code -> add_account`

它明确不做这些事：

- 不跑 Playwright
- 不自动打开授权页
- 不自动填写表单
- 不自动抓 localhost 回调

## 环境要求

- Node.js 20+
- npm 10+

## 安装

```bash
npm install
```

## 配置

复制 [`.env.example`](/D:/Code/Projects/semiauto-add/.env.example) 到 `.env`，并填入实际值：

```env
BASE_ROUTER_HOST=
BASE_ROUTER_ADMIN_EMAIL=
BASE_ROUTER_ADMIN_PASSWORD=
GEN_AUTH_URL=
AUTH_URL=
LOGIN_URL=
EXCHANGE_CODE_URL=
ADD_ACCOUNT_URL=
ADMIN_TOKEN=
TEMP_EMAIL_ADMIN_PWD=
LOCAL_PROXY=
```

这些变量沿用 `auto-add` 的后端接口命名，不重新发明新名字。

## 启动

```bash
npm run dev
```

默认页面地址：

```text
http://localhost:3000
```

## 页面操作顺序

1. 输入邮箱
2. 点击“生成 URL”
3. 手动打开生成出来的授权 URL
4. 在外部页面完成操作
5. 需要时点击“获取 code”读取固定邮箱里的最新验证码
6. 把最终回调 URL 粘贴回页面
7. 点击“添加”

## 测试与校验

```bash
npm test
npm run lint
npm run build
```

## 说明

- 授权上下文保存在浏览器 `sessionStorage`
- 页面提供“清除当前 session”能力
- 重新生成 URL 或修改邮箱时，会清空旧上下文和旧结果
- 服务端不会把管理员 token、temp-email 管理密码或完整 callback code 透传到前端
