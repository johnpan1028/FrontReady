import { nanoid } from 'nanoid';
import { createClient, type AuthSession, type PostgrestError, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  LOCAL_OWNER_ID,
  LOCAL_WORKSPACE_ID,
  createWorkspaceId,
  type ProjectDraftRecord,
  type ProjectSnapshotRecord,
} from '../lib/db';
import type {
  BuilderSession,
  OAuthProvider,
  ProjectIndexRecord,
  ResendVerificationInput,
  SaveProjectDraftInput,
  SaveProjectDraftOptions,
  SignInInput,
  SignUpInput,
  WorkspaceGateway,
  WorkspaceRecord,
} from './workspaceGateway';

export type SupabaseWorkspaceGatewayConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authProfile: 'development' | 'production';
};

type SupabaseProfileRow = {
  user_id: string;
  viewer_name: string | null;
  viewer_email: string | null;
  active_workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseWorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  kind: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

type SupabaseWorkspaceStateRow = {
  owner_id: string;
  workspace_id: string;
  active_project_id: string | null;
  updated_at: string;
};

type SupabaseProjectRow = {
  id: string;
  workspace_id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

type SupabaseDraftRow = {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  document: ProjectDraftRecord['document'];
  created_at: string;
  updated_at: string;
};

type SupabaseSnapshotRow = {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  reason: string;
  document: ProjectSnapshotRecord['document'];
  created_at: string;
  version_number: number | null;
};

const DEFAULT_WORKSPACE_NAME = 'Cloud Workspace';
const DEFAULT_VIEWER_NAME = 'Supabase Builder';
const SUPABASE_OAUTH_PROVIDERS: OAuthProvider[] = ['github'];
const SUPABASE_AUTH_STORAGE_KEY = 'frontend-experience-orchestrator.supabase.auth';
const SUPABASE_PENDING_VERIFICATION_STORAGE_KEY = 'frontend-experience-orchestrator.supabase.pending-verification';
const PENDING_VERIFICATION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const RESERVED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
]);

let supabaseClientSingleton: SupabaseClient | null = null;

type PendingVerificationState = {
  email: string;
  createdAt: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getNowIso = () => new Date().toISOString();

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const maybeSupabase = error as Partial<PostgrestError> & { message?: string };
    if (typeof maybeSupabase.message === 'string' && maybeSupabase.message.trim()) {
      const details = typeof maybeSupabase.details === 'string' && maybeSupabase.details.trim()
        ? ` ${maybeSupabase.details.trim()}`
        : '';
      const hint = typeof maybeSupabase.hint === 'string' && maybeSupabase.hint.trim()
        ? ` Hint: ${maybeSupabase.hint.trim()}`
        : '';
      return `${maybeSupabase.message.trim()}${details}${hint}`;
    }
  }

  if (error instanceof Error) return error.message;
  return String(error);
};

const isMissingSchemaError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('does not exist') || message.includes('relation') || message.includes('builder_profiles');
};

const withSetupHint = (error: unknown) => {
  const message = getErrorMessage(error);
  if (!isMissingSchemaError(error)) return message;
  return `${message} Run \`docs/supabase-schema.sql\` in Supabase SQL Editor before connecting. If the tables already exist, run \`NOTIFY pgrst, 'reload schema';\` and retry.`;
};

const assertNoError = (error: unknown, context: string) => {
  if (!error) return;
  throw new Error(`${context}: ${withSetupHint(error)}`);
};

const resolveViewerName = (user: User | null | undefined) => {
  if (!user) return DEFAULT_VIEWER_NAME;

  const metadataName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? user.user_metadata?.display_name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  if (typeof user.email === 'string' && user.email.trim()) {
    return user.email.trim().split('@')[0] || DEFAULT_VIEWER_NAME;
  }

  return DEFAULT_VIEWER_NAME;
};

const resolveViewerNameFromEmail = (email: string | null | undefined) => {
  if (typeof email !== 'string' || !email.trim()) return DEFAULT_VIEWER_NAME;
  return email.trim().split('@')[0] || DEFAULT_VIEWER_NAME;
};

