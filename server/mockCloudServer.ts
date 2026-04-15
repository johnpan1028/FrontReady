import express, { type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectDocumentSchema } from '../src/schema/project.ts';
import type { BuilderSession } from '../src/core/workspaceGateway.ts';
import type { ProjectDraftRecord, ProjectIndexRecord, WorkspaceRecord } from '../src/lib/db.ts';

type CloudMetaState = {
  activeWorkspaceId: string | null;
  activeProjectIds: Record<string, string>;
};

type CloudUserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type CloudTokenRecord = {
  token: string;
  userId: string;
  createdAt: string;
  lastUsedAt: string;
};

type CloudStoreState = {
  users: CloudUserRecord[];
  tokens: Record<string, CloudTokenRecord>;
  workspaces: WorkspaceRecord[];
  projects: ProjectIndexRecord[];
  drafts: Record<string, ProjectDraftRecord>;
  metaByUser: Record<string, CloudMetaState>;
};

type LegacyCloudStoreState = Partial<CloudStoreState> & {
  meta?: CloudMetaState;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../.mock-cloud');
const dataFile = path.join(dataDir, 'state.json');
const port = Number(process.env.BUILDER_CLOUD_PORT ?? 3001);

const demoUserId = 'mock-cloud-user';
const demoEmail = 'demo@builder.local';
const demoPassword = 'builder123';
const demoName = process.env.MOCK_CLOUD_VIEWER_NAME?.trim() || 'Cloud Demo User';
const legacyOwnerIds = new Set(['local-user', 'cloud-user', demoUserId]);

const createMetaState = (): CloudMetaState => ({
  activeWorkspaceId: null,
  activeProjectIds: {},
});

const hashPassword = (password: string) => {
  return createHash('sha256')
    .update(`frontend-experience-orchestrator:${password}`)
    .digest('hex');
};

const buildDemoUser = (): CloudUserRecord => {
  const now = new Date().toISOString();
  return {
    id: demoUserId,
    email: demoEmail,
    name: demoName,
    passwordHash: hashPassword(demoPassword),
    createdAt: now,
    updatedAt: now,
  };
};

const defaultState = (): CloudStoreState => ({
  users: [buildDemoUser()],
  tokens: {},
  workspaces: [],
  projects: [],
  drafts: {},
  metaByUser: {
    [demoUserId]: createMetaState(),
  },
});

const buildSession = (user?: CloudUserRecord): BuilderSession => ({
  mode: 'cloud',
  viewer: user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    : {
        id: 'anonymous',
        name: 'Anonymous Builder',
      },
  auth: user
    ? {
        provider: 'custom-api',
        status: 'authenticated',
        profile: 'development',
        canSignIn: true,
        canRegister: false,
        canResendVerification: false,
        oauthProviders: [],
        hint: 'Authenticated against the local cloud storage service.',
      }
    : {
        provider: 'custom-api',
        status: 'anonymous',
        profile: 'development',
        canSignIn: true,
        canRegister: false,
        canResendVerification: false,
        oauthProviders: [],
        hint: `Sign in with ${demoEmail} / ${demoPassword} to access cloud workspaces.`,
      },
  gateway: {
    driver: 'http',
    status: 'ready',
    baseUrl: `http://127.0.0.1:${port}`,
    hint: 'Local Express service with persistent users, bearer tokens, workspaces, projects, and drafts.',
  },
  capabilities: {
    cloudSync: Boolean(user),
    accountSwitch: true,
    teamWorkspace: true,
  },
});

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createToken = () => `mock_${randomUUID().replace(/-/g, '')}`;

const getDraftKey = (userId: string, projectId: string) => `${userId}:${projectId}`;

const ensureDemoUser = (users: CloudUserRecord[]) => {
  const demoUser = buildDemoUser();
  const currentIndex = users.findIndex((user) => normalizeEmail(user.email) === demoEmail);

  if (currentIndex < 0) return [...users, demoUser];

  const current = users[currentIndex];
  const next = [...users];
  next[currentIndex] = {
    ...current,
    id: current.id || demoUserId,
    email: demoEmail,
    name: current.name || demoName,
    passwordHash: current.passwordHash || demoUser.passwordHash,
    createdAt: current.createdAt || demoUser.createdAt,
    updatedAt: current.updatedAt || demoUser.updatedAt,
  };
  return next;
};

const normalizeOwnerId = (ownerId: string | undefined, fallbackUserId: string) => {
  if (!ownerId || legacyOwnerIds.has(ownerId)) return fallbackUserId;
  return ownerId;
};

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(defaultState(), null, 2), 'utf8');
  }
};

