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
- 最近更新时间：`2026-04-21`
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
- 最近更新时间：`2026-04-21`
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
- 早前曾临时采用“根层补一个 `Composite Content`”的折中方案
- 但从当前 Card Shell / Control 架构看，这会把子控件职责重新揉回根壳，不符合后续进口组件适配约束

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

- 当前采用“壳/控件分治”而非“根层合并配置”
- 保留 `panel` 根壳，不破坏当前模板渲染与嵌套编辑结构
- 右侧栏不再通过根卡片额外暴露 `Composite Content`
- 根层只显示 `Card Shell` 自身配置；标题、描述、按钮等内容改为选中实际子控件后分别配置
- 后续仍可继续评估是否把复合 card 根节点升级为独立运行时类型，但不能再回到把子控件字段捏进根壳 Inspector 的做法

#### 重开条件

满足以下任一条件时重开：

- 开始处理 `shadcn` block 级适配
- 开始让复合 card 支持专属右侧面板
- 开始定义 `CardDefinition` 与 `template root` 的正式映射规则

#### 维修方案

- 当前状态：`已按架构约束回退临时方案`
- 保留 `panel` 根壳，避免破坏现有嵌套渲染
- 删除根层 `Composite Content` 合并面板
- 根层 Inspector 恢复为纯 `Card Shell`
- 标题、描述、按钮、输入框等内容统一通过各自子控件的 Inspector 编辑

#### 修复后回填项

- 根因确认：`card_shadcn_login` 的根节点是 `panel`，真实可编辑内容在子控件上；把子控件字段并入根壳 Inspector 会打破 card shell / control 的职责边界
- 最终采用的复合 card 映射方案：保留根 `panel`，根层仅负责 `Card Shell`；内容字段回到各自子控件 Inspector
- 实际改动文件清单：
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/pages/BuilderPage.tsx`
- 验证覆盖的复合卡片列表：
  - `card_shadcn_login`

---

### 3. Card Shell 的 Overflow Inspector 交互形态不统一

- 状态：`resolved`
- 优先级：`low`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`Kit Studio` 右侧栏实际操作验证

#### 现象

- `Card Shell` 的 `Overflow` 区块仍沿用普通 section 结构
- 区块内部显示 `Enable Scrollbar` 勾选和文本行
- 与 `Header / Footer` 当前采用的单行右侧 checkbox 交互不一致

#### 当前判断

- 这不是 card shell 滚动语义本身的问题
- 问题在于 Inspector 契约和渲染形态未统一
- `Overflow` 本质上只有一个布尔开关，应该直接收敛为单行 section，而不是再展开出内部字段

#### 相关文件

- `src/kit/definitions/widgetDefinitions.ts`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/components/builder-page/InspectorPrimitives.tsx`

#### 影响范围

- `Card Shell` Inspector 的一致性
- 右侧栏视觉紧凑度
- 后续 shell 级布尔属性的统一设计方式

#### 当前处理决定

- 将 `Overflow` 调整为与 `Header / Footer` 同款的单行 section
- 右侧 checkbox 直接代表 `Enable Scrollbar`
- 不再显示内部勾选行与说明文本块

#### 重开条件

满足以下任一条件时重开：

- 需要让 `Overflow` 扩展为多种滚动策略
- 后续增加横向滚动、滚动条样式或滚动行为细分配置
- 右侧栏 section 规范再次调整

#### 维修方案

- 给 `overflow` section 增加 `toggleFieldId`
- 改为非折叠 section，并复用 compact toggle section 的右侧 checkbox 形态
- 当 section 没有额外内容字段时，不再渲染空 body

#### 修复后回填项

- 根因确认：`Overflow` 仍走普通 toggle section 渲染链，导致单一布尔属性被渲染成“标题 + 内部勾选项”的双层结构
- 最终采用方案：将 `Overflow` 收敛为单行右侧 checkbox section，直接映射 `props.scrollable`
- 实际改动文件清单：
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
- 验证方式 / 回归结果：
  - 在真实浏览器 `3000` 端口、同一窗口内强制刷新验证
  - 确认 `Overflow` 区块高度为单行，右侧为 checkbox，且不再渲染内部 body
  - 截图输出：`/mnt/c/Users/Administrator/AppData/Local/Temp/frontaiready-overflow-inspector.png`
- 是否需要后续追加清理：暂不需要

#### 更新日志

- `2026-04-21`：发现 `Overflow` 区块仍是旧的展开式 toggle 结构
- `2026-04-21`：开始修复，统一到 compact toggle section 体系
- `2026-04-21`：修复完成，并在真实浏览器中确认 `Overflow` 已变为单行 checkbox section

---

### 3. 根画布控件二次拖入 Card Shell 后高度被放大

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` 实际拖拽验证 / `temp/sample-hros/src/components/NestedCanvas.tsx`

#### 现象

- 控件先落在根画布时尺寸正常
- 但再次从根画布拖入 `Card Shell` 后，高度会被自动拉高
- 以 `Heading` 为例：
  - 根画布高度约 `54px`
  - 拖入卡内 hover placeholder 错误变成约 `86px`
  - 最终落地后也保持错误高度

#### 当前判断

- 问题不在控件本体渲染，而在**跨作用域拖入时的布局单位换算**
- 根画布与卡内 nested canvas 使用的高度语义不同：
  - 根画布控件高度按底层 root row 计算
  - 卡内控件高度按 `react-grid-layout` 的 `rowHeight + gap` 计算
- 如果把根画布已有控件的 `h` 直接原样带进卡内，就会把卡内 gap 一并放大进视觉高度

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `temp/sample-hros/src/components/NestedCanvas.tsx`

#### 影响范围

- 根画布已有控件二次拖入卡内
- 左侧 palette 新控件拖入卡内时的 placeholder 高度一致性
- 卡内 drop preview 与最终落地尺寸的一致性

#### 当前处理决定

- 已按最小改动修复
- 不改动控件定义，不改动根画布尺寸规则
- 只在 `NestedCanvas` 的“进入 compact nested canvas”链路补充高度换算

#### 重开条件

满足以下任一条件时重开：

- 后续再次出现“根画布正常、拖入卡内变高”的回归
- 调整 card 内部 `rowHeight / gap / compact` 规则
- 重构 root board 与 nested canvas 的尺寸协议

#### 维修方案

- 对照 `sample` 中 nested canvas 的处理方式，保持“进入卡内前先做高度语义转换”
- 在 `NestedCanvas.tsx` 中新增 root rows → compact rows 的换算
- 同步覆盖以下链路：
  - 根画布已有控件拖入卡内
  - 左侧 palette 新控件拖入卡内
  - 卡内 hover placeholder 预览

#### 修复后回填项

- 根因确认：根画布 `h` 直接进入 card 内 `react-grid-layout`，被 `rowHeight + gap` 重新解释，导致视觉高度膨胀
- 最终采用的修复方案：在 `NestedCanvas.tsx` 中引入进入 compact nested canvas 前的高度换算，并让 placeholder 与最终落地共用同一套换算
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
- 验证方式 / 回归结果：
  - 浏览器实测 `http://127.0.0.1:3002/`
  - 拖拽链路：`Heading` 先落根画布，再二次拖入 `Card Shell`
  - 实测结果：
    - 根画布：`448 × 54`
    - 卡内 placeholder：`416 × 52`
    - 卡内落地：`470 × 52`
  - 不再出现此前的 `54 → 86` 放大
- 是否需要后续追加清理：
  - 需要继续在后续布局底层整理时统一 root / nested 的尺寸换算协议，但当前主问题已闭环

#### 更新日志

- `2026-04-20`：发现根画布控件二次拖入卡内后高度被放大，登记问题
- `2026-04-20`：对照 `sample` 确认根因是 root rows 与 card 内 compact rows 的语义不一致，开始修复
- `2026-04-20`：完成 `NestedCanvas.tsx` 高度换算修复，并通过浏览器实测确认 `54 → 52 → 52`
- 是否需要补充模板迁移脚本：当前不需要

#### 更新日志

- `2026-04-15`：在 Kit Studio 实际验证中发现，`Shadcn Login` 模板可创建但 Inspector 仍命中通用 `panel` 壳定义，复合卡片字段暂不可直接编辑
- `2026-04-15`：开始修复，先补复合卡片内容面板与子控件 props 映射链路
- `2026-04-15`：先行采用临时方案，在根壳 Inspector 增加 `Composite Content`
- `2026-04-21`：根据 Card Shell / Control 架构约束回退该临时方案；Shadcn Login 根层恢复为纯 `Card Shell` Inspector，内容字段改回各子控件独立编辑

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
- 最近更新时间：`2026-04-20`
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
- 第三轮回访补充了一条同类边界：
  - 控件从 `A` 卡拖向 `B` 卡时，释放点如果命中的是 nested canvas / placeholder 等中间 DOM
  - 仅依赖 `elementFromPoint(...)->祖先容器` 的目标卡判断，存在漏命中风险
- 第四轮回访补充了一条预览层问题：
  - `A -> B` 的实际落地虽然已经成立
  - 但拖拽过程中，旧卡 `A` 的 placeholder 仍可见，而目标卡 `B` 没有承接对应预览
  - 导致视觉上像是影子还停留在老卡
- 修复后确认：
  - `root -> card` 可把底板控件归入卡片
  - `card -> root` 可把卡片内控件拖回底板
  - `card -> root -> card` 闭环重新成立
  - `card A -> card B` 直接转场也重新纳入同一套释放点判定
  - `card A -> card B` 的拖拽预览也会随目标卡切换，不再残留在旧卡

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
- 本轮补充 release-point container fallback：
  - 先走原有 `elementFromPoint` 容器命中
  - 失败时再按释放坐标扫描可见 card 容器 bounding box，兜底锁定目标卡
- 本轮继续补充 preview handoff：
  - 当控件从 `A` 卡拖向 `B` 卡时，源卡 placeholder 进入隐藏态
  - 目标卡按当前落地语义显示自定义 cross-card preview

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
  - `NestedCanvas` 在卡内控件拖拽时新增目标卡坐标兜底命中，避免 `A -> B` 直接转场因中间 DOM 命中不稳定而漏判
  - `NestedCanvas` 新增 cross-card preview 事件与目标卡预览渲染
  - 源卡在 cross-card 过程中隐藏自身 placeholder，避免旧预览残留

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
  - `src/index.css`
- root -> card 回归结果：通过
- card -> root 回归结果：通过
- card -> root -> card 回归结果：已通过 Chrome DevTools MCP 脚本化拖拽回归验证
- card A -> card B 回归结果：已通过浏览器实测；同时回归验证 `root -> A`、`A -> B`、`B -> root` 三段链路均保持正常
- card A -> card B 预览回归结果：
  - 浏览器实测中，源卡 placeholder 为隐藏态
  - 目标卡 `B` 显示正确的 cross-card preview
  - 实际落地结果保持不变

#### 更新日志

- `2026-04-15`：收到实际反馈，开始修复 Kit Studio 跨层拖拽链路
- `2026-04-15`：修复完成，已用实际 DOM 拖拽事件验证 `root -> card -> root` 双向链路
- `2026-04-17`：二次回访确认 root leaf control 仍存在“能拖出不能再拖入”的遗漏链路，重新进入修复
- `2026-04-17`：补齐 root leaf control 的智能拖拽手柄与 release-point fallback，并通过 Chrome DevTools MCP 脚本化拖拽验证 `card -> root -> card`
- `2026-04-20`：按“控件可直接从 A 卡拖出进入 B 卡”的回访要求，再次检查跨卡转场释放点判定
- `2026-04-20`：在 `NestedCanvas` 增加目标卡坐标兜底命中，并用浏览器实测回归 `root -> A -> B -> root`
- `2026-04-20`：继续回访发现 `A -> B` 时预览仍残留在源卡；补充 cross-card preview handoff，并通过浏览器实测确认预览已转移到目标卡

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

### 14. Vite Dev 首次热载入偶发沿用旧 Inspector 模块

- 状态：`deferred`
- 优先级：`low`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` / `Card Shell` 实操验证

#### 现象

- 完成 `Card Shell` 右栏字段补充后，首次打开前端并进入 `Kit Studio` 验证时
- 页面实际仍显示旧版 Inspector 字段集，只出现 `Title / Layout / Show Header`
- 重新启动一次 `vite dev` 后，再次进入页面，新增字段全部正常出现：
  - `Show Footer`
  - `Footer Text`
  - `Enable Scrollbar`
  - `Padding X`
  - `Padding Y`
  - `Gap`

#### 当前判断

- 当前更像是开发态热载入 / 浏览器会话状态的偶发残留
- 不是本次 `Card Shell` 运行时代码本身未生效
- 因为重启前端后，字段渲染、store 同步、DOM 联动均已通过实操验证

#### 相关文件

- `src/kit/definitions/widgetDefinitions.ts`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/components/builder-page/WidgetInspectorPanel.tsx`

#### 影响范围

- 开发阶段的调试效率
- 首轮验证时对“是否真的生效”的判断准确性
- 可能造成一次误判，以为功能未接通

#### 当前处理决定

- 当前不进入主线修复
- 后续若再次出现，再专项检查 `vite dev` / HMR / 本地会话缓存链路
- 现阶段继续保持“重要结构改动后做一次前端重启”的验证习惯

#### 重开条件

- 同类现象复现频率明显升高
- 不重启前端时，经常出现 Inspector 字段与源码不一致
- 开始影响后续 card / control 适配效率

#### 维修方案

- 当前状态：`待后续确定`
- 后续排查方向：
  - `vite` 开发态模块替换是否漏掉 definition/inspector 依赖链
  - 浏览器页签是否保留旧的 builder 运行态状态
  - `WidgetInspectorPanel` 与 `StudioDefinitionInspector` 的刷新触发条件

#### 修复后回填项

- 根因确认
- 实际改动文件清单
- 验证方式

#### 更新日志

- `2026-04-18`：在 `Card Shell` 首轮实操验证时发现一次“旧 Inspector 字段残留”现象；重启前端后恢复正常，暂记为低优先级开发态问题

---

