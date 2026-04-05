# semiauto-add

一个单体 Next.js 内部操作台，用来半自动完成 OpenAI 账号接入流程。

它现在有两个工作页签：

- `添加账号`
- `批量测试`

`添加账号` 负责这三件事：

- 生成授权 URL
- 从固定邮箱 `crystiano@penaldo.top` 读取最新验证码
- 解析 `http://localhost:1455...?...code=...` 回调 URL，并完成 `exchange_code -> add_account`

`批量测试` 负责这些事：

- 拉取全部账号列表
- 用异步队列批量测试账号
- 统计 `当前/总计`、`已封禁`、`测试成功`、`测试失败`
- 渲染全部已测账号表格，并支持状态筛选和前端分页
- 支持单行重测、单删、批量删
- 支持主动清除当前批量测试结果

它明确不做这些事：

- 不跑 Playwright
- 不自动打开授权页
- 不自动填写表单
- 不自动抓 localhost 回调

## 登录门

- 站点默认先显示共享账号密码登录页
- 登录成功后通过 cookie 保持登录态，并进入工作台首页
- 顶部提供退出按钮；退出后会立即清掉登录态并回到登录页
- 如果登录态失效，前端请求收到 `401` 后会回到登录页

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
AUTH_USERNAME=
AUTH_PASSWORD=
AUTH_COOKIE_SECRET=
ADMIN_TOKEN=
TEMP_EMAIL_ADMIN_PWD=
LOCAL_PROXY=
```

这些变量沿用 `auto-add` 的后端接口命名，不重新发明新名字。

新增的 3 个登录门变量分别负责：

- `AUTH_USERNAME`: 共享登录用户名
- `AUTH_PASSWORD`: 共享登录密码
- `AUTH_COOKIE_SECRET`: 服务端签名 cookie 使用的密钥

## 启动

```bash
npm run dev
```

默认页面地址：

```text
http://localhost:3000
```

未登录时会先进入：

```text
http://localhost:3000/login
```

## 页面操作顺序

### 添加账号

1. 输入邮箱
2. 点击“生成 URL”
3. 手动打开生成出来的授权 URL
4. 在外部页面完成操作
5. 需要时点击“获取 code”读取固定邮箱里的最新验证码
6. 把最终回调 URL 粘贴回页面
7. 点击“添加”

### 批量测试

1. 切换到 `批量测试`
2. 点击“加载账号列表”
3. 点击“开始批量测试”
4. 观察 `当前/总计` 和分类统计
5. 用状态筛选和分页查看结果
6. 需要时对单个账号手动重测
7. 需要时执行单删或批量删
8. 需要时点击“清除批量测试数据”

## 测试与校验

```bash
npm test
npm run lint
npm run build
```

## 说明

- 授权上下文保存在浏览器 `sessionStorage`
- 页面提供“清除当前 session”能力
- 页面提供显式退出能力
- 重新生成 URL 或修改邮箱时，会清空旧上下文和旧结果
- 服务端不会把管理员 token、temp-email 管理密码或完整 callback code 透传到前端
- 服务端不会把共享登录密码或 cookie 签名密钥暴露到前端
- 批量测试结果默认保留在当前服务生命周期内，直到用户主动清理
