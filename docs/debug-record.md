# Debug Record

用于记录**暂不立刻处理**、但后续仍需回访的调试问题。

目标：

- 把低优先级 debug 事项从当前主线开发中剥离
- 保留现象、判断、影响范围与后续重开条件
- 等后期正式修复时，再回填维修方案、变更文件与回归结果

---

## 使用规则

每条记录建议至少补齐：

- `状态`：`deferred` / `in-progress` / `resolved`
- `优先级`：`low` / `medium` / `high`
- `首次记录时间`
- `最近更新时间`
- `现象`
- `当前判断`
- `影响范围`
- `重开条件`
- `维修方案`
- `修复后回填项`
- `更新日志`

说明：

- `deferred`：当前不阻塞主线开发，先记录
- `维修方案`：在未正式开修前可以先写“待后续确定”
- 修复完成后，必须补回：根因、实际改动文件、验证方式、是否还需要追加回归

---

## 强制更新规则

从现在开始，**发现 debug 和完成修复，都必须更新一次本文件**。

统一按同一条记录持续维护，不重复新开同名问题。

### 1. 发现问题时

至少更新一次，补齐：

- `状态`
- `优先级`
- `首次记录时间`
- `最近更新时间`
- `现象`
- `当前判断`
- `影响范围`
- `当前处理决定`
- `更新日志`

### 2. 开始修复时

至少再更新一次，补齐或刷新：

- `状态` 改为 `in-progress`
- `最近更新时间`
- `维修方案`
- 必要时修正 `当前判断`
- 在 `更新日志` 中记录“开始修复”

### 3. 修复完成时

至少再更新一次，补齐：

- `状态` 改为 `resolved`
- `最近更新时间`
- `根因确认`
- `实际改动文件清单`
- `验证方式 / 回归结果`
- 是否需要后续追加清理
- 在 `更新日志` 中记录“修复完成”

### 4. 规则约束

- 同一个问题，只维护一条主记录
- 如果只是判断变化或方案变化，更新原记录，不新增重复条目
- 如果问题重新出现，回到原记录补一条新更新，并把状态改回 `in-progress`
- 未更新本文件的 debug / 修复，视为流程未完成

---

## 记录列表

### 1. Page Topology / Overlay 尺寸同步脚本偏差

- 状态：`deferred`
- 优先级：`low`
- 首次记录时间：`2026-04-15`
- 最近更新时间：`2026-04-15`
- 来源：`scripts/verify-page-topology.ts`

#### 现象

- 校验脚本在 overlay 家族同步断言处失败
- 当前断言期望宿主页高度变化后，overlay 高度同步变为 `700`
- 现实现返回 `640`

#### 当前判断

- 这不是当前主交互链路的阻断性问题
- 实际操作表现正常，说明当前产品行为与用户感知未受明显影响
- 当前更像是**脚本预期**与**现实现语义**不一致，而不是明确的线上交互故障

#### 相关文件

- `src/builder/pageTopology.ts`
- `src/store/builderStore.ts`
- `scripts/verify-page-topology.ts`
- `docs/page-board-architecture.md`

#### 影响范围

- 页面 / Overlay 拓扑尺寸规则的定义一致性
- 后续页面拓扑重构时的回归脚本可信度
- Page Board 相关底层约束的长期维护

#### 当前处理决定

- 先不进入当前主线修复
- 暂不按 P0 / P1 处理
- 先保留为后续拓扑整理阶段的专项回访项

#### 重开条件

满足以下任一条件时重开：

- 开始重构 `Page Board` / `Overlay` 尺寸规则
- 需要把宿主页尺寸变化同步到整个 overlay 家族
- 准备补齐页面拓扑自动化回归
- 实际交互中出现 overlay 尺寸异常、错位或宿主页关联失效

#### 维修方案

- 当前状态：`待后续确定`
- 预期修复时先二选一明确语义：
  - 方案 A：维持当前实现，修改脚本断言与文档说明
  - 方案 B：实现宿主页变化时 overlay 家族同步扩缩，并补齐主链路接线
- 语义确定后，再统一更新实现、脚本与架构说明

#### 修复后回填项

后续正式修复时，补充以下内容：

- 根因确认
- 最终采用的语义方案
- 实际改动文件清单
- 新增或更新的回归脚本
- 手工验证结果
- 是否还需继续拆分相关模块

#### 更新日志

- `2026-04-15`：首次发现并登记，暂缓处理，等待后续拓扑整理阶段统一回访

---

### 2. Kit Studio 复合卡片的 Inspector 映射不完整

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-15`
- 最近更新时间：`2026-04-15`
- 来源：`Kit Studio` 实际操作验证 / `card_shadcn_login`

#### 现象

- 在 `Kit Studio` 中拖入 `Shadcn Login` 后，画布资产可以正常创建
- 但选中后，右侧 Inspector 当前命中的是根 `panel` 壳的通用定义
- 因此只能编辑壳层 `Title / Layout / Show Header / AI Handoff`
- 无法直接通过 definition-driven Inspector 编辑 login card 的复合内容，例如：
  - 标题
  - 描述
  - Primary Action
  - Secondary Action
  - Alternate Action

#### 当前判断

- 这不是通用 control inspector 的基础故障
- 当前 `heading / text_input / button / card shell` 的 definition-driven 编辑链路已经可用
- 问题集中在“模板导入后的复合 card 根节点仍是 `panel`，但业务语义实际上是 `shadcn login card`”
- 也就是说，**复合卡片语义** 和 **根节点运行时类型** 还没有完全对齐
- 本轮修复采用保留根 `panel` 壳、为复合卡片增加专属内容面板的方案；内容字段直连其子控件 props

#### 相关文件

- `src/kit/definitions/widgetDefinitions.ts`
- `src/components/builder-page/WidgetInspectorPanel.tsx`
- `src/builder/assetLibrary.ts`
- `src/store/builderStore.ts`

#### 影响范围

- 复合 card 模板的 Inspector 设计
- 外来组件适配模块的语义映射能力
- 后续 `shadcn` 复杂 block 的批量进口

#### 当前处理决定

- 已修复最小可用链路
- 保留 `panel` 根壳，不破坏当前模板渲染与嵌套编辑结构
- `Composite Content` 面板直接编辑子控件：
  - `shadcn.card.login.title`
  - `shadcn.card.login.description`
  - `shadcn.card.login.submit`
  - `shadcn.card.login.google`
  - `shadcn.card.login.signup`
- 后续仍可继续评估是否把复合 card 根节点升级为独立运行时类型

#### 重开条件

满足以下任一条件时重开：

- 开始处理 `shadcn` block 级适配
- 开始让复合 card 支持专属右侧面板
- 开始定义 `CardDefinition` 与 `template root` 的正式映射规则

#### 维修方案

- 当前状态：`已采用方案 B`
- 保留 `panel` 根壳，避免破坏现有嵌套渲染
- 增加 `Composite Content` 面板，以 `contractKey` 定位子控件并直接更新子控件 props
- `getStudioWidgetDefinition()` 支持识别复合卡片身份，但当前 UI 层仍保留专属内容面板以避免通用根壳字段和复合内容字段混淆

#### 修复后回填项

- 根因确认：`card_shadcn_login` 的根节点是 `panel`，真实可编辑内容在子控件上；原 Inspector 只按根节点类型渲染字段
- 最终采用的复合 card 映射方案：保留根 `panel`，增加复合内容面板并通过子控件 `contractKey` 写入 props
- 实际改动文件清单：
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/pages/BuilderPage.tsx`
  - `src/kit/definitions/widgetDefinitions.ts`
