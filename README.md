# 凯达装修 / Kaida Renovatie & Maatwerk

凯达装修官网的 GitHub 验收仓库。目标是先在 GitHub 把前台视觉、双语体验和“傻瓜式后台”确认好，再连接 Cloudflare 自动部署。

## 当前可验收

- 中文 / 荷兰语切换
- 响应式前台
- 6 个精选工程卡片
- Before / After 拖动对比
- 微信 / WhatsApp / 报价入口 UI
- 后台：照片选择、工程类型、自由文字、短视频预览、城市/名称/月份、首页精选
- GitHub Actions 自动做静态结构检查

## 现在仍是演示模式

- 报价表单不会真正发送
- 后台“发布工程”不会真正公开内容
- 微信、WhatsApp、邮箱仍需换成凯达真实资料
- 真正持久化将在 Cloudflare 阶段用 D1（数据）+ R2（照片/短视频）实现

## 本地预览

```bash
python3 -m http.server 8765 -d public
```

打开 `http://localhost:8765/`。
后台：`http://localhost:8765/admin/`。

## Cloudflare 目标结构

项目已经带 `wrangler.toml`，Worker 名固定为 `kaida-renovatie`。最终连接 GitHub 到 Cloudflare Workers Builds 后，每次 push 可自动构建/部署；后续再增加 D1、R2 和后台鉴权。
