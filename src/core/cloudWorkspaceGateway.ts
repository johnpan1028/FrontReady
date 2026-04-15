import { createWorkspaceId, type ProjectDraftRecord, type ProjectSnapshotRecord } from '../lib/db';
import type {
  BuilderSession,
  ProjectIndexRecord,
  ResendVerificationInput,
  SaveProjectDraftInput,
  SaveProjectDraftOptions,
  SignInInput,
  SignUpInput,
  WorkspaceGateway,
  WorkspaceRecord,
} from './workspaceGateway';

export type CloudAuthMode = 'anonymous' | 'bearer';

export type CloudWorkspaceGatewayConfig = {
  apiBaseUrl: string;
  authMode: CloudAuthMode;
  staticToken?: string;
  viewerName?: string;
};

type JsonRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  anonymous?: boolean;
};

type SignInResponse = {
  token: string;
  session: BuilderSession;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = trimTrailingSlash(baseUrl);
  return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
};

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const tokenStorageKey = 'builder-cloud-auth-token';

const readStoredToken = () => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(tokenStorageKey) || undefined;
};

const writeStoredToken = (token: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(tokenStorageKey, token);
};

const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(tokenStorageKey);
};

const buildCloudSession = (
  config: CloudWorkspaceGatewayConfig,
  overrides?: Partial<Pick<BuilderSession, 'viewer' | 'auth' | 'gateway'>>,
): BuilderSession => ({
  mode: 'cloud',
  viewer: overrides?.viewer ?? {
    id: 'cloud-user',
    name: config.viewerName?.trim() || 'Cloud Builder',
  },
  auth: overrides?.auth ?? {
    provider: 'custom-api',
    status: config.authMode === 'bearer' && !config.staticToken && !readStoredToken() ? 'anonymous' : 'authenticated',
    profile: 'development',
    canSignIn: config.authMode === 'bearer',
    canRegister: false,
    canResendVerification: false,
    oauthProviders: [],
    hint: config.authMode === 'bearer' && !config.staticToken && !readStoredToken()
      ? 'Sign in to sync workspaces and projects with the cloud gateway.'
      : 'Cloud gateway is using the configured remote API.',
  },
  gateway: overrides?.gateway ?? {
    driver: 'http',
    status: 'ready',
    baseUrl: config.apiBaseUrl,
    hint: 'Remote workspace/project storage is handled by the configured API.',
  },
  capabilities: {
    cloudSync: true,
    accountSwitch: true,
    teamWorkspace: true,
  },
});

const ensureToken = (config: CloudWorkspaceGatewayConfig) => {
  if (config.authMode === 'bearer' && !config.staticToken && !readStoredToken()) {
    throw new Error('Cloud gateway requires sign-in before accessing workspace data.');
  }
};

const createJsonClient = (config: CloudWorkspaceGatewayConfig) => {
  const session = buildCloudSession(config);

  return async <T>(path: string, options: JsonRequestOptions = {}): Promise<T> => {
    if (!options.anonymous) ensureToken(config);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Builder-Client': 'frontend-experience-orchestrator',
    };

    const token = config.staticToken || readStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(joinUrl(config.apiBaseUrl, path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      throw new Error(`Cloud gateway request failed with ${response.status} ${response.statusText}`);
    }

    try {
      return await response.json() as T;
    } catch (error) {
      throw new Error(`Cloud gateway returned invalid JSON: ${normalizeErrorMessage(error)} (${session.gateway.baseUrl})`);
    }
  };
};

export const createCloudWorkspaceGateway = (config: CloudWorkspaceGatewayConfig): WorkspaceGateway => {
  const requestJson = createJsonClient(config);

  return {
    getSession: async () => {
      try {
        return await requestJson<BuilderSession>('/session', { anonymous: true });
      } catch (error) {
        return buildCloudSession(config, {
          gateway: {
            driver: 'http',
            status: 'offline',
            baseUrl: config.apiBaseUrl,
            hint: `Cloud session check failed: ${normalizeErrorMessage(error)}`,
          },
        });
      }
    },
    signIn: async (input: SignInInput) => {
      const response = await requestJson<SignInResponse>('/auth/sign-in', {
        method: 'POST',
        body: input,
        anonymous: true,
      });
      writeStoredToken(response.token);
      return response.session;
    },
    signInWithProvider: async () => {
      throw new Error('OAuth provider sign-in is not supported by the legacy cloud gateway.');
    },
    signUp: async (_input: SignUpInput) => {
      throw new Error('Account registration is not supported by the legacy cloud gateway.');
    },
    resendVerification: async (_input: ResendVerificationInput) => {
      throw new Error('Verification email resend is not supported by the legacy cloud gateway.');
    },
    signOut: async () => {
      try {
        await requestJson('/auth/sign-out', {
          method: 'POST',
          anonymous: true,
        });
      } finally {
        clearStoredToken();
      }

      return buildCloudSession(config, {
        auth: {
          provider: 'custom-api',
          status: 'anonymous',
          profile: 'development',
          canSignIn: true,
          canRegister: false,
          canResendVerification: false,
          oauthProviders: [],
          hint: 'Signed out. Sign in again to access cloud workspaces.',
        },
      });
    },
    createWorkspaceId,
    getLocalWorkspaceDefaults: () => ({
      workspaceId: 'cloud-workspace',
      workspaceName: 'Cloud Workspace',
      ownerId: 'cloud-user',
    }),
    listWorkspaces: async () => requestJson<WorkspaceRecord[]>('/workspaces'),
    saveWorkspace: async (record, options) => {
      await requestJson('/workspaces', {
        method: 'POST',
        body: {
          record,
          options: options ?? {},
        },
      });
    },
    getActiveWorkspaceId: async () => {
      const response = await requestJson<{ workspaceId: string | null }>('/workspaces/active');
      return response.workspaceId;
    },
    setActiveWorkspace: async (workspaceId) => {
      await requestJson(`/workspaces/${workspaceId}/activate`, {
        method: 'POST',
      });
    },
    listProjects: async (workspaceId) => {
      const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
      return requestJson<ProjectIndexRecord[]>(`/projects${query}`);
    },
    getActiveProjectId: async (workspaceId) => {
      const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
      const response = await requestJson<{ projectId: string | null }>(`/projects/active${query}`);
      return response.projectId;
    },
    setActiveProject: async (projectId, workspaceId) => {
      const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
      await requestJson(`/projects/${projectId}/activate${query}`, {
        method: 'POST',
      });
    },
    deleteProject: async (_projectId, _workspaceId) => {
      throw new Error('Project deletion is not supported in cloud mode yet.');
    },
    loadProjectDraft: async (projectId) => {
      const response = await requestJson<{ record: ProjectDraftRecord | null }>(`/projects/${projectId}/draft`);
      return response.record ?? undefined;
    },
    listProjectVersions: async (_projectId) => {
      return [] as ProjectSnapshotRecord[];
    },
    loadProjectVersion: async (_versionId) => {
      return undefined;
    },
    deleteProjectVersion: async (_versionId) => {
      throw new Error('Version deletion is not supported in cloud mode yet.');
    },
    saveProjectDraft: async (record: SaveProjectDraftInput, options?: SaveProjectDraftOptions) => {
      await requestJson(`/projects/${record.projectId}/draft`, {
        method: 'PUT',
        body: {
          record,
          options: options ?? {},
        },
      });
    },
    saveProjectBundle: async () => {
      throw new Error('Project bundle import is not supported in cloud mode yet.');
    },
  };
};