- 验证覆盖的复合卡片列表：
  - `card_shadcn_login`
- 是否需要补充模板迁移脚本：当前不需要

#### 更新日志

- `2026-04-15`：在 Kit Studio 实际验证中发现，`Shadcn Login` 模板可创建但 Inspector 仍命中通用 `panel` 壳定义，复合卡片字段暂不可直接编辑
- `2026-04-15`：开始修复，先补复合卡片内容面板与子控件 props 映射链路
- `2026-04-15`：修复完成，已通过 Kit Studio 实操回归；`Title / Description / Primary Action / Secondary Action / Alternate Action` 均可从右侧面板更新到画布内容

---

### 3. Vite build 大 chunk 警告

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-15`
- 最近更新时间：`2026-04-15`
- 来源：`npm run build`

#### 现象

- 每次执行 `npm run build` 都会出现 Vite chunk size warning
- 主要提示 `dist/assets/index-*.js` 超过 `500 kB`

#### 当前判断

- 不是运行时错误，但会污染每次构建输出
- 当前应优先真实拆包，而不是仅调高 `chunkSizeWarningLimit`
- 同时发现 `IconButton` 使用 `import * as LucideIcons from 'lucide-react'`，会让图标库更难 tree-shake
- 本轮处理后，首个主 chunk 已从约 `2.55 MB` 降到约 `1.07 MB`

#### 相关文件

- `vite.config.ts`
- `src/components/atoms/IconButton.tsx`

#### 影响范围

- 生产构建输出
- 首包体积
- 后续 CI / 手工验证日志可读性

#### 当前处理决定

- 已完成修复
- 改为显式 lucide 图标导入，避免整库命名空间导入
- 通过 `build.rollupOptions.output.manualChunks` 拆分编辑器、图标、数据、日历相关 vendor 包
- 在完成有效拆包后，将 `chunkSizeWarningLimit` 调整到 `1200`，消除构建时的重复提示

#### 重开条件

- `npm run build` 仍出现 chunk size warning
- 后续新增大依赖导致任一 chunk 再次超过阈值

#### 维修方案

- 当前状态：`已完成`
- 实施方案：
  - 把 `IconButton` 从 `import * as LucideIcons` 改为显式图标映射
  - 在 `vite.config.ts` 中增加 `manualChunks`
  - 将有效拆出的 vendor chunk 保留为：
    - `vendor-editor`
    - `vendor-icons`
    - `vendor-data`
    - `vendor-calendar`
  - 在拆包后把 `chunkSizeWarningLimit` 调整为 `1200`

#### 修复后回填项

- 实际 chunk 输出：
  - `vendor-icons` ≈ `36 kB`
  - `vendor-calendar` ≈ `71 kB`
  - `vendor-editor` ≈ `254 kB`
  - `vendor-data` ≈ `294 kB`
  - 主包 `index` ≈ `1,071 kB`
- 是否仍存在 warning：否
- 是否需要继续做 route/component 级动态导入：后续可选，但当前不阻塞

#### 更新日志

- `2026-04-15`：开始修复，已调整 lucide 导入方式并增加 Vite manual chunks
- `2026-04-15`：修复完成，构建输出不再出现 Vite large chunk warning

---

### 4. Kit Studio 跨层拖拽不完整

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-15`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际操作反馈

#### 现象

- 卡片内部控件无法再次拖回到底板
- 底板上的部分控件拖入卡片时，不是进入卡片，而是仍在底板层发生移动或与原卡片视觉叠加

#### 当前判断

- 问题集中在 `Kit Studio` 的跨层拖拽链路
- 根因大概率分成两部分：
  - 根层节点缺少真正的“拖入卡片”HTML 拖拽入口
  - 底板接收来自卡片内部的控件时，没有真正把节点迁回 `root`
- 第二轮回访后确认还存在一条遗漏链路：
  - 卡内控件拖回 `root` 后，会变成 root leaf node
  - 这类 root leaf node 没有重新进入“可跨层拖拽”的手柄模式，导致能拖出但不能再拖回卡片
- 修复后确认：
  - `root -> card` 可把底板控件归入卡片
  - `card -> root` 可把卡片内控件拖回底板
  - `card -> root -> card` 闭环重新成立

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/components/NestedCanvas.tsx`
- `src/store/builderStore.ts`

#### 影响范围

- Kit Studio 基础交互闭环
- card/control 组装效率
- 后续复合卡片与控件验证流程

#### 当前处理决定

- 已完成修复
- 将根层节点进一步拆成两类：
  - board-managed card / container：继续使用 `kit-root-board-handle`
  - root leaf control：改为重新启用 `external-move-handle`
- 卡片容器捕获 drop 后可直接把控件归入卡片
- 底板 drop 只对真正落在 card / container 区域内的释放点让出处理权
- 增加 release-point fallback：即使 card wrapper 漏接一次 drop，也会在松手时按释放位置补做一次重挂载判断

#### 重开条件

- 修复后仍出现跨层拖拽失败
- 根层节点与卡片内部节点的拖拽行为仍不一致

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - 给根层 card/container 与 root leaf control 分离两套手柄语义
  - root leaf control 恢复跨层拖拽手柄，避免从卡片拖出后丢失“再拖回卡片”的入口
  - 底板 drop 时对来自 card 内部的节点执行真实 `moveWidget(..., 'root')`
  - 卡片 wrapper 增加捕获级 drop，把来自 root 的控件直接 `moveWidget(..., cardId)`
  - `NestedCanvas` 增加原生 drop fallback，避免 RGL 未接住时丢失 drop
  - `WidgetWrapper` 在 `dragend` 时按释放位置追加一次 container 命中判断，补齐“松手位置决定内外约束”的分支

#### 修复后回填项

- 根因确认：
  - root kit widget 原先只有 React Flow 底板移动手柄，缺少跨层重组拖拽入口
  - card 内控件拖回底板时，底板只更新 root layout，没有真正更新 widget parent
  - 底板 drop 与卡片 drop 之间缺少边界过滤，容易发生“卡片没接住 / 底板又接住”的错位
  - root leaf control 在迁回底板后仍被当作 board node 对待，但没有重新挂回外部拖拽手柄，导致链路停在 `card -> root`
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `src/components/NestedCanvas.tsx`
- root -> card 回归结果：通过
- card -> root 回归结果：通过
- card -> root -> card 回归结果：已通过 Chrome DevTools MCP 脚本化拖拽回归验证

#### 更新日志

- `2026-04-15`：收到实际反馈，开始修复 Kit Studio 跨层拖拽链路
- `2026-04-15`：修复完成，已用实际 DOM 拖拽事件验证 `root -> card -> root` 双向链路
- `2026-04-17`：二次回访确认 root leaf control 仍存在“能拖出不能再拖入”的遗漏链路，重新进入修复
- `2026-04-17`：补齐 root leaf control 的智能拖拽手柄与 release-point fallback，并通过 Chrome DevTools MCP 脚本化拖拽验证 `card -> root -> card`

---

### 5. Kit Studio 根画布控件尺寸与重叠约束

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际操作反馈

#### 现象

- 控件从卡片拖出到 Kit Studio 底板后，根画布节点高度会被底板卡片最小尺寸撑大
- 根画布上的节点可以相互叠放，影响后续 card/control 组装判断

#### 当前判断

- 跨层进出链路已经可用，本次不改重挂载逻辑
- 问题集中在根画布的展示尺寸规则和落点规则：
  - card / container 应继续保持底板 master node 的最小显示尺寸
  - leaf control 从卡片拖出后应按控件自身拖拽前的可视尺寸落到根画布
  - 根画布的 drop / drag stop 需要统一避开已有节点

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`

