# P2 模式控件目录 v1

## 0. 目的

这份文档用于定义：

1. 哪些 UI 模式应该优先沉淀为 `P2 复合控件`
2. 哪些截图和成品案例可以被稳定拆回系统内语义
3. 后续导入外部成品卡时，哪些结构应该直接映射为中层模式控件，而不是继续拆成过碎的小原子

这份文档的作用，是在 `P0 / P1 / P2 / P3 / P4` 分层规则基础上，进一步补齐：

- 用户真正会高频使用的模式单元
- 后续资产库应该优先进货的控件类型
- 右侧栏大组分组在真实控件类型上的落点

---

## 1. 关联文档

- `docs/component-layer-foundation-v1.md`
- `docs/component-procurement-v1.md`
- `docs/kit-studio-architecture.md`
- `docs/kit-contract-v1.md`
- `docs/theme-system.md`

---

## 2. 为什么必须单独建立 P2 目录

如果系统只有：

- 很多 `P1 原子控件`
- 少量 `P3 Card Shell`

那么用户在真实组装时会遇到两个问题：

### 2.1 手工拼装成本过高

例如一个看起来很常见的内容块：

- 封面图
- 标题
- 描述
- 尾部按钮

如果全部靠：

- `Image`
- `Text`
- `Text`
- `Icon Button`

去手拼，虽然理论上能做出来，但实际效率很低。

### 2.2 导入外部成品卡时没有中间层承接

外部组件通常不是：

- 一个标题
- 一个输入框
- 一个按钮

这么纯粹。

它更多是：

- 媒体项
- 信息行
- 设置项
- 空状态
- 列表块
- 表格
- 图表

因此，系统必须有一批稳定的 `P2 模式控件` 作为进口后的主要承接层。

---

## 3. P2 的定位

`P2` 是平台里最关键的一层：

- 对用户：它是一个完整可用的控件
- 对开发：它内部可以由多个原语和子结构实现
- 对导入：它是吸收外来组件最自然的中间层

它本质上是：

**可配置、可复用、但不开放自由拆散拖拽的完整模式单元**

---

## 4. P2 的一级家族

首批建议把 `P2` 控件分为 8 个家族：

### 4.1 Media 家族

处理图片、视频、封面、轮播、媒体摘要等内容块。

### 4.2 Identity 家族

处理头像、作者信息、用户行、来源信息、状态标识等内容块。

### 4.3 Feed 家族

处理帖子卡、评论卡、内容摘要卡、媒体流卡等。

### 4.4 Setting 家族

处理设置项、开关项、选择项、条目行、参数块等。

### 4.5 Selection 家族

处理 chip 选择、分段选择、分页切换、步骤切换等模式。

### 4.6 Messaging 家族

处理输入条、对话输入区、提示块、AI Composer、回复框等模式。

### 4.7 State 家族

处理 loading、empty、success、warning、verified、processing 等状态型块。

### 4.8 Data 家族

处理 stat、chart、table、calendar、summary list 等重型单体控件。

---

## 5. 首批推荐 P2 清单

以下是当前最值得优先落库的首批模式控件。

## 5.1 Media 家族

### A. `media-summary-card`

适用场景：

- 图文摘要卡
- 视频摘要卡
- 模型介绍卡
- 作品预览卡

内部常见结构：

- media thumbnail
- title
- description
- source/meta

右侧栏重点：

- `Content`
- `Layout`
- `Appearance`
- `Data`

### B. `media-list-item`

适用场景：

- 视频列表项
- 音频列表项
- 文档列表项
- 收藏项

内部常见结构：

- thumbnail
- title
- secondary text
- trailing action

### C. `media-list`

适用场景：

- 垂直媒体列表
- 推荐项列表
- 收藏夹列表

说明：

`media-list` 本身建议作为 `P2`，内部 item 是数据项，不默认升级成独立控件。

### D. `media-carousel`

适用场景：

- 帖子里的图片轮播
- 产品图轮播
- 作品轮播

说明：

- 左右箭头、分页圆点属于 `P0`
- 整个轮播体作为 `P2`

---

## 5.2 Identity 家族

### A. `identity-meta-row`

适用场景：

- 作者行
- 用户信息行
- 来源信息行
- 社区帖子作者条

内部结构：

- avatar
- display name
- source / meta
- optional badge

### B. `identity-summary-card`

适用场景：

- 作者卡
- 用户简介卡
- 团队成员摘要卡

---

## 5.3 Feed 家族

### A. `social-post-body`

适用场景：

- 社区帖子正文区
- 内容平台帖子区

结构：

- identity meta row
- title
- body text
- media carousel
- engagement bar

说明：

这类通常不直接作为单体 `P2` 最终落库，而更适合在 `P4 导入卡` 拆解后，分布到：

- `P3 post shell`
- `P2 identity-meta-row`
- `P1 title / text`
- `P2 media-carousel`
- `P2 engagement-bar`

### B. `engagement-bar`

适用场景：

- 点赞 / 评论 / 分享区
- 社交交互底栏

说明：

图标本身属于 `P0`，底栏整体是 `P2`。

### C. `overflow-action-menu`

适用场景：

- 三点菜单
- 快速操作菜单

说明：

