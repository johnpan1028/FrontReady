import {
  LOCAL_OWNER_ID,
  LOCAL_WORKSPACE_ID,
  LOCAL_WORKSPACE_NAME,
  createWorkspaceId,
  deleteProjectSnapshotRecord,
  deleteProjectRecord,
  listProjectSnapshotRecords,
  listProjectIndexRecords,
  listWorkspaceRecords,
  loadActiveProjectId,
  loadProjectSnapshotRecord,
  loadActiveWorkspaceId,
  loadProjectDraftRecord,
  saveProjectBundleRecord,
  saveProjectDraftRecord,
  saveWorkspaceRecord,
  setActiveProjectRecord,
  setActiveWorkspaceRecord,
  type ProjectDraftRecord,
  type ProjectIndexRecord,
  type ProjectSnapshotRecord,
  type WorkspaceRecord,
} from '../lib/db';
import { createCloudWorkspaceGateway, type CloudAuthMode } from './cloudWorkspaceGateway';
import { createSupabaseWorkspaceGateway } from './supabaseWorkspaceGateway';

export type BuilderSession = {
  mode: 'local' | 'cloud';
  viewer: {
    id: string;
    name: string;
    email?: string;
  };
  auth: {
    provider: 'local' | 'custom-api' | 'supabase';
    status: 'local' | 'anonymous' | 'pending-verification' | 'authenticated' | 'missing-config';
    profile: 'development' | 'production';
    canSignIn: boolean;
    canRegister: boolean;
    canResendVerification: boolean;
    oauthProviders: OAuthProvider[];
    pendingEmail?: string;
    hint?: string;
  };
  gateway: {
    driver: 'indexeddb' | 'http' | 'supabase';
    status: 'ready' | 'fallback' | 'offline';
    baseUrl?: string;
    hint?: string;
  };
  capabilities: {
    cloudSync: boolean;
    accountSwitch: boolean;
    teamWorkspace: boolean;
  };
};

export type SaveProjectDraftInput = ProjectDraftRecord;
export type SaveProjectDraftOptions = {
  createSnapshot?: boolean;
  reason?: string;
  setActive?: boolean;
  workspaceId?: string;
  ownerId?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  redirectTo?: string;
};

export type ResendVerificationInput = {
  email: string;
  redirectTo?: string;
};

export type OAuthProvider = 'github';

export interface WorkspaceGateway {
  getSession: () => Promise<BuilderSession>;
  signIn: (input: SignInInput) => Promise<BuilderSession>;
  signInWithProvider: (provider: OAuthProvider, options?: { redirectTo?: string }) => Promise<BuilderSession>;
  signUp: (input: SignUpInput) => Promise<BuilderSession>;
  resendVerification: (input: ResendVerificationInput) => Promise<BuilderSession>;
  signOut: () => Promise<BuilderSession>;
  createWorkspaceId: () => string;
  getLocalWorkspaceDefaults: () => {
    workspaceId: string;
    workspaceName: string;
    ownerId: string;
  };
  listWorkspaces: () => Promise<WorkspaceRecord[]>;
  saveWorkspace: (record: WorkspaceRecord, options?: { setActive?: boolean }) => Promise<void>;
  getActiveWorkspaceId: () => Promise<string | null>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  listProjects: (workspaceId?: string) => Promise<ProjectIndexRecord[]>;
  getActiveProjectId: (workspaceId?: string) => Promise<string | null>;
  setActiveProject: (projectId: string, workspaceId?: string) => Promise<void>;
  deleteProject: (projectId: string, workspaceId?: string) => Promise<void>;
  loadProjectDraft: (projectId: string) => Promise<ProjectDraftRecord | undefined>;
  listProjectVersions: (projectId: string) => Promise<ProjectSnapshotRecord[]>;
  loadProjectVersion: (versionId: string) => Promise<ProjectSnapshotRecord | undefined>;
  deleteProjectVersion: (versionId: string) => Promise<void>;
  saveProjectDraft: (
    record: SaveProjectDraftInput,
    options?: SaveProjectDraftOptions,
  ) => Promise<void>;
  saveProjectBundle: (
    payload: {
      draft: ProjectDraftRecord;
      snapshots: ProjectSnapshotRecord[];
    },
    options?: {
      replaceExisting?: boolean;
      setActive?: boolean;
      workspaceId?: string;
      ownerId?: string;
    },
  ) => Promise<void>;
}