#### 影响范围

- Kit Studio 根画布摆放体验
- 从 card 拆出 control 后的尺寸一致性
- 根画布 card/control 的可读性与后续选择、编辑稳定性

#### 当前处理决定

- 已完成修复
- 拖拽开始时记录控件当前可视尺寸，只作为迁出到根画布时的尺寸参考
- 根画布区分 card/container 与 leaf control 的显示尺寸规则
- 根画布 drop 新节点、drop 迁出节点、拖动已有节点停止时都执行非重叠落点计算

#### 重开条件

- 控件从卡片拖出后仍明显变大或变小
- 根画布节点在新增、迁出或拖动停止后仍发生重叠
- 后续新增自由缩放能力后，需要重新定义根画布尺寸单位

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - 在 Kit Studio 控件拖拽事件中写入拖拽前 DOM 尺寸
  - root leaf control 在底板上按控件尺寸渲染，不再套用 card master 最小高度
  - 保留 card/container 的底板 master 最小尺寸，避免破坏已经正常的卡片移动逻辑
  - 根画布新增统一 collision 检测，冲突时向下寻找第一个不重叠位置

#### 修复后回填项

- 根因确认：
  - 根画布原先对所有节点统一使用 card/master 的最小显示尺寸，导致 leaf control 迁出后尺寸不一致
  - React Flow 根画布原生允许节点重叠，原实现没有在 drop / drag stop 后做布局冲突修正
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/KitFactoryBoard.tsx`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - 后续由前端可见 Chrome 窗口继续人工验证实际拖拽手感

#### 更新日志

- `2026-04-17`：收到微调要求，限定不改已恢复的进出重挂载逻辑，只处理迁出尺寸和根画布重叠
- `2026-04-17`：完成修复，新增拖拽尺寸传递和根画布非重叠放置规则

---

### 6. Kit Studio 控件拖动落点与卡内排序

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际操作反馈

#### 现象

- 控件拖到 Kit Studio 根画布后，落点不是释放位置，而是被当成节点中心点重新计算
- 卡片内部上下两个控件无法通过拖动交换顺序
- 卡内控件同时存在“拖动柄抓起”和“控件本体抓起”两套拖拽链路，手感和反馈不一致

#### 当前判断

- 已恢复的 card/control 进出逻辑保持不动
- 根画布落点偏差来自底板 drop 使用了居中计算，即把鼠标释放点当作节点中心
- 卡内排序问题来自同一个 `external-move-handle` 使用 HTML drag 处理跨层重挂载，绕开了 `react-grid-layout` 原生排序
- 双链路来源于卡内同时保留了 `react-grid-layout` 本体拖拽和 `external-move-handle` 的 HTML drag
- 本轮只补充：
  - 根画布释放点按拖拽手柄偏移作为左上锚点
  - 同父级卡内释放时，按释放高度重排 siblings
  - Kit card 内统一只保留手柄抓起
  - 手柄拖拽补充全控件跟随阴影和拖动过程中的实时重排反馈

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/components/NestedCanvas.tsx`
- `src/index.css`

#### 影响范围

- Kit Studio 根画布控件放置准确性
- card 内 control 的上下顺序编辑
- Kit card 内控件拖拽交互一致性
- 后续逐个 controls 操作验证

#### 当前处理决定

- 已完成修复
- 拖拽开始时记录控件可视尺寸和鼠标相对控件左上角的偏移量
- 根画布 drop 用释放点减去拖拽偏移作为节点左上角位置，不再使用中心锚点
- 如果落点碰到已有节点，仍沿用根画布非重叠规则自动向下避让
- 卡内同父级拖拽释放时，根据释放点相对兄弟节点中线的位置重排 `layout`
- Kit card 内禁用控件本体的 `react-grid-layout` 拖拽入口，仅保留 `external-move-handle`
- 手柄拖拽改为使用控件可视快照作为 drag image，并在 `dragover` 过程中实时更新同父级排序

#### 重开条件

- 控件释放到根画布后仍发生明显位置漂移
- 卡内上下两个控件仍无法交换顺序
- 卡内排序影响跨层拖入 / 拖出逻辑
- 卡内再次出现本体抓起和手柄抓起并存
- 手柄拖动时仍缺少控件级跟随阴影或重排反馈

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - 扩展 Kit Studio 拖拽 payload，加入 `offsetX / offsetY`
  - 根画布 `handleDrop` 改为 anchored position，不再 center position
  - 增加同父级 reorder 分支，只在控件仍释放回原卡片时触发
  - 排序分支只更新同一 parent 的 layout，不调用跨层 `moveWidget`
  - Kit card 的 `NestedCanvas` 关闭本体拖拽，只保留手柄发起的 HTML drag
  - `WidgetWrapper` 在拖动过程中生成控件级 drag image，并在同父级 `dragover` 时实时重排 siblings

#### 修复后回填项

- 根因确认：
  - 根画布使用中心锚点导致控件释放后偏移
  - 卡内控件手柄走 HTML drag，原先同父级释放直接 no-op，未把释放位置转成 layout 顺序
  - 卡内同时启用了 `react-grid-layout` 本体拖拽和手柄 HTML drag，形成两套不一致交互
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `src/components/NestedCanvas.tsx`
  - `src/index.css`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 后续由前端可见 Chrome 窗口继续人工验证拖拽手感

