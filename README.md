# 全栈无码开发平台

面向非技术用户的“前端体验编排器 + AI 交付桥接层”。

## 当前进度

截至 `2026-04-15`，仓库已经具备以下主链路能力：

- Builder 主界面、多面板工作台与壳层反馈体系
- `Page Board` 页面 / Overlay 拓扑编辑、关系连线与页面壳尺寸约束
- `ProjectDocument` / `ProjectBundle` / 导入导出 / 发布版本与快照存储
- 本地工作区、多项目隔离，以及 `local / cloud / supabase` 可替换网关骨架
- 主题系统、参考主题、主题导入编译与项目主题作用域
- Runtime 预览骨架、数据源协议、AI handoff 与前端交付包生成
- `Mock Cloud` 云端模拟接口、本地联调脚本与页面拓扑校验脚本

当前最需要继续收敛的部分：

- `src/pages/BuilderPage.tsx`、`src/store/builderStore.ts`、`src/components/PageBoard.tsx`、`src/components/ProtocolPanels.tsx` 仍然偏大，后续应继续拆分职责
- 页面拓扑与 Overlay 尺寸同步还需补一轮回归；当前 `scripts/verify-page-topology.ts` 存在断言偏差，可作为下一步调试入口
- 真实云端网关与鉴权仍以本地模拟为主
- 编辑态 / 预览态 / 运行态还有进一步解耦空间
- 临时截图、日志、测试产物需要统一归档到 `temp/`
- 自动化回归仍偏少，后续修复应优先补围绕拓扑、导出、运行态的脚本化校验

## 目录说明

- `src/`：主应用源码
- `src/builder/`：Builder 结构、资产、蓝图、拓扑、响应式与编辑作用域
- `src/components/`：编辑器 UI、Page Board、Kit Factory、协议面板与 builder page 子组件
- `src/core/`：项目文档、导出、handoff、版本、网关与协议编排
- `src/data/`：运行态数据请求、模板变量解析与数据源执行
- `src/hooks/`：编辑器与壳层复用 hooks
- `src/lib/`：应用内部基础能力，如 IndexedDB 持久化
- `src/pages/`：页面级编排入口
- `src/runtime/`：运行时页面、节点、画布渲染
- `src/schema/`：项目协议、页面结构、动作与绑定 schema
- `src/theme/`：主题 schema、preset、reference profile、导入与编译
- `src/store/`：应用状态与 Builder 状态
- `src/utils/`：轻量通用工具
- `components/`、`lib/`：根目录兼容层，主要预留给 shadcn CLI / alias 生成物，非业务主目录
- `server/`：本地 Mock Cloud 服务
- `scripts/`：开发辅助脚本
- `docs/`：产品、架构、边界和协议说明
- `.mock-cloud/`：本地云模拟持久化数据
- `temp/`：统一存放调试截图、日志、快照、备份和临时测试产物

## 开发约束（目录整理后）

- 页面级编排继续收口在 `src/pages/`；页面专属拆分优先放到 `src/components/builder-page/`，不要继续把新逻辑堆回 `src/pages/BuilderPage.tsx`
- 页面拓扑、Overlay 排布、viewport 尺寸与 stage 边界统一收口到 `src/builder/pageTopology.ts`、`src/builder/responsive.ts`、`src/components/WebStageFrame.tsx`，不要重复实现第二套计算
- 协议定义只放 `src/schema/`；项目文档转换、导出、handoff、网关编排放 `src/core/`；`src/store/` 负责状态编排，不再反向吞并协议细节
- 运行态 / 预览态渲染逻辑继续收口在 `src/runtime/`；项目主题只进入 `src/theme/`，平台壳主题继续走 `src/theme/shellTheme.ts`
- 数据请求执行统一走 `src/data/`；工作区 / 项目 / 鉴权网关统一走 `src/core/*WorkspaceGateway.ts`，不要把持久化和运行态请求混写
- 根目录 `components/`、`lib/` 仅在明确接入 shadcn 生成物时使用，默认业务代码仍放 `src/` 体系
- 所有临时日志、截图、备份、测试产物统一进入 `temp/`，不要重新把临时目录散落到仓库根部
- 发现新的 debug、开始修复、修复完成，这三个节点都要同步更新 `docs/debug-record.md`；同一问题持续维护同一条记录
- Kit Studio 右侧栏、拖拽、布局、控件显示类修复必须跑固定浏览器回测：`npm run verify:kit-inspector`；不要再用临时浏览器方法替代

## 下一步修复与调试建议

- 先处理 `scripts/verify-page-topology.ts` 当前暴露的 Overlay 尺寸同步偏差，再推进页面拓扑相关修复
- 以 `BuilderPage`、`builderStore`、`PageBoard`、`ProtocolPanels` 为第一批拆分对象，降低后续修复的联动成本
- 每完成一轮拓扑、导出或运行态修复，都补最小回归脚本，优先保证 Page Board、版本切换、导出包与 Runtime 预览不回退
- 低优先级或暂缓处理的调试项统一记录在 `docs/debug-record.md`

## 开发命令

1. 安装依赖：`npm install`
2. 本地编辑器：`npm run dev`
3. 云模式联调：`npm run dev:cloud`
4. Kit Studio 固定浏览器回测：`npm run verify:kit-inspector`
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