### 2. Card Shell 内部 padding 仅左 / 上生效

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-18`
- 来源：`src/components/NestedCanvas.tsx`

#### 现象

- `Card Shell` 右侧栏原先只有 `paddingX / paddingY`
- 实操时左侧与顶部视觉上会变化，但右侧与底部不稳定或几乎不生效
- 旧实现还不支持分别控制左/右、上/下

#### 当前判断

- 根因不是 Inspector 没写入，而是 grid 模式依赖 React Grid Layout 的对称 `containerPadding`
- 该模型天然不适合表达四边独立 padding，也不利于底部留白的稳定呈现

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/builder/registry.tsx`
- `src/builder/widgetConfig.ts`
- `src/store/builderStore.ts`
- `src/kit/definitions/widgetDefinitions.ts`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/runtime/RuntimeCanvas.tsx`
- `src/runtime/RuntimeRegistry.tsx`
- `docs/card-shell-panel-technical-note.md`

#### 影响范围

- Kit Studio 内 card shell 的 spacing 可视化
- 后续进口组件时 card 内部布局基准
- runtime 预览与 builder 一致性

#### 当前处理决定

- 已改为四边 padding 模型：`Left / Right / Top / Bottom`
- 新增 `Horizontal Same` 与 `Vertical Same`
- 保留对旧 `paddingX / paddingY` 数据的读取兼容

#### 维修方案

- 当前状态：`已完成`
- 关键做法：
  - grid 模式不再依赖旧的对称 `containerPadding`
  - 外层 host 直接承担四边 padding
  - 内部 grid 宽度按左右 padding 扣减后再参与布局计算
  - store 在 `Horizontal Same / Vertical Same` 开启时自动同步对应两侧数值

#### 修复后回填项

- 根因确认：旧的对称 padding 模型无法覆盖四边独立 spacing 诉求
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `src/builder/registry.tsx`
  - `src/builder/widgetConfig.ts`
  - `src/store/builderStore.ts`
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `src/runtime/RuntimeCanvas.tsx`
  - `src/runtime/RuntimeRegistry.tsx`
  - `docs/card-shell-panel-technical-note.md`
- 验证方式：
  - `npm run build`
  - `npm run lint -- --pretty false`
  - 浏览器内置调试：在 `3001` 的 `Kit Studio` 页签中实测
    - 独立模式测得 `paddingLeft=36px / paddingRight=10px / paddingTop=28px / paddingBottom=18px`
    - 联动模式测得 `paddingLeft=24px = paddingRight=24px`、`paddingTop=20px = paddingBottom=20px`

#### 更新日志

- `2026-04-18`：记录 `Card Shell` padding 只对左 / 上稳定生效的问题
- `2026-04-18`：完成四边 padding + 水平 / 垂直联动改造，并完成浏览器实测回填

---

### 15. Card Shell 水平 padding 左右不对等

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-18`
- 来源：`Kit Studio` 实际操作验证 / `Card Shell` Inspector

#### 现象

- 在 `Horizontal Same` 关闭后，分别把 `Padding Left` 与 `Padding Right` 先设为 `0`，再分别设为 `10`
- 虽然 Inspector 数值与 DOM padding 都已更新，但 card 内左右可用内容边界仍然肉眼不对等
- 对比 `sample` 项目的 panel 行为，当前项目会额外在右侧留出一段隐性空列

#### 当前判断

- 不是 Inspector 写值问题，也不是 panel shell 透传问题
- 根因在 `NestedCanvas` 的 compact grid 算法：内部 controls 使用的有效列数被人为减掉了一列，导致右侧始终残留隐藏 gutter
- 因此即使 `Left/Right` 数值相同，视觉上的左右边界也不会等宽

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/builder/WidgetWrapper.tsx`
- `src/pages/BuilderPage.tsx`
- `src/builder/widgetConfig.ts`
- `docs/card-shell-panel-technical-note.md`

#### 影响范围

- `Card Shell` 的水平 padding 视觉正确性
- Kit Studio 中 card 内 controls 的对齐基线
- 后续 panel / nested canvas 与 `sample` 算法对齐的可信度

#### 当前处理决定

- 已按最小改动修复
- 保留现有四边 padding 数据结构与 Inspector 配置
- 只移除 compact grid 内部多出来的一列隐藏 gutter，不顺带改动其他拖拽与重排逻辑
- 后续又清理了 `WidgetWrapper` 与 Inspector 里的旧 `cols - 1` 逻辑，避免控件是否占满一行影响左右 padding 观感
- card shell 根层缩放把手改为复用原生 `react-resizable-handle` 类，不再额外挂一个风格不同的自定义按钮
- 卡内非占行 controls 的同排行拖拽，改为在 drag 过程中按当前行 DOM 宽度做实时撑宽预判，不再等 drop 后才扩卡

#### 重开条件

满足以下任一条件时重开：

- 再次出现 `Left/Right` 同值但左右边界不对等
- 后续 card 内 controls 支持多列自由横向布局时出现新的宽度约束问题
- 需要进一步把 compact 模式和 sample 的 panel 算法继续完全收敛

#### 维修方案

- 当前状态：`已完成`
- 将 compact 模式的有效内容列数恢复为父 card 的完整列数
- 不再额外扣除一列作为隐藏右侧 gutter
- 保持 host 四边 padding + 内部 grid 宽度反推这套现有结构不变
- controls 默认改为 `autoOccupyRow=true`；取消占行的自由控件不再按 card shell 宽度同比例放大
- 根层 card shell 缩放把手外观回归原生 resize handle
- 非占行 controls 在拖拽悬停阶段就触发 card shell 宽度预判扩展
- 最新宽度规则：只有锁定占行的 controls 跟随 card shell 拉宽；非占行 controls 使用 `最小宽度 → 固定首选宽度` 区间，整行最小边界按该行所有 controls 的最小宽度总和 + gap 计算
- 二次修正：非占行 controls 的首选宽度改为记录 grid 列宽，不再用当前 panel 像素宽度重新采样，避免 card shell 拉宽后把自由控件从 `w=9` 改写为 `w=10/13`
- 回归修正：对照 `sample/hros-strategic-cockpit` 后，移除 card shell “放入控件自动撑宽 / 拖拽悬停临时扩列 / 宽度回写”这整条自定义链路，恢复为 `react-grid-layout` 自身布局算法 + 外层壳手动 resize

#### 修复后回填项

- 根因确认：`NestedCanvas` 的 compact grid 通过隐藏一列的方式收缩内容宽度，同时 `WidgetWrapper` 和 Inspector 仍有旧的 `cols - 1` 残留，导致控件不占满一行时更容易暴露右侧隐性 gutter
- 交互补充：根层 card shell 不是 RGL item，之前额外做了一个自定义缩放按钮，视觉和控件原生缩放把手不一致；同时卡内非占行 controls 的扩卡判定滞后到 drop 之后，导致同排行拖放无法成立
- 进一步确认：之前 card shell 缩放只是改了外层像素宽度，`NestedCanvas` 仍会把这段预览宽度当成正式宽度参与子布局重算，导致缩放过程中持续写 store、触发卡壳崩溃；同时同排行扩卡只改像素外壳，没有同步提升 compact grid 的临时列数，因此拖拽占位始终判定“放不下”
- 算法冲突确认：非占行 controls 若继续随 card shell 同比放大，会让同排行 controls 的总宽度随卡壳无限膨胀，反而破坏“多个非占行控件塞入同一行”的判定
- 二次根因确认：`preferredCompactWidthPxRef` 使用像素宽度做首选值，root card shell 扩宽 / NestedCanvas 重挂后会按新 panel 宽度重新采样，导致非占行 controls 被误认为拥有更大的首选宽度，并由 metric effect 写回布局
- sample 对照确认：sample 的 `NestedCanvas` 不做任何按子控件自动撑宽 card shell 的逻辑；panel 宽度只由外层 RGL / resize 决定，内部 layout 只在 `onLayoutChange` / drag-stop 后回写 store
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `src/builder/WidgetWrapper.tsx`
  - `src/pages/BuilderPage.tsx`
  - `src/builder/widgetConfig.ts`
  - `docs/card-shell-panel-technical-note.md`
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - 代码级对照 `sample` 的 panel / nested canvas 算法
  - `npm run lint -- --pretty false`
  - `npm run build`
  - Playwright/CDP：root card shell 从 `w=18` 拉到 `w=26` 后，子 controls 的 store layout 保持原值，card 不再因为内部 controls 自动被撑宽
  - Playwright/CDP trace：root card shell resize 后只出现 `updateLayoutItem('panel_test', 'root', { w: 26 })`，不再有内部 panel layout 自动扩宽写入
  - Playwright/CDP：注入 `panel_test + button_a/button_b`，验证 root card shell 从 `w=18` 拉到 `w=26` 后，非占行 controls 的 store layout 保持原列宽，不再被写成更宽列数
  - Playwright/CDP trace：确认 root card shell 拉宽后只写 root panel `w=26`，不再追加 `panel_test` 子布局扩宽写入
  - 继续在 Kit Studio 中验证 `Left=Right` 时左右边界是否等宽，以及占行 / 非占行 controls 的宽度约束是否一致
  - 重点回归：根层 card shell 缩放不再崩溃；非占行 controls 拖入同一行时，hover 阶段就能临时扩卡并允许落位
- 是否需要后续追加清理：`否`，若后续扩展多列自由布局，再单独评估 compact 规则

#### 更新日志

- `2026-04-18`：发现 `Card Shell` 水平 padding 左右不对等，定位到 compact grid 隐藏右侧 gutter
- `2026-04-18`：移除 compact grid 的隐藏 gutter 列，恢复左右 padding 同值时的对等计算
- `2026-04-18`：继续清理 `cols - 1` 残留，默认 controls 占满一行，并接入同一行 controls 反向撑宽 card shell 的宽度约束
- `2026-04-18`：将根层 card shell 缩放把手切回原生 `react-resizable-handle` 风格，并把非占行 controls 的扩卡判定提前到 drag 悬停阶段
- `2026-04-18`：根层 card shell 缩放改为纯预览态，预览期间暂停 `NestedCanvas` 的宽度联动写入，避免缩放崩溃
- `2026-04-18`：同排行扩卡从“只拉宽像素外壳”改为“同步提升 compact grid 临时列数”，并修正非占行控件落位时不再被强制写回 `x=0`
- `2026-04-18`：移除非占行 controls 随 card shell 同比放大的逻辑，改为只允许锁定占行控件跟随拉宽；非占行同排按行内最小宽度总和约束卡壳最小收窄边界
- `2026-04-18`：用 Playwright/CDP 复现并修正二次扩宽：非占行 controls 的首选宽度从像素采样改为列宽记录，root card shell 拉宽后子控件列宽保持稳定
- `2026-04-18`：重新对照 sample 后，撤销 card shell 自动撑宽方案，回归 `react-grid-layout` 默认布局行为；root 壳宽只保留手动 resize，不再由内部控件拖放驱动自动扩宽

---

### 16. Card Shell 根层拉宽预览被截断

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-18`
- 来源：`src/builder/WidgetWrapper.tsx`

#### 现象

- root `Card Shell` 从右下角继续拉宽时，内部内容在拖拽过程中会被截断
- 视觉上像“没有实时渲染”，但实际是预览宽度只作用到了最内层 `widget-wrapper`
- 松手落地后最终宽度正常，问题只出现在 drag preview 阶段

#### 当前判断

- 根因不是 `NestedCanvas` 的实时布局回写
- Playwright/CDP 复现确认：mid-drag 时 `widget-wrapper` 已经变成 `684px`，但外层 `ProjectThemeScope` 仍停留在旧宽度 `504px`
- 该宿主带有 `contain-paint`，因此虽然下层节点允许 `overflow: visible`，绘制区域仍被旧宽度裁切

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/theme/ProjectThemeScope.tsx`

#### 影响范围

- Kit Studio 根层 `Card Shell` 的手动缩放预览体验
- 容易误判为 card shell 宽度没有实时响应
- 影响后续对 card shell 尺寸系统的调试判断

#### 当前处理决定

- 保持现有 root resize 方案不变
- 只补齐 drag preview 期间的宽度同步宿主
- 不回退 `contain-paint`，避免波及其他主题/渲染隔离逻辑

#### 重开条件

- 再次出现 root card shell 拉宽过程中右侧内容被裁切
- `ProjectThemeScope` 与 `widget-wrapper` 的 mid-drag 宽度重新出现不同步
- 后续 ReactFlow node 外层也引入新的裁切宿主

#### 维修方案

- 当前状态：`已完成`
- 在 `WidgetWrapper` 的 root resize 预览链路中：
  - 继续给 `widget-wrapper` 写入临时 `width/min-width`
  - 同步给最近的 `.project-theme-scope--inline` 写入同样的临时宽度
  - pointer end / unmount 时清理这组 preview 样式

#### 修复后回填项

- 根因确认：live preview 宽度没有同步到带 `contain-paint` 的主题宿主，导致预览绘制区域仍按旧宽度裁切
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
- 验证方式：
  - Playwright/CDP：mid-drag 时 `wrapperStyleWidth=684px`、`hostStyleWidth=684px`
  - Playwright/CDP：mid-drag 时 `wrapperWidth=684`、`hostWidth=684`，而 ReactFlow node 仍可保持旧宽度 `504`
  - Playwright/CDP：pointer up 后 `wrapperStyleWidth=''`、`hostStyleWidth=''`，最终 layout 落地为 `w=24`
  - 截图留档：`temp/captures/root-resize-mid-fixed.png`

#### 更新日志

- `2026-04-18`：发现 root card shell 拉宽预览时被裁切，初步怀疑不是实时渲染
- `2026-04-18`：用 Playwright/CDP 定位到 `ProjectThemeScope(contain-paint)` 未同步预览宽度
- `2026-04-18`：补齐 preview host 宽度同步与清理逻辑，浏览器复测通过

---

### 17. Card Shell 根层缩放柄只能横向拉宽

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-18`
- 来源：`src/builder/WidgetWrapper.tsx`

#### 现象

- root `Card Shell` 右下角缩放柄只能改变宽度
- 鼠标向下拖动时，card shell 高度没有跟随变化
- 这和 `sample` 中 panel 作为 RGL item 时天然支持宽高双向 resize 的行为不一致

#### 当前判断

- 当前项目 root Kit Studio 底板使用 ReactFlow，不是 sample 的根层 RGL
- 因此 root card shell 不能直接获得 RGL 的原生宽高 resize，需要 `WidgetWrapper` 自己把右下角 handle 转成 root layout 的 `w/h`
- 之前实现只计算 `deltaX -> w`，没有计算 `deltaY -> h`

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/components/NestedCanvas.tsx`

#### 影响范围

- Kit Studio 根层 `Card Shell` 手动调整高度
- Card shell 后续 header/footer/scrollbar/padding 调试
- 与 sample panel resize 行为的体验一致性

#### 当前处理决定

- 保留 root ReactFlow 底板结构
- 不重写为根层 RGL
- 只在现有 root resize 预览链路中补齐纵向高度计算
- 内部 padding 规则不做改动，继续保持：
  - 水平：`paddingLeft / paddingRight + linkHorizontalPadding`
  - 垂直：`paddingTop / paddingBottom + linkVerticalPadding`

#### 重开条件

- 缩放柄再次只能改宽不能改高
- root card shell 高度预览被裁切
- 垂直 padding 在 resize 后出现 top/bottom 不对等

#### 维修方案

- 当前状态：`已完成`
- 在 root resize session 中记录：
  - `startY`
  - `startHeightPx`
  - `pixelPerRow`
  - `minRows`
  - `lastRows`
  - `lastHeightPx`
- pointer move 时同步计算：
  - `deltaX -> nextCols`
  - `deltaY -> nextRows`
- drag preview 阶段同步写入：
  - `widget-wrapper width/height/min-width/min-height`
  - `.project-theme-scope--inline width/height/min-width/min-height`
- pointer up 时一次性写回 root layout：
  - `{ w: nextCols, h: nextRows }`

#### 修复后回填项

- 根因确认：root card shell 不是 RGL item，现有自定义 handle 只把 `deltaX` 写回 `w`，没有把 `deltaY` 写回 `h`
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
- 验证方式：
  - Playwright/CDP：从 `w=18/h=12` 斜向拖拽到 mid-drag，`wrapperStyleWidth=564px`、`wrapperStyleHeight=396px`
  - Playwright/CDP：同一时刻 `.project-theme-scope--inline` 同步为 `hostStyleWidth=564px`、`hostStyleHeight=396px`
  - Playwright/CDP：pointer up 后 root layout 落地为 `w=20/h=18`
  - Playwright/CDP：padding 验证 `paddingTop=20px`、`paddingBottom=20px`、`paddingLeft=20px`、`paddingRight=20px`
  - `npm run lint -- --pretty false`
  - `npm run build`

#### 更新日志

- `2026-04-18`：对照 sample 确认 panel resize 应支持宽高双向
- `2026-04-18`：补齐 root resize 纵向计算、预览样式同步与 layout `h` 写回
- `2026-04-18`：浏览器验证通过，并确认垂直 padding 仍和水平 padding 使用同一套联动规则

---

### 18. Card Shell 底部 padding 未贴齐卡壳底边

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-18`
- 最近更新时间：`2026-04-20`
- 来源：`src/components/NestedCanvas.tsx`

