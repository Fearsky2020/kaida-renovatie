# 凯达装修正式发布检查表

当前 GitHub `main` 已经可以用于功能验收，但正式对客户开放前必须完成以下项目。

## 阻止正式发布的占位项

- [ ] 把网站中的测试 WhatsApp `31600000000` 换成凯达真实 Business / 联系号码。
- [ ] 把 `info@example.nl` 换成凯达真实联系邮箱。
- [x] 真实微信联系人已确认：KaiLun / 凯伦，WeChat ID `linkailunLKL5566`，地区 Rotterdam / 鹿特丹。
- [ ] 微信二维码仍需替换为真实二维码图片。
- [ ] 把当前示意工程图片替换为凯达真实工程照片，并确认客户授权网站展示。
- [ ] 替换为凯达高清 Logo 原文件（PNG / SVG / PDF），不要使用聊天截图里的低清小图。

## Cloudflare 后端

- [ ] 首次部署创建 / 绑定 D1 `DB`。
- [ ] 首次部署创建 / 绑定 R2 `MEDIA`。
- [ ] 设置长随机值 `ADMIN_API_TOKEN`。
- [ ] 用 Cloudflare Access 保护 `/admin/*`。
- [ ] 真实提交一条测试询价，确认 D1 入库、R2 照片可读、后台状态可更新。

## 邮件

- [ ] 准备并验证发件域名。
- [ ] 设置 `RESEND_API_KEY`。
- [ ] 设置 `NOTIFY_EMAIL`（老板接收新询价）。
- [ ] 设置 `FROM_EMAIL`。
- [ ] 测试老板通知邮件。
- [ ] 测试客户填写邮箱后的自动确认邮件。

## WhatsApp（可选）

- [ ] Meta WhatsApp Business Cloud API 配置完成。
- [ ] 新询价通知模板审核通过。
- [ ] 设置 `WHATSAPP_ENABLED=true` 及对应 API / Phone ID / 收件号码 / Template 参数。
- [ ] 用真实测试号码验证通知送达。

## 企业微信 / WeCom（可选）

- [ ] 创建群机器人 Webhook。
- [ ] 设置 `WECHAT_WORK_WEBHOOK_URL`。
- [ ] 验证新询价推送。

## 上线验收

- [ ] 桌面 Chrome / Edge。
- [ ] iPhone Safari / Chrome。
- [ ] Android Chrome。
- [ ] 中文 / 荷兰语切换。
- [ ] 询价表单成功 / 失败状态。
- [ ] 10 张照片限制与单张大小限制。
- [ ] 后台未授权访问被拒绝。
- [ ] 客户真实联系方式没有出现在公开页面或公开 API 中。
