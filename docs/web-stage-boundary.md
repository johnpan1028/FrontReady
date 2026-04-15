# Web Stage Boundary

## Goal

当前阶段只做 `Web` 级布局，所以编辑窗与预览窗必须表现得像一个明确的网页可视窗口，而不是无限展开的画布。

这里的 `Web Stage Frame` 是平台壳级能力，不属于用户生产出来的网站或 dashboard。

## Boundary Rules

这是当前的硬约束：

1. 中心工作区是一个 **单独的 Web 窗体**
2. 窗体有明确边界：方角、硬边框、窗体 chrome、内部内容区
3. 窗体尺寸由壳级 `viewport preset` 决定，不能被内部组件撑大或挤压变形
4. **横向禁止滚动**
5. **纵向允许滚动**
6. 组件内容必须在窗体宽度内重排、收缩或裁切，不能把最外层窗体撑出横向滚动条

## What Counts As Outer Boundary

这里说的“最外边界”是：

- 编辑态：中间的 `Web Canvas` 窗体
- 预览态：中间的 `Web Preview` 窗体

不包括平台左右侧栏。

## Shell vs Project

必须明确分层：

1. `WebStageFrame` 属于平台壳：使用壳主题、壳背景、壳边框，不读取用户项目主题
2. 用户项目主题只进入窗体内部的项目内容层
3. 编辑态点阵自由画布属于平台编辑辅助层，必须放在窗体内部
4. 窗体外的大面积中部工作区使用壳主题背景，不能再使用点阵背景或项目主题背景

## Implementation

统一边界组件：`src/components/WebStageFrame.tsx`

它负责：

- 固定 Web 窗体尺寸
- 绘制窗体 chrome
- 锁定 `overflow-x: hidden`
- 开放 `overflow-y: auto`

尺寸契约：`src/builder/responsive.ts`

它负责：

- 定义壳级 viewport preset 的宽高
- 根据平台中部可用空间裁剪 viewport 尺寸
- 从内部 viewport 尺寸推导外部 stage frame 尺寸

编辑态落点：

- `src/pages/BuilderPage.tsx`

预览态落点：

- `src/runtime/RuntimePage.tsx`

## Guardrails

1. 后续新增 Web 预览器或导出页时，必须走同一套 stage frame
2. 不允许让组件内容把 stage frame 横向或纵向撑开
3. 纵向内容增长时，只能让 stage body 内部滚动
4. 如果未来支持移动端单独编排，也必须先继承这个边界模型，再做更细分分支