const readPendingVerification = (): PendingVerificationState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SUPABASE_PENDING_VERIFICATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingVerificationState>;
    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    const createdAt = typeof parsed.createdAt === 'string' ? parsed.createdAt : '';
    const timestamp = Date.parse(createdAt);

    if (!email || !Number.isFinite(timestamp)) {
      window.localStorage.removeItem(SUPABASE_PENDING_VERIFICATION_STORAGE_KEY);
      return null;
    }

    if (Date.now() - timestamp > PENDING_VERIFICATION_MAX_AGE_MS) {
      window.localStorage.removeItem(SUPABASE_PENDING_VERIFICATION_STORAGE_KEY);
      return null;
    }

    return { email, createdAt };
  } catch {
    window.localStorage.removeItem(SUPABASE_PENDING_VERIFICATION_STORAGE_KEY);
    return null;
  }
};

const writePendingVerification = (email: string) => {
  if (typeof window === 'undefined') return;

  const normalizedEmail = email.trim();
  if (!normalizedEmail) return;

  window.localStorage.setItem(
    SUPABASE_PENDING_VERIFICATION_STORAGE_KEY,
    JSON.stringify({
      email: normalizedEmail,
      createdAt: getNowIso(),
    } satisfies PendingVerificationState),
  );
};

const clearPendingVerification = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SUPABASE_PENDING_VERIFICATION_STORAGE_KEY);
};

const resolveEmailRedirectTo = (redirectTo?: string) => {
  if (typeof redirectTo === 'string' && redirectTo.trim()) return redirectTo.trim();
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
};

const getEmailDomain = (email: string) => {
  const [, domain = ''] = email.trim().toLowerCase().split('@');
  return domain;
};

const isNonDeliverableEmail = (email: string) => {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  return RESERVED_EMAIL_DOMAINS.has(domain)
    || domain.endsWith('.test')
    || domain.endsWith('.invalid')
    || domain.endsWith('.localhost')
    || domain.endsWith('.local');
};

const assertDeliverableEmail = (email: string) => {
  if (!isNonDeliverableEmail(email)) return;

  throw new Error(`Use a real inbox address. Placeholder domains like "${getEmailDomain(email)}" cannot receive Supabase verification emails`);
};

const normalizeIsoDateTime = (value: string | null | undefined, fallback?: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback ?? new Date().toISOString();
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return fallback ?? new Date().toISOString();
  }

  return new Date(timestamp).toISOString();
};

const mapWorkspaceRow = (row: SupabaseWorkspaceRow): WorkspaceRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  kind: 'local',
  createdAt: normalizeIsoDateTime(row.created_at),
  updatedAt: normalizeIsoDateTime(row.updated_at, row.created_at),
  lastOpenedAt: normalizeIsoDateTime(row.last_opened_at, row.updated_at ?? row.created_at ?? undefined),
});

const mapProjectRow = (row: SupabaseProjectRow): ProjectIndexRecord => ({
  id: row.id,
  workspaceId: row.workspace_id,
  ownerId: row.owner_id,
  name: row.name,
  createdAt: normalizeIsoDateTime(row.created_at),
  updatedAt: normalizeIsoDateTime(row.updated_at, row.created_at),
  lastOpenedAt: normalizeIsoDateTime(row.last_opened_at, row.updated_at ?? row.created_at ?? undefined),
});

const mapDraftRow = (row: SupabaseDraftRow): ProjectDraftRecord => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  document: row.document,
  createdAt: normalizeIsoDateTime(row.created_at),
  updatedAt: normalizeIsoDateTime(row.updated_at, row.created_at),
});

const mapSnapshotRow = (row: SupabaseSnapshotRow): ProjectSnapshotRecord => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  reason: row.reason,
  document: row.document,
  createdAt: normalizeIsoDateTime(row.created_at),
  versionNumber: row.version_number ?? undefined,
});

const createSupabaseClient = (config: SupabaseWorkspaceGatewayConfig) => {
  if (supabaseClientSingleton) return supabaseClientSingleton;

  supabaseClientSingleton = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
    },
  });

  return supabaseClientSingleton;
};

