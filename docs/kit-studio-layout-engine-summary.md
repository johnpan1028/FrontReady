# Kit Studio 布局引擎与拖拽架构总结

更新时间：2026-04-20

## 1. 目的

这份文档用于固化当前 `Kit Studio` 中 **Card Shell + Controls** 这一套已经跑通的底层规则。

目标不是重复产品规划，而是把现在已经验证过的：

- 布局结构
- 间距模型
- 拖拽语义
- 自动高度
- 滚动条语义
- 根层与卡内的职责边界

整理成一份后续可以直接复用、对照、扩展的技术基线。

适用场景：

1. 后续继续增加内置 controls
2. 将外部组件适配进 Card Shell
3. 新开 card/card shell 能力分支时快速对照
4. 排查拖拽、间距、重排、滚动相关 bug 时统一口径

---

## 2. 当前总体结构

当前 `Kit Studio` 的结构已经稳定为三层：

1. **根层母板（Master Board）**
2. **Card Shell（panel）**
3. **Card 内部布局层（NestedCanvas）**

对应到代码：

- 根层母板：`src/components/KitFactoryBoard.tsx`
- Card Shell 渲染：`src/builder/registry.tsx`
- 卡内布局引擎：`src/components/NestedCanvas.tsx`
- 控件壳与拖拽把手：`src/builder/WidgetWrapper.tsx`
- 布局与节点持久化：`src/store/builderStore.ts`

这三层的职责边界必须保持清晰，后续不要再混回去。

---

## 3. 根层母板职责

根层母板是 `Kit Studio` 顶层工作区，它不是普通 RGL 网格，而是 **ReactFlow 驱动的 card 级画板**。

### 3.1 它负责什么

- 放置顶层 `Card Shell`
- 负责 card 与 card 之间不重叠
- 负责根层拖放预览
- 负责根层 card 的 focus / fit / board 操作
- 负责根层 card 的自由定位
- 负责根层 card 的宽高缩放落地到 root layout

### 3.2 它不负责什么

- 不负责 card 内部 controls 排布
- 不负责 card 内部 gap / padding
- 不负责 controls 在 card 内部的重排
- 不负责 controls 的业务语义

### 3.3 当前稳定约束

- 根层 `Card Shell` 可自由移动
- 根层节点不能重叠
- 根层缩放以 card 自身 `w / h` 写回 root layout
- 根层是 card 级编辑面，不是 control 级布局引擎

这个边界很重要：

**根层解决 card 间关系，卡内解决 control 间关系。**

---

## 4. Card Shell 职责

当前代码里 `panel` 就是产品语义里的 `Card Shell`。

Card Shell 只承担壳层职责，不承载具体业务控件算法。

### 4.1 它负责什么

- header 渲染
- footer 渲染
- 内容区滚动策略
- 四边 padding 参数透传
- gap 参数透传
- layoutMode 透传
- scrollable 透传
- card 内部装配区的边界建立

### 4.2 它不负责什么

- 不直接决定控件怎样排序
- 不直接决定控件怎样交换位置
- 不直接处理控件拖拽中的转场
- 不直接处理 imported component 的业务属性

### 4.3 Card Shell 当前核心字段

当前已经稳定接通：

- `title`
- `showHeader`
- `showFooter`
- `footerText`
- `layoutMode`
- `scrollable`
- `paddingLeft`
- `paddingRight`
- `paddingTop`
- `paddingBottom`
- `linkHorizontalPadding`
- `linkVerticalPadding`
- `gap`

这意味着以后再引入 card，不应该重新发明一套 spacing / shell 语义，而是优先落进这一套字段。

---

## 5. Card 内部布局引擎职责

`NestedCanvas` 是当前最关键的一层。

它是 card 内部 controls 的真实布局引擎。

### 5.1 它负责什么

- 卡内 grid / flex 布局
- 控件拖入 / 拖出 / 内部重排
- 卡内 gap 与四边 padding 生效
- compact 模式单列/自由列逻辑
- `scrollable=false` 时按内容反推 card 高度
- `scrollable=true` 时内容滚动与可视区域协同
- 对 imported controls 提供统一承接底座

### 5.2 它当前为何可复用

因为现在已经把这些最容易打架的能力，统一收敛到了同一处：

- spacing
- drop
- compaction
- internal reorder
- root/card 转场边界
- scrollbar 语义