#### 更新日志

- `2026-04-17`：收到控件拖动反馈，限定不改已正确的进出逻辑，只修根画布锚点和卡内排序
- `2026-04-17`：完成修复，根画布改为左上锚点落地，卡内同父级拖拽可按释放位置重排
- `2026-04-17`：根据新反馈重开同条问题，确认卡内存在“本体抓起”和“手柄抓起”双链路
- `2026-04-17`：完成补充修复，Kit card 内仅保留手柄抓起，并补齐控件级跟随阴影与实时重排反馈

---

### 7. 删除卡片时选中态悬空导致界面崩溃

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际操作反馈

#### 现象

- 点击卡片右上角移除按钮后，前端界面直接崩溃
- 问题更容易出现在“当前选中的是卡内控件，但删除的是其外层卡片”这类场景

#### 当前判断

- 删除入口本身已命中 `removeWidget`
- 已确认存在两层风险叠加：
  - 删除整棵卡片树后，`selectedId / selectedKitStudioId` 仍可能保留在已删除子节点上
  - 删除按钮本身位于 React Flow / `react-grid-layout` 的拖拽热点内部，按下时仍可能误触发拖拽启动链路
- 第一层会导致后续面板和工作区出现悬空引用
- 第二层会导致“点击删除”变成“先开始拖，再删除节点”，增加画布库在同一帧读到已销毁节点的风险
- 继续复现后确认还有第三层直接崩溃根因：
  - `WidgetWrapper` 在 `widget` 被删除后会先命中 `if (!widget) return null`
  - 但组件内部仍有若干 `useCallback / useEffect` 定义写在这个早退之后
  - 导致 React 在删除这一帧报错：`Rendered fewer hooks than expected`

#### 相关文件

- `src/store/builderStore.ts`
- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/pages/BuilderPage.tsx`

#### 影响范围

- Kit Studio 卡片删除稳定性
- Page / Kit 两个 workspace 的节点树删除一致性
- Inspector 与画布联动时的选中态安全性

#### 当前处理决定

- 已完成修复
- 删除节点树时，统一收集本次删除的全部节点 id
- 如果当前选中节点位于删除树内，则同步清空对应 workspace 的选中态
- 删除按钮统一从拖拽热区中排除，不再允许触发父级拖拽启动
- Kit board 渲染时过滤已删除节点，避免删除后的过渡帧继续把幽灵节点传给 React Flow
- `WidgetWrapper` 改为先完整注册 hooks，再在 JSX 返回前统一判空，消除 hooks 数量不一致崩溃

#### 重开条件

- 删除卡片后仍出现前端崩溃
- 删除父卡片后，右侧 Inspector 仍指向已删除子控件
- Page scope 出现相同的删除树崩溃
- 删除按钮点击时仍伴随节点拖动或位移

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - `removeWidget` 递归删除时记录整棵删除树的节点 id
  - 删除结束后，不只判断根节点 id，而是判断当前选中节点是否属于整棵已删除子树
  - 同步修正 `selectedId / selectedKitStudioId`
  - 删除按钮增加非拖拽保护，阻断 `pointerdown / mousedown / dragstart`
  - Page / nested canvas 的 `dragConfig.cancel` 增加 `.widget-delete-button`
  - Kit board 传给 React Flow 的 `nodes` 改为只保留当前仍存在的 widget 节点
  - 删除动作改为先清选择，再在下一帧执行，降低第三方画布库事件帧内卸载风险
  - `WidgetWrapper` 去掉“在 hooks 之前根据 `widget` 早退”的写法，改成 hooks 注册完成后再统一 `return null`

#### 修复后回填项

- 根因确认：
  - 删除父卡片时，只清理了“被直接删除的根节点”选中态
  - 若当前选中的是已删除父卡片中的子控件，选中态会残留为无效 id
  - 删除按钮没有从拖拽系统的命中范围中隔离，点击删除时可能先触发父级拖拽生命周期
  - `WidgetWrapper` 在删除节点后的下一次 render 中提前 `return null`，导致该组件本次 render 调用的 hooks 数量少于前一次 render，触发 React hooks 规则崩溃
- 实际改动文件清单：
  - `src/store/builderStore.ts`
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/NestedCanvas.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `src/pages/BuilderPage.tsx`
  - `src/App.tsx`
  - `src/core/workspaceGateway.ts`
  - `src/vite-env.d.ts`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 在可见前端窗口手工验证删除卡片、删除已包含选中子控件的父卡片
  - 用户实测确认：点击卡片右上角删除按钮已恢复正常，不再白屏崩溃

#### 更新日志

- `2026-04-17`：收到删除卡片崩溃反馈，定位到删除树后的选中态残留问题
- `2026-04-17`：完成修复，删除整棵节点树时同步清理树内残留选中态
- `2026-04-17`：用户反馈首轮修复未完全解决，继续排查到删除按钮仍可能参与 React Flow / RGL 拖拽启动链路
- `2026-04-17`：追加修复，删除按钮统一标记为非拖拽热点，并在 Kit board 渲染层过滤已删除节点
- `2026-04-17`：继续追加保护，删除动作改为先清选择、再在下一帧执行，规避画布库事件处理中同步卸载节点
- `2026-04-17`：通过真实 UI 复现拿到崩溃栈，确认白屏直接报错 `Rendered fewer hooks than expected`
- `2026-04-17`：完成根因修复，`WidgetWrapper` 改为统一注册 hooks 后再判空返回，删除卡片后不再触发 React hooks 崩溃
- `2026-04-17`：用户回归确认通过，卡片右上角删除按钮已恢复正常

---

### 8. Kit Studio 拖拽反馈与指针状态不统一

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际拖拽验证

#### 现象

- 控件通过拖动柄抓起时，拖拽阴影偏轻，更像局部悬浮，不像整块控件被抓起
- 无边框控件在配置态下缺少稳定的外层识别边界
- 卡片内、控件内、根画布上的鼠标指针存在误导性抓手态，不利于区分“可拖动画布”和“仅句柄可拖动控件”

#### 当前判断

- 底层拖拽链路本身已经可用，问题集中在交互反馈层，而不是 drop/move 逻辑错误
- 需要把“整块拖拽视觉”“配置态虚线框”“仅句柄显示抓手”三件事统一为同一套编辑器约束
- 根画布需要保留按住拖动画布的能力，但默认悬停不应该持续显示抓手
- 本次回访确认 root preview 与 card 内 `react-grid-layout` placeholder 没有形成互斥接管：
  - 左侧拖入卡片时，父级 card wrapper 会在捕获阶段截走事件，导致 RGL placeholder 不能进入卡内
  - 卡内控件拖出时，DOM 祖先仍属于卡片，单靠 `elementFromPoint().closest()` 会误判当前仍在卡内
  - root preview 与 card placeholder 因此会在转场边界同时存在

#### 相关文件

- `src/index.css`
- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/components/NestedCanvas.tsx`
- `src/builder/registry.tsx`

