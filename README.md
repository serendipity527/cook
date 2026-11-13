# 开火 · KaiHuo

厨房做饭流程助手：备菜 → 逐步引导 → 倒计时 / 语音播报 → 完成。

## 环境

- Node.js 22.9+（推荐 24 LTS；本项目在本机安装于 `~/.local/node`）
- npm

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 前端 http://localhost:5173
npm run dev:server  # AI 网关 http://localhost:8787
npm test         # 单元测试
npm run build    # 类型检查 + 生产构建
npm run lint     # ESLint
```

前端开发服务器会把 `/api` 代理到 `http://localhost:8787`。

> 如果 npm 11 拦截 `esbuild` 的安装脚本导致构建失败，执行 `npm install-scripts approve esbuild`。

## 目录

```
src/        前端（屏幕、组件、运行时、数据层）
server/     AI 网关（Hono）
shared/     前后端共享 schema
tests/      测试配置
docs/       产品与技术文档
public/     PWA 图标与静态资源
```

## 文档

- [docs/TECH_PLAN.md](docs/TECH_PLAN.md) — 产品与技术方案
- [docs/TECH_STACK.md](docs/TECH_STACK.md) — 技术栈清单
- [docs/MVP.md](docs/MVP.md) — MVP 功能与实现思路
