# 右侧栏大组架构 v1

## 0. 目的

这份文档用于定义 `Kit Studio` 右侧栏在后续重构中的统一架构。

它解决四个问题：

1. 卡壳和控件的属性如何按大组稳定分类
2. 当前散落的 section 应如何归并到上层大组
3. 后续新增控件、复合控件、导入卡时，右侧栏如何自动落位
4. `propertyGroups` 与 `inspector sections` 之间的职责边界是什么

---

## 1. 关联文档

- `docs/component-layer-foundation-v1.md`
- `docs/p2-pattern-catalog-v1.md`
- `docs/kit-studio-architecture.md`
- `docs/kit-contract-v1.md`

---

## 2. 设计目标

右侧栏必须同时满足以下四个目标：

### 2.1 用户扫描快

用户不需要在 10 多个小 section 之间来回找字段。

### 2.2 卡壳与控件心智一致

除了第一组不同外，其余分组顺序要尽量一致，形成肌肉记忆。

### 2.3 对导入适配友好

外部组件进入平台后，字段应先落到固定大组，再落到小 section，而不是临时塞位置。

### 2.4 对 schema 友好

右侧栏应由：

- 上层 `propertyGroups`
- 下层 `inspector sections`

两层共同驱动。

---

## 3. 总体结构

右侧栏统一采用：

**大组 > section > field**

说明：

- **大组**：用户扫描层
- **section**：语义块层
- **field**：实际输入项

也就是说，后续不应再只靠 section 平铺。

---

## 4. 标准大组

## 4.1 控件标准大组

所有 `P1 / P2` 控件统一使用 5 个大组：

1. `Content`
2. `Layout`
3. `Appearance`
4. `Data`
5. `Logic`

## 4.2 Card Shell 标准大组

所有 `P3` 卡壳统一使用 5 个大组：

1. `Shell`
2. `Layout`
3. `Appearance`
4. `Data`
5. `Logic`

## 4.3 为什么不是所有节点都完全同名

因为卡壳和控件最大的差异，就在第一组：

- 控件的第一组是“内容”
- 卡壳的第一组是“壳体”

其余四组尽量保持一致，这样最符合用户操作习惯。

---

## 5. 大组职责定义

## 5.1 `Content`

只用于控件。

负责：

- 可见内容
- 文案
- 选项
- 结构性内容字段
- 组件核心业务字段

典型字段：

- text
- label
- placeholder
- title
- description
- options
- media source
- item list

### 适用控件

- `Heading`
- `Text`
- `Button`
- `Input`
- `Checkbox Group`
- `Media Summary Card`
- `Setting Row`
- `Chart` 的标题副标题

## 5.2 `Shell`

只用于卡壳。

负责：

- Header
- Footer
- Overflow
- Slot policy
- Card 边界层规则

典型字段：

- showHeader
- title
- showFooter
- footerText
- scrollable
- slot rules

## 5.3 `Layout`

控件和卡壳共用。

负责：

- Size
- 宽高
- 最小尺寸
- 跟随父级
- Padding
- Gap
- 高度策略
- 布局约束

典型字段：

- w / h / minW / minH
- followParentWidth
- paddingLeft / Right / Top / Bottom
- linkHorizontalPadding
- linkVerticalPadding
- gap

## 5.4 `Appearance`

控件和卡壳共用。

负责：

- Typography
- Border
- Corner
- Variant
- Chrome
- Theme follow
- 局部样式覆盖

典型字段：

- fontFamily
- text size / weight
- borderStyle
- controlBorderStyle
- childrenFollowBorder
- childrenFollowFont
- corner presets
- variant
- tone
- chrome

## 5.5 `Data`

控件和卡壳共用，但重量不同。

负责：

- bindings
- state key
- value path
- default value
- data source
- field mapping
- slot data contract
- empty / error / loading contract

说明：

- `P1` 往往较轻
- `P2` 通常较重
- `P3` 更多是 contract 级数据

## 5.6 `Logic`

控件和卡壳共用。

负责：

- actions
- event mapping
- handoff
- constraints
- publish / export notes

典型字段：

- actions
- ai handoff
- bindings summary
- pixel constraints

---

## 6. 当前 section 到大组的映射

## 6.1 控件当前映射

### `Content`

- `content`

### `Layout`

- `layout`
- `size`

### `Appearance`

- `typography`
- `frame`
- `corner`
- `style`

### `Data`

- 未来 `state`
- 未来 `data`
- 未来 `mapping`

### `Logic`

- `bindings`
- `actions`
- `handoff`
- `pixel-constraints`

## 6.2 卡壳当前映射

### `Shell`

- `header`
- `footer`
- `overflow`

### `Layout`

- `spacing`
- `size`

### `Appearance`

- `typography`
- `frame`
- `corner`

### `Data`

- 未来 `slot-policy`
- 未来 `default-data-context`
- 未来 `child-inherit-policy`

