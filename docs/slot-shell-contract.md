# Slot Shell Contract

本文件是 `Slot Shell` 的可执行合同说明。

产品背景与拆解图见：

- `docs/slot-shell-product-architecture.md`

## 1. 合同目标

`Slot Shell` 是当前系统唯一长期演进的基础 control 母体。

它的职责是：

- 承接 slot 结构
- 承接 atom 组合
- 承接后续导入组件的适配落位

它不是传统意义上的“一个已经长好的按钮 / 标题 / 表单项”。

## 2. 数据结构

```ts
type SlotShellSlotType = 'empty' | 'text' | 'media' | 'spacer' | 'divider' | 'object'
type SlotShellSlotSize = 'sm' | 'md' | 'lg'
type SlotShellSlotAlign = 'start' | 'center' | 'end'
type SlotShellTextRole = 'title' | 'body' | 'meta'
type SlotShellMediaKind = 'icon' | 'image' | 'video'
type SlotShellObjectKind = 'chart' | 'table' | 'calendar' | 'media' | 'custom'

type SlotShellSlot = {
  id: string
  type: SlotShellSlotType
  span: number
  size: SlotShellSlotSize
  align: SlotShellSlotAlign
  hoverText?: string
  text?: string
  textRole?: SlotShellTextRole
  mediaKind?: SlotShellMediaKind
  icon?: IconName
  imageUrl?: string
  videoUrl?: string
  objectKind?: SlotShellObjectKind
  objectLabel?: string
  actions?: NodeAction[]
}

type SlotShellRow = {
  id: string
  slots: SlotShellSlot[]
}

type SlotShellContract = {
  rowCount: number
  columnCount: number
  rows: SlotShellRow[]
}
```

## 3. 编辑器强约束

### 3.1 默认实例

- 默认 `rowCount = 1`
- 默认 `columnCount = 1`
- 默认 `rows = [1 empty slot]`
- 默认落地是 `1x1` 空槽

### 3.2 Inspector 双态

#### shell 选中态

只出现 shell 结构字段：

- `Rows`
- `Columns`
- `Duplicate Row`
- `Add Row`
- `Remove Row`

#### slot 选中态

只出现当前 slot 字段：

- `Type`
- `Size`
- `Span`
- `Align`
- `Text`
- `Media`
- `Object`
- `Logic / Actions`

### 3.3 不暴露 root resize

`Slot Shell` 不是自由缩放控件。

系统底层允许它映射为 grid 尺寸，但用户面板不直接编辑传统 `Cols / Rows / Min Cols / Min Rows`。

## 4. 结构操作规则

### 4.1 行复制

- 复制的是整行结构
- 新行要产生新的 `row.id`
- 行内 slot 也要生成新的 `slot.id`

### 4.2 拼接

- 当前第一版只做“向右拼接”
- 表现为当前 slot 吃掉右侧相邻 slot 的 `span`

### 4.3 拆分

- 如果当前 `span > 1`，则拆回更小 span
- 如果当前 `span = 1`，则在后方插入一个空 slot

## 5. 命名与模板提取

当 `Slot Shell` 被提取为模板时，命名优先级如下：

1. 第一段非空 `text slot.text`
2. 第一段非空 `object slot.objectLabel`
3. 退回通用模板名

## 6. 导入兼容

兼容旧数据时允许把历史 `graphic` 输入归一到当前 `media` 结构。

但新代码与新文档统一使用：

- `mediaKind`
- `icon`
- `imageUrl`
- `videoUrl`

## 7. 当前实现文件

- `src/builder/slotShell.ts`
- `src/components/patterns/SlotShellWidgets.tsx`
- `src/components/builder-page/SlotShellInspectorSections.tsx`

后续任何 slot shell 改动，都应先更新本文件，再改代码。
