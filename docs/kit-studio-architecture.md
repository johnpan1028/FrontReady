# Kit Studio Architecture v1

## 0. 关联文档

- `docs/kit-contract-v1.md`
- `docs/component-procurement-v1.md`
- `docs/component-layer-foundation-v1.md`
- `docs/p2-pattern-catalog-v1.md`
- `docs/inspector-group-architecture-v1.md`
- `docs/theme-system.md`
- `docs/export-constitution-v1.md`

---

## 1. 目标

`Kit Studio` 不是普通的可视化画布，而是平台内部的 **Card 生产工作台**。

它当前阶段的核心任务只有三件事：

1. 建立一套稳定的 `Control -> Card -> Kit` 生产底座
2. 为平台沉淀首批内置 `Controls` 与 `Cards`
3. 为后续从 `shadcn` 等外部来源引入组件，提供统一的进口、拆解、适配与落库路径

当前阶段不追求“大量接入组件”。

当前阶段首先要把以下三件事定清楚：

- `Card` 和 `Control` 的完整属性模型
- 右侧属性面板的结构与作用域
- 外来组件适配进系统后的代码框架与主题变量体系

只有这三件事先稳定，后续的批量组件进口、蓝图生产、导出、AI handoff 才不会失控。

---

## 2. 产品定位

### 2.1 Kit Studio 的定位

`Kit Studio` 是平台内部的 **内容资产工厂**。

它的职责不是做最终页面编排，而是生产可复用的前端最小活动单元：

- `Control`：卡片内部最小可编辑控件
- `Card`：面向用户复用的最小业务单元
- `Kit`：由多个 card 组成的更高阶结构资产

### 2.2 进口适配模块的定位

从 `shadcn`、`react-day-picker`、`recharts` 等来源引入组件的能力，应被定义成一个 **独立模块**，而不是散落在编辑器里的临时逻辑。

这个模块本质上是：

**外部组件源码 → 平台标准控件资产** 的适配服务。

当前阶段它服务内部开发：

- 帮助团队快速形成第一批基础 controls
- 支撑 card 母版生产
- 支撑蓝图生成与产品调试

后续阶段可以升级成面向用户的增值服务：

- 用户导入第三方组件
- 平台自动完成拆壳、映射、适配
- 输出可编辑、可绑定、可导出的 card/control 资产

---

## 3. 名词统一

当前仓库里仍大量使用 `widget` 作为运行时命名。

为避免后续产品语义混乱，v1 统一采用以下定义：

### 3.1 `Control`

卡片内部最小可编辑单位。

例如：

- `heading`
- `text`
- `button`
- `text_input`
- `select`
- `divider`

### 3.2 `Card`

面向用户直接复用的最小业务单元。

例如：

- KPI 卡
- 趋势卡
- Calendar 卡
- 登录卡
- 作者信息卡

### 3.3 `Kit`

由多个 `Card` 组合成的可复用区域母版。

例如：

- 博客首页 Hero 区
- 侧栏信息栈
- 文章头部区块

### 3.4 `Shell`

结构壳，不代表业务语义，只承担边界、容器和 slot 约束。

例如：

- `page shell`
- `card shell`
- `panel`
- `canvas / slot container`

### 3.5 `Widget`

`Widget` 只保留为当前工程实现里的 **兼容命名**。

在产品文档和后续架构中：

- `WidgetType` ≈ 运行时节点类型别名
- 用户看到和后续设计说明中，统一使用 `Control / Card / Kit`

### 3.6 `Adapter`

外来组件适配模块。

职责包括：

- 进口源码
- 结构拆解
- slot 识别
- 属性建模
- 主题变量映射
- 右侧面板生成
- 落入平台控制语法

---

## 4. 当前仓库的过渡映射

当前仓库中的 `WidgetType` 可以先按下表理解：

### 4.1 Control 类