### `Logic`

- `bindings`
- `actions`
- `handoff`
- `pixel-constraints`

---

## 7. section 组织规则

## 7.1 大组数量控制

默认最多显示 5 个大组。

空组不显示。

## 7.2 每个大组下的 section 数量

默认建议 1~4 个 section。

超过 4 个 section 时，应考虑：

- 合并语义
- 改为数据驱动子模块
- 或升级为复合控件专属 section

## 7.3 组内顺序

### 控件顺序

1. Content
2. Layout
3. Appearance
4. Data
5. Logic

### 卡壳顺序

1. Shell
2. Layout
3. Appearance
4. Data
5. Logic

---

## 8. `propertyGroups` 与 `inspector sections` 的关系

当前合同里已经有：

- `propertyGroups`
- `inspector`

后续建议职责明确如下。

## 8.1 `propertyGroups`

作用：

- 定义大组
- 决定 section 挂载位置
- 决定右侧栏主结构

建议字段语义：

- `id`
- `title`
- `description`
- `fields`
- `meta.sectionIds`

说明：

短期内即使不把 `fields` 用满，也应至少把它作为：

**Inspector 大组编排元数据**

来使用。

## 8.2 `inspector sections`

作用：

- 定义真正渲染的 section
- 定义字段
- 定义 section 内交互结构

## 8.3 推荐组合方式

后续推荐：

- `propertyGroups` 负责大组骨架
- `inspector sections` 负责 section 细节

即：

`groupId -> section[] -> field[]`

---

## 9. 建议的大组 ID

为了便于 schema 驱动，建议固定以下大组 ID。

## 9.1 控件

- `content`
- `layout`
- `appearance`
- `data`
- `logic`

## 9.2 卡壳

- `shell`
- `layout`
- `appearance`
- `data`
- `logic`

---

## 10. 首批适配建议

## 10.1 先适配卡壳

因为卡壳字段最稳定，建议先把：

- `header`
- `footer`
- `overflow`
- `spacing`
- `frame`
- `corner`
- `typography`
- `handoff`

归并到大组骨架里。

## 10.2 再适配普通控件

例如：

- `Heading`
- `Text`
- `Button`
- `Text Input`

这批控件的 section 数少，最适合验证大组 UI。

## 10.3 最后适配 P2

因为 `P2` 往往会真正用到：

- `Data`
- `Logic`
- 多 section 协同

它们适合在大组骨架稳定后再接入。

---

## 11. 不同层级节点的右侧栏策略

## 11.1 `P0 原语`

不拥有独立右侧栏。

## 11.2 `P1 原子控件`

使用标准控件五大组。

## 11.3 `P2 复合控件`

仍然使用标准控件五大组，但通常：

- `Content` 更结构化
- `Data` 更重要
- `Appearance` 可能更窄

## 11.4 `P3 Card Shell`

使用 `Shell / Layout / Appearance / Data / Logic`

## 11.5 `P4 成品卡`

不建议保留“大一统合并面板”。

正确做法是：

- 选中根壳看壳体面板
- 选中子控件看子控件面板

即：

**谁被选中，就展示谁自己的大组结构。**

---

## 12. 对截图案例的右侧栏映射示例

## 12.1 `media-summary-card`

- `Content`：title / description / source
- `Layout`：thumbnail ratio / size / row height
- `Appearance`：surface / border / corner / typography
- `Data`：image src / link / source tag
- `Logic`：click action / trailing action

## 12.2 `setting-row`

- `Content`：label / description
- `Layout`：density / trailing width
- `Appearance`：variant / border / icon style
- `Data`：state key / current value
- `Logic`：toggle / navigate / open dialog

## 12.3 `chart-block`

- `Content`：title / subtitle / empty copy
- `Layout`：size / height policy
- `Appearance`：theme / grid / border / corner
- `Data`：source / fields / aggregation / series
- `Logic`：refresh / click point / filter sync

## 12.4 `card-shell`

- `Shell`：header / footer / overflow
- `Layout`：size / padding / gap / auto height
- `Appearance`：typography / border / corner / follow
- `Data`：slot policy / inherit policy
- `Logic`：handoff / constraints / actions

---

## 13. 最终结论

右侧栏后续不应继续按“所有 section 平铺”发展。

必须升级为：

**大组骨架稳定、section 可扩展、字段按 schema 驱动**

具体结论如下：

1. 控件统一用 `Content / Layout / Appearance / Data / Logic`
2. 卡壳统一用 `Shell / Layout / Appearance / Data / Logic`
3. `propertyGroups` 用来承载大组
4. `inspector sections` 用来承载具体 section
5. 后续新增控件和导入组件，必须先决定归哪个大组，再决定 section 怎么写

这套结构一旦定住，后续：

- `P2` 模式控件扩张
- 右侧栏 UI 重构
- 外部组件导入
- AI 自动生成 Inspector

都会容易很多。
