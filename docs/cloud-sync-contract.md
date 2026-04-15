# Cloud Sync Contract

这份文档定义前端体验编排器在切换到云端模式时，需要后端提供的最小 API 面。

当前前端已经抽象出：

- `WorkspaceGateway`
- `localWorkspaceGateway`
- `cloudWorkspaceGateway`

其中云端模式默认通过 HTTP JSON API 工作。

## 1. 目标

云端后端至少需要承接 4 件事：

- 返回当前登录会话
- 返回工作区列表与当前活跃工作区
- 返回工作区内项目列表与当前活跃项目
- 读写项目草稿

## 2. Session

### `GET /session`

返回当前用户会话与网关能力。

- 未登录时返回 `auth.status = anonymous`
- 已登录时返回 `auth.status = authenticated`
- bearer 模式下，前端会先调用这个接口判断是否需要显示登录面板

示例：

```json
{
  "mode": "cloud",
  "viewer": {
    "id": "user_123",
    "name": "Alice"
  },
  "auth": {
    "provider": "custom-api",
    "status": "authenticated",
    "canSignIn": true
  },
  "gateway": {
    "driver": "http",
    "status": "ready",
    "baseUrl": "https://api.example.com"
  },
  "capabilities": {
    "cloudSync": true,
    "accountSwitch": true,
    "teamWorkspace": true
  }
}
```

## 3. Workspace

### `GET /workspaces`

返回当前登录用户可见的工作区列表。

### `POST /workspaces`

创建或更新工作区。

请求体：

```json
{
  "record": {
    "id": "workspace_xxx",
    "ownerId": "user_123",
    "name": "Marketing",
    "kind": "local",
    "createdAt": "2026-04-11T12:00:00.000Z",
    "updatedAt": "2026-04-11T12:00:00.000Z",
    "lastOpenedAt": "2026-04-11T12:00:00.000Z"
  },
  "options": {
    "setActive": true
  }
}
```

### `GET /workspaces/active`

返回当前活跃工作区：

```json
{
  "workspaceId": "workspace_xxx"
}
```

### `POST /workspaces/:workspaceId/activate`

切换活跃工作区。

## 4. Project Index

### `GET /projects?workspaceId=:workspaceId`

返回某工作区下项目列表。

### `GET /projects/active?workspaceId=:workspaceId`

返回某工作区当前活跃项目：

```json
{
  "projectId": "project_xxx"
}
```

### `POST /projects/:projectId/activate?workspaceId=:workspaceId`

切换工作区内活跃项目。

## 5. Project Draft

### `GET /projects/:projectId/draft`

返回项目草稿：

```json
{
  "record": {
    "id": "project_xxx",
    "projectId": "project_xxx",
    "name": "Homepage",
    "document": {},
    "createdAt": "2026-04-11T12:00:00.000Z",
    "updatedAt": "2026-04-11T12:00:00.000Z"
  }
}
```

### `PUT /projects/:projectId/draft`

写入项目草稿。

请求体：

```json
{
  "record": {},
  "options": {
    "createSnapshot": true,
    "reason": "manual",
    "setActive": true,
    "workspaceId": "workspace_xxx"
  }
}
```

## 6. 鉴权建议

当前前端骨架预留两种模式：

- `anonymous`
- `bearer`

当前云端开发骨架已经默认走 `bearer`，并实现了以下接口：

### `POST /auth/sign-in`

请求体：

```json
{
  "email": "demo@builder.local",
  "password": "builder123"
}
```

响应体：

```json
{
  "token": "mock_xxx",
  "session": {
    "mode": "cloud"
  }
}
```

### `POST /auth/sign-out`

要求携带：

```http
Authorization: Bearer <token>
```

### `GET /auth/providers`

返回当前 mock cloud 支持的认证方式与 demo 凭据说明。

建议第一版正式后端至少支持：

- `Authorization: Bearer <token>`
- 多工作区隔离
- 用户仅访问自己有权限的工作区与项目
- 项目草稿按 `userId + projectId` 作用域隔离，避免不同用户项目 ID 冲突

## 7. 前端环境变量

当前云端模式会读取：

- `VITE_BUILDER_GATEWAY_MODE=cloud`
- `VITE_BUILDER_API_BASE_URL=https://api.example.com`
- `VITE_BUILDER_AUTH_MODE=anonymous|bearer`
- `VITE_BUILDER_STATIC_TOKEN=...`
- `VITE_BUILDER_VIEWER_NAME=Alice`

本地云端联调脚本 `npm run dev:cloud` 现在默认：

- `VITE_BUILDER_GATEWAY_MODE=cloud`
- `VITE_BUILDER_AUTH_MODE=bearer`
- `VITE_BUILDER_API_BASE_URL=http://127.0.0.1:3001`

## 8. 本地开发方式

仓库现在已经内置了本地 mock cloud 服务：

- `npm run mock:cloud`
  - 仅启动本地云端 API，默认端口 `3001`
- `npm run dev:cloud`
  - 同时启动 mock cloud API 与前端云模式 UI
  - mock API：`http://127.0.0.1:3001`
  - cloud UI：`http://127.0.0.1:3002`

mock 数据会写入：

- `.mock-cloud/state.json`

mock cloud 默认测试账号：

- `demo@builder.local`
- `builder123`

并且会持久化：

- 用户列表
- bearer token
- 每个用户自己的活跃 workspace / project
- 每个用户自己的 workspace / project / draft 数据