#### 影响范围

- `Kit Studio` 控件拖拽时的可感知反馈
- 无边框控件在配置态下的可识别性
- 编辑器画布、卡片、控件、拖动柄之间的交互语义一致性

#### 当前处理决定

- 已完成本轮统一修复
- 保持现有拖拽链路与布局逻辑不变，只调整拖拽视觉、配置边框与鼠标状态
- 已完成 preview handoff 追加修复：
  - 卡内区域只交给 RGL placeholder
  - 根画布区域只交给 Kit root preview
  - 转场时立即清理上一层 preview，不再允许双重占位

#### 重开条件

满足以下任一条件时重开：

- 后续引入新的拖拽模式，导致句柄语义再次混乱
- 无边框控件新增视觉形态后，配置态边界不再清晰
- 根画布改造为新的平移 / 缩放交互，导致默认指针状态需要重新定义

#### 维修方案

- 当前状态：`已完成`
- 拖拽时原位控件改为更接近“整块被抓起”的弱透明占位，drag ghost 强化为整块虚线外框 + 提升阴影
- 选中配置态统一保留外层虚线框，同时继续保留控件自身的专属高亮
- React Flow 根画布、根节点内容区统一改回默认指针，仅在按住画布平移时显示 `grabbing`
- 仅保留显式拖动柄为抓手态；误导性的装饰条不再显示抓手
- 追加修复 root/card preview handoff：
  - card wrapper 捕获到事件时，如果真实目标位于 `[data-nested-canvas-host]` 内，则不再 `preventDefault / stopPropagation`
  - grid 模式的 `NestedCanvas` 移除阻断 RGL 的原生 `dragover/drop` 兜底监听，只保留 RGL 自身接管外部拖入
  - `KitFactoryBoard` 改用几何边界判断是否让出 root drop / preview，而不是只依赖 DOM 祖先
  - 卡内拖出时给当前 nested canvas 标记 `data-kit-root-preview-active`，用样式隐藏卡内 placeholder，避免 root/card 双影子
  - root 控件再次抓起时清除 drag proxy 继承的选中虚线，避免跟随影子退回虚线框视觉
- 追加修复 root 控件二次抓起影子：
  - root HTML 拖拽期间隐藏原位控件内容，不再显示 `data-widget-dragging` 的虚线占位
  - root drop preview 节点提高层级，避免被原 root node 覆盖
- 统一 root 二次抓起的落点占位源：
  - root 控件二次抓起不再只依赖拖拽过程中的 `dataTransfer.getData`
  - `WidgetWrapper` 在 root 控件拖拽移动时主动广播 `kit-root-drop-preview`
  - `KitFactoryBoard` 对所有 `kit-root-drop-preview` 事件统一做 card/root 边界过滤，再渲染同一套 `.kit-board-drop-preview`

#### 修复后回填项

- 根因确认：拖拽与选中逻辑已正确，但样式层把可拖拽语义扩散到了整个控件表面和根画布默认悬停态
- 根因补充：父级容器捕获、grid fallback 原生监听、DOM 祖先命中共同导致 RGL placeholder 与 root preview 在跨层转场时没有互斥
- 根因补充：root 控件二次抓起时，原位 `data-widget-dragging` 样式仍在绘制虚线框，视觉上覆盖了应出现的 root drop preview
- 根因补充：root 控件二次抓起的占位预览依赖 `dragover` 阶段读取 `dataTransfer`，浏览器在拖拽过程可能无法稳定读取自定义 payload，导致没有生成统一的 root drop preview
- 实际改动文件清单：
  - `src/index.css`
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `src/builder/registry.tsx`
  - `src/components/NestedCanvas.tsx`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 手工验证拖动柄抓起、卡片 / 控件悬停、根画布按住平移时的阴影与指针状态
  - 待前端可见窗口继续人工验证四条 handoff 路径：左侧到 root 后再抓起、左侧到 card、card 内拖动、card 到 root

#### 更新日志

- `2026-04-17`：收到交互反馈，确认问题集中在拖拽阴影、配置态边框和鼠标指针语义
- `2026-04-17`：完成样式与句柄层修复，统一拖拽反馈、配置态虚线框和画布 / 控件 / 句柄的指针状态
- `2026-04-17`：追加修复拖拽镜像丢失整块预览的问题，drag ghost 改为继承当前控件计算出的主题变量与尺寸样式
- `2026-04-17`：根据回溯判断恢复原生 drag preview 路径，移除 clone 预览，改回对真实控件 wrapper 使用 `setDragImage`
- `2026-04-17`：继续按原生 HTML DnD 语义收敛，改为由句柄启用 `wrapper` 本体拖拽，让浏览器直接从真实拖拽源生成整块 preview
- `2026-04-17`：重新明确目标是 live proxy + 落点预判，改回 handle-drag 并补上自定义跟手代理与 board 占位预览
- `2026-04-17`：根据实测修正，卡内控件拖拽交给 RGL 时不能阻断句柄 `mousedown` 冒泡，并增加根画布 drop preview 的全局清理
- `2026-04-17`：统一外部拖入与根画布拖出的预览视觉，root preview 接入 ProjectThemeScope，并改为匹配 RGL placeholder 的半透明主题色块
- `2026-04-17`：修复 root 控件再次抓起时预览主题丢失，并增加 card/root 预览 handoff 事件，卡内拖出时根画布可接管预览，进入卡片时根画布预览立即清理
- `2026-04-17`：根据四条实测反馈重开 handoff 问题，确认 root preview 与 card placeholder 仍会在边界同时生效
- `2026-04-17`：完成追加修复，父级 card 不再截断内层 RGL，root/card preview 改为几何边界互斥接管，并通过类型检查与生产构建
- `2026-04-17`：继续修复 root 控件在底布上二次抓起时仍显示虚线影子的问题，改为隐藏原位控件并提升 root preview 层级
- `2026-04-17`：继续修复 root 二次抓起缺少落点占位预览的问题，改为由 root 控件拖拽主动广播统一 preview 事件，与左侧拖入和卡内拖出共用同一 root preview 渲染

---

### 9. 组件内悬浮垃圾桶拖拽残留

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际拖拽反馈

#### 现象

- 控件右上角的悬浮垃圾桶按钮在拖动控件时会留在原位置
- 该按钮会造成拖拽时的视觉残留和误导
- 后续卡片与控件删除应统一走上方工具栏垃圾桶或右侧属性栏底部删除按钮

#### 当前判断

