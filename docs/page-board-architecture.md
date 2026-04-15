# Page Board Architecture

## Goal

把项目编辑态从“单页画布”升级为“页面拓扑工作台”。

平台层必须提供一个无限底板，用来承载：

- 页面 `Page`
- 弹窗/抽屉/浮层 `Overlay`
- 页面之间的跳转和打开关系

这样用户能在一个视野里看清整个前端项目结构，而不是依赖记忆在多个页面之间来回切换。

## Layer Model

从外到内分 4 层：

1. **Platform Shell**
   - 平台主题
   - 顶部工具栏、左右栏
   - 无限底板容器
2. **Page Board**
   - 无限平移、缩放、定位
   - 平铺多个 `PageNode`
   - 展示页面关系边
3. **Page Shell**
   - 每个页面节点对应一个页面壳
   - 尺寸受页面 viewport 和页面边界约束
   - 不允许被内容撑破
4. **Page Content**
   - 页面内部组件布局
   - 主题、数据绑定、动作

## Core Objects

### `Page`

真实页面对象，至少包含：

- `id`
- `name`
- `route`
- `kind = page`
- `viewportPreset`
- `board.x / board.y / board.width / board.height`
- `nodes`

### `Overlay`

作为子页面存在的浮层对象，至少包含：

- `kind = overlay`
- 独立 `board` 位置
- 独立 `viewportPreset`
- 尺寸可自由定义
- 最大不能超过其承载页面的硬边界
- 必须优先视为某个 `Page` 的派生节点，而不是平级主页面

## Topology Shape

推荐的默认拓扑不是“所有节点平级乱连”，而是：

- `Page -> Page` 形成主干
- 每个 `Page` 派生自己的 `Overlay` 星系
- `Overlay -> Overlay` 允许同族切换
- `Overlay -> Page` 保留为少量例外流

这让用户能一眼区分：

1. 真正的页面流转
2. 页面内浮层关系
3. 少量异常跳转

## Board Rules

1. Page Board 属于平台层，不受项目主题影响
2. Board 必须支持：
   - 平移
   - 缩放
   - fit/定位到某个页面
3. 页面节点可以拖拽进底板创建
4. 页面节点可以通过动作关系生成连线
5. 页面节点本身是页面壳，不是普通组件卡片

## Board Toolbar

Page Board 需要壳级工具栏，至少包含：

- `Select`
- `Connect`
- `New Page`
- `New Overlay`
- `Delete`
- `Focus`
- `Fit View`
- `Quick Jump`

说明：

- `New Page` / `New Overlay` 既可以点击直接创建，也可以拖入底板手动落点
- 工具栏下方需要持续显示当前结构状态和关系图例
- 工具栏属于平台层，不承载页面内部组件编辑职责

工具栏职责是做结构编辑，不是做页面内容编辑。

## Link Styles

线型必须区分关系类型：

- `navigate-page`：页面到页面，主干实线
- `open-overlay`：页面到浮层，虚线
- `switch-overlay`：浮层到浮层，点线
- `return-page`：浮层回页面，弱强调实线

## Current Engine Choice

当前优先复用 `React Flow / XYFlow`：

- 适合节点/边模型
- 原生支持 pan/zoom/viewport
- 适合后续页面连线、结构缩略图、定位和 fit view

## Editing vs Preview

### Edit

- 中间主区域是 `Page Board`
- 选中页面后进入该页面的 `Canvas` 子模式做组件编辑
- 页面关系和页面内部编辑分层处理

### Preview

- 不显示 Page Board
- 只显示真实单窗口 runtime
- 从 `homePageId` 开始模拟真实访问
- `navigate` 切页
- `open-modal` 打开 overlay

## Migration Direction

第一阶段：

- 建立 `pages[]` 的真实编辑状态
- 建立 `selectedPageId`
- 建立 `board` 坐标和尺寸
- 引入 `Page Board`

第二阶段：

- 页面节点动作直接生成页面关系边
- 从 Board 中拖入新页面/overlay
- 页面快速定位与聚焦
- 工具栏连接/删除/聚焦/总览闭环
- Overlay 围绕宿主 Page 做星系式默认排布
- Overlay 尺寸跟随宿主页边界约束

第三阶段：

- 把页面内部编辑器与 PageNode 更紧密耦合
- 让页面节点支持更高保真缩略
- 建立 overlay 约束和层级关系