- `heading`
- `text`
- `button`
- `icon_button`
- `divider`
- `text_input`
- `number_input`
- `textarea`
- `select`
- `checkbox`
- `radio`

### 4.2 Card 类

- `stat`
- `chart`
- `calendar`
- `shadcn_login_card`

### 4.3 Shell / Slot 类

- `panel`
- `canvas`

因此，当前 `src/builder/widgetConfig.ts` 和 `src/builder/registry.tsx` 可以继续作为兼容层存在，但后续要逐步迁移为：

- `ControlDefinition`
- `CardDefinition`
- `InspectorSchema`
- `AdapterSchema`

驱动，而不是继续靠大体积 `if / switch` 扩张。

---

## 5. Kit Studio 的目标工作台结构

Kit Studio 维持三栏，但语义必须更清晰：

### 左栏：Asset Intake + Library

分为两个主要入口：

1. `Cards`
   - 平台内置 card
   - 已发布/已适配的 card 资产
2. `Controls`
   - 基础文本、动作、表单、数据展示控件
   - 结构性控件与 slot 壳

后续可增加内部入口：

3. `Imports`
   - 进口会话
   - 待适配外来组件
   - 实验性资产

### 中栏：Assembly Board

中间不是“任意画布”，而是 **Card 组装底板**。

主要职责：

- 组装 card
- 调整 slot
- 排布 control
- 查看真实缩略渲染
- 校验 card 在主题下的表现

### 右栏：Inspector / Contract Panel

右侧不是单纯属性面板，而是 **结构 + 样式 + 数据 + 动作 + 代码映射** 的统一检查面板。

它既负责编辑，也负责定义 card/control 的可导出契约。

---

## 6. 系统总架构

Kit Studio 后续应明确拆成 5 层：

### A. Intake Layer

外来组件进口层：

- `shadcn`
- `react-day-picker`
- `recharts`
- 后续其他合格来源

### B. Adapter Layer

把来源组件转换成平台统一语法：

- shell
- slots
- controls
- bindings
- actions
- theme tokens
- AI handoff

### C. Definition Layer

沉淀标准资产定义：

- `ControlDefinition`
- `CardDefinition`
- `InspectorSectionDefinition`
- `ThemeContract`

### D. Studio Layer

Kit Studio 工作台本体：

- 资产库
- 底板编辑
- Inspector
- 发布 / 验收

### E. Runtime / Export Layer

让定义能够真正被：

- 编辑器渲染
- Runtime 预览
- 导出
- AI handoff

消费。

---

## 7. 外来组件进口与适配模块

## 7.1 模块定位

该模块应被视为独立开发单元，建议命名为：

- `Kit Adapter`
- 或 `Asset Intake / Adaptation Service`

它不直接暴露给用户页面编排层，而是先服务内部资产生产。

## 7.2 输入

输入可能来自：

- `shadcn add` 加入的源码型组件
- 社区 registry block
- 已存在的 React 组件源码
- 平台内部实验组件

## 7.3 输出

输出不应该是“一个导入过来的黑盒组件”，而应该是：

- 标准化 `ControlDefinition`
- 标准化 `CardDefinition`
- 对应 Inspector schema
- 对应 Runtime 渲染器映射
- 对应主题 token 映射
- 对应 AI handoff / export 合同

## 7.4 五阶段管线

### Phase 1：Source Intake

记录原始来源：

- source type
- package / registry
- source URL
- 源码文件
- 依赖信息
- style 信息

### Phase 2：Structure Decomposition

拆壳识别：

- 根壳
- 标题区
- 内容区
- footer 区
- slot
- actions
- form fields

### Phase 3：Semantic Normalization

把组件语义转成平台统一语言：

- `card shell`
- `control family`
- `slot`
- `variant`
- `state`
- `data hooks`
- `action hooks`

### Phase 4：Inspector Mapping

为每个适配结果生成右侧面板协议：

