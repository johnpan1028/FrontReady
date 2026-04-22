# Dev Server Hot Reload

## 目标

- 固定使用 `3000` 端口
- 在本地 Windows 盘的同步目录环境下保持稳定热更新
- 避免每次小改动都靠清 `node_modules/.vite` 和重启开发服救火

## 当前约束

- 项目目录位于 `/mnt/g/SynologyDrive/...`
- 物理上它是本地 Windows 盘，但当前 dev server 运行在 WSL 中，通过 `/mnt/g/...` 访问该目录
- 再叠加同步软件后，Vite 默认文件监听可能漏掉变更
- 漏监听后，开发服会继续返回旧的 TSX / CSS transform 结果

## 当前方案

- 在 `vite.config.ts` 中：
  - `server.strictPort = true`
  - 当工作目录位于 `/mnt/<盘符>/...` 的 Windows 盘路径时，启用 `server.watch.usePolling`
  - 轮询间隔保持小步长，优先保证变更可见性

## 预期效果

- 修改 `src` 下文件后，Vite 应主动失效旧模块
- 浏览器刷新或 HMR 后应直接拿到新 transform
- 日常小改动不再默认依赖：
  - `rm -rf node_modules/.vite`
  - 杀掉 `3000` 后重启

## 仍需手动重置的情况

仅当出现以下异常时，再执行缓存清理：

- `curl http://127.0.0.1:3000/src/...` 返回的仍是旧源码 transform
- 页面和源码明显不一致，且等待轮询周期后仍不更新
- Vite 进程本身报 watcher / transform 异常

## 标准排查顺序

1. 先确认 `3000` 端口仍是当前 dev server
2. 直接请求 `http://127.0.0.1:3000/src/...` 对比返回模块
3. 若返回已更新，优先做页面强刷
4. 只有在服务端仍吐旧模块时，才清 `node_modules/.vite` 并重启