const readState = async (): Promise<CloudStoreState> => {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, 'utf8');
  if (!raw.trim()) return defaultState();

  const parsed = JSON.parse(raw) as LegacyCloudStoreState;
  const users = ensureDemoUser(Array.isArray(parsed.users) ? parsed.users : []);
  const demoUser = users.find((user) => normalizeEmail(user.email) === demoEmail) ?? users[0] ?? buildDemoUser();
  const fallbackUserId = demoUser.id;

  const workspaces = Array.isArray(parsed.workspaces)
    ? parsed.workspaces.map((workspace) => ({
        ...workspace,
        ownerId: normalizeOwnerId(workspace.ownerId, fallbackUserId),
        kind: 'local' as const,
      }))
    : [];

  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map((project) => ({
        ...project,
        ownerId: normalizeOwnerId(project.ownerId, fallbackUserId),
      }))
    : [];

  const parsedMetaByUser = parsed.metaByUser && typeof parsed.metaByUser === 'object'
    ? parsed.metaByUser
    : {};
  const legacyMeta = parsed.meta;

  const metaByUser: Record<string, CloudMetaState> = {
    ...parsedMetaByUser,
  };

  for (const user of users) {
    const current = metaByUser[user.id] ?? (user.id === fallbackUserId ? legacyMeta : undefined);
    metaByUser[user.id] = {
      activeWorkspaceId: current?.activeWorkspaceId ?? null,
      activeProjectIds: current?.activeProjectIds && typeof current.activeProjectIds === 'object'
        ? current.activeProjectIds
        : {},
    };
  }

  return {
    users,
    tokens: parsed.tokens && typeof parsed.tokens === 'object' ? parsed.tokens : {},
    workspaces,
    projects,
    drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts as Record<string, ProjectDraftRecord> : {},
    metaByUser,
  };
};

const writeState = async (state: CloudStoreState) => {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(state, null, 2), 'utf8');
};

const sortByRecent = <T extends { updatedAt?: string; lastOpenedAt?: string }>(items: T[]) => {
  return [...items].sort((left, right) => {
    const leftKey = left.lastOpenedAt ?? left.updatedAt ?? '';
    const rightKey = right.lastOpenedAt ?? right.updatedAt ?? '';
    return rightKey.localeCompare(leftKey);
  });
};

const getBearerToken = (request: Request) => {
  const authorization = request.header('Authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const authenticateRequest = (state: CloudStoreState, request: Request) => {
  const token = getBearerToken(request);
  if (!token) return null;

  const tokenRecord = state.tokens[token];
  if (!tokenRecord) return null;

  return state.users.find((user) => user.id === tokenRecord.userId) ?? null;
};

const readAuthenticatedState = async (request: Request, response: Response) => {
  const state = await readState();
  const user = authenticateRequest(state, request);

  if (!user) {
    response.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  return { state, user };
};

const getUserMeta = (state: CloudStoreState, userId: string) => {
  if (!state.metaByUser[userId]) {
    state.metaByUser[userId] = createMetaState();
  }

  return state.metaByUser[userId];
};

const listUserWorkspaces = (state: CloudStoreState, userId: string) => {
  return state.workspaces.filter((workspace) => workspace.ownerId === userId);
};

const listUserProjects = (state: CloudStoreState, userId: string, workspaceId?: string | null) => {
  return state.projects.filter((project) => (
    project.ownerId === userId &&
    (!workspaceId || project.workspaceId === workspaceId)
  ));
};

const resolveWorkspaceId = (
  state: CloudStoreState,
  userId: string,
  requestedWorkspaceId?: string | null,
) => {
  const workspaces = listUserWorkspaces(state, userId);
  if (requestedWorkspaceId && workspaces.some((workspace) => workspace.id === requestedWorkspaceId)) {
    return requestedWorkspaceId;
  }

  const meta = getUserMeta(state, userId);
  if (meta.activeWorkspaceId && workspaces.some((workspace) => workspace.id === meta.activeWorkspaceId)) {
    return meta.activeWorkspaceId;
  }

  return workspaces[0]?.id ?? null;
};

const findUserProject = (state: CloudStoreState, userId: string, projectId: string) => {
  return state.projects.find((project) => project.ownerId === userId && project.id === projectId);
};

const getScopedDraft = (state: CloudStoreState, userId: string, projectId: string) => {
  return state.drafts[getDraftKey(userId, projectId)] ?? state.drafts[projectId] ?? null;
};

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use((_, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Builder-Client');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  next();
});
app.options('*', (_, response) => {
  response.sendStatus(204);
});

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    driver: 'mock-cloud',
    port,
    auth: 'bearer',
  });
});