- 可编辑字段
- 字段类型
- 默认值
- 是否继承全局变量
- 是否允许局部覆盖

### Phase 5：Contract Publish

验收通过后，再把它放进：

- 内置 control 库
- card 母版库
- 蓝图库

没有通过验收的适配结果只能停留在实验区。

---

## 8. shadcn 接入策略

## 8.1 原则

`shadcn` 组件是当前第一优先来源，但只能以 **源码母版** 身份进入平台，不能以黑盒 UI 库的方式直接暴露。

根据当前 `shadcn` 文档与 CLI 约定，它适合作为平台适配母体，原因包括：

- 组件是源码下发，不是封装黑盒
- 强依赖语义化 token 和 CSS variables
- 适合做二次编排和代码级改造
- 易于保留导出可读性

## 8.2 接入规则

### 规则一：先桥接，再标准化

导入 `shadcn` 源码后，先用一层桥接变量保证它在平台主题中可运行，再逐步转译为平台标准 control/card。

### 规则二：不直接保留原始语义为最终标准

`shadcn` 的：

- class
- variant
- slot
- radius
- tone

不能直接等同于平台最终语义。

它们必须先映射进平台定义，再对外暴露。

### 规则三：优先吸收 primitive，不先吸收复杂 block

优先顺序应是：

1. Button / Input / Select / Textarea / Checkbox / Radio / Separator
2. Card / Tabs / Dialog / Sheet / Table 等结构件
3. 复杂 block（login card、settings form、dashboard blocks）

### 规则四：复杂 block 先拆再收

像 `login card` 这类 block，不应直接成为最终标准 control。

它应该被拆成：

- card shell
- heading
- description text
- email input
- password input
- primary action
- secondary action
- footer text

再决定哪些保留为 control，哪些汇总为 card 母版。

## 8.3 主题桥接

为兼容 `shadcn` 生态的语义变量，建议在导入组件 scope 内提供一层桥接：

- 把平台 `--theme-*` / `--kit-*` 映射到 `shadcn` 习惯使用的语义变量
- 让导入组件先“能跑”
- 后续再逐步收敛到平台原生控件体系

这层桥接的作用是降低进口成本，而不是让平台长期依赖外部命名体系。

---

## 9. Card 与 Control 的标准属性模型

当前必须先把“完整属性分类”定下来，再谈批量进货。

## 9.1 所有节点的基础字段

所有 `Control / Card / Kit Shell` 都至少应拥有：

```ts
type StudioNodeBase = {
  id: string
  type: string
  layer: 'control' | 'card' | 'kit-shell' | 'slot'
  name: string
  source: 'native' | 'shadcn' | 'react-day-picker' | 'recharts' | 'custom'
  category: string
  description?: string
  version?: string
  stableKey?: string
  contractRole?: string
  contractKey?: string
  aiHandover?: string
}
```

## 9.2 Control 的属性分组

每个 control 至少由以下 9 组属性组成：

### A. Identity

- `id`
- `type`
- `family`
- `source`
- `name`
- `description`

### B. Content

负责可见文本与内容本体：

- `text`
- `label`
- `placeholder`
- `title`
- `description`
- `options`
- `valuePreview`

### C. Layout

负责在 card 内部的布局约束：

- `w / h`
- `minW / minH`
- `autoOccupyRow`
- `align`
- `layoutMode`
- `slot`
- `padding`
- `gap`

### D. Appearance

负责局部视觉风格：

- `variant`
- `tone`
- `emphasis`
- `size`
- `weight`
- `chrome`
- `surface`
- `borderStyle`
- `shadowLevel`

### E. Theme Binding

负责变量继承与局部覆盖：

- `themeScope`
- `tokenRefs`
- `inheritColor`
- `inheritTypography`
- `inheritShape`
- `localStylePatch`

### F. Data

负责绑定与运行数据：

