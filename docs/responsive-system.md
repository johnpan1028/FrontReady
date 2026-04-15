# Responsive System

## Goal

响应式系统这一层解决的不是“做几个媒体查询”，而是把：

1. 视口预览
2. 栅格断点
3. 编辑态与运行态一致性
4. 组件最小可读性约束

统一成同一套底层契约。

## Current Contract

当前统一入口：`src/builder/responsive.ts`

它定义了两件事：

### 1. 内部栅格断点

- `xxs = 0`
- `xs = 480`
- `sm = 768`
- `md = 1200`
- `lg = 1440`

对应列数：

- `xxs = 8`
- `xs = 16`
- `sm = 24`
- `md = 40`
- `lg = 48`

### 2. 用户可视化预览视口

- `mobile = 390`
- `tablet = 768`
- `laptop = 1280`
- `desktop = 1440`
- `wide = 1728`

这五档是给用户和平台自身打磨页面时看的，不是直接暴露底层 RGL breakpoints 名字。

## Edit / Runtime Sync

当前已经做到：

1. 编辑态中心画布可以切换五档视口
2. 运行态预览使用同一视口选择
3. 运行态网格列数根据实际可用宽度切换
4. 嵌套画布与根画布共享同一份断点来源

关键落点：

- 编辑态视口框：`src/pages/BuilderPage.tsx`
- 运行态视口框：`src/runtime/RuntimePage.tsx`
- 运行态列数解析：`src/runtime/RuntimeCanvas.tsx`
- 宽度测量 hook：`src/hooks/useContainerWidth.ts`

## Guardrails

这是当前骨架阶段的硬约束：

1. 不允许编辑态和运行态各自维护不同断点表
2. 不允许只缩放预览框而不切换运行时列数
3. 不允许把固定像素宽度直接写死进蓝图结构
4. 组件必须继续保留 `minWidth / minHeight / scaleWithParent` 这类可读性约束
5. 后续如果要做“每断点独立布局”，也必须建立在当前统一断点契约上，而不是另起一套

## What This Solves Now

这一版已经能稳定解决：

- 同一项目在 mobile / tablet / laptop / desktop / wide 下可视化查看
- 编辑态和预览态宽度一致
- 画布不会再只在单一桌面宽度下假装成立

## What Comes Next

下一阶段建议继续补三件事：

1. 每断点布局差异存储
2. 溢出/折叠策略可视化告警
3. 组件级响应式规则（例如表单双栏转单栏、指标卡自动堆叠）