#### 现象

- root `Card Shell` 被手动拉高后，卡内底部 padding 看起来不对
- 实际表现不是 `paddingBottom` 数值没写入，而是 compact 模式下的 nested canvas 没有撑满 card body
- 因此底部 padding 只停留在内容宿主自身的底边，没有贴到整个 card shell 底边
- 二次复查发现：`scrollable=false` 自动高度模式下，非空内容仍会被默认 `minH=8` 和 compact drop-zone 最小高度影响，导致底部视觉间距不能像右侧 padding 一样按数值实时贴合

#### 当前判断

- 这是 `compact + scrollable=true` 下的高度承载问题
- 旧实现里 nested canvas host 使用 `min-h-full`，会按内容高度停住，而不是随 card body 一起拉满
- Playwright/CDP 复现时：
  - scroll body 高度 `526px`
  - nested canvas host 高度只有 `248px`
  - host 底边距离 scroll 底边还有 `278px`
- 所以用户看到的是“底部 padding 不对”，本质是底部画布宿主没贴到底
- 二次根因补充：
  - `scrollable=false` 时，父级 root layout 的默认 `minH=8` 会阻止 card shell 按内容高度向下收敛
  - `compactDropZoneMinHeight` 原本对空卡与非空卡都生效，非空内容较少时会额外制造一段底部空白
  - 右侧 padding 已经按 `gridCanvasWidth = canvasWidth - paddingLeft - paddingRight` 实时计算；底部也需要用真实内容高度反推 card shell 高度，而不是继续混入默认 drop-zone 高度

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/builder/registry.tsx`

#### 影响范围

- Kit Studio 中高卡壳的底部 padding 观感
- 卡内底部空白区的拖放/落点预期
- card shell 的纵向 spacing 认知一致性

#### 当前处理决定

- 不改四边 padding 数据结构
- 不改 `scrollable=false` 的 auto-grow 算法
- 只修正 `compact + scrollable=true` 时 nested canvas 的高度承载方式

#### 重开条件

- 再次出现 card shell 拉高后，nested canvas 只停在内容高度
- 底部空白区仍不属于卡内画布
- `scrollable=false` 的 auto-grow 被新逻辑误伤

#### 维修方案

- 当前状态：`已完成`
- 对 `compact + scrollable=true`：
  - 用 `ResizeObserver` 读取 card body 的可视高度
  - 将该高度只作为 outer host / inner `GridLayout` 的最小高度
  - 保持 `GridLayout.autoSize=true`，让内容超出时继续自动撑开并触发滚动条
- 对 `scrollable=false`：
  - 保持原来的 `min-h-full + autoSize`，继续按内容自动撑高
- 二次修正：
  - 非空 card 使用真实 `layoutMaxY` 计算内部 grid 内容高度
  - `compactDropZoneMinHeight` 只作为空 card 的可投放区域，不再压住已有控件的底部 padding
  - 自动高度写回 root layout 时允许下调过高的 `minH`，但不把 `minH` 上调到内容高度，避免之后开启 scrollbar 时被内容高度锁死

#### 修复后回填项

- 根因确认：底部 padding 数值本身正确，但 compact nested canvas 在可滚动模式下没有填满 card body，导致 paddingBottom 没贴齐 card shell 底边
- 二次根因确认：自动高度模式下混入了 root 默认 `minH` 与非空卡的 drop-zone 最小高度，导致底部实际间距不能像右侧 padding 一样由配置值直接决定
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
- 验证方式：
  - Playwright/CDP（修复前）：`scrollHeight=526`、`hostHeight=248`、`hostAtScrollBottom=278`
  - Playwright/CDP（修复后）：`scrollHeight=526`、`hostHeight=526`、`hostAtScrollBottom=0`
  - Playwright/CDP：内容超出时 `clientHeight=262`、`scrollHeight=1064`、`hasScrollbar=true`
  - Playwright/CDP：`paddingTop=20px`、`paddingBottom=40px`
  - Playwright/CDP：`scrollable=false` 回归下仍保持 `visualTopGap=20`、`visualBottomGap=40`
  - Playwright/CDP（二次修复）：单个默认高度控件 `paddingBottom=9px` 时，`bottomFooter=9`、`bottomHost=9`、`right=10`
  - Playwright/CDP（二次修复）：同一控件改为 `paddingBottom=30px` 后，`bottomFooter=30`、`bottomHost=30`，且 `minH` 只保留下调后的 `7.7272727272727275`
  - Playwright/CDP（二次修复）：三控件场景 `paddingBottom=9px` 时，`bottomFooter=9`、`hostToFooter=0`、`right=10`
  - Playwright/CDP（二次修复）：scrollbar 溢出场景滚动到底后，`paddingBottom=30px` 对应 `bottomFooter=30`、`bottomHost=30`
  - 截图留档：
    - `temp/captures/panel-bottom-padding-check.png`
    - `temp/captures/panel-bottom-padding-fixed.png`
  - `npm run lint -- --pretty false`
  - `npm run build`

#### 更新日志

- `2026-04-18`：定位到“底部 padding 不对”实际是 nested canvas 没撑满 card body
- `2026-04-18`：修正 compact scrollable card shell 的 host / GridLayout 高度承载
- `2026-04-18`：浏览器回归确认 `scrollable=false` 未受影响
- `2026-04-20`：修正前次 `h-full + autoSize=false` 方案导致默认滚动条和内容自动撑开失效的问题，改为测量 card body 高度并仅作为最小高度
- `2026-04-20`：二次修复 `scrollable=false` 下 root 默认 `minH` 与非空 drop-zone 最小高度导致的底部 padding 不实时贴合问题；无头浏览器、lint、build 均通过

---

### 19. Card Shell 启用滚动条后左右 padding 偏移

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`src/builder/registry.tsx` / `src/components/NestedCanvas.tsx`

#### 现象

- `Card Shell` 配置相同的 `Padding Left / Padding Right`
- `scrollable=false` 时，控件到 card body 左右内缘的可视距离等于配置值
- `scrollable=true` 但内容高度足够、滚动条未出现时，右侧 padding 不应提前计算滚动条宽度
- 只有内容真实溢出、滚动条现身时，右侧外缘才应多出滚动条宽度；`paddingRight` 本身仍表示控件到滚动条左边缘的距离

#### 当前判断

- 不是 Inspector 写值问题，也不是 `paddingLeft / paddingRight` 本身没生效
- card body 使用 `scrollbar-gutter: stable both-edges` 时，即使没有真实滚动条，也会左右各预留 gutter
- 这会把“启用滚动能力”误当成“滚动条已经出现”，导致无溢出状态下也提前扣掉滚动条空间
- 正确语义应使用浏览器默认 `scrollbar-gutter: auto`：无溢出不预留；真实溢出时再由滚动条自然占位

#### 相关文件

- `src/builder/registry.tsx`
- `src/components/NestedCanvas.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 中启用滚动条的 card shell
- 左右 padding 的视觉一致性
- 启用 / 禁用 scrollbar 时控件宽度和落点的稳定性

#### 当前处理决定

- 移除 `scrollbar-gutter: stable both-edges`
- 不改四边 padding 数据模型
- 不再对 nested canvas host 做 both-edges 横向补偿
- 让真实滚动条出现时自然减少 body 的 `clientWidth`，使 host 右边界停在滚动条左侧

#### 重开条件

- 启用滚动条后，左侧到 card body 内缘不是配置值
- 启用滚动条后，右侧到滚动条左边缘不是配置值
- 无真实滚动条时，右侧仍然提前计入滚动条宽度
- 真实滚动条出现后，右侧 padding 被算到 card body 外缘而不是滚动条左边缘

#### 维修方案

- 当前状态：`已完成`
- 删除 card body 的 `scrollbarGutter: stable both-edges`
- 保持 `overflow-y-auto`：
  - 无溢出时不出现滚动条，`offsetWidth === clientWidth`
  - 有溢出时滚动条自然出现，`clientWidth` 扣除滚动条宽度
- nested canvas host 继续 `w-full`，因此：
  - 无滚动条时 `paddingRight` 到 card body 外缘
  - 有滚动条时 `paddingRight` 到滚动条左边缘

#### 修复后回填项

- 根因确认：`scrollbar-gutter: stable both-edges` 会在无真实滚动条时也预留 gutter，违背“只有滚动条现身才计算滚动条宽度”的产品语义
- 实际改动文件清单：
  - `src/builder/registry.tsx`
  - `src/components/NestedCanvas.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - Playwright/CDP（修复前）：`scrollable=false` 时 `leftFromBody=20 / rightFromBody=20`
  - Playwright/CDP（修复前）：`scrollable=true` 时 `leftFromBody=26 / rightFromBody=26`
  - Playwright/CDP（最终修复）：`scrollable=false` 时 `gutterTotal=0 / leftToBody=20 / rightToBodyOuter=20`
  - Playwright/CDP（最终修复）：`scrollable=true` 但无真实滚动条时 `gutterTotal=0 / leftToBody=20 / rightToBodyOuter=20`
  - Playwright/CDP（最终修复）：`scrollable=true` 且真实滚动条出现时 `gutterTotal=6 / leftToBody=20 / rightToScrollbarEdge=20 / rightToBodyOuter=26`
  - `npm run lint -- --pretty false`
  - `npm run build`

#### 更新日志

- `2026-04-20`：定位滚动条开关引发的左右 padding 偏差来自 `stable both-edges` gutter
- `2026-04-20`：按实际 gutter 对 nested canvas host 做反向补偿，CDP、lint、build 均通过
- `2026-04-20`：根据产品语义修正为只补偿左侧 fake gutter；右侧 padding 以控件到滚动条左边缘为准，不包含滚动条宽度
- `2026-04-20`：最终修正为移除稳定 gutter；只有滚动条真实出现时才由浏览器自然扣除滚动条宽度

---

### 21. Kit Studio root Card Shell 行高出现小数

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` Inspector 实操反馈 / `src/components/NestedCanvas.tsx`

#### 现象

- root `Card Shell` 在自动高度 / 内部边距跟随后
- 右侧 Inspector 的 `Rows` 或 `Min Rows` 会出现小数
- 示例现象：`Rows = 16.09090909`

#### 当前判断

- root `Card Shell` 虽然使用 ReactFlow 作为根层承载，但它的 `w / h / minW / minH` 仍然是母板网格语义
- 这组值应该继续保持整数，不能出现小数行高
- 小数来自 `scrollable=false` 自动高度反推时，root kit 场景曾直接写回 `rawTargetHeight`

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 右侧 Inspector 的布局参数可读性
- root card shell 的网格约束一致性
- 后续 root 卡壳缩放、自动高度、最小高度判断

#### 当前处理决定

- 保持自动高度机制
- 不再允许 root card shell 的 `h / minH` 写回小数
- 统一向上取整，继续服从根层整数网格

#### 重开条件

- root `Card Shell` 的 `Rows` 再次出现小数
- `Min Rows` 再次出现历史遗留小数
- 自动高度改完后出现明显的底部 padding 回退问题

#### 维修方案

- 当前状态：`已完成`
- `NestedCanvas` 自动高度回写中：
  - `targetHeight` 统一改为 `Math.ceil(rawTargetHeight)`
  - 历史遗留的 `currentMinHeight` 先做整数化，再参与比较与写回

#### 修复后回填项

- 根因确认：此前 root kit 场景为了贴合自动高度，直接写回了未取整的 `rawTargetHeight`，导致 root card shell 的 `h / minH` 出现小数
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - 进入 `Kit Studio`
  - 选择启用自动高度的 root `Card Shell`
  - 检查 Inspector 中 `Rows / Min Rows` 为整数
  - 用户实测确认：问题已解决

#### 更新日志

- `2026-04-20`：收到 root card shell `Rows` 出现小数的反馈
- `2026-04-20`：定位到自动高度写回时 root kit 场景直接使用 `rawTargetHeight`
- `2026-04-20`：修正为 root card shell 统一写回整数行高，并同步收口历史遗留小数 `minH`
- `2026-04-20`：用户实测确认已解决，保持当前方案结案

---

### 20. Card Shell 在 Fit board 后缩放会破坏右侧包裹

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` 实操反馈 / `src/builder/WidgetWrapper.tsx`

#### 现象

- 在 Kit Studio 工具栏点击 `Fit board` 后，再拖动 root `Card Shell` 右下角缩放柄
- 已经稳定的内部控件与卡壳约束会被打破
- 主要表现为 card shell 右边距无法继续正确包裹内部控件

#### 当前判断

- 问题由 ReactFlow `fitView()` 改变 viewport zoom 后触发
- root card shell 的自定义 resize 预览链路仍按屏幕像素写入 `widget-wrapper` 和 `.project-theme-scope--inline`
- 当 viewport zoom 不是 `1` 时，屏幕像素被误当作 ReactFlow 内部逻辑像素，导致预览阶段卡壳 CSS 宽度被缩小
- `NestedCanvas` 原先用 `getBoundingClientRect()` 测宽，在 ReactFlow zoom 后会读到被缩放后的视觉宽度，进一步把内部 grid 宽度误算小

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`
- `src/hooks/useContainerWidth.ts`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio root `Card Shell` 在非 1 倍 zoom 下的手动缩放
- Card shell 内部 controls 的右侧 padding / 包裹约束
- `Fit board`、小地图缩放、手动缩放视口后的后续 card resize 操作

#### 当前处理决定

- 保留 `Fit board` / `fitView()` 行为
- 保留现有 root ReactFlow 底板和自定义 card resize 方案
- 只修正 resize 预览与 nested canvas 测宽的坐标系

#### 重开条件

- `Fit board` 后再次缩放 root card shell，右侧 padding 无法包裹内部控件
- ReactFlow zoom 不为 `1` 时，card shell resize 预览宽度和最终落地宽度不一致
- 卡内 grid 在视口缩放后按视觉宽度而不是布局宽度计算

#### 维修方案

- 当前状态：`已完成`
- `WidgetWrapper`：
  - 解析最近 ReactFlow viewport 的 transform scale
  - pointer move 的 `deltaX / deltaY` 先除以 zoom，再换算为 root layout `w / h`
  - 预览阶段写入的是未缩放的 ReactFlow 逻辑 CSS 宽高，而不是屏幕视觉宽高
- `useContainerWidth`：
  - 增加 `measureMode: 'layout' | 'visual'`
  - layout 模式用 `clientWidth / clientHeight`，避免被 CSS transform scale 影响
- `NestedCanvas`：
  - 卡内布局测宽改用 `measureMode: 'layout'`

#### 修复后回填项

