# Card Shell / Panel 技术笔记

更新时间：2026-04-18

配套总纲：`docs/kit-studio-layout-engine-summary.md`

## 名词映射

- 样例项目里的 `panel` 对应本项目的 `Card Shell`，也就是 `panel` 类型 widget 和 `card-panel-shell` 定义。
- 样例项目里的 `NestedCanvas` 不是一个独立产品概念，本质对应本项目中 card 内部的组装区：`src/components/NestedCanvas.tsx`。
- 本项目继续保持现有命名：用户侧叫 `card` / `controls`，代码侧容器 widget 暂时沿用 `panel`。

## 样例里的核心逻辑

样例拆成两层：

1. `WidgetRegistry.panel` 只负责 shell：
   - 渲染 header。
   - 渲染 footer。
   - 控制内容区是否出现纵向 scrollbar。
   - 把四边 padding、联动开关、`gap`、`scrollable` 透传给内部 `NestedCanvas`。
2. `NestedCanvas` 负责内部布局算法：
   - `gap` 映射到 React Grid Layout 的 `margin`。
   - grid 模式不再依赖旧的对称 `containerPadding`，而是由外层 host 负责四边 padding，内部 grid 宽度按左右 padding 反推。
   - compact 模式下，内部 controls 的有效列数与父 card 实际列数保持一致，不再额外预留隐藏 gutter 列；这样当 `Left/Right` 设为同值时，左右可用内容边界保持对等，和 `sample` 的 panel 表现一致。
   - `scrollable=false` 时，内部内容不滚动，外层 panel 根据内容高度反推自己在父布局里的 `h`。

样例里 footer/header 本身不是布局引擎的一部分，只是在自动高度反推时被当作额外像素高度加入。

## 适配到本项目的边界

本次只做 card shell 底座能力，不调整已有拖拽转场、根画布防重叠、controls 重排策略。

落地范围：

- `src/builder/widgetConfig.ts`
  - panel 默认 spacing 改为：`paddingLeft`、`paddingRight`、`paddingTop`、`paddingBottom`，并提供 `linkHorizontalPadding`、`linkVerticalPadding`。
- `src/builder/registry.tsx`
  - `panel` shell 增加 footer 渲染。
  - 内容区按 `scrollable` 切换 `overflow-y-auto / overflow-y-hidden`。
  - 将 padding、gap、layoutMode、scrollable 透传到 `NestedCanvas`。
- `src/components/NestedCanvas.tsx`
  - 接收 `paddingLeft`、`paddingRight`、`paddingTop`、`paddingBottom`、`gap`、`scrollable`，并兼容旧的 `paddingX / paddingY`。
  - grid 模式中用 `gap` 驱动 RGL `margin`，四边 padding 直接作用在 host 上；内部 grid 宽度扣除左右 padding 后再参与布局计算。
  - flex-row / flex-col 模式同步使用同一组 padding 和 gap。
  - 仅在 `panel + compact grid + scrollable=false` 时启用自动高度反推。
- `src/kit/definitions/widgetDefinitions.ts`
  - 右侧属性栏明确提供 header、footer、footer text、scrollbar、`Horizontal Same`、`Padding Left/Right`、`Vertical Same`、`Padding Top/Bottom`、gap。
- `src/kit/inspector/StudioDefinitionInspector.tsx`
  - number 字段读取 `meta.min`，用于允许 card shell 的 padding/gap 设为 `0`。

## 自动高度反推

当前实现的自动高度只作用于 `panel`，不作用于 `canvas`，也不作用于非 grid 的 flex 布局，避免扩大副作用。

计算步骤：

1. 读取 card 内部 layout 中最大的 `y + h`，得到内部内容占用的 grid 行数。
2. 用本项目内部 card 行高 `18px`、配置的 `gap`、`paddingTop + paddingBottom` 计算内容区像素高度。
3. 如果 header/footer 开启，则分别加入 shell chrome 的固定估算高度。
4. 根据父容器的布局单位反推当前 card 的外层 `h`：
   - 页面根画布：`rowHeight=20`、`marginY=6`。
   - Kit Studio 根画布：board-managed 节点按 `22px` 行高映射。
   - 嵌套父容器：沿用内部 `rowHeight=18`，父级 `gap` 作为 margin。
5. 通过 `updateLayoutItem(id, parentId, { h })` 更新外层布局。

## 后续注意事项

- 后续进口 shadcn 或其他组件时，card shell 不应直接承载控件属性，只负责 shell 与 slot 布局。
- controls 的个性属性仍放在各自 definition 中；card shell 只管理 header/footer/scrollbar/four-side padding/gap/layoutMode。
- 若以后允许 card 嵌套 card，需要重新评估自动高度与拖拽转场的边界，现在仍遵守当前项目的容器不可嵌入约束。
- 如果要让 footer text 在 `showFooter=false` 时隐藏，需要先让 `StudioDefinitionInspector` 支持 visibility 条件；本次为最小改动，字段常显。

## 宽度反向约束

`2026-04-18` 起，Card Shell 增加第一版横向反向撑开规则：

- controls 默认 `autoOccupyRow=true`，拖入 card 后先按垂直整行排布。
- 勾选 `Auto occupy row` 的 control 始终占满 card 内容区宽度，并跟随 card 宽度变化。
- 取消 `Auto occupy row` 的 control 允许在 card 内保持自身横向占比；card 变宽 / 变窄时按比例换算 grid 宽度。
- 每个 control 的 `minWidth` 与布局 `minW` 会参与 card shell 的最小宽度反推。
- 同一行存在多个非占行 controls 时，最小宽度按整行组合计算：`左 padding + 控件宽度总和 + gap + 右 padding`。
- card shell 的 `minW` 会随内部行宽动态回写；如果当前 card 宽度小于计算值，会自动撑宽。
- Kit Studio 根层 `Card Shell` 右下角提供宽度拖拽把手；拖窄时会被动态 `minW` 截止，避免横向滚动。
- 水平方向继续保持 `overflow-x-hidden`，不引入横向 scrollbar。

## 实操验证结论

已在 `Kit Studio` 中完成一轮真实操作验证，结论如下：

- 从左侧资产栏将 `Card Shell` 拖入 master board，实例创建正常。
- 向 card 内继续拖入 `Heading` 与 `Button`，嵌套内容创建正常。
- 右侧 Inspector 已确认出现并可编辑以下字段：
  - `Header Text`
  - `Layout`
  - `Show Header`
  - `Show Footer`
  - `Footer Text`
  - `Enable Scrollbar`
  - `Horizontal Same`
  - `Padding Left`
  - `Padding Right`
  - `Vertical Same`
  - `Padding Top`
  - `Padding Bottom`
  - `Gap`
- 通过 Inspector 修改 `title/showHeader/showFooter/footerText` 后，store 与 DOM 都已同步更新。
- 通过 Inspector 修改四边 padding / 联动开关 / gap 后，内部控件位置与 host 实际 padding 都发生真实变化，说明 spacing 参数已接入布局引擎。
- `scrollable` 已完成双向验证：
  - 开启时内容区为 `overflow-y: auto`
  - 关闭时内容区为 `overflow-y: hidden`

当前结论：

- `Card Shell` 第一版底座能力已接通，可作为后续内置 cards / controls 适配的基础容器。
- 后续继续做具体组件迁移时，可直接遵守当前 `shell -> nested layout -> inspector props` 这套结构，不需要再重做 card shell 底层。
- `2026-04-18` 已补正 compact grid 的隐藏右侧 gutter 问题，`Horizontal Same` 关闭后即使分别录入相同的 `Left/Right` 数值，左右边距也按同一套算法计算。