以后新控件只要遵守 `NestedCanvas` 的输入契约，就不必再从头搭布局层。

---

## 6. 间距模型已经固定

这是后续最应该复用的一组规则。

### 6.1 间距输入源

Card Shell 当前使用四边 padding，而不是旧的 `paddingX / paddingY` 对称模型。

最终稳定字段：

- `paddingLeft`
- `paddingRight`
- `paddingTop`
- `paddingBottom`
- `gap`

兼容层仍允许读取旧值，但新能力必须按四边模型思考。

### 6.2 联动规则

- `linkHorizontalPadding=true`：左/右联动
- `linkVerticalPadding=true`：上/下联动

这两个联动是 UI 层规则，不是布局层例外逻辑。

也就是说：

- 布局引擎只吃最终值
- store 负责把联动值整理成最终四边值

### 6.3 生效位置

当前稳定做法：

- host 承担四边 padding
- 内部 grid 宽度按左右 padding 反推
- gap 直接映射为内部布局 `margin`

这样做的优点：

- 左右/上下语义统一
- 更容易和 imported component 的 slot 映射对齐
- 不依赖 RGL 对称 `containerPadding` 的旧模型

---

## 7. 滚动条语义已经固定

这一条必须单独记，因为刚做完多轮修正。

### 7.1 `scrollable=false`

语义：

- 不滚动
- card 按内部内容自动增长高度
- 底部 padding 必须真实贴合最后一个控件到底边的距离

当前算法：

- 读取 `layoutMaxY`
- 用真实控件内容高度 + gap + top/bottom padding
- 再叠加 header/footer chrome 高度
- 反推 root / parent layout 的 `h`

### 7.2 `scrollable=true`

语义：

- 内容区允许滚动
- 当内容没有溢出时，不应该提前预留滚动条宽度
- 当内容真实溢出、滚动条出现时：
  - `paddingRight` 表示控件到滚动条左边缘的距离
  - 不包含滚动条自身宽度

### 7.3 最终结论

**只有真实滚动条出现时，才会把滚动条宽度纳入右侧外缘。**

这意味着：

- 无滚动条：右边距 = `paddingRight`
- 有滚动条：控件到滚动条左边缘 = `paddingRight`
- 控件到 card body 最外缘 = `paddingRight + scrollbarWidth`

这个语义以后不要再改混。

---

## 8. 宽度模型已经固定

### 8.1 `autoOccupyRow=true`

这是当前 controls 的默认模式。

语义：

- 控件占满当前 card 内容区宽度
- 在 compact 模式下按垂直顺序排布
- 随 card 宽度变化自动跟随

这是最稳定、最适合作为默认导入模式的布局方式。

### 8.2 `autoOccupyRow=false`

语义：

- 控件允许保留自身宽度
- 可以在 card 内部组成同一行
- 适合后续更复杂的表单、按钮组、组合展示结构

### 8.3 当前收敛原则

- 默认先按整行排布，保证可用性优先
- 非占行只作为显式能力，不作为默认状态
- card 内部布局基线应先稳定，再追求复杂同排策略

---

## 9. 拖拽模型已经分层固定

这是后续最值得复用的部分之一。

### 9.1 拖拽入口只有一个正式抓手

当前稳定方案是：

- 控件移动通过拖动柄触发
- 控件本体不再承担独立抓起能力
- 但保留本体在内部重排时的原生视觉动效

这样可以减少：

- 卡内/卡外转场误判
- 本体抓起与 handle 抓起逻辑冲突
- 控件误拖导致的混乱

### 9.2 三类拖拽场景

#### A. 左侧资产栏 → 卡内/根层

- 创建新节点
- 根据 drop 目标决定 parent
- Card Shell 不允许作为普通控件一样无约束乱入

#### B. 卡内控件 → 卡内重排

- 使用 RGL 原生拖动与占位
- 支持上下重排
- 后续 imported controls 默认也要沿用这条链路

#### C. 卡内控件 ↔ 根层画板

- 同一拖动柄，drop 时再判断最终落点
- 鼠标释放点在 card 内：服从卡内约束
- 鼠标释放点在 card 外且进入根画板：转场为根层节点

这条规则是现在“卡内进出已跑通”的核心。

### 9.3 当前转场原则