const localSession: BuilderSession = {
  mode: 'local',
  viewer: {
    id: LOCAL_OWNER_ID,
    name: 'Local Builder',
  },
  auth: {
    provider: 'local',
    status: 'local',
    profile: 'development',
    canSignIn: false,
    canRegister: false,
    canResendVerification: false,
    oauthProviders: [],
    hint: 'Local mode uses browser storage and does not require sign-in.',
  },
  gateway: {
    driver: 'indexeddb',
    status: 'ready',
    hint: 'Workspace and project drafts are stored in IndexedDB on this device.',
  },
  capabilities: {
    cloudSync: false,
    accountSwitch: false,
    teamWorkspace: false,
  },
};

export const localWorkspaceGateway: WorkspaceGateway = {
  getSession: async () => localSession,
  signIn: async () => localSession,
  signInWithProvider: async () => localSession,
  signUp: async () => localSession,
  resendVerification: async () => localSession,
  signOut: async () => localSession,
  createWorkspaceId,
  getLocalWorkspaceDefaults: () => ({
    workspaceId: LOCAL_WORKSPACE_ID,
    workspaceName: LOCAL_WORKSPACE_NAME,
    ownerId: LOCAL_OWNER_ID,
  }),
  listWorkspaces: () => listWorkspaceRecords(),
  saveWorkspace: (record, options) => saveWorkspaceRecord(record, options),
  getActiveWorkspaceId: () => loadActiveWorkspaceId(),
  setActiveWorkspace: (workspaceId) => setActiveWorkspaceRecord(workspaceId),
  listProjects: (workspaceId) => listProjectIndexRecords(workspaceId),
  getActiveProjectId: (workspaceId) => loadActiveProjectId(workspaceId),
  setActiveProject: (projectId, workspaceId) => setActiveProjectRecord(projectId, workspaceId),
  deleteProject: (projectId, workspaceId) => deleteProjectRecord(projectId, workspaceId),
  loadProjectDraft: (projectId) => loadProjectDraftRecord(projectId),
  listProjectVersions: (projectId) => listProjectSnapshotRecords(projectId),
  loadProjectVersion: (versionId) => loadProjectSnapshotRecord(versionId),
  deleteProjectVersion: (versionId) => deleteProjectSnapshotRecord(versionId),
  saveProjectDraft: (record, options) => saveProjectDraftRecord(record, options),
  saveProjectBundle: (payload, options) => saveProjectBundleRecord(payload, options),
};

const createLocalFallbackGateway = (hint: string): WorkspaceGateway => ({
  ...localWorkspaceGateway,
  getSession: async () => ({
    ...localSession,
    gateway: {
      ...localSession.gateway,
      status: 'fallback',
      hint,
    },
  }),
});

const runtimeEnv: Record<string, string | undefined> = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
) ?? {};

const resolveGatewayMode = () => {
  const raw = runtimeEnv.VITE_BUILDER_GATEWAY_MODE;
  if (raw === 'cloud') return 'cloud';
  if (raw === 'supabase') return 'supabase';
  return 'local';
};

const resolveCloudAuthMode = (): CloudAuthMode => {
  return runtimeEnv.VITE_BUILDER_AUTH_MODE === 'bearer' ? 'bearer' : 'anonymous';
};

const resolveSupabaseAuthProfile = (): 'development' | 'production' => {
  return runtimeEnv.VITE_SUPABASE_AUTH_PROFILE === 'development' ? 'development' : 'production';
};

const resolveWorkspaceGateway = (): WorkspaceGateway => {
  const mode = resolveGatewayMode();
  if (mode === 'local') return localWorkspaceGateway;

  if (mode === 'supabase') {
    const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL ?? '').trim();
    const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY ?? '').trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      return createLocalFallbackGateway('Supabase mode was requested, but VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Falling back to local workspace storage.');
    }

    return createSupabaseWorkspaceGateway({
      supabaseUrl,
      supabaseAnonKey,
      authProfile: resolveSupabaseAuthProfile(),
    });
  }

  const apiBaseUrl = String(runtimeEnv.VITE_BUILDER_API_BASE_URL ?? '').trim();
  if (!apiBaseUrl) {
    return createLocalFallbackGateway('Cloud mode was requested, but VITE_BUILDER_API_BASE_URL is missing. Falling back to local workspace storage.');
  }

  return createCloudWorkspaceGateway({
    apiBaseUrl,
    authMode: resolveCloudAuthMode(),
    staticToken: String(runtimeEnv.VITE_BUILDER_STATIC_TOKEN ?? '').trim() || undefined,
    viewerName: String(runtimeEnv.VITE_BUILDER_VIEWER_NAME ?? '').trim() || undefined,
  });
};

export const builderWorkspaceGateway = resolveWorkspaceGateway();

export type {
  ProjectIndexRecord,
  WorkspaceRecord,
};
