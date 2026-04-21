# FrontAIReady

## 1. 一句话定位
基于 Vite + React 的 AI 前端项目，集成 Supabase 认证，已新增 GitHub OAuth 登录。

## 2. 技术栈
- **前端框架**: Vite + React
- **认证后端**: Supabase (Email/Password + GitHub OAuth)
- **代码托管**: GitHub
- **开发规范**: React best practices 约束体系
- **调试工具**: 页面拓扑校验脚本 (lint/build/type-check)

## 3. 当前进展
最近一次会话主要完成了两件事：
1. **GitHub OAuth 登录接入** — 网关接口层、Supabase 实现层、状态层、账户面板 UI 均已改造完成，类型检查通过
2. **文档全面更新** — README 和架构文档已同步最新项目状态
3. **Git 仓库初始化并推送** — 项目已推送到 GitHub（但注意：本机未配置 `git user.name/user.email`，SSH key 未检测到）
当前卡点：页面拓扑校验脚本执行失败，需要修复调试

## 4. 项目结构
```
/mnt/g/SynologyDrive/Porjects/FrontAIReady/
├── src/
│   ├── api/               # 接口层 (网关)
│   ├── auth/              # 认证相关
│   ├── components/        # UI 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── pages/             # 页面
│   ├── stores/            # 状态层
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── public/
├── AGENTS.md              # Agent 行为约束
├── SPEC.md                # 项目规格说明
├── README.md              # 项目说明 (已更新)
├── package.json
└── vite.config.ts
```

## 5. 关键决策
- GitHub OAuth vs 其他第三方登录: 选 GitHub 作为 Supabase Email/Password 的补充，因项目面向开发者群体
- 改造策略: 复用现有网关接口模式，不破坏原有 Email 登录流程，低成本扩展 GitHub 登录入口
- 文档先行的开发模式: 推送前先更新 README 和架构文档，确保项目约束可追溯

## 6. 已解决的问题
- **GitHub OAuth 登录缺失**: 在网关接口、Supabase 实现、状态层、账户面板四层同步新增 GitHub 登录入口，类型检查通过
- **Git 仓库未初始化**: 完成 Git 初始化并推送到 GitHub（注意凭据环境需补充）
- **文档与代码脱节**: 更新 README 和架构文档，同步最新项目结构、约束和技术实现

## 7. 当前卡点 / 待办
- ❌ **卡点 - 页面拓扑校验脚本失败**: 调试脚本执行报错，需要定位并修复拓扑校验逻辑
- ❌ **卡点 - Git 环境配置缺失**: 本机未配置 `git user.name` / `git user.email`，且未检测到 SSH key，后续 `git commit` 身份信息会缺失，建议补充配置
- ⏳ **待办 - GitHub OAuth 凭据配置**: 需要在 Supabase Dashboard 中配置 GitHub OAuth App 的 Client ID 和 Client Secret
- ⏳ **待办 - 构建产物验证**: lint/build/type-check 基线检查需完整跑通，确保新增代码无破坏