- `bindings`
- `valuePath`
- `defaultValue`
- `emptyState`
- `errorState`
- `loadingState`

### G. Actions

负责交互行为：

- `actions`
- `eventMap`
- `targetRef`
- `submitBehavior`

### H. Accessibility

- `ariaLabel`
- `role`
- `tabIndex`
- `disabled`
- `required`
- `readOnly`

### I. Source Metadata

- `sourceComponentName`
- `sourceRegistry`
- `sourceUrl`
- `importedAt`
- `adaptationStatus`

## 9.3 Card 的属性分组

Card 是用户看到的最小活动单元，因此除了 control 的共性字段，还必须补以下结构：

### A. Shell Contract

- `shellType`
- `cardKind`
- `layoutMode`
- `showHeader`
- `showFooter`
- `surfacePolicy`

### B. Slots

- `slots[]`
- `slotRules`
- `acceptedControlFamilies`
- `requiredSlots`

### C. Theme Policy

- `themePolicy: inherited | derived | isolated`
- `cardThemePatch`
- `allowControlOverrides`

### D. Data Contract

- `expectedBindings`
- `requiredFields`
- `emptyContract`
- `errorContract`

### E. Export Contract

- `exportType`
- `runtimeComponentKey`
- `codegenHints`
- `aiHandover`

## 9.4 建议的定义对象

```ts
type ControlDefinition = {
  base: StudioNodeBase
  contentSchema: Record<string, unknown>
  layoutSchema: Record<string, unknown>
  appearanceSchema: Record<string, unknown>
  dataSchema: Record<string, unknown>
  actionSchema: Record<string, unknown>
  accessibilitySchema: Record<string, unknown>
  inspector: InspectorSectionDefinition[]
  runtime: RuntimeRendererSpec
  export: ExportRendererSpec
}

type CardDefinition = {
  base: StudioNodeBase
  slots: CardSlotDefinition[]
  defaultChildren: string[]
  themePolicy: CardThemePolicy
  inspector: InspectorSectionDefinition[]
  runtime: RuntimeRendererSpec
  export: ExportRendererSpec
}
```

---

## 10. Control 家族划分

为了让右侧面板和代码映射更清晰，后续控件应先归类，再扩充。

建议至少分 6 类：

### 10.1 Textual Controls

- heading
- text
- label
- badge
- helper text

### 10.2 Action Controls

- button
- icon button
- link action
- menu trigger

### 10.3 Form Controls

- input
- number input
- textarea
- select
- checkbox group
- radio group
- switch

### 10.4 Data Controls

- stat
- chart
- calendar
- avatar summary
- list item

### 10.5 Structural Controls

- divider
- panel
- stack
- grid slot
- canvas slot

### 10.6 Composite Controls

由多个更小控件组成，但暂时作为一个整体维护：

- login card
- pricing card
- author bio card

后续只要条件成熟，就应继续拆分 composite。

---

## 11. 右侧栏设计

右侧栏必须从“写死某几个字段”升级为 **Schema-driven Inspector**。

## 11.1 右栏的三种上下文

### A. 未选中状态：Workspace / Kit Defaults

当没有选中具体节点时，右栏显示当前 Kit Studio 工作区级设置：

- 当前 card 名称
- card 类别
- card 默认主题
- typography scale
- radius / border / shadow scale
- slot 策略
- 默认行为策略

### B. 选中 Card Root：Card Inspector

聚焦 card 的整体合同：

- card contract
- shell
- slots
- theme policy
- data contract
- export contract
- AI handoff

### C. 选中 Control：Control Inspector

聚焦单个控件：

- content
- appearance
- layout
- bindings
- actions
- code mapping

## 11.2 右栏的主标签结构

建议统一为以下 6 个主标签：

### 1. Overview

显示：

- 类型
- 来源
- id
- layer
- source badge
- 适配状态

### 2. Content

显示：

- 标题 / 文案 / label / placeholder
- 选项数据
- 卡片文案结构

