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
npm run icons    # 由 public/icon.svg 重新生成 PWA 图标
```

前端开发服务器会把 `/api` 代理到 `http://localhost:8787`。

> 如果 npm 11 拦截 `esbuild` 的安装脚本导致构建失败，执行 `npm install-scripts approve esbuild`。

## AI 助手配置

```bash
cp .env.example .env.local
# 在 .env.local 填入 AI_API_KEY
npm run dev:server
```

默认使用 **OpenCode Go**：

- `AI_BASE_URL=https://opencode.ai/inference/go/openai/v1`
- `AI_MODEL=deepseek-v4.1-flash`

也可以换成 DeepSeek 官方（`https://api.deepseek.com` + `deepseek-chat`）或其他 OpenAI 兼容服务。

> **key 只写 `.env.local`**（已被 `.gitignore` 忽略）。`.env.example` 是提交到仓库的模板，只保留空值。

没有配置 key 时，做饭流程和其他功能都能正常使用；只有 AI 对话会返回 503。

## AI 厨房助手能做什么

- 闲聊、问候、一般做饭问题（不会把“你好”变成菜谱）
- 列出已有菜谱、按菜名查看
- 口述做法，生成带步骤和时长的菜谱草稿
- 在当前草稿上继续改（“改成 3 人份”“第二步再久一点”）
- 保存后直接进入菜谱详情，开始做饭

所有消息都交给模型；服务端提示词会先判断意图，问候不会生成菜谱，查/看菜谱会返回菜谱 id 并渲染卡片。

> 真机测试屏幕常亮、语音和 Service Worker 需要 HTTPS。局域网 IP 的 HTTP 地址不行，请用 Cloudflare Tunnel 或自签证书。

## 当前状态（MVP）

已实现：

- 备菜 → 逐步计时 → 响铃 / 语音播报 → 完成
- 3 个内置菜谱、屏幕常亮、中断恢复、做菜记录
- P0 交互骨架：+30 秒、下一步预告、重听、跳过撤销、返回守卫、24 小时恢复
- 手动新建菜谱、删除撤销、Toast / 底部确认面板
- AI 厨房助手：聊天、查菜谱、新建/修改菜谱、草稿内联编辑
- 本地 IndexedDB、导入导出、持久化申请
- PWA 安装引导、离线壳、PNG 图标

暂未实现（v2）：

- 云端 TTS 预生成、云同步、分享链接
- 边说边录、截图 / 链接导入、小程序迁移

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
- [docs/UI_INTERACTION.md](docs/UI_INTERACTION.md) — 界面交互设计（提案）
