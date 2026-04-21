# Browser Regression Workflow

Kit Studio 的 UI 修复必须优先用固定浏览器回测命令验证，避免只靠源码检索或临时浏览器脚本判断。

## 固定命令

```bash
npm run verify:kit-inspector
```

默认验证地址：

```bash
http://127.0.0.1:3002/
```

如需临时指定地址：

```bash
KIT_STUDIO_VERIFY_URL=http://127.0.0.1:3002/ npm run verify:kit-inspector
```

## 当前覆盖

- 打开 `3002`
- 禁用浏览器缓存
- 进入 `Kit Studio`
- 从左侧栏拖入 `Card Shell`
- 确认右侧属性栏进入 `Card Shell` 配置态
- 确认右侧栏不显示内部元数据：
  - `Component ID`
  - `Component Type`
  - `Runtime Type`
  - `Project ID`
  - `Shell ID`
  - `Relation ID`
  - `Relation Type`
  - `Code`
- 同时检查开发服源码 URL，防止 Vite 旧 transform 缓存继续返回旧代码

## 依赖规则

- 脚本固定使用 Playwright 自带 Chromium，不再临时切换 Windows Chrome / CDP。
- 如果 WSL 缺少 Chromium 运行库，脚本会自动用用户态方式下载 `.deb` 并解包到：

```bash
~/.cache/frontaiready-playwright-deps
```

- 不需要 sudo，不修改系统全局包。
- 脚本会自动注入 `LD_LIBRARY_PATH`。

## 输出产物

成功后会写入截图：

```bash
temp/kit-studio-inspector-verify.png
```

失败时以命令退出码阻断继续回报。