### 3. Style

显示：

- 颜色
- 字体
- 字号
- 字重
- 圆角
- 边框
- 阴影
- 间距
- 状态样式

### 4. Data

显示：

- bindings
- value path
- empty / loading / error
- mock preview

### 5. Actions

显示：

- 点击
- 提交
- 打开 overlay
- request
- refresh

### 6. Code

显示：

- runtime renderer key
- export renderer key
- source component
- adaptation notes
- compatibility level

## 11.3 Style 标签必须支持双层编辑

这是右栏设计的核心：

### 第一层：全局变量

作用于当前 card 或整个工作区：

- 主题主色
- 背景 / 前景
- 字体族
- 正文字号
- 标题字号级别
- 边框风格
- 控件圆角
- 卡片圆角
- 阴影

### 第二层：局部覆盖

作用于当前 control：

- 单个按钮改 variant
- 单个输入框改单独 radius
- 单个标题改 size / weight
- 单个卡片改单独 header surface

局部覆盖必须显式标记为 override，不能和全局值混在一起。

## 11.4 字段交互模式

每个样式字段应有明确模式：

- `Inherit`
- `Card Default`
- `Custom`

例如：

- 颜色默认继承 card
- card 默认继承 workspace
- 只有切到 `Custom` 才允许输入局部值

这个模式能避免后续样式配置失控。

---

## 12. 全局主题变量与局部样式变量

这是当前阶段必须定清的底层。

## 12.1 现有基础

当前项目已经具备：

- `--theme-*`
- `--color-hr-*`
- `--theme-font-family`
- `--theme-radius-panel`
- `--theme-radius-control`
- `--theme-control-*`
- `--theme-input-*`

因此 Kit Studio 不应再另起一套互不兼容的主题世界，而应在此基础上扩展 **Card / Control alias tokens**。

## 12.2 建议的变量层级

建议采用 5 层变量继承：

### Layer 1：Platform Shell Theme

平台工作台自己的壳层主题。

### Layer 2：Project Theme

当前项目统一主题，仍然是主要语义来源。

### Layer 3：Kit Studio Global Tokens

针对 card/control 生产场景的别名层，例如：

- `--kit-card-bg`
- `--kit-card-border`
- `--kit-card-text`
- `--kit-control-bg`
- `--kit-control-border`
- `--kit-input-bg`
- `--kit-input-border`
- `--kit-button-radius`
- `--kit-font-size-body`
- `--kit-font-size-heading-sm/md/lg`

### Layer 4：Card Scope Tokens

单张 card 的派生变量，例如：

- `--card-bg`
- `--card-border`
- `--card-title-size`
- `--card-control-gap`

### Layer 5：Control Overrides

单个 control 的局部覆盖：

- `--control-bg`
- `--control-border`
- `--control-radius`
- `--control-font-size`

## 12.3 推荐继承关系

推荐链路如下：

```txt
Project Theme
  -> Kit Studio Global Tokens
    -> Card Scope Tokens
      -> Control Local Overrides
```

## 12.4 样式策略

### 全局同步能力

所有 controls 至少应能同步以下全局变量：

- 主色
- 文本色
- 背景色
- 边框色
- 字体族
- 正文字号
- 标题字重
- 卡片圆角
- 控件圆角
- 边框粗细
- 阴影级别

### 个性化能力

单个 control 允许局部调整：

- variant
- emphasis
- size
- tone
- radius override
- padding override
- local accent override

前提是：

- 局部值必须可追踪
- 能在 Inspector 中明确看出它不是继承值

---

## 13. 背后的代码框架

建议把 Kit Studio 能力从现有 builder 兼容层里逐步抽出，形成单独目录。

## 13.1 推荐目录

