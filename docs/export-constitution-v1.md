# 用户项目导出宪法 v1

## 1. 这份文档解决什么问题

这个项目的核心，不是让用户画一张前端草图，而是让用户最终拿到：

**一套可运行、可继续开发、可稳定交给 AI Coding 和工程师接手的标准前端工程。**

所以从现在开始，编辑器里的一切资产——页面壳、卡片壳、控件、蓝图、主题、绑定、动作——都必须围绕**导出标准**来设计，而不是围绕“画布好不好看”来设计。

这份文档定义的，是用户项目的 **v1 正式交付标准**。

---

## 2. 产品本质

这个产品不是普通低代码平台，也不是纯原型工具。

它的本质应该被定义为：

**前端合同编译器（Frontend Contract Compiler）**

用户在平台里做的，不是最终代码本身，而是：

- 页面结构
- 布局关系
- 卡片边界
- 控件内容
- 动作意图
- 数据绑定意图
- 主题 tokens
- AI handoff 描述

平台最终把这些内容，编译成一套标准化前端工程，再交给 AI Coding 或工程师继续接后端、补功能、上线部署。

---

## 3. 平台本身 vs 用户导出物

必须严格区分两层：

### A. 平台本身

也就是当前这个可视化编辑器。

它可以有自己的内部实现、自己的缓存机制、自己的调试工具、自己的平台壳主题。

### B. 用户导出物

这是用户真正交付出去的东西。

它必须：

- 技术栈统一
- 目录结构统一
- 主题规则统一
- 组件规则统一
- 数据绑定规则统一
- AI handoff 规则统一

后续所有资产设计，都必须优先服务 **B 层**。

---

## 4. v1 导出标准栈

v1 正式冻结为以下组合：

- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `Tailwind CSS`
- `CSS Variables Design Tokens`
- `Zustand`
- `TanStack Query`
- `Zod`
- `fetch adapter`
- `Supabase adapter`（优先预留）

---

## 5. 为什么是这套

### `React`

用户拼出来的 page / card / control，本质上都应该有稳定组件边界，React 是最自然的承载体。

### `TypeScript`

导出后不能是一堆弱约束代码，必须让页面、卡片、绑定、动作都能被强类型理解。

### `Vite`

导出工程必须轻、快、容易跑，方便非技术用户交给 AI 或前端工程师直接接手。

### `React Router`

页面壳必须最终落成真实路由；overlay 也必须有清晰归属和状态入口。

### `Tailwind CSS + CSS Variables`

组件样式必须标准化，又要保留主题能力。  
Tailwind 负责实现效率，CSS Variables 负责主题 tokens 落地。

### `Zustand`

适合轻量前端交互状态，不需要把简单站点和内容型项目做得过重。

### `TanStack Query`

所有后端拉取、缓存、失效、刷新，不应混在 UI 状态里，必须有独立的数据层。

### `Zod`

所有表单、绑定、请求载荷、AI handoff 输入输出，都必须可校验。

### `Adapter Layer`

后端不应直接写死在页面里。  
导出工程要先有标准 `fetch adapter`，并对 `Supabase adapter` 预留一致入口。

---

## 6. 用户最终拿到的是什么

用户最终拿到的，不是：

- 截图代码
- demo 原型
- 只有静态页面的玩具
- 和平台强耦合的内部代码

用户最终拿到的，应该是：

- 一个可安装依赖的前端工程
- 一个可本地开发的前端工程
- 一个可构建上线的前端工程
- 一个能继续接后端的前端工程
- 一个 AI 可以按 ID 和 schema 精准实现的前端工程

也就是说，标准导出物至少必须满足：

- `npm install`
- `npm run dev`
- `npm run build`

---

## 7. v1 工程目录标准

```txt
project/
  public/
  src/
    app/
    pages/
    widgets/
    features/
    shared/
      ui/
      theme/
      api/
      lib/
      types/
  ai-handoff/
  .env.example
  package.json
  tsconfig.json
  vite.config.ts
```

### 目录职责

#### `src/app`

- 应用入口
- providers
- router
- theme bootstrap
- query client

#### `src/pages`

- 页面级路由组件
- 对应 page shell

#### `src/widgets`

- 卡片组件
- 用户保存的 kit
- 由 card shell 生成的可复用组件

#### `src/features`

- 页面中的交互行为
- 提交流程
- 过滤逻辑
- 弹层开关

#### `src/shared/ui`

- Button
- Input
- Select
- Divider
- Typography
- Card base

#### `src/shared/theme`

- design tokens
- theme map
- theme runtime

#### `src/shared/api`

- adapter
- query hooks
- schema
- client

#### `src/shared/lib`

- 通用工具函数

#### `src/shared/types`

- 公共类型

#### `ai-handoff`

给 AI Coding / 工程师看的协议文件集合。

---

## 8. 页面、卡片、控件的正式定义

### `Page Shell`

代表一个真实页面路由。  
它不是普通组件，而是页面边界。

### `Overlay Shell`

代表附属于某个 page 的弹层、抽屉、浮窗、局部流程视图。  
它不能脱离 owner page 独立存在。

### `Card Shell`

代表一个业务组件边界。  
用户在页面里真正组织内容、交给 AI 接后端的核心单位，就是 card。

即使视觉上：

- 透明
- 无边框
- 无 header

它也必须在结构上存在。

### `Control`