- 判断发生在 drop / drag-stop 结果层，而不是仅靠起点
- 同一控件只维护一份真实实体
- preview / placeholder 只用于视觉，不应变成第二实体

---

## 10. 拖拽预览与占位逻辑

### 10.1 当前有效预览类型

系统现在区分：

- 根层 board preview
- 卡内 RGL placeholder
- 外部 drag proxy

### 10.2 稳定原则

- 同一时刻只应该存在当前语义需要的预览
- 不允许 root preview 和 card preview 双重同时占位
- 不允许 preview 仍留在旧容器参与布局计算

### 10.3 当前经验结论

凡是拖拽 bug，优先排查三件事：

1. preview 是否转场成功
2. 原容器 placeholder 是否已清掉
3. drop 结果是否只写入一个 parent

这三条已经被证明是高频根因。

---

## 11. 根层与卡内的重排边界

### 11.1 根层

- 根层 card 之间不允许重叠
- 根层更偏“自由摆放 + 防碰撞”
- 根层不是 card 内 controls 的 compaction 场所

### 11.2 卡内

- 卡内由 compact grid / RGL 负责重排
- 纵向 compaction、占位推动、内部交换都在卡内解决
- card 内部排布不应反过来污染根层布局逻辑

这条边界保持住，系统就不容易再次打架。

---

## 12. 当前已验证的稳定约束

当前可以视为 v1 已基本稳定的约束有：

1. 根层 card 可移动、可缩放、不重叠
2. 控件可从左栏拖入 card 或根层
3. 控件可在卡内重排
4. 控件可从卡内拖出到根层
5. 控件可从根层重新拖入 card
6. Card Shell 四边 padding / gap 生效稳定
7. `scrollable=false` 自动高度可用
8. `scrollable=true` 的滚动条语义已稳定
9. 控件边框、选中态、虚线态已接入统一规则
10. 删除入口已统一走上方工具栏或右侧面板，不再依赖控件右上角垃圾桶

---

## 13. 对后续 imported component 的复用建议

以后从 `shadcn` 或别处导入控件时，建议遵守以下顺序：

### 第一步：先判定它属于哪一层

它是：

- control
- card
- shell
- 还是复合 card

### 第二步：先落到底层契约，不要先写样式

先明确：

- 它是否 `autoOccupyRow`
- 是否需要最小宽高
- 是否需要 header/footer slot
- 是否暴露哪些 inspector 字段
- 是否需要 actions / bindings

### 第三步：尽量复用现有 spacing / drag / layout 规则

优先复用：

- Card Shell 四边 spacing
- NestedCanvas 拖放规则
- WidgetWrapper 抓手与选中态
- builderStore 的 layout 更新链路

### 第四步：不要直接把 imported component 的原始结构硬塞进系统

要先拆成：

- shell
- slots
- controls
- style contract
- data contract

这样以后才不会再次被某个外来组件牵着底层结构跑。

---

## 14. 当前仍应保持的约束

为了避免副作用，后续开发继续遵守：

- 不随手改 root board 的定位系统
- 不让 card shell 和 control 共用同一套根层重排语义
- 不恢复控件本体抓起作为正式拖拽入口
- 不把 spacing 再退回 `paddingX / paddingY` 的对称模型
- 不在无明确收益时重新引入稳定 scrollbar gutter
- 不在 imported card 中绕开 `NestedCanvas` 自己另写一套拖放系统

---

## 15. 后续文档关系

这份文档作为当前布局引擎总纲，和以下文档配合使用：

- `docs/kit-studio-architecture.md`：讲产品定位与模块分层
- `docs/card-shell-panel-technical-note.md`：讲 card shell / panel 的历史适配细节
- `docs/debug-record.md`：讲 bug、修复与边界案例

推荐后续使用方式：

- 新人先看本文件
- 做 card shell / controls 适配时对照 `card-shell-panel-technical-note.md`
- 遇到异常再查 `debug-record.md`

---

## 16. 一句话结论

当前版本的 `Kit Studio`，已经形成了一套可复用的底层：

**根层管 card，卡内管 control；Card Shell 管壳，NestedCanvas 管布局；拖拽按落点分层，间距按四边模型统一，滚动条只在真实出现时才参与右侧外缘计算。**

以后新增 card、control、import adapter，都应优先复用这条基线，而不是重新发明一套布局与拖拽逻辑。