- 根因确认：`Fit board` 后 ReactFlow zoom 不是 `1`，root resize 和 nested canvas 测宽混用了屏幕视觉像素与布局逻辑像素
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/NestedCanvas.tsx`
  - `src/hooks/useContainerWidth.ts`
  - `docs/debug-record.md`
- 验证方式：
  - `npm run lint -- --pretty false`
  - `npm run build`
  - 用户实测：`Fit board -> 拖动 root Card Shell 缩放柄`，右侧包裹约束恢复正常

#### 更新日志

- `2026-04-20`：收到 `Fit board` 后拖动 card shell 缩放柄会破坏右侧包裹约束的反馈
- `2026-04-20`：定位到 ReactFlow zoom 后 root resize 预览和 nested canvas 测宽混用坐标系
- `2026-04-20`：修复为 resize 使用 ReactFlow 逻辑像素、NestedCanvas 使用 layout 宽度测量；类型检查与生产构建通过
- `2026-04-20`：根据复测反馈继续收敛，root resize 不再固定使用 `pointerdown` 时的 viewport scale，改为 `pointermove/pointerup` 按当前 ReactFlow scale 实时取值，避免 `Fit board` 动画或后续视口变化影响落地宽度
- `2026-04-20`：用户实测确认已修复，保持当前方案结案

---

### 21. 右侧属性栏仍残留 ID / TYPE 元数据

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` 实操反馈 / `src/components/BuilderShellPanels.tsx`

#### 现象

- 用户要求右侧属性栏不再显示控件、卡片、项目、页面或关系的 `ID / TYPE` 类元数据
- 前几轮只移除了局部显示入口，`3002` 页面中仍能看到相关字段
- 主要残留包括 `Project ID`、`Shell ID`、`Relation ID`、`Relation Type` 以及 widget definition 内的 `Runtime Type` / `Component ID`

#### 当前判断

- 问题不是样式缓存，而是元数据入口分散在多条 inspector 链路
- `WidgetInspectorPanel` 的顶部字段已经移除，但 `widgetDefinitions.ts` 仍保留 `codeSection`
- 壳层相关面板 `ProjectContractPanel`、`PageShellInspectorPanel`、`RelationInspectorPanel` 也有独立只读字段
- 仅在渲染层过滤 `section.id === 'code'` 不够稳，源头定义仍会让后续复用或新面板重新暴露该字段

#### 相关文件

- `src/kit/definitions/widgetDefinitions.ts`
- `src/components/BuilderShellPanels.tsx`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 右侧属性栏的可用空间
- 控件 / card shell / 项目壳 / 页面壳 / 页面关系的属性配置体验
- 后续新增 controls 时 inspector 定义的默认展示规则

#### 当前处理决定

- 不改拖拽、布局、card shell 尺寸算法
- 不删除业务可配置的 `Input Type`、`Action Type` 等功能型选项
- 只移除系统内部元数据的可见展示入口

#### 重开条件

- 右侧属性栏再次出现 `Project ID`、`Shell ID`、`Relation ID`、`Relation Type`
- 控件定义 inspector 中再次出现 `Runtime Type` 或 `Component ID`
- 新增 controls 时默认把内部 `id / type` 字段暴露给用户

#### 维修方案

- 当前状态：`已完成`
- `widgetDefinitions.ts`：
  - 删除 `readonlyField` helper 与 `codeSection`
  - 移除所有 control/card inspector 内的 `codeSection` 引用
- `BuilderShellPanels.tsx`：
  - 移除 `Project ID`、`Shell ID`、`Relation ID`、`Relation Type` 的只读展示块
  - 保留 `projectId` / `relation` props 类型兼容，不影响现有调用链
- `StudioDefinitionInspector.tsx`：
  - 移除临时 `code` section 过滤兜底，改回完全由源头 definition 决定展示

#### 修复后回填项

- 根因确认：右栏字段入口分布在 widget definition、项目壳面板、页面壳面板和关系面板，前几次只删了局部 UI，源头和旁路仍会显示
- 实际改动文件清单：
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/components/BuilderShellPanels.tsx`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - `rg -n "Component ID|Component Type|Runtime Type|Project ID|Shell ID|Relation ID|Relation Type|codeSection|readonlyField" src -S`
  - `npm run lint -- --pretty false`
  - `npm run build`
  - `curl http://127.0.0.1:3002/` 返回 `200`
  - `3002` 开发服源码检索无上述字段残留
  - `npm run verify:kit-inspector`

#### 更新日志

- `2026-04-20`：收到右侧栏仍残留 `ID / TYPE` 的复测反馈
- `2026-04-20`：定位到 widget definition 的 `codeSection` 和 shell panels 的只读元数据字段仍在
- `2026-04-20`：完成源头删除与壳面板同步清理，lint、build、源码检索与 `3002` 响应均通过
- `2026-04-20`：浏览器实测拖入 `Card Shell` 后复现残留，进一步确认 `3002` Vite 旧进程裸模块 URL 仍返回旧 transform 缓存；重启 `3002` 后用浏览器禁用缓存复测，`Component ID / Component Type / Runtime Type / Project ID / Shell ID / Relation ID / Relation Type / Code` 均为 `0`
- `2026-04-20`：固定回测入口为 `npm run verify:kit-inspector`，脚本使用 Playwright 自带 Chromium，自动补用户态运行库，并输出 `temp/kit-studio-inspector-verify.png`

---

### 22. 根画布控件改宽度后二次拖动预览未同步

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-21`
- 来源：`Kit Studio` 实操反馈 / `src/components/KitFactoryBoard.tsx`

#### 现象

- 根画布上的控件在右侧栏修改 `Cols` 后，控件本体尺寸已更新
- 但再次抓起该控件拖动时，根画布上的落点预览仍沿用旧宽度
- 实际表现为拖动代理是新尺寸，`.kit-board-drop-preview` 和 `.react-flow__node-preview` 仍是旧尺寸
- 后续继续暴露同类问题：控件进出 Card Shell 时，落点影子有时按目标布局列宽重算，而不是按当前拖拽本体像素尺寸显示

#### 当前判断

- 不是控件 DOM 尺寸没更新，真实拖动代理已经读取到最新宽度
- 根因在于 `KitFactoryBoard` 的 `dragover` 预览回退逻辑
- 现有根控件拖动时，自定义事件 `kit-root-drop-preview` 已带出正确 `width=224`
- 但随后板面 `updateDropPreview` 在读不到 `dataTransfer` 的已拖动 widget 信息时，回退到 `draggedType` 默认尺寸，按 `Heading` 默认 `16 cols` 重新覆盖成 `448px`
- 2026-04-21 补充判断：
  - 根画布 drop preview 和跨卡 preview 应以当前拖拽本体的 DOM 像素尺寸为视觉真值
  - 逻辑布局 `w/h` 只能用于最终落地和碰撞计算，不能反过来改变拖拽影子的视觉尺寸

#### 相关文件

- `src/components/KitFactoryBoard.tsx`
- `src/components/NestedCanvas.tsx`
- `scripts/verify-kit-studio-inspector.mjs`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 根画布控件的二次拖动反馈
- 控件宽度调整后的拖拽可预判性
- 后续所有依赖 `draggedType` 默认回退的根层预览逻辑
- 控件在 `Card Shell ↔ 根画布`、`A 卡 ↔ B 卡` 之间转场时的影子尺寸一致性

#### 当前处理决定

- 不改左侧栏新控件拖入逻辑
- 不改卡内控件拖拽与转场逻辑
- 仅阻断“已有控件拖动代理存在时，被默认控件预览覆盖”的路径

#### 重开条件

- 根画布已有控件修改宽度后，再次拖动时预览宽度与控件本体不一致
- `.kit-board-drop-preview` 与 `[data-widget-drag-proxy="true"]` 宽度再次出现不一致
- 固定回测脚本重新报出根画布拖拽预览宽度错误

#### 维修方案

- 当前状态：`已完成`
- `KitFactoryBoard.tsx`：
  - 初版曾增加活动拖拽代理检测 `ACTIVE_WIDGET_DRAG_PROXY_SELECTOR`
  - 最终改为根控件拖拽会话事件 `kit-root-drag-session`
  - 在根画布 `updateDropPreview` 中，若当前处于根控件拖拽会话，则不再回退到 `draggedType` 默认预览
  - 2026-04-21 补充：根画布 preview 节点视觉宽高改为优先使用拖拽事件带出的当前本体像素宽高
- `NestedCanvas.tsx`：
  - 2026-04-21 补充：跨卡 preview 事件增加当前本体 `previewWidth / previewHeight`
  - 跨卡落点影子优先使用本体像素尺寸，避免进入不同宽度卡壳时按目标列宽重算导致忽大忽小
- `verify-kit-studio-inspector.mjs`：
  - 新增“拖入 Heading → 修改 `Cols=8` → 二次拖动”的固定浏览器回测
  - 校验 `.kit-board-drop-preview`、`.react-flow__node-preview`、拖动代理、本体拖动态四者宽度一致，且为 `224px`
  - 输出截图 `temp/kit-studio-root-preview-width-verify.png`
- `index.css`：
  - 提高 `.kit-board-drop-preview` 的边框、填充和阴影强度
  - 让根画布拖拽时的落点影子在实际浏览器画面里更容易辨认

#### 修复后回填项

- 根因确认：真实问题不是宽度变更失败，而是已有控件拖动时，正确的自定义根预览被 `draggedType` 默认尺寸回退覆盖
- 实际改动文件清单：
  - `src/components/KitFactoryBoard.tsx`
  - `src/components/NestedCanvas.tsx`
  - `src/index.css`
  - `scripts/verify-kit-studio-inspector.mjs`
  - `docs/debug-record.md`
- 验证方式：
  - `node --check scripts/verify-kit-studio-inspector.mjs`
  - `npm run lint -- --pretty false`
  - `npm run build`
  - `npm run verify:kit-inspector`
  - 浏览器回测结果中 `.kit-board-drop-preview` / `.react-flow__node-preview` / `[data-widget-drag-proxy="true"]` / `.widget-wrapper[data-widget-dragging="true"]` 宽度均为 `224`

#### 更新日志

- `2026-04-20`：收到“改控件宽度数值后，影子没跟着变”的进一步澄清
- `2026-04-20`：浏览器探针确认自定义根预览事件已发出 `224px`，但随后被根画布 `draggedType` 默认预览覆盖为 `448px`
- `2026-04-20`：初版补丁通过活动拖动代理检测阻断默认尺寸回退
- `2026-04-20`：复测反馈出现“影子消失 / 拖动发卡”，定位到初版补丁在 `dragover` 高频阶段做 DOM 扫描，带来额外阻塞并干扰预览时机
- `2026-04-20`：将判定改为根控件拖拽会话事件 `kit-root-drag-session`，移除 `dragover` 内 DOM 扫描；浏览器复测确认普通二次拖动与改宽度后二次拖动两条链路的影子均恢复正常
- `2026-04-20`：继续收到“没影子了”的人工反馈；浏览器截图确认 DOM 仍在，但落点影子视觉对比度偏低，于是增强 `.kit-board-drop-preview` 的边框、填充和阴影强度，并重启 `3002` 复测
- `2026-04-20`：补充固定浏览器回测脚本并实测通过，输出 `temp/kit-studio-root-preview-width-verify.png`
- `2026-04-21`：收到“控件进出卡片的影子大小不稳定，影子永远要跟本体一样大”的反馈；修正根画布 preview 与跨卡 preview 的视觉尺寸真值，统一优先使用拖拽本体像素宽高

---

### 23. 右侧属性栏 Size / Pixel Constraints 分组顺序调整

- 状态：`resolved`
- 优先级：`low`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` 实操反馈 / `src/components/builder-page/WidgetInspectorPanel.tsx`

#### 现象

- 右侧属性栏中 `Size` 与 `Pixel Constraints` 分组位于 definition inspector 前部
- 用户要求这组尺寸相关配置移动到 `Border` 分组上方，调整为更符合编辑顺序的布局

#### 当前判断

- 这是 inspector 展示顺序问题，不涉及布局算法、拖拽、尺寸计算或字段写入逻辑
- `Size / Pixel Constraints` 是 `WidgetInspectorPanel` 的外层固定分组
- `Border` 来自 definition inspector 的 `frame` section，因此需要支持在 definition section 前插入外部自定义分组

#### 相关文件

- `src/components/builder-page/WidgetInspectorPanel.tsx`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 控件右侧属性栏分组顺序
- 控件配置时尺寸与边框相关字段的阅读路径

#### 当前处理决定

- 已完成最小改动
- 不改字段定义、不改字段值、不改 `Border` 本身逻辑
- 仅调整有 `Border` section 的 definition inspector 渲染顺序

#### 重开条件

- `Size / Pixel Constraints` 再次出现在属性栏顶部而不是 `Border` 上方
- 新增控件 definition 后，带 `Border` 的控件未按新顺序渲染

#### 维修方案

- 当前状态：`已完成`
- `StudioDefinitionInspector` 增加 `renderBeforeSection` 插槽能力
- `WidgetInspectorPanel` 将 `Size / Pixel Constraints` 抽成可插入分组
- 当 definition 存在 `frame / Border` section 时，把尺寸相关分组插入到 `Border` 前
- 没有 `Border` section 的组件维持原先外层顺序

#### 修复后回填项

- 根因确认：尺寸分组是外层固定渲染，无法自然落在 definition inspector 内部的 `Border` 前
- 实际改动文件清单：
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - `npm run lint -- --pretty false`
  - 浏览器实测 `Heading` 控件右侧属性栏顺序为 `Control -> Content -> Typography -> Size -> Pixel Constraints -> Border -> Layout -> Handoff -> Bindings -> Actions`
  - `npm run verify:kit-inspector`

#### 更新日志

- `2026-04-20`：收到右侧属性栏分组顺序调整反馈，要求将截图中的尺寸配置块移动到 `Border` 上方
- `2026-04-20`：完成 inspector 插槽与分组顺序调整，并通过浏览器读取 section 顺序确认生效

---

### 24. Alignment 最后一个选项未实现“拉伸占行”效果

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`Kit Studio` 实操反馈 / `src/utils/typography.ts`

#### 现象

- `Typography -> Alignment` 的最后一个选项当前使用 `J / justify` 图形表示
- 但实际在画布中切换后，效果与左对齐几乎一致
- 用户预期该选项的语义应为“拉伸占行”，而不是无变化

#### 当前判断

- 问题不是 inspector 按钮无效，而是运行时缺少 `justify/stretch` 的专门渲染语义
- 当前实现里：
  - `left / center / right` 会映射到 flex 对齐类
  - `justify` 没有单独实现，最终会回退到左对齐
- 文本类控件如果只依赖原生 `text-align: justify`，单行内容也难以产生明显拉伸效果

#### 相关文件

- `src/utils/typography.ts`
- `src/builder/registry.tsx`
- `src/runtime/RuntimeRegistry.tsx`
- `src/index.css`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 中 `Heading / Text / Button / Card Shell Header/Footer` 的最后一个对齐选项
- 运行时页面与编辑态画布的对齐语义一致性

#### 当前处理决定

- 最终按产品决定移除该效果
- `Alignment` 只保留 `左 / 中 / 右`
- 历史上已写入的 `justify` 值统一回退为 `left`
- 不改控件布局尺寸、拖拽、占行规则

#### 重开条件

