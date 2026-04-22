# Card Shell Resize Optimization Plan

用于在**不破坏当前可用版本**的前提下，专项优化 `Kit Studio` 中 `Card Shell` 的缩放体验。

当前先以“稳定、可回退、可验证”为第一原则，不把其它链路混进来一起改。

---

## 1. 冻结基线

- 当前可用快照：
  - 分支：`codex/kit-studio-snapshot-20260420`
  - 提交：`4db5b5a`
  - 提交信息：`chore: snapshot current kit studio card shell state`
- 这个版本已经满足：
  - `root ↔ card` 迁移可用
  - `A card ↔ B card` 迁移可用
  - 影子预览尺寸基本统一
  - Card Shell 自动撑宽已回归正确语义
  - 收缩边界已回到按非跟随控件实际占位计算
- 后续优化必须基于这个快照逐段推进，不能顺手混改别的链路

---

## 2. 当前问题定义

### 2.1 非跟随控件抖动

现象：

- 卡壳缩放时，`followParentWidth = false` 的内部控件会来回抖动
- 视觉上像是控件在缩放过程中被反复“重新排布 / 再拉回”

当前判断：

- 不是最终落地结果错误
- 而是**缩放过程中的中间态计算存在竞争**
- 主要怀疑是以下几组状态在抢真值：
  - `WidgetWrapper` 的 preview 宽高样式
  - `KIT_ROOT_RESIZE_PREVIEW_EVENT`
  - `NestedCanvas` 的 `rootResizePreviewCols`
  - `useContainerWidth` / `ResizeObserver` 的实时测量
  - `normalizeCompactLayout(...)` 触发的 compact 回写

### 2.2 跟随控件右侧 padding 实时不稳定

现象：

- `followParentWidth = true` 的控件，最终停下后宽度是对的
- 但缩放拖动过程中，右侧 padding 会短暂波动

当前判断：

- 这更像是**同一帧里宽度真值不唯一**
- wrapper 已经按像素拉宽，但 nested canvas 内容区宽度晚一拍更新
- 跟随控件吃到的是“上一帧的内容区宽度”，所以右侧间距拖动中不稳定

---

## 3. 不能被破坏的既有约束

后续优化必须保持以下链路不回归：

- root 画布控件不重叠
- 控件 root ↔ card 迁移保持尺寸稳定
- 控件可以从 A 卡直接拖入 B 卡
- 拖拽影子尺寸始终与本体一致
- Card Shell 自动撑宽仍然只按**非跟随控件实际占位**
- 缩放下限仍然不能小于某一行非跟随控件总占位
- `paddingRight` 不再出现旧版那种额外大空列
- 滚动条语义保持现状：只在真实出现时参与右侧视觉计算

---

## 4. 优化总策略

核心原则只有两条：

1. **缩放过程只允许一个尺寸真值**
2. **正式 compact / normalize 只在必要时发生**

换句话说：

- preview 期：以 resize session 为主
- commit 期：再把结果回写到 store

不能让 DOM 测量、preview cols、layout normalize 三套系统在拖动中互相追逐。

---

## 5. 分阶段落地方案

### 阶段 0：冻结版本

目标：

- 先确保可用态随时可回退

动作：

- 保留 `4db5b5a` 作为回退锚点
- 新的优化在新提交里逐步落地
- 每修一个缩放子问题，立即更新 `docs/debug-record.md`

### 阶段 1：统一 preview 期尺寸真值

目标：

- 让 `WidgetWrapper` 成为 root resize 期唯一的尺寸来源

建议做法：

- resize session 内维护：
  - `previewCols`
  - `previewRows`
  - `previewWidthPx`
  - `previewHeightPx`
- `NestedCanvas` 在 root resize 期间只消费这组 preview 值
- `useContainerWidth` 的测量值在 preview 期间只作观测，不反向驱动 layout 真值

重点文件：

- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`

### 阶段 2：冻结非跟随控件在 resize 中的布局

目标：

- 彻底去掉非跟随控件的实时抖动

建议做法：

- resize 开始时记录卡内 child layout snapshot
- 对 `followParentWidth = false` 的控件：
  - 缩放期间不做每帧 compact
  - 保持 `x/y/w/h` 原值
- 只在 pointer up 后：
  - 执行一次最终 normalize
  - 必要时执行一次 compact
  - 最后提交 store

为什么这样做：

- 非跟随控件本来就不应该在卡壳缩放中被实时重新排布
- 它们只应该影响卡壳“最小可收缩边界”

### 阶段 3：让跟随控件直接使用 preview 内容区宽度

目标：

- 缩放过程中右侧 padding 全程稳定

建议做法：

- 跟随控件在 preview 期直接使用：
  - 同一帧的 `previewCols`
  - 同一帧的 card content width
  - 同一帧的 `paddingLeft / paddingRight / gap`
- 不等待 `ResizeObserver` 回传后再重新套宽度

关键点：

- 跟随控件应当“跟随卡壳”
- 但这个跟随必须基于**同一帧的 preview 内容区**
- 不能一部分吃 wrapper 的像素宽度，另一部分还拿旧的 nested grid 宽度

### 阶段 4：收口提交

目标：

- 拖动过程稳定，松手后结果也稳定

建议做法：

- `pointerup` 时统一做最终 commit
- 顺序建议：
  1. 取最终 preview cols / rows
  2. 更新 root card shell 的 `w/h`
  3. 对 card child layout 做一次最终 normalize
  4. 如有必要再做一次 compact
  5. 清理 preview session / preview styles / preview events

---

## 6. 预估最小改动面

尽量只动以下文件：

- `src/builder/WidgetWrapper.tsx`
- `src/components/NestedCanvas.tsx`
- `src/hooks/useContainerWidth.ts`
- `docs/debug-record.md`

如果不是这几个文件，就要先判断是否越界。

---

## 7. 浏览器验证清单

固定要求：

- 固定 `3000` 端口
- 固定同一个浏览器窗口
- 每轮修改后真实验证，不只看代码

### 场景 A：非跟随单控件

- 卡内放一个未开启跟随父级的控件
- 左右拖拉卡壳
- 预期：
  - 控件不抖动
  - 控件宽度不跟着变
  - 卡壳不能收缩到小于控件所需宽度

### 场景 B：跟随单控件

- 卡内放一个开启跟随父级的控件
- 左右拖拉卡壳
- 预期：
  - 控件全程贴合内容区
  - 右侧 padding 全程稳定
  - 停下前后视觉一致

### 场景 C：混合场景

- 同一卡内同时放跟随控件与非跟随控件
- 拖拉卡壳
- 预期：
  - 跟随控件实时贴合
  - 非跟随控件不抖动
  - 卡壳缩放下限仍正确

### 场景 D：回归链路

- root → A 卡
- A 卡 → root
- A 卡 → B 卡
- root 上再次抓起拖动
- 预期：
  - 影子尺寸不变
  - 不额外变宽或变高
  - 不出现旧的蓝色虚框回退

---

## 8. 成功标准

满足以下条件才算这一轮缩放优化真正完成：

- 非跟随控件缩放时不再抖动
- 跟随控件右侧 padding 在拖动过程中实时稳定
- 卡壳自动撑宽、最小宽度边界、拖拽迁移都不回归
- `docs/debug-record.md` 对应问题记录完成回填

---

## 9. 本轮落地结果

状态：`已完成本轮优化`

实际策略：

- `WidgetWrapper` 的 root resize preview 事件现在同步传递 `cols / rows / widthPx / heightPx`
- `NestedCanvas` 在 preview 期间用实时 DOM 宽度与 preview 像素宽度作为内容区计算来源，避免只等 `ResizeObserver`
- preview 开始时冻结 child layout 快照；非跟随控件不在缩放过程中被每帧 compact / 回写
- preview 事件进入 `NestedCanvas` 后同步刷新，减少跟随控件落后一帧导致的右侧 padding 波动
- 非跟随控件在 preview 期间不再用 `scaleX` 补偿，改为锁定 resize 开始时的 `width / min-width / max-width` 像素值，preview clear 后恢复正常 grid 渲染
- pointer up 后再回到最终 layout commit / normalize 流程

浏览器验证：

- 固定 `3000` 端口
- 复用同一个 Chrome 远程调试窗口
- 用真实鼠标事件拖动 Card Shell 右下角缩放柄
- 最小复现场景：
  - 一个 `panel`
  - 两个 `followParentWidth = false` 控件
  - 一个 `followParentWidth = true` 控件
- 回归结果：
  - `rightGapRange: 0`
  - `fixedWidthRange: 0`
  - `fixedXRange: 0`
  - 非跟随控件 layout 未被 resize 过程改写
  - 跟随控件在松手后按新卡壳宽度提交最终 layout

补充排查：

- 用户反馈“优化没实际效果”后，确认 `3000` 端口一度仍加载旧版 resize handler；重启同一端口后再验证，确保浏览器实际执行最新源码。
- 直接锁宽比 `scaleX` 更符合本项目语义：未开启 `Follow parent` 的控件在父级 Card Shell 拉伸期间不参与父级宽度缩放，只保留自身原始像素占位。