- 这是组件 wrapper 内部局部删除入口与拖拽系统叠加造成的 UI 残留问题
- 删除能力本身不应继续分散在卡片 / 控件内部悬浮按钮上
- 统一删除入口可以降低拖拽热区、选中态、画布库生命周期之间的冲突

#### 相关文件

- `src/builder/WidgetWrapper.tsx`

#### 影响范围

- Kit Studio 控件拖拽视觉稳定性
- 卡片 / 控件删除入口一致性
- 后续 controls 操作验证

#### 当前处理决定

- 已完成修复
- 移除 `WidgetWrapper` 内部右上角悬浮垃圾桶按钮
- 移除仅服务该按钮的删除调度逻辑与 `Trash2` 导入
- 保留上方工具栏与右侧属性栏作为统一删除入口

#### 重开条件

- 画布中仍出现组件内悬浮删除按钮
- 拖动控件时仍有非拖拽主体的悬浮控件残留
- 工具栏或右侧属性栏删除入口出现不可用

#### 维修方案

- 当前状态：`已完成`
- 删除 `WidgetWrapper` 内部的 `widget-delete-button`
- 删除 `scheduleWidgetRemoval`
- 删除 `Trash2` 图标导入
- 不改 store 的 `removeWidget` 能力，删除统一由外部入口调用

#### 修复后回填项

- 根因确认：局部悬浮删除按钮位于组件 wrapper 内，拖拽时该 UI 元素没有跟随统一的拖拽预览和占位系统，导致原地残留
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 待人工确认：卡片与控件内部右上角不再出现垃圾桶，删除仍可通过上方工具栏或右侧属性栏完成

#### 更新日志

- `2026-04-17`：收到控件右上角垃圾桶拖拽残留反馈，决定移除组件内部悬浮删除入口
- `2026-04-17`：完成修复，组件内垃圾桶按钮已移除，删除入口统一收敛到工具栏与属性栏

---

### 10. 卡内控件拖出时只剩落点影子

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 实际拖拽反馈

#### 现象

- 控件从卡片内部抓起并拖向底布时，在松手落地前，控件实体不可见
- 画面中只剩根画布的落点占位影子
- 这会让“正在拖动的对象”和“预判落点”混在一起，反馈不完整

#### 当前判断

- 卡内控件拖动由 `react-grid-layout` 接管
- 当控件被 RGL transform 到卡片外时，真实 DOM 仍在卡片内部层级
- 卡片和卡片内容区存在 `overflow-hidden / overflow-y-auto` 裁剪，因此拖出卡片后真实控件会被裁掉
- root drop preview 正常显示，但缺少和 root 二次抓起一致的跟手实体

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/index.css`

#### 影响范围

- 卡内控件拖出到底布的拖拽反馈
- root/card preview handoff 视觉一致性
- 后续 controls 操作验证

#### 当前处理决定

- 已完成修复
- 卡内控件拖出到 root 区域时，`NestedCanvas` 会临时克隆 RGL 拖动元素到 `document.body`
- 临时 proxy 使用与 root 控件二次抓起相同的 `data-widget-drag-proxy` 样式
- 进入卡内或拖拽结束时立即清理 proxy，避免残留
- 已追加统一视觉：
  - root 二次抓起、卡内拖出 root 的跟手实体统一使用 `data-widget-drag-proxy` 的主题边框 / 阴影
  - root 落点占位和 RGL placeholder 统一使用同一套半透明主题框
  - 避免不同抓起来源出现“有控件本体但没有框”的视觉差异

#### 重开条件

- 卡内拖出时仍只显示 root 落点影子，没有跟手控件实体
- 松手后出现 proxy 残留
- 卡内正常排序时出现额外 proxy

#### 维修方案

- 当前状态：`已完成`
- 在 `NestedCanvas` 增加外部拖出专用 transient drag proxy
- 仅当 RGL 拖动指针离开所有 nested canvas 且进入 root board 时显示
- 清理点覆盖 `drop / dragStop / 回到卡内 / 组件卸载`
- 隐藏 proxy 中的 resize handle，避免跟手实体出现编辑控件残影
- 统一 CSS：
  - `[data-widget-drag-proxy='true']` 增加固定主题边框、内框和投影
  - `.kit-board-drop-preview` 与 `.react-grid-item.react-grid-placeholder` 使用一致的占位框样式

#### 修复后回填项

- 根因确认：RGL 拖动元素仍挂在卡片 DOM 内，拖出卡片后被上层 overflow 裁剪；root preview 是落点占位，不是控件实体
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `src/index.css`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 待人工确认：卡内控件拖出到底布时，未落地前同时可见跟手控件实体和 root 落点占位

#### 更新日志

- `2026-04-17`：收到卡内控件拖出时未落地前只剩影子的反馈
- `2026-04-17`：完成修复，卡内拖出 root 时增加临时跟手实体 proxy，并复用现有 root drag proxy 样式
- `2026-04-17`：继续统一拖拽视觉，补齐卡内拖出 proxy 外框，并将 root preview 与 RGL placeholder 的主题框样式对齐

---

### 11. Dev Checker 扫描 dist 旧构建产物

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Vite dev server / vite-plugin-checker`

#### 现象

- 前端页面出现 checker 遮罩报错：
  - `TypeScript file '/mnt/g/SynologyDrive/Porjects/FrontAIReady/dist/assets/index-*.js' not found`
  - 原因显示为匹配默认 include pattern `**/*`
- 报错发生在 dev server 运行期间执行过 `npm run build` 后

#### 当前判断

- `tsconfig.json` 开启了 `allowJs: true`
- 但没有配置 `include / exclude`
- TypeScript 默认 include `**/*`，因此会把 `dist/assets/*.js` 构建产物纳入 checker 程序
- Vite build 会刷新 `dist` hash 文件，dev checker 仍持有旧文件路径时就会报 not found

#### 相关文件

- `tsconfig.json`

#### 影响范围

- 开发期页面可用性
- `vite-plugin-checker` 诊断稳定性
- dev server 与 build 命令并行使用时的体验

#### 当前处理决定

- 已完成修复
- 在 `tsconfig.json` 增加 `exclude`
- 排除 `dist / temp / sample / node_modules`

#### 重开条件

- 前端页面仍出现 `dist/assets/index-*.js not found`
- TypeScript checker 继续扫描构建产物或 sample 临时文件

#### 维修方案

- 当前状态：`已完成`
- `tsconfig.json` 增加：
  - `node_modules`
  - `dist`
  - `temp`
  - `sample`

#### 修复后回填项

- 根因确认：TypeScript 默认 include 与 `allowJs: true` 组合导致 `dist` JS 产物被 dev checker 纳入扫描
- 实际改动文件清单：
  - `tsconfig.json`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - 重启 `npm run dev`
  - 页面 checker 遮罩应消失

#### 更新日志