- `Alignment` 面板再次出现第 4 个选项
- 历史 `justify` 值没有正确回退为左对齐
- 后续如果产品重新决定恢复 `Stretch / Fill`，可在这条记录上继续演进

#### 维修方案

- 当前状态：`已完成`
- `typography.ts`：
  - 移除 `Alignment` 的第 4 个选项
  - 将历史 `justify` 值统一规范化为 `left`
- `builder/registry.tsx` 与 `runtime/RuntimeRegistry.tsx`：
  - 移除上一版临时加入的 `stretch` 渲染分支
- `index.css`：
  - 移除 `justify/stretch` 对应的 inspector 图形和运行时样式

#### 修复后回填项

- 根因确认：最后一个对齐选项的产品语义并不稳定；继续保留会引入额外实现和理解偏差，因此按最终要求直接收敛为三态对齐
- 实际改动文件清单：
  - `src/utils/typography.ts`
  - `src/builder/registry.tsx`
  - `src/runtime/RuntimeRegistry.tsx`
  - `src/index.css`
  - `docs/debug-record.md`
- 验证方式：
  - `npm run lint -- --pretty false`
  - 浏览器实测：`Alignment` 面板只剩 `L / C / R`
  - 浏览器源码确认：不再暴露 `justify` 选项
  - 历史 `justify` 值渲染时回退为左对齐
  - `npm run verify:kit-inspector`
  - `npm run build`

#### 更新日志

- `2026-04-20`：收到“Alignment 最后一个效果应为拉伸占行，但当前未实现”的反馈
- `2026-04-20`：补充 `justify/stretch` 语义分支，并通过浏览器实测确认最后一个选项已进入拉伸态
- `2026-04-20`：根据最终产品决定移除该效果，只保留 `左 / 中 / 右` 三态对齐，并将历史 `justify` 值统一回退为左对齐

---

### 25. 控件默认占行状态与底布缩放柄不一致

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-20`
- 最近更新时间：`2026-04-20`
- 来源：`src/builder/widgetConfig.ts`

#### 现象

- 新增控件默认会勾选 `Auto occupy row`
- 控件落在 Kit Studio 底布后看不到右下角缩放柄，只有卡内控件或 Card Shell 才能缩放

#### 当前判断

- 控件默认行为与当前产品目标不一致：应默认允许非占行布局，便于后续同排组合
- 底布缩放能力不是布局引擎缺失，而是根层 `WidgetWrapper` 只给根层 `panel` 渲染了自定义缩放柄，普通控件被条件分支排除了
- 卡内新增控件还有两处紧凑布局入口硬编码成 `autoOccupyRow: true`，会让默认值与实际落地行为不一致

#### 相关文件

- `src/builder/widgetConfig.ts`
- `src/components/NestedCanvas.tsx`
- `src/builder/WidgetWrapper.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 左侧新增控件后的默认布局行为
- 控件从左侧拖入卡内时的初始宽度与占行状态
- 控件在底布上的尺寸调整能力

#### 当前处理决定

- 将控件默认 `Auto occupy row` 改为未勾选
- 同步修正卡内新增控件的默认紧凑布局入口，避免仍按占行宽度落地
- 保持 Card Shell 原有缩放逻辑不变，只补开底布普通控件的同套缩放柄

#### 重开条件

- 新增控件后右侧栏仍默认勾选 `Auto occupy row`
- 控件从左侧拖入卡内后仍直接铺满整行
- 控件在底布选中后仍不出现右下角缩放柄

#### 维修方案

- 当前状态：`已完成`
- `widgetConfig.ts`：
  - 将控件默认 `autoOccupyRow` 从 `true` 改为 `false`
- `NestedCanvas.tsx`：
  - 将卡内新增控件的两处紧凑布局默认行为从占行改为非占行
- `WidgetWrapper.tsx`：
  - 放开 Kit Studio 根层普通控件的右下角缩放柄
  - 复用现有根层缩放逻辑，不改 Card Shell 已有缩放路径

#### 修复后回填项

- 根因确认：默认值、卡内新增入口、底布缩放柄渲染条件三处没有统一到同一套控件契约
- 实际改动文件清单：
  - `src/builder/widgetConfig.ts`
  - `src/components/NestedCanvas.tsx`
  - `src/builder/WidgetWrapper.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - 浏览器实测：新增控件后 `Auto occupy row` 默认未勾选
  - 浏览器实测：控件在底布选中后出现右下角缩放柄并可调整尺寸
  - `npm run verify:kit-inspector`
  - `npm run lint -- --pretty false`

#### 更新日志

- `2026-04-20`：收到“控件默认不要勾选自动占行、底布控件也需要缩放柄”的反馈
- `2026-04-20`：确认根因分别位于控件默认 props、卡内新增紧凑布局入口、根层控件缩放柄渲染条件
- `2026-04-20`：按最小改动完成修复，并进入浏览器回测

---

### 26. 右侧栏 Size 未实时跟随缩放

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/builder/WidgetWrapper.tsx`

#### 现象

- 在 Kit Studio 底布拖动右下角缩放柄时，画布中的控件/卡壳会变化
- 但右侧栏 `Size -> Cols / Rows` 只在松手后才更新，拖动过程中不是实时值

#### 当前判断

- 右侧栏 `Size` 本身直接读取当前选中 layout
- 根因不在 inspector，而在根层缩放逻辑：`WidgetWrapper` 在拖动中只改本地预览样式，直到 `pointerup` 才调用 `updateLayoutItem`
- 因此 UI 已预览变化，但 inspector 没有拿到对应的实时尺寸预览，导致拖动中显示旧值

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/pages/BuilderPage.tsx`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 底布 Card Shell 缩放
- Kit Studio 底布普通控件缩放
- 右侧栏 `Size` 与画布缩放的双向交互一致性

#### 当前处理决定

- 保留现有缩放预览样式逻辑
- 在缩放过程中发出根层尺寸预览事件，让 inspector 读取实时 `Cols / Rows`
- 不改 inspector 结构，不改松手后的最终 store 落地逻辑

#### 重开条件

- 拖动缩放柄时右栏 `Cols / Rows` 仍停留旧值
- 拖动过程中右栏更新，但松手后最终值回跳
- 实时写回导致缩放卡顿、闪烁或破坏既有尺寸约束

#### 维修方案

- 当前状态：`已完成`
- `WidgetWrapper.tsx`：
  - 在根层缩放 `pointermove` 的 `requestAnimationFrame` 中派发实时 `Cols / Rows` 预览事件
  - 在 `pointerup` 后清除预览事件，并保留最终 `updateLayoutItem` 写回
- `BuilderPage.tsx`：
  - 监听根层尺寸预览事件
  - 当当前选中项就是正在缩放的根层节点时，用预览值覆盖右栏 `Size` 展示

#### 修复后回填项

- 根因确认：缩放预览与 inspector 数据源分离，导致拖动中右栏拿不到实时尺寸
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/pages/BuilderPage.tsx`
  - `docs/debug-record.md`
- 验证方式：
  - 浏览器实测：按住缩放柄拖动时，右栏 `Cols / Rows` 实时变化
  - 浏览器实测：通过右栏直接改 `Cols / Rows` 后，画布尺寸同步变化
  - `npm run verify:kit-inspector`
  - `npm run lint -- --pretty false`
  - `npm run build`

#### 更新日志

- `2026-04-21`：收到“右侧栏 size 数据要实时跟随缩放变化，形成双向交互”的反馈
- `2026-04-21`：确认根因是根层缩放只在 `pointerup` 时提交 layout，拖动过程中 inspector 读取不到实时值
- `2026-04-21`：收敛方案为“缩放预览事件 + inspector 预览覆盖 + 松手后最终 store 落地”
- `2026-04-21`：完成实现并进入浏览器回测

---

### 27. 右侧栏 Spacing 配置区过高

- 状态：`resolved`
- 优先级：`low`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/kit/inspector/StudioDefinitionInspector.tsx`

#### 现象

- Card Shell 的 `Spacing` 区块中，水平 padding 与垂直 padding 串行排列，占用 6 行
- 右侧栏滚动压力偏大，配置密度不够紧凑

#### 当前判断

- 这是右侧栏展示结构问题，不涉及 Card Shell 的实际 padding / gap 算法
- `Gap` 仍应单独保留一行，避免和 padding 语义混在一起

#### 相关文件

- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/index.css`
- `docs/debug-record.md`

#### 影响范围

- Kit Studio 中 Card Shell 的 `Spacing` inspector 展示
- 不影响布局计算、拖拽、缩放、滚动条和 padding 数据结构

#### 当前处理决定

- 将 `Horizontal Same + Left + Right` 作为水平小块
- 将 `Vertical Same + Top + Bottom` 作为垂直小块
- 两个小块并排显示，将 6 行压缩为 3 行；`Gap` 单独一行保持不变

#### 重开条件

- `Spacing` 区块再次退回 6 行串行排列
- `Gap` 被合并进水平/垂直小块
- 修改展示结构后影响 padding / gap 的读写

#### 维修方案

- 当前状态：`已完成`
- `StudioDefinitionInspector.tsx`：
  - 为 Card Shell 的 `spacing` section 增加专用紧凑渲染模板
- `index.css`：
  - 增加两列并排小块样式
  - 保持 `Gap` 使用原来的完整单行宽度
  - 移除不稳定的原生 number spinner，改成统一的自定义小步进按钮，避免紧凑布局下内部溢出
- `InspectorPrimitives.tsx`：
  - 新增统一的 `InspectorNumberInput`，供 inspector 内所有数字输入复用

#### 修复后回填项

- 根因确认：通用 inspector 串行渲染不适合四向 padding 的密集配置，而原生 number spinner 在不同环境里尺寸不稳定
- 实际改动文件清单：
  - `src/components/builder-page/InspectorPrimitives.tsx`
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `src/index.css`
  - `docs/debug-record.md`
- 验证方式：
  - 浏览器实测：`Horizontal Same / Vertical Same` 并排
  - 浏览器实测：`Padding Left / Padding Top` 并排，`Padding Right / Padding Bottom` 并排
  - 浏览器实测：`Gap` 仍单独一行
  - `KIT_STUDIO_VERIFY_URL=http://127.0.0.1:3000/ npm run verify:kit-inspector`
  - `npm run lint -- --pretty false`

#### 更新日志

- `2026-04-21`：收到“把 Spacing 收紧，水平和垂直拆成 2 小块并排，Gap 保持单独一行”的反馈
- `2026-04-21`：完成专用 inspector 布局和样式，并通过 3000 端口浏览器回测
- `2026-04-21`：根据后续视觉反馈，放弃继续压原生 spinner，改为统一的自定义小步进按钮
- `2026-04-21`：针对“小按钮内部溢出/看起来没变化”复测，确认按钮仍继承浏览器 `appearance: button`；已改为无原生外观、10px 宽自定义步进按钮

---

### 28. Card Shell 新增父级控制与内部跟随

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`Kit Studio` 属性面板 / `Card Shell`

#### 现象

- 控件的 `Border` 只有 `Solid / None`
- 卡壳无法统一驱动内部控件的边框与字体
- 需要在卡壳右侧增加一层“父级控制”，减少批量调样式时逐个点控件的成本

#### 当前判断

- 这是 Card Shell -> child controls 的局部样式继承能力缺口
- 不应把子控件属性重新写回根壳数据
- 应保留控件独立属性，同时增加：
  - 控件侧的可选继承模式
  - 卡壳侧的批量跟随开关

#### 相关文件

- `src/kit/definitions/widgetDefinitions.ts`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/builder/WidgetWrapper.tsx`
- `src/runtime/RuntimeRegistry.tsx`
- `src/runtime/RuntimeCanvas.tsx`
- `src/runtime/RuntimeNode.tsx`
- `src/index.css`

#### 影响范围

- 全部控件的 `Border` 配置选项
- Card Shell 的 `Typography` 与 `Border` inspector 结构
- 编辑态 Kit Studio 中子控件对父级字体/边框策略的即时跟随
- 运行态 nested canvas 的字体跟随一致性

#### 当前处理决定

- 控件 `Font` / `Border` 新增 `Parent controlled`
- Card Shell 新增独立 `Border` 分组
- Card Shell 的 `Font` 与 `Border` 字段右侧新增 `Internal follow`
- 跟随逻辑分两层：
  - 父级 `Internal follow = true`：父级开放该属性的跟随通道
  - 子控件 `Parent controlled`：子控件显式同意接收父级值
  - 两者同时成立时才真正生效

#### 重开条件

- 控件 `Font / Border` 下拉缺失 `Parent controlled`
- Card Shell 缺失 `Border` 分组或 `Internal follow`
- 勾选卡壳跟随且子控件选择 `Parent controlled` 后，内部控件的边框/字体不实时变化
- 嵌套 card 时 `Parent controlled` 无法继续向上解析

#### 维修方案

- 当前状态：`已完成`
- `widgetDefinitions.ts`：
  - 抽出统一 `BORDER_STYLE_OPTIONS`
  - 控件 `Border` 增加 `Parent controlled`
  - 控件 `Font` 增加 `Parent controlled`
  - Card Shell 新增 `Border` section
  - Typography 增加 `childrenFollowFont`
- `StudioDefinitionInspector.tsx`：
  - 为 `Font` / `Border` 增加右侧 inline checkbox
  - panel 的 `Border` section 改为“选择器 + 跟随开关”同排展示
- `WidgetWrapper.tsx`：
  - 新增父级边框解析与编辑态有效 props 继承
- `RuntimeCanvas.tsx` / `RuntimeNode.tsx` / `RuntimeRegistry.tsx`：
  - 新增运行态字体/边框跟随透传，保持预览一致

#### 修复后回填项

- 根因确认：原系统只有控件本地样式，没有建立 Card Shell 到 child controls 的样式控制桥；同时需要避免父级勾选后无条件覆盖全部子控件
- 实际改动文件清单：
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/builder/WidgetWrapper.tsx`
  - `src/runtime/RuntimeRegistry.tsx`
  - `src/runtime/RuntimeCanvas.tsx`
  - `src/runtime/RuntimeNode.tsx`
  - `src/index.css`
  - `docs/debug-record.md`
- 验证方式：
  - `npm run lint -- --pretty false`
  - `KIT_STUDIO_VERIFY_URL=http://127.0.0.1:3000/ npm run verify:kit-inspector`
  - 浏览器实测：Card Shell `Typography -> Font` 右侧存在 `Internal follow`
  - 浏览器实测：Card Shell `Border` 分组存在 `Internal follow`
  - 浏览器实测：控件 `Font / Border` 下拉存在 `Parent controlled`
  - 浏览器实测：仅父级勾选 `Internal follow` 时，未选 `Parent controlled` 的 Heading 保持原样
  - 浏览器实测：Heading 选择 `Parent controlled` 后，卡壳 `Font=Geist + Internal follow` 使其字体变为 `Geist Variable`
  - 浏览器实测：Heading 选择 `Parent controlled` 后，卡壳 `Border=None + Internal follow` 使其 wrapper 变为 `data-widget-border-style=\"transparent\"`

#### 更新日志

- `2026-04-21`：收到需求，要求为控件增加 `Parent controlled`，并让 Card Shell 提供 `Border / Font` 的内部跟随
- `2026-04-21`：完成 inspector、编辑态继承链路与运行态透传，并通过 3000 浏览器回测
- `2026-04-21`：根据补充约束收紧逻辑，改为“父级 follow + 子控件 Parent controlled”双向确认后才生效

