# Control System P0-P4

本文件用于固定当前控件分层的产品定义。

关联文档：

- `docs/slot-shell-product-architecture.md`
- `docs/slot-shell-contract.md`

## 1. 总原则

这一版的关键结论不是“继续增加更多基础控件”。

而是：

- 真正的基础原子内嵌在系统内部
- 左栏暴露的基础壳尽量少
- 常规控件通过 `Slot Shell` 组合生成

## 2. 分层定义

### P0：Internal Atoms

P0 不直接出现在左侧拖拽栏。

当前包含：

- `text`
- `media`
- `spacer`
- `divider`
- `object`

它们通过 slot 的属性面板被创建，而不是直接拖出来。

### P1：组合结果，不是固定资产层

这一版不再把 P1 理解成一堆写死的基础控件。

`button / heading / paragraph / avatar / list item`
这些都只是：

- `Slot Shell`
- 若干 `slot`
- 若干 `P0 atoms`

组合出来的结果。

### P2：复合控制结构

P2 是更大一点的控制结构，但仍然应该优先建立在 `Slot Shell` 或 `object` 挂载上。

例如：

- 图表挂载
- 表格挂载
- 多段组合信息块

### P3：Card

`Card = Card Shell + Controls`

卡壳负责：

- header / footer
- padding / gap / overflow
- 卡片边界与内部工作区

控件仍然是自己的东西，不与卡壳配置揉在一起。

### P4：Page / Overlay Shell

P4 是页面级壳层。

它承接：

- page shell
- overlay shell
- card
- direct control

## 3. 为什么要这样改

旧思路的问题是：

- 控件看起来很多，但不够自由
- 用户无法快速拼出自己要的常规块
- 导入外部组件时，没法清晰拆到系统底座

现在这套分层的目标是：

- 原子极少
- 组合能力极强
- 后续导入适配有统一拆解规则

## 4. 左栏暴露策略

当前 `canvas / kits` 场景下：

- control 基础入口收敛为 `Slot Shell`
- card 基础入口保留 `Card Shell`

历史控件仅为兼容保留，不再作为系统设计主线。

## 5. 后续落地方式

后面要做的不是继续扩充硬编码控件库，而是：

1. 用 `Slot Shell` 造出第一批高频预设
2. 完成 `object` 的真实挂载协议
3. 把导入组件适配过程标准化
4. 让这整套底层可沉淀成独立 skill