const buildSupabaseSession = (
  config: SupabaseWorkspaceGatewayConfig,
  authSession: AuthSession | null,
  overrides?: Partial<Pick<BuilderSession, 'auth' | 'gateway' | 'viewer' | 'capabilities'>>,
): BuilderSession => {
  const user = authSession?.user ?? null;

  return {
    mode: 'cloud',
    viewer: overrides?.viewer ?? {
      id: user?.id ?? 'anonymous',
      name: resolveViewerName(user),
      email: user?.email ?? undefined,
    },
    auth: overrides?.auth ?? {
      provider: 'supabase',
      status: user ? 'authenticated' : 'anonymous',
      profile: config.authProfile,
      canSignIn: true,
      canRegister: true,
      canResendVerification: true,
      oauthProviders: SUPABASE_OAUTH_PROVIDERS,
      hint: user
        ? 'Supabase Auth session is active. Project data loads automatically on startup.'
        : 'Sign in with a Supabase email/password or GitHub account. Once signed in, the session persists and reconnects automatically next startup.',
    },
    gateway: overrides?.gateway ?? {
      driver: 'supabase',
      status: 'ready',
      baseUrl: trimTrailingSlash(config.supabaseUrl),
      hint: 'Supabase Auth + Postgres stores workspaces, project drafts, and version snapshots.',
    },
    capabilities: overrides?.capabilities ?? {
      cloudSync: Boolean(user),
      accountSwitch: true,
      teamWorkspace: false,
    },
  };
};

const buildPendingVerificationSession = (
  config: SupabaseWorkspaceGatewayConfig,
  options: {
    email: string;
    user?: User | null;
    hint?: string;
  },
) => {
  const normalizedEmail = options.email.trim();

  return buildSupabaseSession(config, null, {
    viewer: {
      id: options.user?.id ?? 'pending-verification',
      name: options.user ? resolveViewerName(options.user) : resolveViewerNameFromEmail(normalizedEmail),
      email: normalizedEmail,
    },
    auth: {
      provider: 'supabase',
      status: 'pending-verification',
      profile: config.authProfile,
      canSignIn: true,
      canRegister: true,
      canResendVerification: true,
      oauthProviders: SUPABASE_OAUTH_PROVIDERS,
      pendingEmail: normalizedEmail,
      hint: options.hint ?? `Verification required. Open the confirmation email sent to ${normalizedEmail}, then return here to unlock this isolated cloud workspace.`,
    },
    capabilities: {
      cloudSync: false,
      accountSwitch: true,
      teamWorkspace: false,
    },
  });
};

const isEmailNotConfirmedError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('email not confirmed') || message.includes('email_not_confirmed');
};

const isEmailRateLimitError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('email rate limit exceeded')
    || message.includes('over_email_send_rate_limit')
    || (message.includes('rate limit') && message.includes('email'));
};

const toFriendlyAuthError = (
  error: unknown,
  config: SupabaseWorkspaceGatewayConfig,
  action: 'sign-in' | 'sign-up' | 'resend-verification',
) => {
  if (isEmailRateLimitError(error)) {
    const base = 'Supabase auth email quota is exhausted for this hour. Wait for the cooldown, sign in with an existing account, or configure custom SMTP.';
    if (config.authProfile === 'development') {
      return `${base} For local scaffolding, you can also disable "Confirm email" in Supabase Authentication -> Providers -> Email.`;
    }

    return `${base} Production projects should keep email confirmation enabled and use custom SMTP.`;
  }

  if (action === 'resend-verification' && isEmailNotConfirmedError(error)) {
    return 'Verification is still pending. Open the original confirmation email or request another email after the rate-limit window resets.';
  }

  return null;
};

const getSupabaseSession = async (client: SupabaseClient) => {
  const { data, error } = await client.auth.getSession();
  assertNoError(error, 'Supabase session lookup failed');
  return data.session ?? null;
};

const requireUser = async (client: SupabaseClient) => {
  const session = await getSupabaseSession(client);
  const user = session?.user ?? null;
  if (!user) {
    throw new Error('Supabase sign-in required before accessing cloud workspaces.');
  }

  return { session, user };
};

