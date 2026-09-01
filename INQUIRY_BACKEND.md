# 凯达装修：客户询价后台

## 已实现

- `POST /api/inquiries`：客户提交询价，文本进入 Cloudflare D1，现场照片进入 R2。
- 后台 `/admin/inquiries.html`：查看询价、联系方式、留言、照片，更新状态。
- 状态：`new` / `contacted` / `quoted` / `won` / `lost`。
- 管理接口需要 `ADMIN_API_TOKEN`，不会把客户资料公开暴露。
- 邮件：配置 Resend 后，老板收到新询价邮件；客户填写邮箱时自动收到确认邮件。
- WhatsApp：预留 WhatsApp Business Cloud API 模板通知；默认关闭。
- 微信：支持企业微信 / WeCom 群机器人 Webhook；普通个人微信不走非官方自动化。
- 表单有隐私同意框、隐藏 honeypot 反垃圾字段、照片数量与大小限制。

## Cloudflare 资源

`wrangler.toml` 使用 Workers Static Assets，并为 API 配置：

- `DB` — D1 数据库
- `MEDIA` — R2 存储桶
- `ASSETS` — 静态网站资源

当前 Wrangler 支持自动资源 provisioning；第一次部署时可创建并绑定 D1/R2。Worker 也会执行 `CREATE TABLE IF NOT EXISTS`，因此首次收到 API 请求时能自建询价表。`migrations/0001_inquiries.sql` 保留为正式迁移基线。

## 必须配置的 Secret

正式上线前至少设置：

```bash
npx wrangler secret put ADMIN_API_TOKEN
```

邮件通知再设置：

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put NOTIFY_EMAIL
npx wrangler secret put FROM_EMAIL
```

`ADMIN_URL` 可作为普通环境变量或 Secret，指向正式后台，例如：

```text
https://example.com/admin/inquiries.html
```

## WhatsApp（可选）

设置 `WHATSAPP_ENABLED=true` 后，还需要：

- `WHATSAPP_API_VERSION`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_NOTIFY_TO`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANG`

代码假设模板正文有 4 个文本参数，顺序为：客户姓名、城市、工程类型、联系方式。

## 企业微信 / WeCom（可选）

设置：

```text
WECHAT_WORK_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

有新询价时会向该群机器人推送一条简短通知。

## 后台安全

当前 API 已要求 Bearer 管理员密钥。正式上线后，再用 Cloudflare Access 保护 `/admin/*`，做到：

1. Cloudflare Access 身份登录；
2. API `ADMIN_API_TOKEN` 二次保护。

不要把任何真实 API key、管理员 token、WhatsApp token 写入 GitHub。