### 29. Parent controlled 默认值与内置模板未统一

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/builder/widgetConfig.ts`

#### 现象

- 新增的 Card Shell 与 controls 已有“父级控制 / 内部跟随”能力，但新拖入的默认值没有统一对齐
- 左侧 `Cards > Card Shell` 这类内置模板，实例化后仍可能沿用旧 props，而不是最新默认规则
- 需要把“默认值策略”和“内置模板落地值”统一，否则后续批量导入 shadcn / 外部组件时会出现基座不一致

#### 当前判断

- 默认规则此前只落在部分 inspector / 运行态链路里，缺少创建新节点时的统一入口
- `DEFAULT_WIDGET_PROPS` 与 `assetLibrary node()` 之间没有形成同一套默认 props 注入链

#### 相关文件

- `src/builder/widgetConfig.ts`
- `src/builder/assetLibrary.ts`
- `docs/debug-record.md`

#### 影响范围

- 新建 Card Shell 的默认 Typography / Border 跟随行为
- 新建 controls 的默认 Font / Border 取值
- 左侧内置模板实例化后的初始 props 一致性

#### 当前处理决定

- 控件默认：
  - `Font = Parent controlled`
  - `Border = Parent controlled`
- Card Shell 默认：
  - `Font = Theme`
  - `Typography Internal follow = true`
  - `Border = Solid`
  - `Border Internal follow = true`
- 内置模板统一走 `cloneDefaultWidgetProps(type)` 注入默认 props，再叠加模板自定义字段

#### 重开条件

- 新拖入的 Card Shell 默认不是 `Theme + Internal follow`
- 新拖入的 Heading / Button / Input 等控件默认不是 `Parent controlled`
- 左侧内置模板实例与直接新建实例表现不一致

#### 维修方案

- 当前状态：`已完成`
- `widgetConfig.ts`：
  - 控件默认 `fontFamily` 改为 `parent`
  - 控件默认 `borderStyle` 改为 `parent`
  - Card Shell 默认 `fontFamily=theme`
  - Card Shell 默认开启 `childrenFollowFont`
  - Card Shell 默认 `controlBorderStyle=solid`
  - Card Shell 默认开启 `childrenFollowBorder`
- `assetLibrary.ts`：
  - `node()` helper 统一 merge `cloneDefaultWidgetProps(type)`
  - 保证左侧内置模板与直接新建控件共享同一默认值入口

#### 修复后回填项

- 根因确认：默认值规则没有在“创建新节点”和“内置模板实例化”两个入口同时收口，导致父级控制能力已存在，但默认落地仍旧分叉
- 实际改动文件清单：
  - `src/builder/widgetConfig.ts`
  - `src/builder/assetLibrary.ts`
  - `docs/debug-record.md`
- 验证方式：
  - 重启 `3000` 开发服，确认 `http://127.0.0.1:3000/src/builder/widgetConfig.ts?raw` 与 `http://127.0.0.1:3000/src/builder/assetLibrary.ts?raw` 已吐出最新源码
  - 浏览器实测：根画布新拖入 `Heading`，右侧默认显示 `Font=Parent controlled`、`Border=Parent controlled`
  - 浏览器实测：新拖入 `Card Shell`，右侧默认显示 `Font=Theme`、`Internal follow=checked`、`Border=Solid`、`Internal follow=checked`
  - 浏览器实测：向 Card Shell 内拖入新的 `Heading`，右侧默认显示 `Font=Parent controlled`、`Border=Parent controlled`
  - 浏览器实测：把 Card Shell `Font` 改为 `Serif`、`Border` 改为 `None` 后，卡内 Heading 实际变为 `Georgia / Times New Roman`，且 wrapper 变为 `data-widget-border-style="transparent"`
  - 截图留档：`temp/default-parent-follow-verify.png`

#### 更新日志

- `2026-04-21`：补齐默认值策略，要求控件默认跟随父级、Card Shell 默认开启内部跟随
- `2026-04-21`：把内置模板实例化入口接入 `cloneDefaultWidgetProps(type)`，消除模板与新建控件的默认值分叉
- `2026-04-21`：完成 3000 浏览器回测并留档截图

---

### 8. Kit Studio 控件父级跟随宽度与 Card Shell 最小宽度约束

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/components/NestedCanvas.tsx`

#### 现象

- 旧 `Auto occupy row` 勾选已迁到 `Size -> Cols` 的 `Follow parent`
- 但在实际拖拽链路中仍存在两类不稳定：
  - 控件在卡内勾选 `Follow parent` 后，跨卡迁移能适配新卡宽度，但再拖到底布时，宽度可能被重新算成小数
  - Card Shell 的最小宽度需要始终包裹内部控件，而当前计算必须基于“卡内最终吸附后的布局”，否则会出现约束不稳定

#### 当前判断

- 问题集中在三条链路的宽度归一没有完全统一：
  - `NestedCanvas` 的卡内布局归一 / 最小宽度推导
  - 卡内控件拖出到底布时的 root layout 归一
  - `WidgetWrapper` 的跨卡 fallback 迁移链路
- root 底布不能被当作“父级宽度来源”，只能在迁出时保留当前尺寸值

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/components/KitFactoryBoard.tsx`
- `src/builder/WidgetWrapper.tsx`
- `src/pages/BuilderPage.tsx`

#### 影响范围

- 控件 `Follow parent` 的 Inspector 语义闭环
- `A 卡 -> B 卡 -> 底布` 的尺寸一致性
- Card Shell 永远包裹内部控件的宽度下限
- 卡内“向上、向左吸附”后的稳定 gap / padding 体验

#### 当前处理决定

- 已完成修复
- 保持最小化改动，不动已正确的拖拽/预览主链路
- 只补齐宽度语义、最小宽度约束、fallback 迁移链路和 root 归一

#### 重开条件

- 修复后仍出现 `Follow parent` 控件拖到底布时宽度变成小数
- 控件跨卡迁移没有自动适配目标卡宽度
- Card Shell 仍能收窄到小于内部某一行控件总宽

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - 用 compact 后布局而不是原始 layout 计算 `requiredPanelMinCols`
  - root layout 放置前先归一整数宽高，并强制满足 `minW / minH`
  - 补齐 `WidgetWrapper` fallback 迁移链路对 `followParentWidth` 的识别
  - 将旧 `Auto occupy row` 的用户入口迁移到 `Size -> Cols -> Follow parent`
  - 保留旧 `autoOccupyRow` 兼容读取，但新写入使用 `followParentWidth`

#### 修复后回填项

- 根因确认：
  - `Follow parent` 语义已从旧 `autoOccupyRow` 迁移，但部分拖拽迁移链路仍只按布局宽度或 DOM 像素宽度计算
  - 卡内控件迁出到底布时，如果没有统一做 root layout 归一，可能出现 `w < minW` 或小数宽高
  - 跨卡 fallback 链路没有读取 `followParentWidth`，存在与主链路不一致的边界风险
  - Card Shell 最小宽度如果基于原始布局而非 compact 后布局，会和最终向上、向左吸附结果脱节
- 实际改动文件清单：
  - `src/builder/widgetConfig.ts`
  - `src/components/NestedCanvas.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/pages/BuilderPage.tsx`
  - `src/kit/contracts/control.ts`
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - `npm run lint -- --pretty false`：通过
  - 重启 `3000` 开发服后，通过 Chrome 远程调试端口连接真实浏览器验证 `http://127.0.0.1:3000`
  - 浏览器验证：右侧 Inspector 不再出现 `Auto occupy row`，`Size -> Cols` 行出现 `Follow parent`
  - 浏览器验证：`Heading` 在 `Card A(w=12)` 勾选 `Follow parent` 后，卡内 layout 为 `x=0,w=12,minW=12`
  - 浏览器验证：从 `Card A` 直接拖入 `Card B(w=18)` 后，自动适配为 `x=0,w=18,minW=18`
  - 浏览器验证：再从 `Card B` 拖回底布后，parent 变为 `root`，但宽度保持 `w=18,minW=18`，没有被底布当作父级重新计算
  - 截图留档：`temp/follow-parent-width-verify.png`

#### 更新日志

- `2026-04-21`：根据最新宽度规则要求，登记问题并开始修复
- `2026-04-21`：第一次浏览器回测复现迁出到底布仍按像素宽度重算；确认需要重启 Vite 清掉旧模块缓存
- `2026-04-21`：重启 `3000` 后完成真实浏览器回测，确认 `Follow parent`、跨卡适配、迁出到底布宽度保持和整数归一均通过

---

### 9. Kit Studio 最小 Cols / Rows 独立约束与默认值归一

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/store/builderStore.ts`

#### 现象

- 控件和卡壳的 `Min Cols / Min Rows` 不能再跟随其他尺寸数字联动变化，否则会引发拖拽、缩放和布局约束异常
- 当前版本需要统一默认值：
  - Card Shell：`4 x 2`
  - Control：`2 x 1`
- 这两个最小值通常只作为底层边界，不应被普通尺寸改动、父级跟随、自动撑开、自动增高等逻辑重写

#### 当前判断

- 问题本质是“默认最小值”和“运行时尺寸”在部分链路里没有彻底解耦
- `minW / minH` 应该是独立约束；`w / h` 才是跟随拖拽、缩放、自动包裹、自动高度变化的运行值
- 另外 `3000` 开发服曾缓存旧模块，导致第一次浏览器回测看到的仍是旧逻辑
- 补充确认：左侧 `CARDS -> Card Shell` 走的是内置模板 `card_shell_base`，模板自身仍写死 `minW=12,minH=8`

#### 相关文件

- `src/builder/widgetConfig.ts`
- `src/store/builderStore.ts`
- `src/components/NestedCanvas.tsx`
- `src/builder/WidgetWrapper.tsx`
- `src/pages/BuilderPage.tsx`
- `src/components/builder-page/WidgetInspectorPanel.tsx`
- `src/kit/definitions/widgetDefinitions.ts`
- `src/builder/assetLibrary.ts`

#### 影响范围

- 新建 Card Shell / Control 时的默认最小尺寸
- 右侧 Inspector 的 `Min Cols / Min Rows` 显示与编辑语义
- 控件与卡壳在缩放、自动撑开、自动增高后的稳定边界
- 后续拖拽与布局规则的整数约束稳定性

#### 当前处理决定

- 已完成修复并完成浏览器回测
- 保持最小化改动，只处理最小尺寸默认值与独立约束，不顺手扩展其他布局行为

#### 重开条件

- Card Shell 新建后最小值不是 `4 x 2`
- Control 新建后最小值不是 `2 x 1`
- 修改 `Cols / Rows` 或触发自动布局后，`Min Cols / Min Rows` 被同步改写

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - 在 `widgetConfig` 中集中定义按类型分流的默认最小尺寸
  - `addWidget` / `addTemplateNode` 在缺省 `minW / minH` 时自动补齐默认值
  - 移除 `Follow parent`、Card Shell 自动撑宽、非滚动自动增高等链路对 `minW / minH` 的自动写回
  - Inspector 的 `Min Cols / Min Rows` 改为按组件类型回退到默认最小值
  - 将内置 `card_shell_base` 模板的 `minW / minH` 从 `12 / 8` 改为 `4 / 2`

#### 修复后回填项

- 根因确认：
  - 旧逻辑里部分尺寸链路会把运行态 `w / h` 反写进 `minW / minH`
  - 组件新建入口与模板实例化入口对最小值默认策略不统一
  - 左侧 `Card Shell` 实际属于内置模板入口，模板数据中显式 `minW=12,minH=8` 会覆盖默认最小值
  - 第一次浏览器验证命中的是 `3000` 端口的旧 Vite 模块缓存，造成误判
- 实际改动文件清单：
  - `src/builder/widgetConfig.ts`
  - `src/store/builderStore.ts`
  - `src/components/NestedCanvas.tsx`
  - `src/builder/WidgetWrapper.tsx`
  - `src/pages/BuilderPage.tsx`
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/kit/definitions/widgetDefinitions.ts`
  - `src/builder/assetLibrary.ts`
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - `npm run lint -- --pretty false`：通过
  - 重启 `3000` 端口 Vite 后，使用 Chrome 远程调试连接真实浏览器页面验证
  - 浏览器验证：新建 `panel` 后，layout 为 `minW=4,minH=2`
  - 浏览器验证：新建 `heading` 后，layout 为 `minW=2,minH=1`
  - 浏览器验证：把 Card Shell 从 `12x8` 改到 `18x10` 后，`Min Cols / Min Rows` 仍保持 `4 / 2`
  - 浏览器验证：把 Control 从 `6x3` 改到 `8x4` 后，`Min Cols / Min Rows` 仍保持 `2 / 1`
  - 浏览器验证：右侧 Inspector 同步显示 `panel=4/2`、`control=2/1`
  - 浏览器验证：从内置 `card_shell_base` 模板实例化的 Card Shell，layout 与 Inspector 均显示 `Min Cols=4, Min Rows=2`

#### 更新日志

- `2026-04-21`：根据“最小值独立、不随其他数字变化”的新要求开始收口默认策略
- `2026-04-21`：完成默认值中心化与最小值独立约束改造
- `2026-04-21`：第一次浏览器回测发现命中旧 dev 模块；重启 `3000` 后复测通过
- `2026-04-21`：补修左侧 `Card Shell` 内置模板仍写死 `12x8` 的漏网点，重启 `3000` 后复测通过

---

### 10. Kit Studio 非父级跟随控件入卡后被卡壳裁剪

