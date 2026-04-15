# Theme System

## Goal

主题系统不是只放几套颜色，而是给项目建立一套可持续扩展的“主题仓 + 导入规则 + 运行时 token 映射”底座。

当前这一层只解决三件事：

1. 让主题有统一 schema，可被校验、编排、复用。
2. 让主题来源透明，区分原创、官方参考、社区参考。
3. 让后续“从 DESIGN.md / 品牌规范 / 设计系统文档生成主题”有固定入口。

## Current Model

运行时仍然只持久化 `themeId`。

主题现在明确分成两层：

1. **Platform shell theme**
   - 作用对象：平台自身的工作台、侧栏、属性面板、账户区
   - 当前策略：仅支持 `light / dark`
   - 运行位置：`document.documentElement[data-shell-theme]`
2. **Project theme**
   - 作用对象：用户正在搭建的页面画布、组件树、运行态预览
   - 当前策略：支持内置主题、项目主题库、导入与编辑
   - 运行位置：仅允许下发到 `.project-theme-scope`

主题本体由 `src/theme/schema.ts` 和 `src/theme/presets.ts` 管理，包含：

- `tokens`：页面基础色板
- `typography`：字体族、标题字重、正文基础字号
- `shape`：卡片圆角、控件圆角、阴影
- `source`：主题来源说明
- `importPolicy`：是直接映射还是二次演绎
- `guidance`：适用场景、明暗属性、避免场景

示例 manifest 见 `docs/theme-manifest.example.json`
示例 markdown 主题见 `docs/theme-design.example.md`

当前 UI 已具备：

- 内置主题库
- 项目自定义主题库
- 参考风格源一键派生
- 主题编辑器（颜色 / 字体 / 圆角 / 阴影）
- JSON / DESIGN.md 主题导入

## Source Kinds

- `handcrafted`：项目内原创主题
- `official-reference`：基于公开官方设计系统整理的主题
- `community-reference`：基于社区主题库或 DESIGN.md 样例提炼的主题

## Import Rules

后续导入外部设计规范时，按以下规则执行：

1. 先抽取 token，不先抄组件实现。
2. 先映射颜色、文字层级、圆角、间距语气，再决定组件皮肤。
3. 默认走 `derived`，即“借鉴气质 + 转译成本项目主题 token”。
4. 只有明确允许、且确实需要品牌直出时，才考虑 `direct`。
5. 默认 `userFacingBranding = generic`，避免把外部品牌身份硬塞给最终用户项目。

## Reference Starters

当前第一批参考风格源包括：

- GitHub Product Light
- Carbon Enterprise Light
- Material Expressive Light
- DESIGN.md Studio Warm

这些都属于“派生主题”，不是对外部品牌主题的直接复制。

## Runtime Contract

运行时真正消费的仍然是这些颜色 token：

- `bg`
- `panel`
- `border`
- `text`
- `muted`
- `primary`
- `success`
- `danger`
- `warning`

运行时还会消费这些结构化 token：

- `typography.fontFamily`
- `typography.headingWeight`
- `typography.bodySize`
- `shape.panelRadius`
- `shape.controlRadius`
- `shape.panelShadow`
- `shape.panelHoverShadow`

它们最终映射到项目作用域 CSS variables，由 `applyProjectThemeToElement()` 下发到 `.project-theme-scope`。

平台壳层则通过 shell variables 驱动，不再允许用户项目主题写入 document root。

## Isolation Guardrails

这是当前骨架阶段的硬约束：

1. 用户项目主题 **禁止** 直接修改 `document.documentElement`
2. 只有 `.project-theme-scope` 内部才允许消费项目主题变量
3. 平台壳层主题与用户项目主题必须分别有自己的变量来源
4. 以后新增预览器、运行页、导出页时，必须显式包裹 `ProjectThemeScope`
5. 如果某个 shell 组件意外放进 `.project-theme-scope`，它会被视为架构错误而不是主题特性
6. `.project-theme-scope` 不仅要覆写语义别名变量，还必须直接覆写 `--color-hr-*`，否则 Tailwind 主题类会继续读取壳层颜色

## Next Step

下一阶段建议追加三部分：

1. `theme manifests/` 目录：允许 JSON 主题清单落库
2. 外部规范解析器：把 DESIGN.md 或设计系统 token 转成 manifest
3. 主题工作台：导入、预览、对比、设为项目默认
