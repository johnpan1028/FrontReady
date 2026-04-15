# 全栈无码开发平台

面向非技术用户的“前端体验编排器 + AI 交付桥接层”。

## 当前进度

截至 `2026-04-15`，仓库已经具备以下主链路能力：

- Builder 主界面与多面板工作台
- `Page Board` 页面拓扑编辑与关系连线
- 主题系统、主题参考配置与导入编译
- 本地工作区 / 项目 / 草稿 / 版本化存储
- `Mock Cloud` 云端模拟接口与会话流
- `Project Bundle`、导出校验、AI handoff 与前端交付包
- 资产库、Kit Factory、社区组件接入雏形

当前最需要继续收敛的部分：

- `src/pages/BuilderPage.tsx` 仍然偏大，后续应继续拆分职责
- 真实云端网关与鉴权仍以本地模拟为主
- 编辑态 / 预览态 / 运行态还有进一步解耦空间
- 临时截图、日志、测试产物需要统一归档到 `temp/`

## 目录说明

- `src/`：主应用源码
- `src/builder/`：Builder 结构、资产、蓝图、拓扑与编辑作用域
- `src/components/`：编辑器 UI、Page Board、Kit Factory、协议面板等组件
- `src/core/`：项目文档、导出、handoff、网关协议
- `src/runtime/`：运行时页面、节点、画布渲染
- `src/theme/`：主题 schema、preset、reference profile、导入与编译
- `src/store/`：应用状态与 Builder 状态
- `server/`：本地 Mock Cloud 服务
- `scripts/`：开发辅助脚本
- `docs/`：产品、架构、边界和协议说明
- `.mock-cloud/`：本地云模拟持久化数据
- `temp/`：统一存放调试截图、日志、快照、备份和临时测试产物

## 开发命令

1. 安装依赖：`npm install`
2. 本地编辑器：`npm run dev`
3. 云模式联调：`npm run dev:cloud`
4. 类型检查：`npm run lint`
5. 临时文件归档：`npm run temp:organize`
6. 推送 GitHub 备份：`npm run backup:github`

## GitHub 备份

- `npm run backup:github` 会在当前 `HEAD` 上创建一个带时间戳的备份 tag，并把同一提交推送成一个带时间戳的备份分支到 `origin`
- 默认命名格式：
- 分支：`backup/<当前分支>-YYYYMMDD-HHmmss`
- tag：`backup-<当前分支>-YYYYMMDD-HHmmss`
- 脚本要求工作区干净；如果有未提交改动，会直接中止
- 预演可用：`npm run backup:github -- --dry-run`
- 如需自定义名字：`npm run backup:github -- --branch=backup/manual --tag=backup-manual`

## 临时文件约束

- 所有手工调试截图、日志、快照、备份、临时测试结果，统一放入 `temp/`
- 不再把这类文件直接堆在仓库根目录
- `artifacts/`、`test-results/`、`project backup/` 这类临时目录已收口到 `temp/`
- `.mock-cloud/` 属于运行态模拟数据，不按普通临时文件处理