app.get('/auth/providers', (_request, response) => {
  response.json({
    providers: [
      {
        id: 'mock-password',
        label: 'Mock Password',
        type: 'password',
      },
    ],
    demo: {
      email: demoEmail,
      password: demoPassword,
    },
  });
});

app.get('/session', async (request, response) => {
  const state = await readState();
  const user = authenticateRequest(state, request);
  response.json(buildSession(user ?? undefined));
});

app.post('/auth/sign-in', async (request, response) => {
  const body = request.body as {
    email?: string;
    password?: string;
  };
  const email = normalizeEmail(body.email ?? '');
  const passwordHash = hashPassword(body.password ?? '');
  const state = await readState();
  const user = state.users.find((item) => normalizeEmail(item.email) === email);

  if (!user || user.passwordHash !== passwordHash) {
    response.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const now = new Date().toISOString();
  const token = createToken();
  state.tokens[token] = {
    token,
    userId: user.id,
    createdAt: now,
    lastUsedAt: now,
  };
  getUserMeta(state, user.id);

  await writeState(state);
  response.json({
    token,
    session: buildSession(user),
  });
});

app.post('/auth/sign-out', async (request, response) => {
  const token = getBearerToken(request);
  if (token) {
    const state = await readState();
    delete state.tokens[token];
    await writeState(state);
  }

  response.json({
    ok: true,
    session: buildSession(),
  });
});

app.get('/workspaces', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  response.json(sortByRecent(listUserWorkspaces(context.state, context.user.id)));
});

app.post('/workspaces', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const body = request.body as {
    record?: WorkspaceRecord;
    options?: { setActive?: boolean };
  };

  if (!body?.record?.id || !body.record.name) {
    response.status(400).json({ error: 'Invalid workspace record.' });
    return;
  }

  const { state, user } = context;
  const now = new Date().toISOString();
  const currentIndex = state.workspaces.findIndex((workspace) => (
    workspace.ownerId === user.id &&
    workspace.id === body.record?.id
  ));
  const existing = currentIndex >= 0 ? state.workspaces[currentIndex] : null;
  const nextRecord: WorkspaceRecord = {
    ...body.record,
    ownerId: user.id,
    kind: 'local',
    createdAt: existing?.createdAt ?? body.record.createdAt ?? now,
    updatedAt: body.record.updatedAt ?? now,
    lastOpenedAt: body.record.lastOpenedAt ?? now,
  };

  if (currentIndex >= 0) {
    state.workspaces[currentIndex] = nextRecord;
  } else {
    state.workspaces.push(nextRecord);
  }

  if (body.options?.setActive) {
    getUserMeta(state, user.id).activeWorkspaceId = nextRecord.id;
  }

  await writeState(state);
  response.json({ ok: true, record: nextRecord });
});

app.get('/workspaces/active', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  response.json({
    workspaceId: resolveWorkspaceId(context.state, context.user.id),
  });
});

app.post('/workspaces/:workspaceId/activate', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const { state, user } = context;
  const workspaceId = request.params.workspaceId;
  const exists = state.workspaces.some((workspace) => (
    workspace.ownerId === user.id &&
    workspace.id === workspaceId
  ));

  if (!exists) {
    response.status(404).json({ error: 'Workspace not found.' });
    return;
  }

  getUserMeta(state, user.id).activeWorkspaceId = workspaceId;
  state.workspaces = state.workspaces.map((workspace) => (
    workspace.ownerId === user.id && workspace.id === workspaceId
      ? { ...workspace, lastOpenedAt: new Date().toISOString() }
      : workspace
  ));

  await writeState(state);
  response.json({ ok: true, workspaceId });
});

app.get('/projects', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const workspaceId = resolveWorkspaceId(
    context.state,
    context.user.id,
    typeof request.query.workspaceId === 'string' ? request.query.workspaceId : null,
  );
  response.json(sortByRecent(listUserProjects(context.state, context.user.id, workspaceId)));
});