```txt
src/kit/
  adapter/
    intake/
    normalize/
    shadcn/
    publish/
  definitions/
    controls/
    cards/
    slots/
  inspector/
    sections/
    fields/
    resolvers/
  theme/
    tokenLayers.ts
    controlAliases.ts
    shadcnBridge.ts
  runtime/
    renderControl.tsx
    renderCard.tsx
  export/
    serializeControl.ts
    serializeCard.ts
  contracts/
    control.ts
    card.ts
    inspector.ts
```

## 13.2 与现有代码的过渡关系

当前先保留：

- `src/builder/widgetConfig.ts`
- `src/builder/registry.tsx`
- `src/components/builder-page/WidgetInspectorPanel.tsx`
- `src/components/KitFactoryBoard.tsx`

但新能力不应再继续堆进这些文件，而应逐步转移到：

- `definition-driven`
- `schema-driven`
- `inspector-driven`

架构。

## 13.3 推荐的定义驱动对象

### `ControlDefinition`

定义控件本身：

- 属性 schema
- 默认值
- Inspector sections
- Runtime renderer
- Export renderer
- Theme alias support

### `CardDefinition`

定义 card：

- shell
- slots
- required controls
- theme policy
- data contract
- export hints

### `InspectorSectionDefinition`

定义右侧面板：

- section id
- title
- scope
- field list
- inheritance behavior
- visibility conditions

### `AdapterRecord`

定义导入适配产物：

- source metadata
- normalized nodes
- unresolved issues
- review notes
- publish status

---

## 14. 开发顺序建议

当前必须先定模型，再进口组件。

### Phase 1：统一命名与合同

- 明确 `Control / Card / Kit / Slot`
- 把当前 widget 语义做一层兼容映射
- 先定义 `ControlDefinition` / `CardDefinition`

### Phase 2：右侧栏 schema 化

- 把右侧栏拆成 section-driven
- 先支持 workspace / card / control 三种上下文
- 支持 `inherit / default / custom`

### Phase 3：主题别名层

- 在现有 `--theme-*` 基础上建立 `--kit-*` / `--card-*` / `--control-*`
- 让全局同步与局部覆盖同时成立

### Phase 4：shadcn 适配 MVP

- 优先导入 primitive controls
- 做 `shadcn bridge`
- 建立“导入 → 拆壳 → Inspector → 发布”的最小流程

### Phase 5：首批内置资产生产

建议优先形成：

- Button
- Input
- Textarea
- Select
- Checkbox / Radio
- Card Shell
- KPI Card
- Stat List Card
- Login Card

### Phase 6：蓝图联动

- 用已稳定的 cards 继续生产 starter blueprints
- 验证导出与 AI handoff

---

## 15. 当前阶段的直接约束

从现在开始，Kit Studio 相关开发遵守以下约束：

1. 不再把外来组件直接当最终用户资产暴露
2. 不再为单个 widget 手写一整块右侧面板逻辑作为长期方案
3. 新增 control 时，必须同时定义：
   - 属性 schema
   - Inspector schema
   - Runtime 映射
   - Export / handoff 映射
4. 新增 card 时，必须同时定义：
   - shell
   - slots
   - theme policy
   - data contract
5. 所有颜色、字体、字号、圆角、边框、阴影，优先走全局 token，再允许局部 override
6. `shadcn` 只能作为源码母版来源，不能成为平台最终语义本身
7. 在属性模型未定之前，不继续大批量进口复杂 block

---

## 16. 判断这条线是否成功的标准

不是“能导进来多少组件”，而是以下条件是否成立：

1. 用户能在 Kit Studio 里稳定组装一张 card
2. 右侧栏能清楚区分全局变量与局部覆盖
3. 同一批 controls 能随主题统一切换颜色、字体、字号、边框和圆角
4. 导入的 `shadcn` 组件可以被拆解成平台内部 control/card 语法
5. card 能清晰导出，并被 AI Coding 继续接手

如果这几点成立，Kit Studio 就不是临时素材板，而是平台真正的资产生产底座。