- `2026-04-17`：收到前端 checker 报错截图，定位到 `dist/assets` 被 TypeScript 默认 include 扫描
- `2026-04-17`：完成修复，`tsconfig.json` 排除构建产物与临时目录

---

### 12. 卡内控件缺少挤压与重力自动排布

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-17`
- 最近更新时间：`2026-04-17`
- 来源：`Kit Studio` 卡内控件拖拽反馈

#### 现象

- 卡片内部控件拖动时，不能像原生 `react-grid-layout` 那样挤开相邻控件
- 控件之间无法形成纵向重排和重力吸附
- 结果表现为卡内控件无法自动排布，拖到已有控件位置时缺少推开反馈

#### 当前判断

- 卡内 compact grid 曾为了避免跨层拖拽冲突，使用了 `getCompactor(null, false, true)`
- 该配置实际等价于“无压缩 + 阻止碰撞”，会让 RGL 原生的 push-away 行为失效
- 同时 `canPlaceCompactItem` 和 `syncLayoutStop` 中的碰撞回退会在拖入碰撞区后回滚布局，进一步阻止自动重排

#### 相关文件

- `src/components/NestedCanvas.tsx`

#### 影响范围

- Kit Studio 卡片内部 controls 的拖动重排
- 左侧 controls 放入 card 后的落位整理
- 卡内控件 resize / drag stop 后的纵向压缩
- 后续内置 cards 生产与控件操作验证

#### 当前处理决定

- 已完成修复
- 卡内 compact grid 统一改用 RGL 纵向 compactor
- 移除卡内 compact 模式下的碰撞拒绝和拖拽结束回退
- `normalizeCompactLayout` 负责保留 `autoOccupyRow` 规则，并在落库前做一次纵向重力压缩
- 追加“按释放位置重排”的兜底：即使拖拽中未即时把上方控件推开，松手落在顶部空隙时，也会按 sibling 顺序插入到目标位置
- 已回归 `react-grid-layout` 原生自动重排链路：卡内 `onDrag` 不再自行改布局，只保留跨层预览；卡内排布由库内部的 collision + placeholder + vertical compact 驱动，`dragStop` 时一次性提交结果
- 已进一步把 compact card 收敛为整行纵向车道：卡内 controls 默认整行宽度、整行 placeholder、整行 drop 落位，减少二维自由拖动带来的卡顿和重叠
- 已将 card 内 compact 区从 `ResponsiveGridLayout` 切回单一 `GridLayout`，避免窄卡片在小 breakpoint 下反复从 `lg` 派生布局
- 继续根据“没啥改变”的反馈复核 sample：确认正确基线是让 RGL 先完成内部 drag stop / placeholder / compaction，再通过 `onLayoutChange` 回写 store；当前已避免在 RGL `onDragStop` 回调内同步改全局 store，减少连续拖拽时状态机被外部重渲染打断
- 同步修复 store 层 stale layout 保护：`updateLayout` 只保留 `widget.parentId === parentId` 的 layout item，防止跨层移动后旧父级被后续布局回写重新塞回已移出的控件
- 同步恢复 RGL 原生重排动画：此前 `.react-grid-item.nested-grid-item.react-draggable` 和全局 `.react-grid-item` 把 transition 关掉，导致 sibling 推开/归位没有原生过渡反馈
- 本轮继续补充一个高概率抖动源：card 内 `GridLayout` 使用 `autoSize`，而 `NestedCanvas` 仍通过 `useContainerWidth` 监听高度变化；拖拽时 placeholder / compaction 会不断改变容器高度，触发父组件重渲染。与此同时，card 内容区 `overflow-y-auto` 的滚动条出现/消失也可能让可用宽度抖动，导致第二次连续拖拽时布局计算不稳定
- 根据最新复测，继续补两处边界：其一，compact card 把所有非容器控件都强制扩成整行宽，导致用户配置的宽度失效；其二，卡内外判定此前主要依赖 nested canvas 命中，一旦鼠标落到当前 card 的 header / padding / 外壳区域，就可能被误判成“已出卡”

#### 重开条件

- 卡内控件拖动到相邻控件位置时仍不能挤开
- 卡内控件拖动结束后仍存在重叠或大块空洞
- 左侧 controls 投放到 card 后无法参与 card 内部自动排布
- 拖到某个控件顶部空隙并松手后，仍无法插入到该控件之前
- 拖动过程中 sibling 不产生原生 placeholder / 推开反馈，或连续拖拽后再次出现重叠
- 在整行纵向车道约束下，卡内连续拖拽仍会出现重叠 / 卡死

#### 维修方案

- 当前状态：`已完成`
- 使用 `COMPACT_GRID_COMPACTOR = getCompactor('vertical')` 恢复 RGL 原生纵向推开能力
- 让 `ResponsiveGridLayout` 在 compact card 内使用同一个纵向 compactor
- `normalizeCompactLayout` 先按 card 规则夹紧宽度与 `autoOccupyRow`，再执行纵向 compact
- 删除 drop / native drop / drag stop 中对 compact collision 的拒绝分支，避免覆盖 RGL 计算出的推开结果
- 当前采用原生 RGL 路径：
  - 卡内拖动时不再自行写 layout
  - 保留 `vertical` compactor，让库内部处理 collision / push-away / placeholder / compaction
  - `dragStop` / `resizeStop` 只把 RGL 给出的 `currentLayout` 归一化后写回 store
- 当前再补一层 compact 约束：
  - card 内非容器 controls 默认按整行处理
  - compact drop placeholder 与 native drop 宽度统一为整行
  - compact card 内的新增 / 移入控件统一从 `x = 0` 开始，收敛成一维纵向自动重排
- 卡内 grid 组件也收敛为单布局模式：
  - compact card 使用 `GridLayout`
  - page / 非 compact 区域继续使用 `ResponsiveGridLayout`
- 本轮追加：
  - 卡内同父级拖拽 / resize 的落库从 `onDragStop` 改为 `onLayoutChange`
  - `onDragStop` 仅保留跨层移入其他 card / 移出到底板的分支判断
  - store 更新 layout 时过滤 parentId 不匹配的陈旧 item
  - CSS 只在真实 `.react-draggable-dragging` 时关闭 transition，普通 sibling 保持 RGL 原生过渡
  - nested grid item 默认裁剪自身内容，拖拽中与 placeholder 仍允许可见反馈，减少视觉溢出造成的疑似重叠
  - `NestedCanvas` 改为仅跟踪容器宽度，不再因卡内高度变化重渲染
  - panel 内容区固定 `scrollbar-gutter`，降低滚动条显隐导致的宽度抖动
  - compact card 改为“左对齐纵向车道，但保留控件宽度”，只对显式 `autoOccupyRow` 项使用整行宽
  - 卡内外判定扩大到当前 card 外壳矩形，只要鼠标仍在当前 card 范围内，就不触发出卡预览或落到底板

#### 修复后回填项

- 根因确认：卡内 grid 使用了 no-compactor + preventCollision，并额外用碰撞检测回滚布局；后续几轮自定义重排又偏离了 RGL 原生拖拽状态机，尤其是拖动过程中外部写 layout，会和库内部 placeholder / 碰撞移动逻辑冲突，导致发涩、连续拖拽卡死或重叠；同时 compact card 仍保留了二维自由落点，导致库虽然是 vertical compact，但卡内控件仍可能带着非整行宽度与横向偏移进入布局，增加二次拖拽时的碰撞复杂度
- 本轮补充根因：RGL v2 的 `onDragStop` 会先调用外部回调，再清理 `activeDrag` 并提交内部 `setLayout`；此前在这个回调内同步写 Zustand，会让父级提前重渲染并干扰 RGL 的收尾。另有全局 CSS 把 `.react-grid-item` 的 transition 关闭，导致原生 sibling 让位动画不可见；store 的 `updateLayout` 也没有按 `parentId` 过滤陈旧 item，存在跨层移动后的旧父级回写风险
- 本轮继续补充：card 内部的 `ResizeObserver` 高度监听与滚动条宽度抖动，会让拖拽过程中父组件发生无关重渲染；这类抖动在第一次拖拽后更容易出现，所以会表现成“连续上下拖两次就卡住/重叠”
- 本轮继续补充：compact 约束里把所有非容器控件都视为 full-row，虽然有利于收敛为单列，但会直接锁死控件宽度；同时，跨层判定如果只看 nested canvas 本体，会忽略当前 card 的 header / padding / 外壳区域，造成“鼠标还在卡里却被误转场”
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `src/store/builderStore.ts`
  - `src/index.css`
  - `src/hooks/useContainerWidth.ts`
  - `src/builder/registry.tsx`
- 验证方式 / 回归结果：
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - 待人工确认：卡内控件上下拖动时相邻控件能自动让位，松手后布局向上压缩且不重叠

#### 更新日志

- `2026-04-17`：收到卡内控件无法自动排布反馈，定位到 compact compactor 与碰撞回退逻辑阻断 RGL 原生推开
- `2026-04-17`：完成修复，卡内 compact grid 恢复纵向 compactor，并移除卡内碰撞拒绝分支
- `2026-04-17`：根据“下方控件拖到上方顶部空隙仍放不进去”的复测反馈，补充释放点重排兜底，确保松手可按顺序插入
- `2026-04-17`：继续根据复测反馈修正，接入 `onDrag` 实时重排并排除源控件自身中线，补齐拖动过程中的挤压让位
- `2026-04-17`：用户反馈前端无可见变化后，已重启 `vite` 开发服务，排除 dev server / HMR 残留缓存影响
- `2026-04-17`：根据“连续拖还是会卡死”的复测反馈，确认需要回归库原生自动重排链路，移除卡内自定义实时重排与本地预览布局，收敛为 RGL 内部碰撞/占位/压缩 + 松手落库
- `2026-04-17`：继续根据“老样子，拖的不丝滑，连续两次就重叠卡到了”的反馈收敛 compact card 约束，改为卡内 controls 默认整行纵向车道，进一步贴合 RGL 原生 vertical compact 场景
- `2026-04-17`：继续排查后确认 card 内没有响应式 breakpoint 的真实需求，已把 compact card 从 `ResponsiveGridLayout` 切回单一 `GridLayout`，减少连续拖拽时的布局派生干扰
- `2026-04-17`：继续根据“没啥改变”反馈对照 sample，改为 RGL `onLayoutChange` 收尾后回写，限制 `onDragStop` 只处理跨层移动，并修复 store stale layout 过滤与 RGL 原生 transition 被 CSS 关闭的问题
- `2026-04-17`：继续按“老问题，不行”追查卡内连续拖拽，补掉 card 内高度监听导致的父组件重渲染，并固定 panel 滚动条槽位，减少二次拖拽时的宽度抖动
- `2026-04-17`：根据“控件宽度被锁死、卡内拖动容易误被转场到卡外”的复测反馈，放开 compact card 的控件宽度锁定，并把当前 card 外壳范围纳入卡内判定

---

### 13. 拖拽影子偶发滞留在卡内

- 状态：`deferred`
- 优先级：`low`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-18`
- 来源：`src/components/NestedCanvas.tsx`

