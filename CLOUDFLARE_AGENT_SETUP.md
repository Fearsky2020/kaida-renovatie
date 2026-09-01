# Cloudflare Agent Setup

依据 Cloudflare 2026 Agent Setup 官方文档：

- 推荐让 OpenAI Codex 安装 Cloudflare plugin，它会提供 Cloudflare Skills 和 MCP servers。
- Cloudflare API Code Mode MCP: `https://mcp.cloudflare.com/mcp`
- Docs MCP: `https://docs.mcp.cloudflare.com/mcp`
- Bindings MCP: `https://bindings.mcp.cloudflare.com/mcp`
- Builds MCP: `https://builds.mcp.cloudflare.com/mcp`
- Observability MCP: `https://observability.mcp.cloudflare.com/mcp`
- 第一次调用 Cloudflare 工具时通过浏览器 OAuth 授权。
- Wrangler 用于本地开发、部署和 D1/R2 等产品命令。

当前 ChatGPT 会话没有暴露 Cloudflare MCP/OAuth 工具，因此这里仅把项目按 Cloudflare 规范准备好；真正连接账号时完成一次 OAuth 即可。