const ensureProfile = async (
  client: SupabaseClient,
  user: User,
  options?: { activeWorkspaceId?: string | null },
) => {
  const payload: Partial<SupabaseProfileRow> & { user_id: string } = {
    user_id: user.id,
    viewer_name: resolveViewerName(user),
    viewer_email: user.email ?? null,
    updated_at: getNowIso(),
  };

  if (options && 'activeWorkspaceId' in options) {
    payload.active_workspace_id = options.activeWorkspaceId ?? null;
  }

  const { error } = await client
    .from('builder_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  assertNoError(error, 'Failed to sync builder profile');
};

const loadProfile = async (client: SupabaseClient, userId: string) => {
  const { data, error } = await client
    .from('builder_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<SupabaseProfileRow>();

  assertNoError(error, 'Failed to load builder profile');
  return data ?? null;
};

const loadWorkspace = async (client: SupabaseClient, ownerId: string, workspaceId: string) => {
  const { data, error } = await client
    .from('builder_workspaces')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('id', workspaceId)
    .maybeSingle<SupabaseWorkspaceRow>();

  assertNoError(error, 'Failed to load workspace');
  return data ?? null;
};

const touchWorkspace = async (
  client: SupabaseClient,
  ownerId: string,
  workspaceId: string,
  patch: Partial<Pick<SupabaseWorkspaceRow, 'updated_at' | 'last_opened_at' | 'name'>> = {},
) => {
  const { error } = await client
    .from('builder_workspaces')
    .update(patch)
    .eq('owner_id', ownerId)
    .eq('id', workspaceId);

  assertNoError(error, 'Failed to update workspace');
};

const loadProject = async (client: SupabaseClient, ownerId: string, projectId: string) => {
  const { data, error } = await client
    .from('builder_projects')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('id', projectId)
    .maybeSingle<SupabaseProjectRow>();

  assertNoError(error, 'Failed to load project');
  return data ?? null;
};

const setWorkspaceActiveProject = async (
  client: SupabaseClient,
  ownerId: string,
  workspaceId: string,
  activeProjectId: string | null,
) => {
  const { error } = await client
    .from('builder_workspace_state')
    .upsert({
      owner_id: ownerId,
      workspace_id: workspaceId,
      active_project_id: activeProjectId,
      updated_at: getNowIso(),
    } satisfies Partial<SupabaseWorkspaceStateRow>, { onConflict: 'owner_id,workspace_id' });

  assertNoError(error, 'Failed to update active project');
};

const getActiveWorkspaceIdInternal = async (client: SupabaseClient, user: User) => {
  await ensureProfile(client, user);
  const profile = await loadProfile(client, user.id);
  return profile?.active_workspace_id ?? null;
};

const getActiveProjectIdInternal = async (
  client: SupabaseClient,
  ownerId: string,
  workspaceId: string,
) => {
  const { data, error } = await client
    .from('builder_workspace_state')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('workspace_id', workspaceId)
    .maybeSingle<SupabaseWorkspaceStateRow>();

  assertNoError(error, 'Failed to load active project');
  return data?.active_project_id ?? null;
};

const resolveWorkspaceIdForSave = async (
  client: SupabaseClient,
  user: User,
  explicitWorkspaceId?: string,
) => {
  if (explicitWorkspaceId) return explicitWorkspaceId;

  const activeWorkspaceId = await getActiveWorkspaceIdInternal(client, user);
  if (activeWorkspaceId) return activeWorkspaceId;

  const { data, error } = await client
    .from('builder_workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .order('last_opened_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  assertNoError(error, 'Failed to resolve active workspace');
  if (data?.id) return data.id;

  return LOCAL_WORKSPACE_ID;
};

const upsertWorkspaceIfMissing = async (
  client: SupabaseClient,
  user: User,
  workspaceId: string,
  fallbackTimestamp: string,
) => {
  const existingWorkspace = await loadWorkspace(client, user.id, workspaceId);
  if (existingWorkspace) return existingWorkspace;

  const row = {
    owner_id: user.id,
    id: workspaceId,
    name: DEFAULT_WORKSPACE_NAME,
    kind: 'local',
    created_at: fallbackTimestamp,
    updated_at: fallbackTimestamp,
    last_opened_at: fallbackTimestamp,
  } satisfies Partial<SupabaseWorkspaceRow> & { owner_id: string; id: string; name: string };

  const { error } = await client
    .from('builder_workspaces')
    .upsert(row, { onConflict: 'owner_id,id' });

  assertNoError(error, 'Failed to create default workspace');
  return await loadWorkspace(client, user.id, workspaceId);
};

const persistProjectRecord = async (
  client: SupabaseClient,
  user: User,
  record: SaveProjectDraftInput,
  options?: SaveProjectDraftOptions,
) => {
  const existingProject = await loadProject(client, user.id, record.projectId);
  const workspaceId = options?.workspaceId
    ?? existingProject?.workspace_id
    ?? await resolveWorkspaceIdForSave(client, user);
  const timestamp = record.updatedAt;

  await upsertWorkspaceIfMissing(client, user, workspaceId, record.createdAt);

  const projectRow = {
    owner_id: user.id,
    id: record.projectId,
    workspace_id: workspaceId,
    name: record.name,
    created_at: existingProject?.created_at ?? record.createdAt,
    updated_at: record.updatedAt,
    last_opened_at: options?.setActive
      ? timestamp
      : existingProject?.last_opened_at ?? timestamp,
  } satisfies Partial<SupabaseProjectRow> & { owner_id: string; id: string; workspace_id: string; name: string };

  const { error: projectError } = await client
    .from('builder_projects')
    .upsert(projectRow, { onConflict: 'owner_id,id' });

  assertNoError(projectError, 'Failed to save project index');

  const draftRow = {
    owner_id: user.id,
    id: record.id,
    project_id: record.projectId,
    name: record.name,
    document: record.document,
    created_at: existingProject?.created_at ?? record.createdAt,
    updated_at: record.updatedAt,
  } satisfies Partial<SupabaseDraftRow> & { owner_id: string; id: string; project_id: string; name: string; document: ProjectDraftRecord['document'] };

  const { error: draftError } = await client
    .from('builder_project_drafts')
    .upsert(draftRow, { onConflict: 'owner_id,id' });

  assertNoError(draftError, 'Failed to save project draft');

  const workspace = await loadWorkspace(client, user.id, workspaceId);
  await touchWorkspace(client, user.id, workspaceId, {
    updated_at: record.updatedAt,
    last_opened_at: options?.setActive
      ? timestamp
      : workspace?.last_opened_at ?? timestamp,
  });

  if (options?.createSnapshot) {
    const { data: latestSnapshot, error: snapshotQueryError } = await client
      .from('builder_project_snapshots')
      .select('version_number')
      .eq('owner_id', user.id)
      .eq('project_id', record.projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle<{ version_number: number | null }>();

    assertNoError(snapshotQueryError, 'Failed to load current project version');

    const { error: snapshotInsertError } = await client
      .from('builder_project_snapshots')
      .insert({
        owner_id: user.id,
        id: nanoid(12),
        project_id: record.projectId,
        name: record.name,
        reason: options.reason ?? 'manual',
        document: record.document,
        created_at: record.updatedAt,
        version_number: (latestSnapshot?.version_number ?? 0) + 1,
      } satisfies Partial<SupabaseSnapshotRow> & {
        owner_id: string;
        id: string;
        project_id: string;
        name: string;
        reason: string;
        document: ProjectSnapshotRecord['document'];
      });

    assertNoError(snapshotInsertError, 'Failed to create project snapshot');
  }

  if (options?.setActive) {
    await ensureProfile(client, user, { activeWorkspaceId: workspaceId });
    await setWorkspaceActiveProject(client, user.id, workspaceId, record.projectId);
  }

  return workspaceId;
};

export const createSupabaseWorkspaceGateway = (
  config: SupabaseWorkspaceGatewayConfig,
): WorkspaceGateway => {
  const client = createSupabaseClient(config);

  return {
    getSession: async () => {
      try {
        const session = await getSupabaseSession(client);
        const user = session?.user ?? null;

        if (user) {
          clearPendingVerification();
          await ensureProfile(client, user);
          return buildSupabaseSession(config, session);
        }

        const pendingVerification = readPendingVerification();
        if (pendingVerification) {
          return buildPendingVerificationSession(config, {
            email: pendingVerification.email,
          });
        }

        return buildSupabaseSession(config, null);
      } catch (error) {
        return buildSupabaseSession(config, null, {
          auth: {
            provider: 'supabase',
            status: 'missing-config',
            profile: config.authProfile,
            canSignIn: true,
            canRegister: true,
            canResendVerification: true,
            oauthProviders: SUPABASE_OAUTH_PROVIDERS,
            hint: withSetupHint(error),
          },
          gateway: {
            driver: 'supabase',
            status: 'offline',
            baseUrl: trimTrailingSlash(config.supabaseUrl),
            hint: withSetupHint(error),
          },
          capabilities: {
            cloudSync: false,
            accountSwitch: true,
            teamWorkspace: false,
          },
        });
      }
    },
    signIn: async (input: SignInInput) => {
      const { data, error } = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) {
        if (isEmailNotConfirmedError(error)) {
          writePendingVerification(input.email);
          return buildPendingVerificationSession(config, {
            email: input.email,
            hint: `Email verification is still pending for ${input.email.trim()}. Confirm the signup email, then return here and sign in again or refresh the session.`,
          });
        }
        const friendlyError = toFriendlyAuthError(error, config, 'sign-in');
        if (friendlyError) {
          throw new Error(friendlyError);
        }
        assertNoError(error, 'Supabase sign-in failed');
      }

      if (!data.session?.user) {
        throw new Error('Supabase sign-in did not return a valid user session.');
      }

      clearPendingVerification();
      await ensureProfile(client, data.session.user);
      return buildSupabaseSession(config, data.session);
    },
    signInWithProvider: async (provider, options) => {
      if (typeof window === 'undefined') {
        throw new Error(`${provider} OAuth sign-in requires a browser context.`);
      }

      clearPendingVerification();

      const redirectTo = resolveEmailRedirectTo(options?.redirectTo);
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          ...(redirectTo ? { redirectTo } : {}),
          skipBrowserRedirect: true,
        },
      });

      assertNoError(error, `Supabase ${provider} OAuth sign-in failed`);

      if (!data?.url) {
        throw new Error(`Supabase ${provider} OAuth sign-in did not return a redirect URL.`);
      }

      window.location.assign(data.url);

      return buildSupabaseSession(config, null, {
        auth: {
          provider: 'supabase',
          status: 'anonymous',
          profile: config.authProfile,
          canSignIn: true,
          canRegister: true,
          canResendVerification: true,
          oauthProviders: SUPABASE_OAUTH_PROVIDERS,
          hint: `Redirecting to ${provider} for authentication. Finish the consent flow and return here to unlock your cloud workspace.`,
        },
        capabilities: {
          cloudSync: false,
          accountSwitch: true,
          teamWorkspace: false,
        },
      });
    },
    signUp: async (input: SignUpInput) => {
      assertDeliverableEmail(input.email);
      const redirectTo = resolveEmailRedirectTo(input.redirectTo);
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      const friendlyError = toFriendlyAuthError(error, config, 'sign-up');
      if (friendlyError) {
        throw new Error(friendlyError);
      }
      assertNoError(error, 'Supabase sign-up failed');

      if (data.session?.user) {
        clearPendingVerification();
        await ensureProfile(client, data.session.user);
        return buildSupabaseSession(config, data.session);
      }

      if (data.user?.email || input.email) {
        const pendingEmail = data.user?.email ?? input.email;
        writePendingVerification(pendingEmail);
        return buildPendingVerificationSession(config, {
          email: pendingEmail,
          user: data.user,
          hint: `Confirmation email sent to ${pendingEmail.trim()}. Verify it before this account can access isolated builder workspaces.`,
        });
      }

      throw new Error('Supabase sign-up completed without returning a user record.');
    },
    resendVerification: async (input: ResendVerificationInput) => {
      assertDeliverableEmail(input.email);
      const redirectTo = resolveEmailRedirectTo(input.redirectTo);
      const { error } = await client.auth.resend({
        type: 'signup',
        email: input.email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      const friendlyError = toFriendlyAuthError(error, config, 'resend-verification');
      if (friendlyError) {
        throw new Error(friendlyError);
      }
      assertNoError(error, 'Failed to resend verification email');
      writePendingVerification(input.email);
      return buildPendingVerificationSession(config, {
        email: input.email,
        hint: `A fresh verification email was sent to ${input.email.trim()}.`,
      });
    },
    signOut: async () => {
      const { error } = await client.auth.signOut();
      assertNoError(error, 'Supabase sign-out failed');
      clearPendingVerification();
      return buildSupabaseSession(config, null);
    },
    createWorkspaceId,
    getLocalWorkspaceDefaults: () => ({
      workspaceId: LOCAL_WORKSPACE_ID,
      workspaceName: DEFAULT_WORKSPACE_NAME,
      ownerId: LOCAL_OWNER_ID,
    }),
    listWorkspaces: async () => {
      const { user } = await requireUser(client);
      await ensureProfile(client, user);

      const { data, error } = await client
        .from('builder_workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('last_opened_at', { ascending: false });

      assertNoError(error, 'Failed to list workspaces');
      return (data ?? []).map((row) => mapWorkspaceRow(row as SupabaseWorkspaceRow));
    },
    saveWorkspace: async (record, options) => {
      const { user } = await requireUser(client);
      const row = {
        owner_id: user.id,
        id: record.id,
        name: record.name,
        kind: record.kind,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        last_opened_at: record.lastOpenedAt,
      } satisfies Partial<SupabaseWorkspaceRow> & { owner_id: string; id: string; name: string };

      const { error } = await client
        .from('builder_workspaces')
        .upsert(row, { onConflict: 'owner_id,id' });

      assertNoError(error, 'Failed to save workspace');

      if (options?.setActive) {
        await ensureProfile(client, user, { activeWorkspaceId: record.id });
      } else {
        await ensureProfile(client, user);
      }
    },
    getActiveWorkspaceId: async () => {
      const { user } = await requireUser(client);
      return getActiveWorkspaceIdInternal(client, user);
    },
    setActiveWorkspace: async (workspaceId) => {
      const { user } = await requireUser(client);
      const now = getNowIso();

      await ensureProfile(client, user, { activeWorkspaceId: workspaceId });
      await touchWorkspace(client, user.id, workspaceId, {
        updated_at: now,
        last_opened_at: now,
      });
    },
    listProjects: async (workspaceId) => {
      const { user } = await requireUser(client);
      let query = client
        .from('builder_projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      assertNoError(error, 'Failed to list projects');
      return (data ?? []).map((row) => mapProjectRow(row as SupabaseProjectRow));
    },
    getActiveProjectId: async (workspaceId) => {
      const { user } = await requireUser(client);
      const resolvedWorkspaceId = workspaceId ?? await getActiveWorkspaceIdInternal(client, user);
      if (!resolvedWorkspaceId) return null;
      return getActiveProjectIdInternal(client, user.id, resolvedWorkspaceId);
    },
    setActiveProject: async (projectId, workspaceId) => {
      const { user } = await requireUser(client);
      const project = await loadProject(client, user.id, projectId);
      const resolvedWorkspaceId = workspaceId ?? project?.workspace_id ?? await getActiveWorkspaceIdInternal(client, user);

      if (!resolvedWorkspaceId) {
        throw new Error('No workspace is available to activate this project.');
      }

      const now = getNowIso();
      await setWorkspaceActiveProject(client, user.id, resolvedWorkspaceId, projectId);
      await ensureProfile(client, user, { activeWorkspaceId: resolvedWorkspaceId });

      const { error: projectError } = await client
        .from('builder_projects')
        .update({
          workspace_id: resolvedWorkspaceId,
          last_opened_at: now,
        } satisfies Partial<SupabaseProjectRow>)
        .eq('owner_id', user.id)
        .eq('id', projectId);

      assertNoError(projectError, 'Failed to activate project');

      await touchWorkspace(client, user.id, resolvedWorkspaceId, {
        updated_at: now,
        last_opened_at: now,
      });
    },
    deleteProject: async (projectId, workspaceId) => {
      const { user } = await requireUser(client);
      const project = await loadProject(client, user.id, projectId);
      if (!project) return;

      const resolvedWorkspaceId = workspaceId ?? project.workspace_id;
      const { error } = await client
        .from('builder_projects')
        .delete()
        .eq('owner_id', user.id)
        .eq('id', projectId);

      assertNoError(error, 'Failed to delete project');

      const activeProjectId = await getActiveProjectIdInternal(client, user.id, resolvedWorkspaceId);
      if (activeProjectId !== projectId) return;

      const { data: nextProject, error: nextProjectError } = await client
        .from('builder_projects')
        .select('id')
        .eq('owner_id', user.id)
        .eq('workspace_id', resolvedWorkspaceId)
        .order('last_opened_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();

      assertNoError(nextProjectError, 'Failed to resolve next active project');
      await setWorkspaceActiveProject(client, user.id, resolvedWorkspaceId, nextProject?.id ?? null);
    },
    loadProjectDraft: async (projectId) => {
      const { user } = await requireUser(client);
      const { data, error } = await client
        .from('builder_project_drafts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('project_id', projectId)
        .maybeSingle<SupabaseDraftRow>();

      assertNoError(error, 'Failed to load project draft');
      return data ? mapDraftRow(data) : undefined;
    },
    listProjectVersions: async (projectId) => {
      const { user } = await requireUser(client);
      const { data, error } = await client
        .from('builder_project_snapshots')
        .select('*')
        .eq('owner_id', user.id)
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .order('created_at', { ascending: false });

      assertNoError(error, 'Failed to list project versions');
      return (data ?? []).map((row) => mapSnapshotRow(row as SupabaseSnapshotRow));
    },
    loadProjectVersion: async (versionId) => {
      const { user } = await requireUser(client);
      const { data, error } = await client
        .from('builder_project_snapshots')
        .select('*')
        .eq('owner_id', user.id)
        .eq('id', versionId)
        .maybeSingle<SupabaseSnapshotRow>();

      assertNoError(error, 'Failed to load project version');
      return data ? mapSnapshotRow(data) : undefined;
    },
    deleteProjectVersion: async (versionId) => {
      const { user } = await requireUser(client);
      const { error } = await client
        .from('builder_project_snapshots')
        .delete()
        .eq('owner_id', user.id)
        .eq('id', versionId);

      assertNoError(error, 'Failed to delete project version');
    },
    saveProjectDraft: async (record, options) => {
      const { user } = await requireUser(client);
      await persistProjectRecord(client, user, record, options);
    },
    saveProjectBundle: async (payload, options) => {
      const { user } = await requireUser(client);
      const workspaceId = await persistProjectRecord(client, user, payload.draft, {
        createSnapshot: false,
        reason: 'bundle-import',
        setActive: options?.setActive,
        workspaceId: options?.workspaceId,
      });

      if (options?.replaceExisting) {
        const { error: deleteSnapshotsError } = await client
          .from('builder_project_snapshots')
          .delete()
          .eq('owner_id', user.id)
          .eq('project_id', payload.draft.projectId);

        assertNoError(deleteSnapshotsError, 'Failed to replace existing project versions');
      }

      if (payload.snapshots.length > 0) {
        const normalizedSnapshots = payload.snapshots.map((snapshot, index) => ({
          owner_id: user.id,
          id: snapshot.id,
          project_id: payload.draft.projectId,
          name: payload.draft.name,
          reason: snapshot.reason,
          document: snapshot.document,
          created_at: snapshot.createdAt,
          version_number: snapshot.versionNumber ?? index + 1,
        }));

        const { error: snapshotsError } = await client
          .from('builder_project_snapshots')
          .upsert(normalizedSnapshots, { onConflict: 'owner_id,id' });

        assertNoError(snapshotsError, 'Failed to import project versions');
      }

      if (options?.setActive) {
        await ensureProfile(client, user, { activeWorkspaceId: workspaceId });
        await setWorkspaceActiveProject(client, user.id, workspaceId, payload.draft.projectId);
      }
    },
  };
};