触发图标是 `P0`，菜单整体属于 `P2`。

---

## 5.4 Setting 家族

### A. `setting-row`

适用场景：

- 设置项
- 双因素认证项
- 已验证状态项
- 环境选择项

结构：

- leading icon / label
- description
- control area / trailing action

### B. `setting-option-card`

适用场景：

- 环境选择卡
- 方案选择卡
- 套餐选择卡

### C. `url-input-bar`

适用场景：

- URL 输入条
- 搜索地址条
- command style input bar

结构：

- leading icon
- input
- trailing actions

---

## 5.5 Selection 家族

### A. `choice-chip-group`

适用场景：

- 标签选择
- 筛选 chips
- 社交平台偏好选择

### B. `segmented-switcher`

适用场景：

- 视图切换
- 1/2/3 分页切换
- 类型切换

### C. `pagination-control`

适用场景：

- 上下页
- 页码切换

---

## 5.6 Messaging 家族

### A. `composer-box`

适用场景：

- 对话输入条
- AI prompt box
- 评论输入框

结构：

- input / textarea
- context actions
- submit action

### B. `chat-entry-row`

适用场景：

- 对话消息项
- 结果项
- 引导输入项

---

## 5.7 State 家族

### A. `empty-state-card`

适用场景：

- 无成员
- 无数据
- 未开始配置

### B. `processing-state-card`

适用场景：

- 正在处理
- 正在加载
- 后台任务中

### C. `verified-status-row`

适用场景：

- 已验证
- 已同步
- 已发布
- 已连接

---

## 5.8 Data 家族

### A. `stat-block`

### B. `chart-block`

### C. `table-block`

### D. `calendar-block`

说明：

这些都是 `P2` 的重型单体控件，不应默认拆成自由卡壳。

---

## 6. 对截图案例的反推映射

以下按你刚提供的截图做回拆判断。

## 6.1 社区帖子截图

建议拆法：

- `P4 social-post-card`
  - `P3 post-shell`
  - `P2 identity-meta-row`
  - `P1 title`
  - `P2 media-carousel`
  - `P2 engagement-bar`
  - `P2 overflow-action-menu`

说明：

这个案例不应该让用户靠一堆原子控件硬拼。

正确做法是把它变成：

**一个可快速复用的成品卡模板 + 若干可复用 P2 模式控件**

## 6.2 横向媒体摘要卡

建议拆法：

- `P2 media-summary-card`

说明：

这是最典型的中层模式控件。

## 6.3 单个视频行

建议拆法：

- `P2 media-list-item`

## 6.4 视频列表卡

建议拆法：

- `P3 list-shell`
  - `P1 section-title`
  - `P2 media-list`

## 6.5 shadcn 多组件画廊

这不是一个完整业务卡，而是一组模式控件库。

可拆成：

- `P3 form-shell`
- `P2 empty-state-card`
- `P2 url-input-bar`
- `P2 setting-row`
- `P2 choice-chip-group`
- `P2 pagination-control`
- `P2 processing-state-card`
- `P2 composer-box`

结论：

只要这批 `P2` 做出来，用户就可以很快拼出类似案例。

---

## 7. 首批优先级

建议按以下优先级推进。

## 7.1 P2 第一优先级

这是最能直接提升组装效率的一批：

1. `media-summary-card`
2. `media-list-item`
3. `media-list`
4. `setting-row`
5. `choice-chip-group`
6. `empty-state-card`
7. `processing-state-card`
8. `composer-box`

## 7.2 P2 第二优先级

1. `identity-meta-row`
2. `engagement-bar`
3. `url-input-bar`
4. `pagination-control`
5. `verified-status-row`

## 7.3 P2 重型控件

这些通常已存在基础版或即将通过外部组件适配进入：

1. `chart-block`
2. `table-block`
3. `calendar-block`
4. `stat-block`

---

## 8. 与 P1 / P3 的边界

### 什么应该保留为 P1

- 标题
- 段落
- 按钮
- 输入框
- 单个 checkbox
- 分割线

### 什么应该升级为 P2

- 列表项
- 信息行
- 状态卡
- 设置项
- 社交底栏
- 轮播
- 表格
- 图表

### 什么才应该是 P3

只有当用户真的需要：

- 自由拖入多个子控件
- 独立管理子控件布局
- slot 级承接内容

时，才使用卡壳。

---

## 9. 导入时的优先拆解策略

后续导入外部成品卡时，不要一上来问：

“能不能拆成很多原子控件？”

正确问题应该是：

“它是否可以优先映射为现有 P2 模式？”

推荐顺序：

1. 先识别 `P3` 边界
2. 再匹配是否能落入现有 `P2` 目录
3. 再补少量 `P1`
4. 剩余局部留在 `P0`
5. 只有确实没有中层承接物时，才新增新的 `P2`

这样能保证：

- 用户效率高
- 资产库增长有秩序
- 导入适配不会越来越乱

---

## 10. 最终结论

如果平台想让用户高效率拼出真实世界产品界面，就不能只建设：

- 原子控件库
- 卡壳库

中间必须有一层稳定的：

**P2 模式控件库**

这层才是后续：

- 提升组装速度
- 提升导入成功率
- 提升右侧栏可用性

的关键。