- 状态：`resolved`
- 优先级：`high`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/components/NestedCanvas.tsx`

#### 现象

- 控件没有勾选 `Follow parent` 时，拖入较小 Card Shell 后仍会被父级宽度约束
- 预期是控件保持自身 `w`，由 Card Shell 反向撑开并继续保持左右 padding
- 勾选 `Follow parent` 的控件才应服从卡壳宽度并独占一行
- 后续真实操作继续暴露一条回归：未勾选 `Follow parent` 的控件在 `Card Shell ↔ 根画布` 之间反复往返后，会一轮一轮变窄

#### 当前判断

- 问题来自多条链路提前把子控件 `w` 裁剪到父级 cols：
  - Nested canvas 入卡 / 跨卡 / native drop 的 width 计算
  - compact layout 归一阶段
  - Kit store 对非 root 子布局的统一 parent cols clamp
  - WidgetWrapper fallback drop 入口
- 往返缩水回归来自卡内迁出到底布的宽度真值选择错误：
  - DOM 像素宽度会把卡内列宽重新采样成更小的底布列数
  - `react-grid-layout` 的 `oldItem/newItem` 在跨域拖出时也可能已被临时压小
  - 但后续回归再确认：compact card 的 `w` 也不是根层 `w` 的同单位，直接把卡内 `sourceLayoutItem.w` 写回 root 一样会漂移
  - 正确做法是：回根层时按当前拖拽控件本体的真实像素宽高，结合当前 React Flow viewport scale 反算回 root cols/rows
- 卡壳缩小时被异常顶宽的根因补充：
  - Card Shell 自动反向撑宽原先按子控件当前首选 `w` 计算最小卡壳宽度
  - 正确边界应按每一行控件的 `minW` 总和计算，而不是按当前首选宽度计算
  - 否则一个未跟随父级的 `Heading(w=16,minW=2)` 会把卡壳锁回接近初始宽度，导致手动收窄后立刻弹开
- Card Shell 拉伸预览期的根因补充：
  - root 层拉伸时会先临时写 wrapper / preview host 的像素宽度，但 store 中 parent cols 还没落地
  - `NestedCanvas` 若继续使用旧 parent cols + 新 DOM 宽度计算列宽，就会导致未跟随父级控件在 mid-resize 阶段被临时放大
  - 正确做法是：预览期用 `kit-root-resize-preview` 事件中的目标 cols 参与卡内 grid 计算，直到 pointer up 正式落地
- 正确模型应是：
  - `followParentWidth=true`：子控件写成父级内容宽
  - `followParentWidth=false`：子控件保留自身宽度，父级 Card Shell 根据内部 row span 自动扩宽
  - Card Shell 手动收窄时，最小宽度应受“当前同一行全部非跟随控件的实际 row span”约束，而不是按 `minW` 总和约束
  - `padding / gap` 是 Card Shell 内部渲染语义，不能再折算成额外的根层列数，否则右侧 padding 会被空列放大
  - `followParentWidth=true` 的控件只服从卡壳，不反向锁死卡壳宽度

#### 相关文件

- `src/components/NestedCanvas.tsx`
- `src/store/builderStore.ts`
- `src/builder/WidgetWrapper.tsx`
- `src/components/KitFactoryBoard.tsx`
- `docs/debug-record.md`

#### 影响范围

- 左侧控件拖入 Card Shell
- 底布控件拖入 Card Shell
- A 卡控件跨入 B 卡
- 卡内控件拖到底布后再回卡的往返稳定性
- 未跟随父级控件与跟随父级控件的宽度语义区分

#### 当前处理决定

- 已完成修复
- 保持最小化改动，只取消非跟随控件的父级宽度裁剪，不改已有删除、选择、边框、最小值等链路

#### 重开条件

- 未勾选 `Follow parent` 的控件入卡后 `w` 被压成卡壳宽度
- 已勾选 `Follow parent` 的控件不再服从卡壳宽度
- Card Shell 被内部控件撑开时写大了 `minW`

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - Kit nested child layout 在 store 层保留原始 `w`，不再统一按 parent cols 裁剪
  - Nested canvas 对非跟随控件保留自身宽度；只有 follow parent 时才写入父级内容宽
  - 用非跟随控件的实际内部 row span 参与 Card Shell 自动撑宽
  - WidgetWrapper fallback drop 保留非跟随控件源宽度
  - 卡内控件迁出到底布时，root `w/h` 改为按真实拖拽控件本体的像素宽高反算，并扣除当前 React Flow viewport scale
  - 根画布拖拽预览同步增加 `layoutW`，确保预览与最终落地宽度保持同一口径
  - `NestedCanvas` 监听 `kit-root-resize-preview`，当当前 Card Shell 正在 root 层拉伸预览时，临时使用预览 cols 参与卡内 grid 计算
  - Card Shell 手动缩放时，缩放柄运行期的最小宽度改为按“当前非跟随控件实际 row span 的包裹宽度”动态限制；同一行多控件时，拉宽不带动控件变宽，收缩停在刚好包裹的位置
  - Card Shell 自动撑宽与手动收缩下限不再把 `padding / gap` 二次折算成额外列数，避免右侧出现多余空列

#### 修复后回填项

- 根因确认：
  - 原先为了避免子控件溢出，多个入口都使用 `Math.min(parentCols, childW)`
  - 这会在 Card Shell 有机会自动撑开之前，先把子控件自身宽度丢失
  - Store 层的父级 clamp 会进一步把已保留的宽度再次裁回父级宽度
  - 后续回归进一步确认：卡内控件迁出到底布时，若按 DOM 像素宽度或 `react-grid-layout` 的临时拖拽 item 回写 root `w`，会让未跟随父级控件每往返一次就少一列
  - 最新回归再确认：compact card 内部列宽与根画布 `28px/col` 不是同一单位；若把卡内 `w` 直接写回 root `w`，就会出现 `root 8 -> panel 9 -> root 9 -> panel 10` 这种逐轮加宽
  - 最新回归确认：Card Shell 最小宽度约束不能按 `minW` 行总和算；用户当前语义要求是“按非跟随控件当前实际 row span 包裹”，否则会出现同一行多控件被压换行或卡壳收缩压穿
  - 这意味着需要拆开两种宽度语义：自动撑宽看“实际非跟随内容包裹宽度”，跟随父级控件只参与服从父级，不参与反向锁宽
  - 右侧 padding 回归确认：此前把 `padding / gap` 按像素再换算成根层列数，导致 `Heading(w=18)` 自动撑开后 Card Shell 被扩到 `w=21`，子控件右侧出现约 `98px` 空列；正确结果应是卡壳 `w=18`，左右 padding 均约 `17px`
- 实际改动文件清单：
  - `src/components/NestedCanvas.tsx`
  - `src/store/builderStore.ts`
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/KitFactoryBoard.tsx`
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - `npm run lint -- --pretty false`：通过
  - 重启 `3000` 端口 Vite 后，使用 Chrome 远程调试连接真实浏览器页面验证
  - 浏览器验证：`followParentWidth=false` 的 `heading(w=16)` 入 `panel(w=8)` 后，控件保持 `w=16`，Card Shell 自动扩为内容 row span，`minW` 仍为 `4`
  - 浏览器验证：`followParentWidth=true` 的 `heading(w=16)` 入 `panel(w=10)` 后，控件变为 `w=10`，Card Shell 保持 `w=10`
  - 浏览器验证：未勾选 `Follow parent` 的 `Heading` 完成 `Card Shell → 根画布 → Card Shell` 三次往返后，根画布宽度稳定保持 `448px`，回卡宽度稳定保持 `416px`，不再出现逐轮递减
  - 浏览器验证：未勾选 `Follow parent` 的 `Button` 完成 `root 8 -> panel 9 -> root 8 -> panel 9` 往返后，不再出现 `8 -> 9 -> 10` 逐轮递增
  - 浏览器验证：未勾选 `Follow parent` 的 `Heading` 回卡后手动收缩 Card Shell，卡壳可从 `504px` 收到 `280px`，不再弹回 `504px`
  - 浏览器验证：未勾选 `Follow parent` 的 `Button` 在 Card Shell 拉宽预览中，宽度从 `199px` 只到 `202px`，不再临时跳到 `284px`
  - 浏览器验证：已勾选 `Follow parent` 的 `Button` 在 Card Shell 拉宽预览中，宽度从 `414px` 实时变到 `584px`，pointer up 后稳定为 `582px`
  - 浏览器验证：非跟随 `Heading(w=6)` 位于 `Card Shell(w=14)` 内时，卡壳保持 `w=14`
  - 浏览器验证：非跟随 `Heading(w=18)` 位于 `Card Shell(w=10)` 内时，卡壳自动扩为 `w=18`
  - 浏览器验证：非跟随 `Heading(w=18)` 自动撑开后，左右 padding 量测均约 `17px`，不再出现右侧 `98px` 空列
  - 浏览器验证：跟随父级 `Heading` 在卡壳从 `w=12` 拉到 `w=18` 时，子控件同步从 `w=12` 跟到 `w=18`
  - 浏览器验证：同一行两个非跟随 `Button(w=5 + 5)` 位于 `Card Shell(w=14)` 内时，卡壳拉宽到 `w=22` 过程中按钮宽度仅保持轻微像素级浮动；再强制收缩时停在 `w=10` 的包裹边界，不再压穿到 `w=4`
  - 截图留档：`temp/repeat-shrink-verify.png`
  - 截图留档：`/tmp/frontai-width-verify.png`

#### 更新日志

- `2026-04-21`：按“非跟随控件撑开卡壳、跟随控件服从卡壳”重新梳理链路
- `2026-04-21`：修复 store、nested canvas、fallback drop 三处宽度裁剪
- `2026-04-21`：重启 `3000` 后完成真实浏览器回测并确认通过
- `2026-04-21`：继续收到“未跟随父级控件在卡和底布之间往返会越来越小”的反馈；首次回测命中旧 Vite 进程，确认 `3000` 仍在吐旧模块
- `2026-04-21`：重启 `3000` 后定位并补修：卡内迁出到底布时改为读取 store 源布局宽度，根画布预览同步跟随 `layoutW`
- `2026-04-21`：真实浏览器复测三次 `卡内 → 底布 → 卡内` 往返，宽度保持稳定，回归关闭
- `2026-04-21`：收到“收缩卡壳后被顶很大”的反馈；将 Card Shell 最小宽度边界从控件当前 `w` 改为行内 `minW` 总和，重启 `3000` 后浏览器复测通过
- `2026-04-21`：再次收到“控件反复进出 A 卡 / B 卡会每轮变宽 1 格”的反馈；浏览器脚本复现链路为 `root 8 -> panel 9 -> root 9 -> panel 10`
- `2026-04-21`：定位到卡内迁出到底布时，`NestedCanvas` 仍把卡内列数直接当成根画布列数写回；对 compact card 来说，卡内 `w` 与根层 `w` 不是同一单位
- `2026-04-21`：补修为按真实拖拽控件本体的像素宽高回写根层列数 / 行数，并按当前 React Flow viewport scale 反算；重启 `3000` 后浏览器复测 `root 8 -> panel 9 -> root 8 -> panel 9`，不再继续递增
- `2026-04-21`：收到“未开启跟随父级时，卡壳拉伸过程中控件也会跟着动”的反馈；浏览器脚本复现 mid-resize 非跟随控件 `199px -> 284px -> 201px`
- `2026-04-21`：定位到预览期只更新了 DOM 像素宽度，`NestedCanvas` 仍用旧 parent cols 算列宽；修复为监听 root resize preview cols，浏览器复测非跟随控件不再临时放大，同时跟随父级控件仍实时拉伸
- `2026-04-21`：用户重新明确卡壳宽度语义：非跟随控件按当前实际宽度反向撑开；跟随父级控件只服从卡壳；同一行多非跟随控件收缩时必须停在包裹边界
- `2026-04-21`：据此把 Card Shell 自动撑宽与缩放下限统一切到“非跟随控件实际 row span 包裹宽度”口径，并补上 root 缩放柄运行期的动态最小宽度
- `2026-04-21`：重启固定 `3000` 端口并在同一 Chrome 窗口真实回测 4 条规则：小于卡壳不撑开、大于卡壳自动撑开、跟随父级实时跟随、多控件同一行收缩停在 `w=11` 包裹边界，全部通过
- `2026-04-21`：收到“右侧 padding 不对”的反馈；定位到 `padding / gap` 被二次折算成额外列数，导致 Card Shell 右侧出现空列；改为自动撑宽和缩放下限只返回内部 row span，本轮浏览器复测右侧 padding 约 `17px`、多控件收缩边界为 `w=10`

---

### 30. 根画布控件拖入 Card Shell 时仍出现错误的大占位框

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/builder/WidgetWrapper.tsx` / `src/components/NestedCanvas.tsx`

#### 现象

- 根画布控件从底板抓起后，拖入 Card Shell 时，真实拖拽代理尺寸是正确的
- 但卡内还会额外出现一个错误的 `react-grid-placeholder`
- 实测例子：
  - 根控件本体 / 拖拽代理：`224 x 54`
  - 卡内默认占位框：`407 x 48`
- 这会让用户看到“双重影子”，且卡内那一层明显比本体大

#### 当前判断

- 问题只出现在 `root -> card` 的 HTML5 拖拽入口
- 已确认其他三条链路仍正常：
  - `card -> root`：根画布预览与拖拽代理一致
  - `A card -> B card`：跨卡预览与本体一致
  - Card Shell 收缩：不再被内部控件异常顶宽
- 当前未打通的点是：根控件拖入 Card Shell 时，`react-grid-layout` 仍在目标卡内生成一层默认 placeholder，且其尺寸口径与根控件真实像素尺寸不一致
- 已尝试的几条 JS 分支没有稳定接管这层默认 placeholder，因此先保留回归记录，避免继续在正确链路上扩大副作用

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`
- `src/index.css`
- `docs/debug-record.md`

#### 影响范围

- `root -> card` 拖拽体验
- 根控件进入 Card Shell 时的影子观感一致性
- 用户对最终落点的预判

#### 当前处理决定

- 已完成修复并回归
- 保持最小化改动：只收口 `root -> card` 预览所有权与 placeholder 可见性，不改已通过的 `card -> root`、`A -> B` 和 Card Shell 缩放逻辑

#### 重开条件

- 用户继续反馈根控件拖入 Card Shell 时仍看到比本体更大的卡内占位框
- 或后续要把 `root -> card` 也升级成与 `A -> B` 一样的卡内像素预览层

#### 维修方案

- 当前状态：`已完成`
- 已实施：
  - `WidgetWrapper` 不再让根画布控件在 `root -> card` 过程中发起跨卡 preview 接管，避免和 `NestedCanvas` 的 root 入口逻辑互相打架
  - `NestedCanvas` 继续允许 `react-grid-layout` 计算落点，但把默认 placeholder 作为内部占位计算使用，不再对用户可见
  - `index.css` 的 placeholder 隐藏规则改为排除 `.kit-cross-card-drop-preview`，避免顺带把 `A -> B` 正常的卡内预览也一起藏掉

#### 修复后回填项

- 根因确认：
  - `root -> card` 这条链路本身仍会由 `react-grid-layout` 生成默认 placeholder 做占位计算
  - 之前根控件拖拽同时还在 `WidgetWrapper` 发跨卡 preview 事件，和卡内 root 入口的预览接管互相竞争，导致同一时刻可能出现“错误大占位框 / 双影子 / 旧预览残留”
  - 同时全局 placeholder 隐藏样式没有排除 `.kit-cross-card-drop-preview`，会影响 `A -> B` 的正常卡内预览
- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/index.css`
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - `npm run lint -- --pretty false`：通过
  - Playwright 真浏览器回测 `root -> card`：
    - 拖拽代理：`224 x 54`
    - 卡内默认 placeholder：`227 x 52`
    - 但已是 `opacity=0 / visibility=hidden`，用户侧不再看到错误大影子
    - drop 后 parent 正确落为 `panel_test`
  - Playwright 真浏览器回测 `card -> root`：
    - 根画布 preview 与拖拽代理宽度一致：`200 -> 200`
    - drop 后 parent 正确回到 `root`
  - Playwright 真浏览器回测 `A -> B`：
    - 目标卡 `.kit-cross-card-drop-preview` 仍可见，`opacity=1 / visibility=visible`
    - drop 后 parent 正确落为 `panel_b`
- 是否需要后续追加清理：
  - 当前不需要；若后续要把 `root -> card` 也升级为卡内像素预览，再单开增强项，不在本次 bug 修复里继续扩大改动

#### 更新日志

- `2026-04-21`：浏览器复测确认 `card -> root`、`A -> B`、Card Shell 收缩三条链路仍通过
- `2026-04-21`：新增根控件 `root -> card` 回测，抓到错误占位尺寸：本体 / 代理 `224 x 54`，卡内默认占位 `407 x 48`
- `2026-04-21`：已尝试通过根拖拽会话、目标卡原生 `dragover` 和跨卡预览事件复用接管该入口，但暂未稳定覆盖 `react-grid-layout` 默认占位，先记录并留待下一轮单独处理
- `2026-04-21`：重新核对 3000 开发服后发现此前一度命中旧 Vite 模块；重启同端口并用浏览器脚本确认真实模块状态
- `2026-04-21`：收口根控件 `root -> card` 的 preview 所有权，移除根拖拽对跨卡 preview 的抢占；同时让 placeholder 隐藏规则排除 `.kit-cross-card-drop-preview`
- `2026-04-21`：Playwright 回归确认 `root -> card` 错误大占位框已不再可见，`card -> root` 与 `A -> B` 两条链路保持正常，记录结案

---

### 31. Card Shell 缩放实时体验不够丝滑

- 状态：`resolved`
- 优先级：`medium`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`src/builder/WidgetWrapper.tsx` / `src/components/NestedCanvas.tsx`

#### 现象

- Card Shell 宽度缩放功能已经完整可用，但实时拖拉体验还不够丝滑稳定
- 未开启 `Follow parent` 的内部控件在卡壳缩放过程中可能反复抖动
- 开启 `Follow parent` 的控件在缩放过程中，右侧 padding 不是全程实时稳定贴合，pointer up 后才更稳定

#### 当前判断

- 当前实现已经满足可用版本，需要先保存版本再做专项优化
- 抖动更像是“预览期 DOM 像素宽度、root cols、nested grid cols、ResizeObserver 重新测量”之间的高频反馈循环
- 跟随父级控件右侧 padding 不稳定，可能来自预览期 `rootResizePreviewCols` 与实际 wrapper 像素宽度有一帧不同步
- 下一步不应再顺手改拖拽迁移、落点 preview、删除、Inspector 等已验证链路

#### 相关文件

- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`
- `docs/debug-record.md`

#### 影响范围

- Card Shell 手动缩放的实时视觉体验
- 非跟随控件在缩放过程中的位置稳定性
- 跟随父级控件的实时右侧 padding 稳定性

#### 当前处理决定

- 已先冻结当前可用版本，避免继续优化时破坏现有正确链路
- 冻结版本信息：
  - 分支：`codex/kit-studio-snapshot-20260420`
  - 提交：`4db5b5a`
  - 提交信息：`chore: snapshot current kit studio card shell state`
- 上一轮“已完成”的结论曾被用户实测推翻，后续确认原因包含 `3000` 服务仍加载旧模块以及非跟随控件只做了 `scaleX` 视觉补偿
- 本轮已完成补强：非跟随控件在 root resize preview 期间改为直接锁定自身像素宽度，避免随父级 grid item 宽度变化
- 当前仍只处理 Card Shell 缩放实时体验，不涉及拖拽迁移、Inspector、删除、跨卡预览等无关链路
- 本轮修复顺序为“尺寸真值收敛 → 非跟随控件稳定 → 跟随控件 padding 实时稳定”

#### 重开条件

- 开始优化 Card Shell 缩放丝滑度
- 复现未跟随控件缩放过程中抖动
- 复现跟随父级控件右侧 padding 在拖拽中实时不稳定

#### 维修方案

- 当前状态：`已完成本轮补强修复`
- 已确认的分阶段方案：
  - 阶段 0：冻结现状
    - 保留当前可用版本作为回退基线
    - 不在基线版本上继续混入新功能
  - 阶段 1：统一缩放预览真值
    - 由 `WidgetWrapper` 的 root resize 会话统一持有 preview cols / rows / pixel width / pixel height
    - `NestedCanvas` 在 preview 期只消费统一 preview 值，不再让 DOM 测量值和 grid cols 双向抢写
  - 阶段 2：冻结非跟随控件在 resize 期的布局真值
    - 非跟随控件在卡壳缩放过程中保持原始 `x/y/w/h`
    - 仅在 pointer up 后再执行 normalize / compact / wrap 修正
    - 避免 `normalizeCompactLayout` 与 `updateLayout` 在缩放中每帧回写，引发来回抖动
  - 阶段 3：让跟随父级控件直接吃 preview 期宽度
    - 跟随父级控件在 resize 期直接使用同一帧 preview cols 对应的内容区宽度
    - `paddingRight` 继续以真实内容区为基准，不把滚动条与未出现的保留宽度混算进去
    - 确保跟随控件右侧内边距在拖拉过程中就稳定，而不是 pointer up 后才稳定
  - 阶段 4：收口与回归
    - pointer up 后一次性提交最终 `w/h`
    - 再执行一次最终 normalize / compact / auto-wrap
    - 用固定 `3000` 端口、同一个浏览器窗口回归：root 缩放、A→B 跨卡、root↔card、影子尺寸一致、自动撑宽、缩放下限、右侧 padding
- 已执行但仍需补强的部分：
  - root resize preview 事件从只传 `cols / rows` 扩展为同步传递 `widthPx / heightPx`
  - `NestedCanvas` 在 resize preview 期使用实时 DOM 宽度 / preview 像素宽度作为内容区计算来源
  - resize preview 开始时冻结 child layout 快照，非跟随控件在缩放中不再每帧 compact / 回写
  - preview 事件进入 `NestedCanvas` 后使用同步刷新，减少跟随控件落后一帧的问题
  - 缩放过程中跳过 child layout normalize 回写，pointer up 后再进入最终 commit / normalize
- 本轮补强：
  - 非跟随控件不再用 `scaleX(...)` 做缩放补偿
  - 在父级 Card Shell root resize preview 期间，`WidgetWrapper` 直接把非跟随控件 wrapper 的 `width / min-width / max-width` 锁定为 resize 开始时的像素宽度
  - preview clear 时清理宽度锁定，回到正常 grid layout 渲染
- 涉及文件保持最小范围：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/NestedCanvas.tsx`
  - `docs/debug-record.md`
  - `docs/card-shell-resize-optimization-plan.md`

#### 根因确认

- `WidgetWrapper` 原来的 root resize preview 事件只传 `cols / rows`，当像素宽度变化但列数未稳定同步时，`NestedCanvas` 会拿到滞后的内容区宽度
- `NestedCanvas` 在 root resize preview 期间仍可能触发 `normalizeCompactLayout(...)` 与 `updateLayout(...)`，导致非跟随控件在拖拉过程中被重复 compact / clamp
- `useContainerWidth` 依赖 `ResizeObserver`，天然会比直接拖拉写入的 DOM 宽度晚一帧；跟随父级控件因此会出现右侧 padding 拖动中不稳定、松手后恢复的现象
- 上一轮补强验证偏差：一开始 `3000` 端口仍在加载旧版 `WidgetWrapper`，真实源码未进入浏览器；重启同一端口后才确认新模块生效
- 非跟随控件残余波动根因：只在 wrapper 上做 `scaleX(...)` 补偿，仍会受 grid item 实时宽度、舍入与帧时序影响；直接锁定像素宽度后，浏览器采样宽度波动归零

#### 修复后回填项

- 实际改动文件清单：
  - `src/builder/WidgetWrapper.tsx`
  - `src/components/NestedCanvas.tsx`
  - `docs/debug-record.md`
  - `docs/card-shell-resize-optimization-plan.md`
- 验证方式 / 回归结果：
  - `npm run lint -- --pretty false`
  - `npm run build`
  - 固定 `3000` 端口，使用同一个 Chrome 远程调试窗口做 CDP 浏览器回测
  - 通过 `window.__builderStore` 种入最小复现场景：`resize-panel` + 两个非跟随按钮 + 一个跟随父级输入框
  - 真实鼠标事件拖动 Card Shell 右下角缩放柄，采样 5 个 resize 过程点
  - 回归结果：
    - `rightGapRange: 0`，跟随父级控件右侧 padding 在拖动中保持稳定
    - `fixedWidthRange: 0`，非跟随控件在拖动采样期间视觉宽度不再波动
    - `fixedXRange: 0`，非跟随控件缩放中不再横向抖动 / 被重新 compact
    - 非跟随控件的 child layout 在缩放前后保持 `x/y/w/h` 不变
    - pointer up 后 follow 控件按新卡壳宽度提交最终 layout
- 本轮未改动拖拽迁移、A ↔ B 跨卡、删除入口、Inspector 配置链路

#### 更新日志

- `2026-04-21`：用户反馈完整实现已可用，但 Card Shell 缩放体验仍存在非跟随控件抖动、跟随控件右侧 padding 实时不稳定；先登记并准备保存当前可用版本
- `2026-04-21`：已先冻结当前可用版本到 `codex/kit-studio-snapshot-20260420` / `4db5b5a`，并把后续优化拆成“统一尺寸真值 → 冻结非跟随布局 → 跟随控件实时 padding 稳定 → 回归验证”四个阶段
- `2026-04-21`：完成本轮专项修复；preview 事件补齐像素宽度，NestedCanvas 预览期冻结非跟随布局并使用实时宽度，浏览器 CDP 回测确认右侧 padding 与非跟随控件位置稳定
- `2026-04-21`：用户反馈“这轮优化没实际效果”，重新回到修复中；复盘判断上一轮只验证到位置与部分 padding 稳定，未把未跟随父级控件的视觉宽度彻底锁死，需继续用固定 `3000` 端口和同一浏览器窗口回测
- `2026-04-21`：确认 `3000` 服务曾加载旧模块，重启同一端口后新代码生效；将非跟随控件的 resize preview 处理从 `scaleX` 改为直接锁定 `width / min-width / max-width`，CDP 真实鼠标回测得到 `fixedWidthRange: 0`、`fixedXRange: 0`、`rightGapRange: 0`

---

### 9. Inspector 勾选项的文本与勾选框顺序不统一

- 状态：`resolved`
- 优先级：`low`
- 首次记录时间：`2026-04-21`
- 最近更新时间：`2026-04-21`
- 来源：`Kit Studio` 右侧栏实际操作验证

#### 现象

- Inspector 内多个勾选项仍是“左侧勾选框 + 右侧文本”的旧顺序
- 与当前 `Header / Footer / Overflow` 这类右侧勾选的视觉逻辑不统一
- 典型位置包括：
  - `Spacing` 中的 `Horizontal Same / Vertical Same`
  - `Typography / Border / Size` 中的 `Internal follow / Follow parent`

#### 当前判断

- 这是 inspector 表达层的统一性问题，不涉及属性语义变更
- 应统一为“文本在左，勾选在右”，减少右侧栏视觉噪音

#### 相关文件

- `src/components/builder-page/InspectorPrimitives.tsx`
- `src/kit/inspector/StudioDefinitionInspector.tsx`
- `src/components/builder-page/WidgetInspectorPanel.tsx`
- `src/index.css`

#### 影响范围

- 右侧栏 checkbox 类字段的视觉一致性
- `Card Shell` 与普通控件 inspector 的统一设计语言

#### 当前处理决定

- 统一调整块级 checkbox 行和 inline checkbox 的左右顺序
- 保持功能和字段定义不变，只改呈现顺序与排布

#### 重开条件

满足以下任一条件时重开：

- 后续右侧栏整体规范再次调整
- 勾选项改造为 switch / segmented 等别的控件形态

#### 维修方案

- 调整 `InspectorToggleField` 结构，让文本块在前、checkbox 在后
- 调整 inline toggle 结构，让 `Internal follow / Follow parent` 统一为文本左、checkbox 右
- 用 CSS 保持现有紧凑高度和对齐方式

#### 修复后回填项

- 根因确认：Inspector 中 block toggle 与 inline toggle 仍使用旧 DOM 顺序，导致 checkbox 默认渲染在左侧
- 最终采用方案：统一改为“copy 在前，checkbox 在后”
- 实际改动文件清单：
  - `src/components/builder-page/InspectorPrimitives.tsx`
  - `src/kit/inspector/StudioDefinitionInspector.tsx`
  - `src/components/builder-page/WidgetInspectorPanel.tsx`
  - `src/index.css`
- 验证方式 / 回归结果：
  - 固定 `3000` 端口，同一真实浏览器窗口回测
  - DOM 验证：
    - `Horizontal Same / Vertical Same` 为 `firstElement=builder-inspector-toggle-copy`、`lastElement=builder-inspector-checkbox`
    - `Internal follow / Follow parent` 为 `children=[SPAN, INPUT]`
  - 截图输出：
    - `/mnt/c/Users/Administrator/AppData/Local/Temp/frontaiready-toggle-panel.png`
    - `/mnt/c/Users/Administrator/AppData/Local/Temp/frontaiready-toggle-control.png`
- 是否需要后续追加清理：暂不需要

#### 更新日志

- `2026-04-21`：发现 Inspector 多处 checkbox 顺序仍不统一
- `2026-04-21`：开始修复 block toggle 与 inline toggle 的左右顺序
- `2026-04-21`：修复完成，并在真实浏览器中确认 `Card Shell` 与普通控件的勾选项均已变为“文本左、勾选右”

---

### 10. 3000 开发服继续服务旧 CSS 模块

- 状态：`resolved`
- 优先级：`low`
- 首次记录时间：`2026-04-22`
- 最近更新时间：`2026-04-22`
- 来源：`Kit Studio` 右侧栏大组层级视觉回测

#### 现象

- 已修改 `src/index.css` 后，固定 Chrome 页面刷新仍显示旧右侧栏分组样式
- 浏览器内 `.builder-inspector-group` 命中规则仍是旧的 `gap: 6px / padding: 8px 0 10px / border-bottom`
- 同一页面直接 `fetch('/src/index.css')` 也返回旧 CSS 内容

#### 当前判断

- 这是本地 Vite 进程的模块缓存 / 热更新状态异常
- 当前磁盘文件已经是新版本，但 `3000` 进程继续服务旧 CSS 模块
- 不属于 Kit Studio inspector 分组架构本身的逻辑问题

#### 相关文件

- `src/index.css`
- `docs/debug-record.md`

#### 影响范围

- 前端视觉调整后的真实浏览器回测可信度
- 用户在固定 `3000` 页面看到的右侧栏样式是否与磁盘源码一致

#### 当前处理决定

- 只重启 `3000` 的 Vite 开发服
- 不新开浏览器窗口，继续复用当前 Chrome 调试页
- 重启后强制跳转刷新同一页面并重新截图验证

#### 重开条件

- 后续再次出现“磁盘文件已更新，但浏览器和 `/src/index.css` 仍返回旧内容”
- 同一端口重启后仍不能服务当前源码

#### 维修方案

- 结束旧 `3000` Vite 进程
- 重新执行 `npm run dev` 绑定 `3000`
- 在同一 Chrome target 中禁用缓存并跳转到带时间戳参数的 `3000` URL

#### 修复后回填项

- 根因确认：旧 Vite 进程继续返回旧 CSS 模块，导致浏览器刷新和页面内 fetch 均看不到当前磁盘变更
- 实际改动文件清单：
  - `docs/debug-record.md`
- 验证方式 / 回归结果：
  - 重启 `3000` 后，开发服返回的 `/src/index.css` 已包含 `border-radius: 14px` 与 `margin-top: 10px`
  - 同一 Chrome 页面回测 `.builder-inspector-group` 计算样式为 `borderRadius: 14px`、`borderTopWidth: 1px`
  - `window.__builderLastError` 为 `null`

#### 更新日志

- `2026-04-22`：发现当前 `3000` 页面和页面内 fetch 均仍读取旧 CSS
- `2026-04-22`：重启同一端口 Vite，不新开浏览器窗口，确认新 CSS 已生效并完成截图回测

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