app.get('/projects/active', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const workspaceId = resolveWorkspaceId(
    context.state,
    context.user.id,
    typeof request.query.workspaceId === 'string' ? request.query.workspaceId : null,
  );
  const meta = getUserMeta(context.state, context.user.id);

  response.json({
    projectId: workspaceId ? meta.activeProjectIds[workspaceId] ?? null : null,
  });
});

app.post('/projects/:projectId/activate', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const { state, user } = context;
  const workspaceId = resolveWorkspaceId(
    state,
    user.id,
    typeof request.query.workspaceId === 'string' ? request.query.workspaceId : null,
  );
  const projectId = request.params.projectId;
  const project = findUserProject(state, user.id, projectId);

  if (!workspaceId || !project || project.workspaceId !== workspaceId) {
    response.status(404).json({ error: 'Project not found in workspace.' });
    return;
  }

  const meta = getUserMeta(state, user.id);
  meta.activeWorkspaceId = workspaceId;
  meta.activeProjectIds[workspaceId] = projectId;
  state.projects = state.projects.map((item) => (
    item.ownerId === user.id && item.id === projectId
      ? { ...item, lastOpenedAt: new Date().toISOString() }
      : item
  ));

  await writeState(state);
  response.json({ ok: true, projectId, workspaceId });
});

app.get('/projects/:projectId/draft', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const project = findUserProject(context.state, context.user.id, request.params.projectId);
  if (!project) {
    response.status(404).json({ error: 'Project not found.' });
    return;
  }

  response.json({
    record: getScopedDraft(context.state, context.user.id, request.params.projectId),
  });
});

app.put('/projects/:projectId/draft', async (request, response) => {
  const context = await readAuthenticatedState(request, response);
  if (!context) return;

  const body = request.body as {
    record?: ProjectDraftRecord;
    options?: {
      setActive?: boolean;
      workspaceId?: string;
      ownerId?: string;
    };
  };

  if (!body?.record?.projectId || body.record.projectId !== request.params.projectId) {
    response.status(400).json({ error: 'Project draft payload is invalid.' });
    return;
  }

  try {
    ProjectDocumentSchema.parse(body.record.document);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const { state, user } = context;
  const workspaceId = body.options?.workspaceId
    ?? resolveWorkspaceId(state, user.id)
    ?? 'cloud-workspace';
  const now = body.record.updatedAt;
  const draftKey = getDraftKey(user.id, body.record.projectId);

  const existingProjectIndex = state.projects.findIndex((project) => (
    project.ownerId === user.id &&
    project.id === body.record?.projectId
  ));
  const existingWorkspaceIndex = state.workspaces.findIndex((workspace) => (
    workspace.ownerId === user.id &&
    workspace.id === workspaceId
  ));

  state.drafts[draftKey] = cloneJson(body.record);

  const existingProject = existingProjectIndex >= 0 ? state.projects[existingProjectIndex] : null;
  const projectRecord: ProjectIndexRecord = {
    id: body.record.projectId,
    workspaceId,
    ownerId: user.id,
    name: body.record.name,
    createdAt: existingProject?.createdAt ?? body.record.createdAt,
    updatedAt: now,
    lastOpenedAt: now,
  };

  if (existingProjectIndex >= 0) {
    state.projects[existingProjectIndex] = projectRecord;
  } else {
    state.projects.push(projectRecord);
  }

  const existingWorkspace = existingWorkspaceIndex >= 0 ? state.workspaces[existingWorkspaceIndex] : null;
  const workspaceRecord: WorkspaceRecord = {
    id: workspaceId,
    ownerId: user.id,
    name: existingWorkspace?.name ?? 'Cloud Workspace',
    kind: 'local',
    createdAt: existingWorkspace?.createdAt ?? now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  if (existingWorkspaceIndex >= 0) {
    state.workspaces[existingWorkspaceIndex] = workspaceRecord;
  } else {
    state.workspaces.push(workspaceRecord);
  }

  if (body.options?.setActive) {
    const meta = getUserMeta(state, user.id);
    meta.activeWorkspaceId = workspaceId;
    meta.activeProjectIds[workspaceId] = body.record.projectId;
  }

  await writeState(state);
  response.json({
    ok: true,
    record: body.record,
  });
});

app.listen(port, () => {
  console.log(`[mock-cloud] listening on http://127.0.0.1:${port}`);
  console.log(`[mock-cloud] demo login: ${demoEmail} / ${demoPassword}`);
  console.log(`[mock-cloud] state file: ${dataFile}`);
});