控件是卡片内部内容原子，例如：

- heading
- text
- button
- text input
- select
- checkbox
- divider

控件不能直接充当页面根结构，必须落在 card 或布局容器内部。

---

## 9. 结构约束

### 页面层

- page shell 才能成为真实路由
- overlay shell 必须绑定 owner page
- page 之间关系由系统生成，不靠人工乱连

### 卡片层

- 页面最终承载的是 card 实例
- card 必须具备稳定 ID
- card 内部元素也必须具备稳定 ID

### 控件层

- control 是内容原子
- control 不承担路由级责任
- control 的价值是承载字段、交互和绑定

---

## 10. ID 宪法

所有关键对象都必须有稳定 ID，且由系统生成。

### ID 范围

- `project_xxx`
- `page_xxx`
- `overlay_xxx`
- `card_xxx`
- `control_xxx`
- `action_xxx`
- `binding_xxx`
- `theme_xxx`

### 原则

- 用户可改名称，但不能改系统 ID
- AI coding 与工程实现一律依赖 ID，而不是依赖文案
- 导出时所有对象都必须保留完整 ID 链

这是本项目未来能稳定交给 AI 的关键前提。

---

## 11. 主题宪法

### 必须分离两套主题

#### A. 平台壳主题

只服务当前编辑器本身。

v1 只保留：

- `light`
- `dark`

#### B. 用户项目主题

只服务用户导出的前端项目。

平台壳主题切换，绝不应污染用户项目主题。

### v1 主题 tokens 范围

- color
- typography
- radius
- spacing
- shadow
- border

### 规则

- 所有用户项目组件只能消费 tokens
- 不允许把品牌色和具体视觉细节写死在组件里
- 导出时必须能输出完整 theme manifest

---

## 12. 响应式宪法

v1 先聚焦：

- `desktop-web`

不做多端混战。

### v1 原则

- 页面不出现横向滚动
- 主内容优先保持稳定
- 次级 rail 可折叠或下移
- card 内部布局受父级约束

### 响应式控制优先级

1. page shell
2. layout skeleton
3. card shell
4. inner controls

也就是说：

**先解决页面骨架，再解决卡片适配，而不是让卡片自己乱撑页面。**

---

## 13. 数据绑定宪法

所有未来需要接后端的结构，都必须预留统一绑定入口。

每个可绑定对象，至少要支持：

- `bindingId`
- `dataSource`
- `schemaRef`
- `queryKey`
- `fallback`

所有绑定必须能导出为机器可读结构，而不是只停留在 UI 文本说明。

---

## 14. 动作宪法

每个交互动作都必须具备标准描述结构。

至少要有：

- `actionId`
- `actionType`
- `target`
- `payloadSchema`
- `successState`
- `errorState`

例如按钮动作，不该只是“点一下有反应”，而应该能被导出成：

- 页面跳转
- overlay 打开
- overlay 关闭
- 表单提交
- 请求触发
- 状态切换

---

## 15. AI Handoff 宪法

导出工程必须包含 `ai-handoff/` 目录。

v1 至少应包含：

- `project.manifest.json`
- `routes.map.json`
- `component.index.json`
- `bindings.schema.json`
- `actions.schema.json`
- `implementation-notes.md`

### 作用

- 让 AI 不需要猜页面结构
- 让 AI 不需要猜组件边界
- 让 AI 不需要猜字段归属
- 让 AI 能按 ID 精准接后端和填功能

---

## 16. 两种导出模式

### A. Project Bundle

平台内部用的工程包。

作用：

- 备份
- 导入
- 覆盖
- 迁移
- 多版本保存

它遵守平台自己的 bundle 格式，不直接给最终开发使用。

### B. Frontend Deliverable

真正交付给 AI Coding / 前端工程师的正式前端工程。

作用：

- 继续开发
- 对接后端
- 补功能
- 部署上线

这才是用户真正意义上的“产物”。

---

## 17. v1 非目标

以下内容不应进入 v1：

- 多端同时导出
- 任意框架自由切换
- 原生 App 导出
- SSR/CSR 多套导出体系
- 用户自选几十种技术栈
- 超复杂 CMS/权限/多租户后台

v1 先把一套标准 Web 导出打透。

---

## 18. 对当前开发的直接约束

从这份文档生效开始：

1. 左侧资产体系必须围绕导出工程来设计
2. card shell 必须成为核心资产
3. control 必须围绕 card 服务
4. blueprint 必须输出 page topology
5. 主题系统必须只输出 tokens，不输出写死视觉
6. 所有结构必须保留稳定 ID
7. 所有数据与动作都必须可导出为 schema
8. 所有“好看但无交付意义”的资产，都不应优先开发

---

## 19. 一句话总结

这个平台最终交付的，不是页面截图，也不是低代码工程残骸。

**它交付的是一套标准化 React + TypeScript 前端工程骨架，以及一份 AI 可以直接接手实现的前端合同。**

---

## 20. 官方参考

- React: `https://react.dev/learn/start-a-new-react-project`
- Vite: `https://vite.dev/guide/`
- Tailwind CSS: `https://tailwindcss.com/docs/installation`
- React Router: `https://reactrouter.com/v6/start/overview`
- TanStack Query: `https://tanstack.com/query/latest`
- Supabase React: `https://supabase.com/docs/guides/getting-started/quickstarts/reactjs`