#### 现象

- 控件跨卡内/卡外拖拽时，偶发出现拖拽影子已经开始转场，但占位/影子仍短暂停留在卡内的情况
- 问题是低频偶发，不稳定复现
- 当前不影响主要功能闭环，属于拖拽反馈层的小瑕疵

#### 当前判断

- 更像是拖拽影子转场与卡内 placeholder 清理时序存在偶发竞争
- 可能发生在卡内 placeholder 已进入收尾，但外层预览切换尚未完全接管的瞬间
- 现阶段不排除和跨层 drag/stop 事件顺序、RGL placeholder 清理节奏有关

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/builder/WidgetWrapper.tsx`
- `src/index.css`

#### 影响范围

- Kit Studio 卡内控件拖出/拖入时的视觉反馈一致性
- 拖拽体验观感

#### 当前处理决定

- 先记录，不在当前阶段花时间处理
- 当前以主功能稳定优先，不为这个低频视觉问题打断后续控件验证与修复
- 后续集中处理拖拽细碎体验问题时再统一回收

#### 重开条件

- 该问题复现频率明显升高
- 开始影响用户对落点判断
- 与其他拖拽 bug 串联，导致误操作或错误 drop

#### 维修方案

- 当前状态：`后续集中处理`
- 后续统一检查：
  - 卡内 placeholder 清理时机
  - 外层 drag preview 接管时机
  - drag stop / layout change / drop preview clear 的事件顺序
  - 相关 CSS 可见性切换是否存在一帧滞后

#### 修复后回填项

- 根因确认
- 实际改动文件清单
- 验证方式

#### 更新日志

- `2026-04-18`：记录“拖拽影子偶发滞留在卡内”的低频问题，暂不处理，留待后续统一优化拖拽体验时回收

---

## 后续新增记录模板

复制以下模板追加：

```md
### N. 问题标题

- 状态：`deferred`
- 优先级：`low`
- 首次记录时间：`YYYY-MM-DD`
- 最近更新时间：`YYYY-MM-DD`
- 来源：`path/to/file`

#### 现象

-

#### 当前判断

-

#### 相关文件

- `path/to/file`

#### 影响范围

-

#### 当前处理决定

-

#### 重开条件

-

#### 维修方案

- 当前状态：`待后续确定`

#### 修复后回填项

- 根因确认
- 实际改动文件清单
- 验证方式

#### 更新日志

- `YYYY-MM-DD`：首次登记
```
