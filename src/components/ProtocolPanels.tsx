import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BadgeCheck, Bot, DatabaseZap, Github, LogIn, MailCheck, Palette, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { BUILDER_BLUEPRINTS, type BuilderBlueprintId } from '../builder/blueprints';
import { useFeedback } from './FeedbackProvider';
import {
  InspectorField,
  InspectorSection,
  inspectorInputClassName,
  inspectorItemClassName,
  inspectorTextareaClassName,
} from './builder-page/InspectorPrimitives';
import { mergeBuilderThemeManifest } from '../theme/compiler';
import { THEME_REFERENCE_PROFILES, type ThemeReferenceProfileId } from '../theme/referenceProfiles';
import { BUILDER_THEME_TOKEN_KEYS, type BuilderThemeTokenKey } from '../theme/schema';
import {
  createActionDraft,
  createBindingDraft,
  createBuilderDataSource,
  getDefaultDataSourceConfig,
  parseJsonText,
  parseLooseValue,
  replaceActionType,
  stringifyLooseValue,
} from '../core/protocol';
import {
  getNavigateActionConfig,
  getOpenModalActionConfig,
  mergeNavigateActionConfig,
  mergeOpenModalActionConfig,
} from '../core/actionTargets';
import type { AiHandoffPackage } from '../core/aiHandoff';
import type { BuilderSession, OAuthProvider } from '../core/workspaceGateway';
import { DataSourceSchema, RequestConfigSchema } from '../schema/project';
import type {
  BuilderDataSource,
  BuilderPage,
  DataBinding,
  NodeAction,
  RequestAuth,
  RequestAuthMode,
  RequestConfig,
} from '../schema/project';
import { BUILDER_THEME_PRESETS, type BuilderThemeId, type BuilderThemeManifest, type BuilderThemePreset } from '../theme/presets';

type SourceOption = {
  label: string;
  value: string;
};

type SectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
  defaultOpen?: boolean;
};

function PanelSection({
  title,
  description,
  children,
  compact = false,
  defaultOpen = true,
}: SectionProps) {
  return (
    <InspectorSection title={title} defaultOpen={defaultOpen}>
      {children}
    </InspectorSection>
  );
}

function SmallActionButton({
  children,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
}) {
  const palette = {
    default: 'border-hr-border text-hr-muted hover:text-hr-text hover:border-hr-primary',
    danger: 'border-red-200 text-red-500 hover:border-red-400 hover:text-red-600',
    primary: 'border-hr-primary/20 bg-hr-primary/10 text-hr-primary hover:bg-hr-primary/20',
  } as const;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`builder-control inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${palette[variant]}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <InspectorField label={label}>{children}</InspectorField>;
}

const inputClassName = inspectorInputClassName;
const textareaClassName = `${inspectorTextareaClassName} text-xs font-mono`;

type RestSource = Extract<BuilderDataSource, { kind: 'rest' }>;
type MockSource = Extract<BuilderDataSource, { kind: 'mock' }>;
type RequestConfigPatch = Omit<Partial<RequestConfig>, 'auth'> & { auth?: Partial<RequestAuth> };
type RequestActionConfig = RequestConfig & { sourceKey: string; resultKey: string };
type RequestActionConfigPatch = Omit<Partial<RequestActionConfig>, 'auth'> & { auth?: Partial<RequestAuth> };

const getDefaultRequestAuth = (): RequestAuth => ({
  mode: 'none',
  placement: 'header',
  tokenTemplate: '',
  headerName: 'Authorization',
  queryName: 'api_key',
  prefix: 'Bearer ',
});

const parseRequestAuthMode = (value: string): RequestAuthMode => {
  if (value === 'bearer' || value === 'api-key') return value;
  return 'none';
};

const parseAuthPlacement = (value: string): RequestAuth['placement'] => {
  return value === 'query' ? 'query' : 'header';
};

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error)
);

const mergeRequestConfig = (configInput: unknown, patch: RequestConfigPatch = {}): RequestConfig => {
  const current = RequestConfigSchema.parse(configInput ?? {});

  return {
    ...current,
    ...patch,
    auth: patch.auth ? { ...current.auth, ...patch.auth } : current.auth,
  };
};

const getRequestActionConfig = (configInput: unknown): RequestActionConfig => {
  const raw = configInput && typeof configInput === 'object'
    ? configInput as Record<string, unknown>
    : {};

  return {
    ...mergeRequestConfig(raw),
    sourceKey: typeof raw.sourceKey === 'string' ? raw.sourceKey : '',
    resultKey: typeof raw.resultKey === 'string' ? raw.resultKey : '',
  };
};

const mergeRequestActionConfig = (
  configInput: unknown,
  patch: RequestActionConfigPatch = {},
): Record<string, unknown> => {
  const current = getRequestActionConfig(configInput);
  const next: RequestActionConfig = {
    ...current,
    ...patch,
    auth: patch.auth ? { ...current.auth, ...patch.auth } : current.auth,
  };

  return next as Record<string, unknown>;
};

export function ProjectBasicsPanel({
  projectName,
  onProjectNameChange,
}: {
  projectName: string;
  onProjectNameChange: (value: string) => void;
}) {
  return (
    <PanelSection
      title="Project Basics"
      description="Lock the project semantics first so AI handoff stays stable."
    >
      <Field label="Project Name">
        <input
          type="text"
          className={inputClassName}
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
        />
      </Field>
    </PanelSection>
  );
}

export function SessionStatusPanel({
  session,
  authPending,
  authError,
  onSignIn,
  onSignInWithProvider,
  onSignUp,
  onResendVerification,
  onRefreshSession,
  onSignOut,
}: {
  session: BuilderSession | null;
  authPending: boolean;
  authError?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignInWithProvider: (provider: OAuthProvider) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onResendVerification: (email: string) => Promise<void>;
  onRefreshSession: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const { notify } = useFeedback();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [signInEmail, setSignInEmail] = useState('demo@builder.local');
  const [signInPassword, setSignInPassword] = useState('builder123');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const canUseAuth = session?.mode === 'cloud' && session.auth.canSignIn;
  const isAuthenticated = session?.auth.status === 'authenticated';
  const isPendingVerification = session?.auth.status === 'pending-verification';
  const isMockCloud = session?.auth.provider === 'custom-api';
  const isSupabase = session?.auth.provider === 'supabase';
  const canRegister = Boolean(canUseAuth && session?.auth.canRegister);
  const oauthProviders = session?.auth.oauthProviders ?? [];
  const canUseGithubOAuth = isSupabase && oauthProviders.includes('github') && !isPendingVerification;
  const pendingEmail = session?.auth.pendingEmail ?? session?.viewer.email ?? signUpEmail ?? signInEmail;
  const authProfile = session?.auth.profile ?? 'production';
  const effectiveError = localError ?? authError ?? null;

  useEffect(() => {
    if (isSupabase) {
      setSignInPassword('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
      const resolvedEmail = session?.auth.pendingEmail ?? session?.viewer.email ?? '';
      if (resolvedEmail) {
        setSignInEmail(resolvedEmail);
        setSignUpEmail(resolvedEmail);
      }
      if (session?.auth.status === 'pending-verification') {
        setMode('sign-up');
      }
      return;
    }

    if (isMockCloud) {
      setSignInEmail('demo@builder.local');
      setSignInPassword('builder123');
    }
  }, [isMockCloud, isSupabase, session?.auth.pendingEmail, session?.auth.status, session?.viewer.email]);

  useEffect(() => {
    if (authPending) return;
    setLocalError(null);
  }, [authPending]);

  const renderIsolationCard = () => (
    <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3">
      <div className="flex items-center gap-2 text-emerald-700">
        <ShieldCheck size={14} />
        <span className="font-medium">User isolation</span>
      </div>
      <div className="mt-1 text-[11px] leading-5 text-emerald-700/90">
        Each authenticated account gets its own RLS boundary. Workspaces, projects, drafts, and snapshots stay scoped to a single user identity.
      </div>
      {isAuthenticated ? (
        <div className="mt-2 rounded-md border border-emerald-200/80 bg-white/80 px-2.5 py-2 text-[11px] text-emerald-800">
          <div className="font-medium">Active owner</div>
          <div className="mt-1 break-all font-mono">{session?.viewer.id}</div>
        </div>
      ) : null}
    </div>
  );

  const renderSupabasePendingCard = () => (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
      <div className="flex items-center gap-2 text-sky-700">
        <MailCheck size={14} />
        <span className="font-medium">Verification pending</span>
      </div>
      <div className="mt-1 text-[11px] leading-5 text-sky-700/90">
        Confirm the signup email for <span className="font-medium">{pendingEmail || 'this account'}</span>. The project stays isolated until verification is complete.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallActionButton
          variant="primary"
            disabled={authPending}
            onClick={() => {
              setLocalError(null);
              void onRefreshSession().catch(() => {});
            }}
          >
          <BadgeCheck size={12} />
          {authPending ? 'Checking…' : 'I verified'}
        </SmallActionButton>
        {session?.auth.canResendVerification && pendingEmail ? (
          <SmallActionButton
            disabled={authPending}
            onClick={() => {
              setLocalError(null);
              void onResendVerification(pendingEmail).catch(() => {});
            }}
          >
            <RefreshCw size={12} />
            Resend email
          </SmallActionButton>
        ) : null}
      </div>
    </div>
  );

  const renderSignInForm = () => (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setLocalError(null);
        void onSignIn(signInEmail, signInPassword).catch(() => {});
      }}
    >
      {isMockCloud ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
          Mock cloud demo: demo@builder.local / builder123
        </div>
      ) : null}
      {isSupabase ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] text-sky-700">
          Use a Supabase email/password account or continue with GitHub. Verified accounts reconnect automatically on the next startup.
        </div>
      ) : null}
      <Field label="Email">
        <input
          type="email"
          className={inputClassName}
          value={signInEmail}
          autoComplete="username"
          disabled={authPending}
          onChange={(event) => {
            setLocalError(null);
            setSignInEmail(event.target.value);
          }}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          className={inputClassName}
          value={signInPassword}
          autoComplete="current-password"
          disabled={authPending}
          onChange={(event) => {
            setLocalError(null);
            setSignInPassword(event.target.value);
          }}
        />
      </Field>
      <button
        type="submit"
        disabled={authPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-hr-primary/20 bg-hr-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-hr-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogIn size={13} />
        {authPending ? 'Signing in…' : 'Sign in'}
      </button>
      {canUseGithubOAuth ? (
        <>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-hr-muted">
            <span className="h-px flex-1 bg-hr-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-hr-border" />
          </div>
          <button
            type="button"
            disabled={authPending}
            onClick={() => {
              setLocalError(null);
              void onSignInWithProvider('github').catch(() => {});
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-hr-border bg-hr-panel px-3 py-2 text-xs font-semibold text-hr-text transition-colors hover:border-hr-primary/40 hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Github size={13} />
            {authPending ? 'Redirecting…' : 'Continue with GitHub'}
          </button>
        </>
      ) : null}
    </form>
  );

  const renderSignUpForm = () => (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();

        if (!signUpEmail.trim()) {
          setLocalError('Email is required.');
          return;
        }

        if (signUpPassword.length < 8) {
          setLocalError('Password must be at least 8 characters.');
          return;
        }

        if (signUpPassword !== signUpConfirmPassword) {
          setLocalError('Passwords do not match.');
          return;
        }

        setLocalError(null);
        void onSignUp(signUpEmail, signUpPassword).catch(() => {});
      }}
    >
      <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] text-sky-700">
        New builder accounts require email verification before isolated cloud workspaces become available. Use a real inbox address — placeholder domains such as `example.com` or `.test` will be rejected.
      </div>
      {canUseGithubOAuth ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
          Prefer not to manage another password? Switch to <span className="font-medium">Sign in</span> and continue with GitHub after enabling the provider in Supabase.
        </div>
      ) : null}
      <Field label="Email">
        <input
          type="email"
          className={inputClassName}
          value={signUpEmail}
          autoComplete="email"
          disabled={authPending}
          onChange={(event) => {
            setLocalError(null);
            setSignUpEmail(event.target.value);
          }}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          className={inputClassName}
          value={signUpPassword}
          autoComplete="new-password"
          disabled={authPending}
          onChange={(event) => {
            setLocalError(null);
            setSignUpPassword(event.target.value);
          }}
        />
      </Field>
      <Field label="Confirm password">
        <input
          type="password"
          className={inputClassName}
          value={signUpConfirmPassword}
          autoComplete="new-password"
          disabled={authPending}
          onChange={(event) => {
            setLocalError(null);
            setSignUpConfirmPassword(event.target.value);
          }}
        />
      </Field>
      <button
        type="submit"
        disabled={authPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-hr-primary/20 bg-hr-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-hr-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserPlus size={13} />
        {authPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );

  return (
    <PanelSection
      title="Session"
      description="Account status, verification, and storage isolation for the active builder runtime."
    >
      {!session ? (
        <div className="rounded-lg border border-dashed border-hr-border bg-hr-panel/80 p-3 text-xs text-hr-muted">
          Session is loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 text-xs">
          {isSupabase ? (
            <div className={`rounded-lg border p-3 ${authProfile === 'development' ? 'border-amber-200 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
              <div className={`font-medium ${authProfile === 'development' ? 'text-amber-700' : 'text-sky-700'}`}>
                {authProfile === 'development' ? 'Development auth profile' : 'Production auth profile'}
              </div>
              <div className={`mt-1 text-[11px] leading-5 ${authProfile === 'development' ? 'text-amber-700/90' : 'text-sky-700/90'}`}>
                {authProfile === 'development'
                  ? 'Fast local iteration profile. You can disable Confirm email in Supabase to make new accounts log in immediately.'
                  : 'Strict verification profile. Keep Confirm email enabled and use a real SMTP provider for reliable delivery.'}
              </div>
            </div>
          ) : null}
          {effectiveError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="font-medium text-red-700">Auth issue</div>
              <div className="mt-1 text-[11px] leading-5 text-red-700/90">{effectiveError}</div>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-hr-border bg-hr-panel p-3">
            <div className="flex items-center gap-2 text-hr-text">
              <DatabaseZap size={14} />
              <span className="font-medium">Mode</span>
            </div>
            <span className="text-hr-muted">{session.mode}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-hr-border bg-hr-panel p-3">
            <div className="flex items-center gap-2 text-hr-text">
              <Bot size={14} />
              <span className="font-medium">Viewer</span>
            </div>
            <span className="text-right text-hr-muted">
              {session.viewer.name}
              {session.viewer.email ? <span className="block text-[11px]">{session.viewer.email}</span> : null}
            </span>
          </div>
          <div className="rounded-lg border border-hr-border bg-hr-panel p-3">
            <div className="mb-1 font-medium text-hr-text">Auth</div>
            <div className="text-hr-muted">
              {session.auth.provider} · {session.auth.status}
            </div>
            {session.auth.hint ? <div className="mt-1 text-[11px] text-hr-muted">{session.auth.hint}</div> : null}
          </div>
          <div className="rounded-lg border border-hr-border bg-hr-panel p-3">
            <div className="mb-1 font-medium text-hr-text">Gateway</div>
            <div className="text-hr-muted">
              {session.gateway.driver} · {session.gateway.status}
            </div>
            {session.gateway.baseUrl ? (
              <div className="mt-1 break-all text-[11px] text-hr-muted">{session.gateway.baseUrl}</div>
            ) : null}
            {session.gateway.hint ? <div className="mt-1 text-[11px] text-hr-muted">{session.gateway.hint}</div> : null}
          </div>
          {isSupabase ? renderIsolationCard() : null}
          {canUseAuth ? (
            <div className="rounded-lg border border-hr-border bg-hr-panel p-3">
              <div className="mb-2 font-medium text-hr-text">Account</div>
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] text-hr-muted">
                    Signed in as <span className="font-medium text-hr-text">{session.viewer.email ?? session.viewer.name}</span>. Signing out immediately disconnects protected workspaces and project APIs.
                  </div>
                  <SmallActionButton
                    onClick={() => {
                      void onSignOut().catch((error) => {
                        notify({
                          title: 'Sign out failed',
                          message: getErrorMessage(error),
                          tone: 'danger',
                          durationMs: 7000,
                        });
                      });
                    }}
                    disabled={authPending}
                  >
                    {authPending ? 'Signing out…' : 'Sign out'}
                  </SmallActionButton>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {isPendingVerification ? renderSupabasePendingCard() : null}
                  {canRegister ? (
                    <div className="inline-flex rounded-lg border border-hr-border bg-hr-bg/70 p-1">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === 'sign-in' ? 'bg-hr-panel text-hr-text shadow-sm' : 'text-hr-muted hover:text-hr-text'}`}
                        onClick={() => setMode('sign-in')}
                      >
                        <LogIn size={12} />
                        Sign in
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === 'sign-up' ? 'bg-hr-panel text-hr-text shadow-sm' : 'text-hr-muted hover:text-hr-text'}`}
                        onClick={() => setMode('sign-up')}
                      >
                        <UserPlus size={12} />
                        Create account
                      </button>
                    </div>
                  ) : null}
                  {mode === 'sign-up' && canRegister ? renderSignUpForm() : renderSignInForm()}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </PanelSection>
  );
}

export function BlueprintLibraryPanel({
  onApply,
  disabled = false,
}: {
  onApply: (blueprintId: BuilderBlueprintId) => Promise<void>;
  disabled?: boolean;
}) {
  const { notify } = useFeedback();
  return (
    <PanelSection
      title="Starter Blueprints"
      description="Start from a real scenario skeleton, then replace modules, text, bindings, and actions."
    >
      <div className="flex flex-col gap-3">
        {BUILDER_BLUEPRINTS.map((blueprint) => (
          <div key={blueprint.id} className="rounded-xl border border-hr-border bg-hr-panel p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-hr-text">
                  <Sparkles size={14} className="text-hr-primary" />
                  {blueprint.name}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-hr-muted">
                  {blueprint.category} · {blueprint.bestFor}
                </div>
                <div className="mt-1 text-[11px] text-hr-muted">
                  Recommended theme: {BUILDER_THEME_PRESETS.find((theme) => theme.id === blueprint.themeId)?.name ?? blueprint.themeId}
                </div>
              </div>
              <SmallActionButton
                variant="primary"
                disabled={disabled}
                onClick={() => {
                  void onApply(blueprint.id).catch((error) => {
                    notify({
                      title: 'Apply blueprint failed',
                      message: getErrorMessage(error),
                      tone: 'danger',
                      durationMs: 7000,
                    });
                  });
                }}
              >
                Apply
              </SmallActionButton>
            </div>
            <p className="mt-2 text-xs leading-5 text-hr-muted">{blueprint.description}</p>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

export function ThemeLibraryPanel({
  themes,
  projectThemeIds,
  activeThemeId,
  onApply,
}: {
  themes: BuilderThemePreset[];
  projectThemeIds: string[];
  activeThemeId: BuilderThemeId;
  onApply: (themeId: BuilderThemeId) => void;
}) {
  return (
    <PanelSection
      title="Theme Presets"
      description="Built-in presets give users ready-made themes and keep blueprint generation visually grounded."
    >
      <div className="flex flex-col gap-3">
        {themes.map((theme) => {
          const isActive = theme.id === activeThemeId;
          const isProjectTheme = projectThemeIds.includes(theme.id);

          return (
            <div
              key={theme.id}
              className={`builder-panel-card rounded-xl border bg-hr-panel p-3 text-left transition-colors ${isActive ? 'border-hr-primary ring-1 ring-hr-primary/30' : 'border-hr-border hover:border-hr-primary/40'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-hr-text">
                    <Palette size={14} className="text-hr-primary" />
                    {theme.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-hr-muted">
                    <span>{theme.category}</span>
                    <span>·</span>
                    <span>{theme.guidance.lightness}</span>
                    <span>·</span>
                    <span>{theme.source.kind.replace('-', ' ')}</span>
                    {isProjectTheme ? (
                      <>
                        <span>·</span>
                        <span>project</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <SmallActionButton
                  variant={isActive ? 'default' : 'primary'}
                  onClick={() => onApply(theme.id)}
                >
                  {isActive ? 'Active' : 'Apply'}
                </SmallActionButton>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {(['bg', 'panel', 'border', 'primary', 'text'] as const).map((tokenKey) => (
                  <span
                    key={tokenKey}
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: theme.tokens[tokenKey] }}
                    title={`${tokenKey}: ${theme.tokens[tokenKey]}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-hr-muted">{theme.description}</p>
              <div className="mt-2 text-[11px] leading-5 text-hr-muted">
                Source: {theme.source.label}
              </div>
              <div className="text-[11px] leading-5 text-hr-muted">
                Strategy: {theme.importPolicy.strategy} · Branding: {theme.importPolicy.userFacingBranding}
              </div>
              {theme.guidance.bestFor.length > 0 ? (
                <div className="mt-1 text-[11px] leading-5 text-hr-muted">
                  Best for: {theme.guidance.bestFor.join(' / ')}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}

export function ThemeStudioPanel({
  activeTheme,
  isProjectTheme,
  onDuplicateActiveTheme,
  onSaveTheme,
  onDeleteTheme,
  onCreateReferenceTheme,
  onImportThemeText,
}: {
  activeTheme: BuilderThemePreset | null;
  isProjectTheme: boolean;
  onDuplicateActiveTheme: () => void;
  onSaveTheme: (theme: BuilderThemeManifest) => void;
  onDeleteTheme: (themeId: BuilderThemeId) => void;
  onCreateReferenceTheme: (profileId: ThemeReferenceProfileId) => void;
  onImportThemeText: (input: string) => Promise<string>;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImport = async () => {
    if (!importText.trim()) {
      setImportStatus('Paste theme JSON or DESIGN.md content first.');
      return;
    }

    try {
      const importedThemeName = await onImportThemeText(importText);
      setImportStatus(`Imported theme: ${importedThemeName}`);
      setImportText('');
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportText(text);
      setImportStatus(`Loaded file: ${file.name}`);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = '';
    }
  };

  const previewTheme = activeTheme;
  const previewStyle = previewTheme
    ? {
        backgroundColor: previewTheme.tokens.bg,
        color: previewTheme.tokens.text,
        borderColor: previewTheme.tokens.border,
        fontFamily: previewTheme.typography.fontFamily,
        fontSize: `${previewTheme.typography.bodySize}px`,
      }
    : null;

  return (
    <PanelSection
      title="Theme Studio"
      description="Choose a theme first, then edit color, type, and radius inside the shared rules."
    >
      <div className="flex flex-col gap-3">
        <div className="builder-panel-card rounded-xl border border-hr-border bg-hr-panel p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-hr-text">
                {activeTheme?.name ?? 'No active theme'}
              </div>
                <div className="mt-1 text-[11px] text-hr-muted">
                  {activeTheme
                    ? `${activeTheme.source.label} · ${isProjectTheme ? 'Project theme' : 'Built-in theme'}`
                    : 'Select a theme above first'}
                </div>
            </div>
            {!isProjectTheme ? (
              <SmallActionButton variant="primary" onClick={onDuplicateActiveTheme} disabled={!activeTheme}>
                Duplicate to Project
              </SmallActionButton>
            ) : activeTheme ? (
              <SmallActionButton variant="danger" onClick={() => onDeleteTheme(activeTheme.id)}>
                Delete Theme
              </SmallActionButton>
            ) : null}
          </div>

          {!activeTheme ? null : !isProjectTheme ? (
            <div className="mt-3 rounded-lg border border-dashed border-hr-border bg-hr-bg/60 px-3 py-2 text-[11px] leading-5 text-hr-muted">
              Built-in themes stay read-only. Duplicate one into the project library before editing tokens.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Theme Name">
                <input
                  type="text"
                  className={inputClassName}
                  value={activeTheme.name}
                  onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                    name: event.target.value.trim() || activeTheme.name,
                  }))}
                />
              </Field>

              <Field label="Description">
                <textarea
                  className={textareaClassName}
                  value={activeTheme.description}
                  onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                    description: event.target.value.trim() || activeTheme.description,
                  }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Font Family">
                  <input
                    type="text"
                    className={inputClassName}
                    value={activeTheme.typography.fontFamily}
                    onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                      typography: {
                        fontFamily: event.target.value.trim() || activeTheme.typography.fontFamily,
                      },
                    }))}
                  />
                </Field>
                <Field label="Heading Weight">
                  <input
                    type="number"
                    min="400"
                    max="900"
                    step="50"
                    className={inputClassName}
                    value={activeTheme.typography.headingWeight}
                    onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                      typography: {
                        headingWeight: Number(event.target.value) || activeTheme.typography.headingWeight,
                      },
                    }))}
                  />
                </Field>
                <Field label="Body Size">
                  <input
                    type="number"
                    min="12"
                    max="20"
                    className={inputClassName}
                    value={activeTheme.typography.bodySize}
                    onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                      typography: {
                        bodySize: Number(event.target.value) || activeTheme.typography.bodySize,
                      },
                    }))}
                  />
                </Field>
                <Field label="Panel Radius">
                  <input
                    type="number"
                    min="0"
                    max="32"
                    className={inputClassName}
                    value={activeTheme.shape.panelRadius}
                    onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                      shape: {
                        panelRadius: Number(event.target.value) || activeTheme.shape.panelRadius,
                      },
                    }))}
                  />
                </Field>
                <Field label="Control Radius">
                  <input
                    type="number"
                    min="0"
                    max="32"
                    className={inputClassName}
                    value={activeTheme.shape.controlRadius}
                    onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                      shape: {
                        controlRadius: Number(event.target.value) || activeTheme.shape.controlRadius,
                      },
                    }))}
                  />
                </Field>
              </div>

              <Field label="Panel Shadow">
                <input
                  type="text"
                  className={inputClassName}
                  value={activeTheme.shape.panelShadow}
                  onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                    shape: {
                      panelShadow: event.target.value.trim() || activeTheme.shape.panelShadow,
                    },
                  }))}
                />
              </Field>

              <Field label="Panel Hover Shadow">
                <input
                  type="text"
                  className={inputClassName}
                  value={activeTheme.shape.panelHoverShadow}
                  onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                    shape: {
                      panelHoverShadow: event.target.value.trim() || activeTheme.shape.panelHoverShadow,
                    },
                  }))}
                />
              </Field>

              <div className="grid grid-cols-1 gap-3">
                {BUILDER_THEME_TOKEN_KEYS.map((tokenKey: BuilderThemeTokenKey) => (
                  <div key={tokenKey} className="grid grid-cols-[90px,56px,1fr] items-center gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-hr-muted">{tokenKey}</div>
                    <input
                      type="color"
                      className="builder-control h-10 w-14 rounded-md border border-hr-border bg-hr-panel p-1"
                      value={activeTheme.tokens[tokenKey]}
                      onChange={(event) => onSaveTheme(mergeBuilderThemeManifest(activeTheme, {
                        tokens: {
                          [tokenKey]: event.target.value,
                        },
                      }))}
                    />
                    <input
                      type="text"
                      className={inputClassName}
                      value={activeTheme.tokens[tokenKey]}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="builder-panel-card rounded-xl border border-hr-border bg-hr-panel p-3">
          <div className="text-sm font-semibold text-hr-text">Import Theme</div>
          <div className="mt-1 text-[11px] leading-5 text-hr-muted">
            Import a JSON manifest, or a DESIGN.md file with Tokens / Typography / Shape blocks.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.md,.markdown,.txt"
              className="hidden"
              onChange={handleImportFile}
            />
            <SmallActionButton
              variant="default"
              onClick={() => importInputRef.current?.click()}
            >
              Load File
            </SmallActionButton>
            <SmallActionButton variant="primary" onClick={() => { void handleImport(); }}>
              Import as Project Theme
            </SmallActionButton>
          </div>
          <div className="mt-3">
            <textarea
              className={textareaClassName}
              value={importText}
              placeholder={'Paste theme JSON or DESIGN.md here...'}
              onChange={(event) => setImportText(event.target.value)}
            />
          </div>
          {importStatus ? (
            <div className="mt-2 text-[11px] leading-5 text-hr-muted">{importStatus}</div>
          ) : null}
        </div>

        {previewTheme && previewStyle ? (
          <div className="builder-panel-card rounded-xl border border-hr-border bg-hr-panel p-3">
          <div className="text-sm font-semibold text-hr-text">Live Preview</div>
          <div className="mt-1 text-[11px] leading-5 text-hr-muted">
            Preview how the theme affects headings, panels, buttons, and status blocks.
          </div>
            <div
              className="mt-3 rounded-2xl border p-4"
              style={{
                ...previewStyle,
                boxShadow: previewTheme.shape.panelShadow,
                borderRadius: `${previewTheme.shape.panelRadius}px`,
              }}
            >
              <div
                className="text-lg"
                style={{
                  fontWeight: previewTheme.typography.headingWeight,
                }}
              >
                {previewTheme.name}
              </div>
              <div className="mt-1 text-xs" style={{ color: previewTheme.tokens.muted }}>
                {previewTheme.description}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl border p-3"
                  style={{
                    backgroundColor: previewTheme.tokens.panel,
                    borderColor: previewTheme.tokens.border,
                    borderRadius: `${previewTheme.shape.panelRadius}px`,
                  }}
                >
                  <div className="text-[11px]" style={{ color: previewTheme.tokens.muted }}>Panel</div>
                  <div className="mt-1 font-semibold">Primary surface</div>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{
                    backgroundColor: previewTheme.tokens.panel,
                    borderColor: previewTheme.tokens.border,
                    borderRadius: `${previewTheme.shape.panelRadius}px`,
                  }}
                >
                  <div className="text-[11px]" style={{ color: previewTheme.tokens.muted }}>Status</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: previewTheme.tokens.success }} />
                    <span>Healthy</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-sm font-semibold text-white"
                  style={{
                    backgroundColor: previewTheme.tokens.primary,
                    borderRadius: `${previewTheme.shape.controlRadius}px`,
                  }}
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  className="border px-3 py-2 text-sm font-semibold"
                  style={{
                    borderColor: previewTheme.tokens.border,
                    color: previewTheme.tokens.text,
                    borderRadius: `${previewTheme.shape.controlRadius}px`,
                    backgroundColor: previewTheme.tokens.panel,
                  }}
                >
                  Secondary
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="builder-panel-card rounded-xl border border-hr-border bg-hr-panel p-3">
          <div className="text-sm font-semibold text-hr-text">Reference Starters</div>
          <div className="mt-1 text-[11px] leading-5 text-hr-muted">
            These are editable starters derived from public design systems and community DESIGN.md references.
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {THEME_REFERENCE_PROFILES.map((profile) => (
              <div key={profile.id} className="rounded-lg border border-hr-border bg-hr-bg/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-hr-text">{profile.name}</div>
                    <div className="mt-1 text-[11px] text-hr-muted">
                      {profile.source.label} · {profile.source.kind}
                    </div>
                  </div>
                  <SmallActionButton variant="primary" onClick={() => onCreateReferenceTheme(profile.id)}>
                    Create
                  </SmallActionButton>
                </div>
                <div className="mt-2 text-xs leading-5 text-hr-muted">{profile.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

export function RuntimeEnvPanel({
  runtimeEnv,
  onChange,
}: {
  runtimeEnv: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}) {
  const entries = Object.entries(runtimeEnv);

  return (
    <PanelSection
      title="Runtime Env"
      description="Store API base URLs, tokens, and other runtime variables. Request templates can read {{env.KEY}}."
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-hr-muted">{entries.length} key(s)</div>
        <SmallActionButton
          variant="primary"
          onClick={() => onChange({
            ...runtimeEnv,
            [`ENV_${entries.length + 1}`]: '',
          })}
        >
          <Plus size={14} />
          Add Env
        </SmallActionButton>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[1fr,1fr,auto] gap-2">
            <input
              type="text"
              className={inputClassName}
              value={key}
              onChange={(event) => {
                const nextKey = event.target.value;
                const nextEntries = Object.entries(runtimeEnv).map(([entryKey, entryValue]) => (
                  entryKey === key ? [nextKey, entryValue] : [entryKey, entryValue]
                ));
                onChange(Object.fromEntries(nextEntries.filter(([entryKey]) => entryKey.trim())));
              }}
            />
            <input
              type="text"
              className={inputClassName}
              value={value}
              onChange={(event) => onChange({
                ...runtimeEnv,
                [key]: event.target.value,
              })}
            />
            <SmallActionButton
              variant="danger"
              onClick={() => onChange(Object.fromEntries(Object.entries(runtimeEnv).filter(([entryKey]) => entryKey !== key)))}
            >
              <Trash2 size={14} />
            </SmallActionButton>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

export function DataSourcesPanel({
  sources,
  onChange,
}: {
  sources: BuilderDataSource[];
  onChange: (sources: BuilderDataSource[]) => void;
}) {
  const { notify } = useFeedback();
  const updateSource = (id: string, updater: (source: BuilderDataSource) => BuilderDataSource) => {
    onChange(sources.map((source) => (source.id === id ? updater(source) : source)));
  };

  const updateMockSource = (id: string, updater: (source: MockSource) => MockSource) => {
    updateSource(id, (source) => (source.kind === 'mock' ? updater(source) : source));
  };

  const updateRestSource = (id: string, updater: (source: RestSource) => RestSource) => {
    updateSource(id, (source) => (source.kind === 'rest' ? updater(source) : source));
  };

  const removeSource = (id: string) => {
    onChange(sources.filter((source) => source.id !== id));
  };

  return (
    <PanelSection
      title="Data Sources"
      description="Project-level data sources are shared by runtime behavior, bindings, and the AI handoff package."
    >
      <div className="flex flex-wrap gap-2">
        <SmallActionButton onClick={() => onChange([...sources, createBuilderDataSource('mock')])} variant="primary">
          <Plus size={14} />
          Add Mock
        </SmallActionButton>
        <SmallActionButton onClick={() => onChange([...sources, createBuilderDataSource('rest')])}>
          <Plus size={14} />
          Add REST
        </SmallActionButton>
      </div>

      <div className="flex flex-col gap-3">
        {sources.map((source) => {
          const restConfig = source.kind === 'rest' ? source.config : null;
          const restAuth = restConfig?.auth ?? getDefaultRequestAuth();

          return (
          <div key={source.id} className="rounded-lg border border-hr-border bg-hr-panel p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-hr-text">{source.name}</div>
                <div className="text-[11px] font-mono text-hr-muted">{source.id}</div>
              </div>
              <SmallActionButton onClick={() => removeSource(source.id)} variant="danger">
                <Trash2 size={14} />
                Remove
              </SmallActionButton>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Display Name">
                <input
                  type="text"
                  className={inputClassName}
                  value={source.name}
                  onChange={(event) => updateSource(source.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))}
                />
              </Field>

              <Field label="Kind">
                <select
                  className={inputClassName}
                  value={source.kind}
                  onChange={(event) => {
                    const kind = event.target.value as BuilderDataSource['kind'];
                    updateSource(source.id, (current) => DataSourceSchema.parse({
                      ...current,
                      kind,
                      config: getDefaultDataSourceConfig(kind),
                    }));
                  }}
                >
                  <option value="mock">mock</option>
                  <option value="rest">rest</option>
                </select>
              </Field>

              {source.kind === 'mock' ? (
                <Field label="Mock Payload JSON">
                  <textarea
                    key={`${source.id}-payload-${JSON.stringify(source.config?.payload ?? {})}`}
                    defaultValue={JSON.stringify(source.config?.payload ?? {}, null, 2)}
                    className={textareaClassName}
                    onBlur={(event) => {
                      try {
                        const payload = parseJsonText<Record<string, unknown>>(event.target.value, {});
                        updateMockSource(source.id, (current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            payload,
                          },
                        }));
                      } catch (error) {
                        notify({
                          title: 'Invalid mock payload JSON',
                          message: getErrorMessage(error),
                          tone: 'danger',
                          durationMs: 7000,
                        });
                      }
                    }}
                  />
                </Field>
              ) : (
                <>
                  <Field label="URL">
                    <input
                      type="text"
                      className={inputClassName}
                      value={restConfig?.url ?? ''}
                      onChange={(event) => updateRestSource(source.id, (current) => ({
                        ...current,
                        config: mergeRequestConfig(current.config, { url: event.target.value }),
                      }))}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Method">
                      <select
                        className={inputClassName}
                        value={restConfig?.method ?? 'GET'}
                        onChange={(event) => updateRestSource(source.id, (current) => ({
                          ...current,
                          config: mergeRequestConfig(current.config, { method: event.target.value }),
                        }))}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </Field>
                    <Field label="Pick Path">
                      <input
                        type="text"
                        className={inputClassName}
                        value={restConfig?.pick ?? ''}
                        onChange={(event) => updateRestSource(source.id, (current) => ({
                          ...current,
                          config: mergeRequestConfig(current.config, { pick: event.target.value }),
                        }))}
                      />
                    </Field>
                  </div>

                  <Field label="Headers JSON">
                    <textarea
                      key={`${source.id}-headers-${JSON.stringify(restConfig?.headers ?? {})}`}
                      defaultValue={JSON.stringify(restConfig?.headers ?? {}, null, 2)}
                      className={textareaClassName}
                      onBlur={(event) => {
                        try {
                          const headers = parseJsonText<Record<string, string>>(event.target.value, {});
                          updateRestSource(source.id, (current) => ({
                            ...current,
                            config: mergeRequestConfig(current.config, { headers }),
                          }));
                        } catch (error) {
                          notify({
                            title: 'Invalid headers JSON',
                            message: getErrorMessage(error),
                            tone: 'danger',
                            durationMs: 7000,
                          });
                        }
                      }}
                    />
                  </Field>

                  <Field label="Query JSON">
                    <textarea
                      key={`${source.id}-query-${JSON.stringify(restConfig?.query ?? {})}`}
                      defaultValue={JSON.stringify(restConfig?.query ?? {}, null, 2)}
                      className={textareaClassName}
                      onBlur={(event) => {
                        try {
                          const query = parseJsonText<Record<string, unknown>>(event.target.value, {});
                          updateRestSource(source.id, (current) => ({
                            ...current,
                            config: mergeRequestConfig(current.config, { query }),
                          }));
                        } catch (error) {
                          notify({
                            title: 'Invalid query JSON',
                            message: getErrorMessage(error),
                            tone: 'danger',
                            durationMs: 7000,
                          });
                        }
                      }}
                    />
                  </Field>

                  <Field label="Body JSON">
                    <textarea
                      key={`${source.id}-body-${JSON.stringify(restConfig?.body ?? {})}`}
                      defaultValue={JSON.stringify(restConfig?.body ?? {}, null, 2)}
                      className={textareaClassName}
                      onBlur={(event) => {
                        try {
                          const body = parseJsonText<Record<string, unknown>>(event.target.value, {});
                          updateRestSource(source.id, (current) => ({
                            ...current,
                            config: mergeRequestConfig(current.config, { body }),
                          }));
                        } catch (error) {
                          notify({
                            title: 'Invalid body JSON',
                            message: getErrorMessage(error),
                            tone: 'danger',
                            durationMs: 7000,
                          });
                        }
                      }}
                    />
                  </Field>

                  <div className="rounded-lg border border-hr-border bg-hr-bg/40 p-3">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-hr-text">Auth</div>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Mode">
                        <select
                          className={inputClassName}
                          value={restAuth.mode}
                          onChange={(event) => updateRestSource(source.id, (current) => ({
                            ...current,
                            config: mergeRequestConfig(current.config, {
                              auth: { mode: parseRequestAuthMode(event.target.value) },
                            }),
                          }))}
                        >
                          <option value="none">none</option>
                          <option value="bearer">bearer</option>
                          <option value="api-key">api-key</option>
                        </select>
                      </Field>

                      {restAuth.mode !== 'none' ? (
                        <>
                          <Field label="Token Template">
                            <input
                              type="text"
                              className={inputClassName}
                              value={restAuth.tokenTemplate}
                              onChange={(event) => updateRestSource(source.id, (current) => ({
                                ...current,
                                config: mergeRequestConfig(current.config, {
                                  auth: { tokenTemplate: event.target.value },
                                }),
                              }))}
                            />
                          </Field>

                          {restAuth.mode === 'api-key' ? (
                            <Field label="Placement">
                              <select
                                className={inputClassName}
                                value={restAuth.placement}
                                onChange={(event) => updateRestSource(source.id, (current) => ({
                                  ...current,
                                  config: mergeRequestConfig(current.config, {
                                    auth: { placement: parseAuthPlacement(event.target.value) },
                                  }),
                                }))}
                              >
                                <option value="header">header</option>
                                <option value="query">query</option>
                              </select>
                            </Field>
                          ) : null}

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Header Name">
                              <input
                                type="text"
                                className={inputClassName}
                                value={restAuth.headerName}
                                onChange={(event) => updateRestSource(source.id, (current) => ({
                                  ...current,
                                  config: mergeRequestConfig(current.config, {
                                    auth: { headerName: event.target.value },
                                  }),
                                }))}
                              />
                            </Field>
                            <Field label="Query Name">
                              <input
                                type="text"
                                className={inputClassName}
                                value={restAuth.queryName}
                                onChange={(event) => updateRestSource(source.id, (current) => ({
                                  ...current,
                                  config: mergeRequestConfig(current.config, {
                                    auth: { queryName: event.target.value },
                                  }),
                                }))}
                              />
                            </Field>
                          </div>

                          {restAuth.mode === 'bearer' ? (
                            <Field label="Bearer Prefix">
                              <input
                                type="text"
                                className={inputClassName}
                                value={restAuth.prefix}
                                onChange={(event) => updateRestSource(source.id, (current) => ({
                                  ...current,
                                  config: mergeRequestConfig(current.config, {
                                    auth: { prefix: event.target.value },
                                  }),
                                }))}
                              />
                            </Field>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <Field label="Timeout (ms)">
                    <input
                      type="number"
                      min="1000"
                      className={inputClassName}
                      value={restConfig?.timeoutMs ?? 15000}
                      onChange={(event) => updateRestSource(source.id, (current) => ({
                        ...current,
                        config: mergeRequestConfig(current.config, {
                          timeoutMs: Number(event.target.value) || 15000,
                        }),
                      }))}
                    />
                  </Field>
                </>
              )}
            </div>
          </div>
        )})}
      </div>
    </PanelSection>
  );
}

export function BindingsPanel({
  bindings,
  sourceOptions,
  compact = false,
  onChange,
}: {
  bindings: DataBinding[];
  sourceOptions: SourceOption[];
  compact?: boolean;
  onChange: (bindings: DataBinding[]) => void;
}) {
  const updateBinding = (id: string, updater: (binding: DataBinding) => DataBinding) => {
    onChange(bindings.map((binding) => (binding.id === id ? updater(binding) : binding)));
  };

  return (
    <PanelSection
      title="Bindings"
      description="Bind component fields to project data sources. AI reproduces the same wiring from target props and paths."
      compact={compact}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-hr-muted">{bindings.length} binding(s)</div>
        <SmallActionButton
          variant="primary"
          disabled={sourceOptions.length === 0}
          onClick={() => onChange([...bindings, createBindingDraft(sourceOptions[0]?.value ?? '')])}
        >
          <Plus size={14} />
          Add Binding
        </SmallActionButton>
      </div>

      <div className="flex flex-col gap-3">
        {bindings.map((binding) => (
          <div key={binding.id} className={inspectorItemClassName}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-hr-muted">{binding.id}</div>
              <SmallActionButton
                onClick={() => onChange(bindings.filter((item) => item.id !== binding.id))}
                variant="danger"
              >
                <Trash2 size={14} />
                Remove
              </SmallActionButton>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Target Prop">
                <input
                  type="text"
                  className={inputClassName}
                  value={typeof binding.meta?.prop === 'string' ? binding.meta.prop : ''}
                  onChange={(event) => updateBinding(binding.id, (current) => ({
                    ...current,
                    meta: {
                      ...current.meta,
                      prop: event.target.value,
                    },
                  }))}
                />
              </Field>

              <Field label="Source">
                <select
                  className={inputClassName}
                  value={binding.sourceKey}
                  onChange={(event) => updateBinding(binding.id, (current) => ({
                    ...current,
                    sourceKey: event.target.value,
                  }))}
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Data Path">
                <input
                  type="text"
                  className={inputClassName}
                  value={binding.path}
                  onChange={(event) => updateBinding(binding.id, (current) => ({
                    ...current,
                    path: event.target.value,
                  }))}
                />
              </Field>

              <Field label="Fallback Value">
                <textarea
                  key={`${binding.id}-fallback-${stringifyLooseValue(binding.fallback)}`}
                  defaultValue={stringifyLooseValue(binding.fallback)}
                  className={textareaClassName}
                  onBlur={(event) => updateBinding(binding.id, (current) => ({
                    ...current,
                    fallback: parseLooseValue(event.target.value),
                  }))}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

export function ActionsPanel({
  actions,
  sourceOptions,
  pages = [],
  currentPageId = null,
  onCreateTargetPage,
  compact = false,
  onChange,
}: {
  actions: NodeAction[];
  sourceOptions: SourceOption[];
  pages?: BuilderPage[];
  currentPageId?: string | null;
  onCreateTargetPage?: (kind: BuilderPage['kind']) => BuilderPage | null;
  compact?: boolean;
  onChange: (actions: NodeAction[]) => void;
}) {
  const { notify } = useFeedback();
  const currentPage = currentPageId
    ? pages.find((page) => page.id === currentPageId) ?? null
    : null;
  const projectPageTargets = pages.filter((page) => page.kind === 'page' && page.id !== currentPageId);
  const projectOverlayTargets = pages.filter((page) => {
    if (page.kind !== 'overlay') return false;
    if (!currentPage) return true;
    if (currentPage.kind === 'page') return page.ownerPageId === currentPage.id;
    return page.ownerPageId === currentPage.ownerPageId && page.id !== currentPage.id;
  });

  const withSelectedTarget = (targets: BuilderPage[], targetPageId: string) => {
    if (!targetPageId || targets.some((page) => page.id === targetPageId)) {
      return targets;
    }
    const selectedTarget = pages.find((page) => page.id === targetPageId);
    return selectedTarget ? [...targets, selectedTarget] : targets;
  };

  const updateAction = (id: string, updater: (action: NodeAction) => NodeAction) => {
    onChange(actions.map((action) => (action.id === id ? updater(action) : action)));
  };

  const updateRequestActionConfig = (id: string, patch: RequestActionConfigPatch) => {
    updateAction(id, (action) => (
      action.type !== 'request'
        ? action
        : {
            ...action,
            config: mergeRequestActionConfig(action.config, patch),
          }
    ));
  };

  const updateNavigateActionConfig = (id: string, patch: Parameters<typeof mergeNavigateActionConfig>[1]) => {
    updateAction(id, (action) => (
      action.type !== 'navigate'
        ? action
        : {
            ...action,
            config: mergeNavigateActionConfig(action.config, patch),
          }
    ));
  };

  const updateOpenModalActionConfig = (id: string, patch: Parameters<typeof mergeOpenModalActionConfig>[1]) => {
    updateAction(id, (action) => (
      action.type !== 'open-modal'
        ? action
        : {
            ...action,
            config: mergeOpenModalActionConfig(action.config, patch),
          }
    ));
  };

  const createLinkedTarget = (action: NodeAction, kind: BuilderPage['kind']) => {
    const createdPage = onCreateTargetPage?.(kind);
    if (!createdPage) return;

    if (action.type === 'navigate') {
      updateNavigateActionConfig(action.id, {
        destinationType: 'project-page',
        targetPageId: createdPage.id,
        href: createdPage.route,
        target: '_self',
      });
      return;
    }

    if (action.type === 'open-modal') {
      updateOpenModalActionConfig(action.id, {
        modalType: 'project-overlay',
        targetPageId: createdPage.id,
        title: createdPage.name,
      });
    }
  };

  return (
    <PanelSection
      title="Actions"
      description="Actions map directly to runtime behavior and AI integration tasks."
      compact={compact}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-hr-muted">{actions.length} action(s)</div>
        <SmallActionButton variant="primary" onClick={() => onChange([...actions, createActionDraft()])}>
          <Plus size={14} />
          Add Action
        </SmallActionButton>
      </div>

      <div className="flex flex-col gap-3">
        {actions.map((action) => {
          const requestConfig = action.type === 'request' ? getRequestActionConfig(action.config) : null;
          const navigateConfig = action.type === 'navigate' ? getNavigateActionConfig(action.config) : null;
          const modalConfig = action.type === 'open-modal' ? getOpenModalActionConfig(action.config) : null;
          const refreshValue = Array.isArray(action.config?.sourceKeys)
            ? action.config.sourceKeys.filter((item): item is string => typeof item === 'string').join(', ')
            : '';
          const isInlineRequest = action.type === 'request' ? !requestConfig?.sourceKey : false;
          const navigateTargets = withSelectedTarget(projectPageTargets, navigateConfig?.targetPageId ?? '');
          const overlayTargets = withSelectedTarget(projectOverlayTargets, modalConfig?.targetPageId ?? '');

          return (
            <div key={action.id} className={inspectorItemClassName}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-hr-muted">{action.id}</div>
                <SmallActionButton
                  onClick={() => onChange(actions.filter((item) => item.id !== action.id))}
                  variant="danger"
                >
                  <Trash2 size={14} />
                  Remove
                </SmallActionButton>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Field label="Label">
                  <input
                    type="text"
                    className={inputClassName}
                    value={action.label ?? ''}
                    onChange={(event) => updateAction(action.id, (current) => ({
                      ...current,
                      label: event.target.value,
                    }))}
                  />
                </Field>

                <Field label="Type">
                  <select
                    className={inputClassName}
                    value={action.type}
                    onChange={(event) => updateAction(action.id, (current) => replaceActionType(current, event.target.value as NodeAction['type']))}
                  >
                    <option value="navigate">navigate</option>
                    <option value="request">request</option>
                    <option value="refresh">refresh</option>
                    <option value="open-modal">open-modal</option>
                    <option value="set-state">set-state</option>
                    <option value="custom">custom</option>
                  </select>
                </Field>

                {action.type === 'navigate' ? (
                  <>
                    <Field label="Destination">
                      <select
                        name={`${action.id}-destinationType`}
                        className={inputClassName}
                        value={navigateConfig?.destinationType ?? 'url'}
                        onChange={(event) => updateNavigateActionConfig(action.id, {
                          destinationType: event.target.value === 'project-page' ? 'project-page' : 'url',
                        })}
                      >
                        <option value="url">External URL</option>
                        <option value="project-page">Project page</option>
                      </select>
                    </Field>

                    {navigateConfig?.destinationType === 'project-page' ? (
                      <>
                        <Field label="Target Page">
                          <select
                            name={`${action.id}-targetPageId`}
                            className={inputClassName}
                            value={navigateConfig.targetPageId}
                            onChange={(event) => {
                              const targetPage = pages.find((page) => page.id === event.target.value);
                              updateNavigateActionConfig(action.id, {
                                destinationType: 'project-page',
                                targetPageId: targetPage?.id ?? '',
                                href: targetPage?.route ?? '',
                                target: '_self',
                              });
                            }}
                          >
                            <option value="">Choose page…</option>
                            {navigateTargets.map((page) => (
                              <option key={page.id} value={page.id}>
                                {page.name} · {page.route}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <SmallActionButton
                          variant="primary"
                          disabled={!onCreateTargetPage}
                          onClick={() => createLinkedTarget(action, 'page')}
                        >
                          <Plus size={14} />
                          New Page Target
                        </SmallActionButton>
                      </>
                    ) : (
                      <>
                        <Field label="Href">
                          <input
                            type="text"
                            name={`${action.id}-href`}
                            className={inputClassName}
                            value={navigateConfig?.href ?? ''}
                            onChange={(event) => updateNavigateActionConfig(action.id, {
                              href: event.target.value,
                            })}
                          />
                        </Field>
                        <Field label="Target">
                          <select
                            name={`${action.id}-target`}
                            className={inputClassName}
                            value={navigateConfig?.target ?? '_self'}
                            onChange={(event) => updateNavigateActionConfig(action.id, {
                              target: event.target.value,
                            })}
                          >
                            <option value="_self">_self</option>
                            <option value="_blank">_blank</option>
                          </select>
                        </Field>
                      </>
                    )}
                  </>
                ) : null}

                {action.type === 'request' ? (
                  <>
                    <Field label="Use Existing Data Source">
                      <select
                        className={inputClassName}
                        value={requestConfig?.sourceKey ?? ''}
                        onChange={(event) => updateRequestActionConfig(action.id, { sourceKey: event.target.value })}
                      >
                        <option value="">Inline request</option>
                        {sourceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Result Key">
                      <input
                        type="text"
                        className={inputClassName}
                        value={requestConfig?.resultKey ?? ''}
                        onChange={(event) => updateRequestActionConfig(action.id, { resultKey: event.target.value })}
                      />
                    </Field>

                    {isInlineRequest ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Method">
                            <select
                              className={inputClassName}
                              value={requestConfig?.method ?? 'GET'}
                              onChange={(event) => updateRequestActionConfig(action.id, { method: event.target.value })}
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                              <option value="DELETE">DELETE</option>
                            </select>
                          </Field>
                          <Field label="Pick Path">
                            <input
                              type="text"
                              className={inputClassName}
                              value={requestConfig?.pick ?? ''}
                              onChange={(event) => updateRequestActionConfig(action.id, { pick: event.target.value })}
                            />
                          </Field>
                        </div>
                        <Field label="URL">
                          <input
                            type="text"
                            className={inputClassName}
                            value={requestConfig?.url ?? ''}
                            onChange={(event) => updateRequestActionConfig(action.id, { url: event.target.value })}
                          />
                        </Field>
                        <Field label="Headers JSON">
                          <textarea
                            key={`${action.id}-headers-${JSON.stringify(requestConfig?.headers ?? {})}`}
                            defaultValue={JSON.stringify(requestConfig?.headers ?? {}, null, 2)}
                            className={textareaClassName}
                            onBlur={(event) => {
                              try {
                                const headers = parseJsonText<Record<string, string>>(event.target.value, {});
                                updateRequestActionConfig(action.id, { headers });
                              } catch (error) {
                                notify({
                                  title: 'Invalid request headers JSON',
                                  message: getErrorMessage(error),
                                  tone: 'danger',
                                  durationMs: 7000,
                                });
                              }
                            }}
                          />
                        </Field>
                        <Field label="Query JSON">
                          <textarea
                            key={`${action.id}-query-${JSON.stringify(requestConfig?.query ?? {})}`}
                            defaultValue={JSON.stringify(requestConfig?.query ?? {}, null, 2)}
                            className={textareaClassName}
                            onBlur={(event) => {
                              try {
                                const query = parseJsonText<Record<string, unknown>>(event.target.value, {});
                                updateRequestActionConfig(action.id, { query });
                              } catch (error) {
                                notify({
                                  title: 'Invalid request query JSON',
                                  message: getErrorMessage(error),
                                  tone: 'danger',
                                  durationMs: 7000,
                                });
                              }
                            }}
                          />
                        </Field>
                        <Field label="Body JSON">
                          <textarea
                            key={`${action.id}-body-${JSON.stringify(requestConfig?.body ?? {})}`}
                            defaultValue={JSON.stringify(requestConfig?.body ?? {}, null, 2)}
                            className={textareaClassName}
                            onBlur={(event) => {
                              try {
                                const body = parseJsonText<Record<string, unknown>>(event.target.value, {});
                                updateRequestActionConfig(action.id, { body });
                              } catch (error) {
                                notify({
                                  title: 'Invalid request body JSON',
                                  message: getErrorMessage(error),
                                  tone: 'danger',
                                  durationMs: 7000,
                                });
                              }
                            }}
                          />
                        </Field>

                        <div className="rounded-lg border border-hr-border bg-hr-bg/40 p-3">
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-hr-text">Auth</div>
                          <div className="grid grid-cols-1 gap-3">
                            <Field label="Mode">
                              <select
                                className={inputClassName}
                                value={requestConfig?.auth.mode ?? 'none'}
                                onChange={(event) => updateRequestActionConfig(action.id, {
                                  auth: { mode: parseRequestAuthMode(event.target.value) },
                                })}
                              >
                                <option value="none">none</option>
                                <option value="bearer">bearer</option>
                                <option value="api-key">api-key</option>
                              </select>
                            </Field>

                            {requestConfig?.auth.mode !== 'none' ? (
                              <>
                                <Field label="Token Template">
                                  <input
                                    type="text"
                                    className={inputClassName}
                                    value={requestConfig?.auth.tokenTemplate ?? ''}
                                    onChange={(event) => updateRequestActionConfig(action.id, {
                                      auth: { tokenTemplate: event.target.value },
                                    })}
                                  />
                                </Field>

                                {requestConfig?.auth.mode === 'api-key' ? (
                                  <Field label="Placement">
                                    <select
                                      className={inputClassName}
                                      value={requestConfig?.auth.placement ?? 'header'}
                                      onChange={(event) => updateRequestActionConfig(action.id, {
                                        auth: { placement: parseAuthPlacement(event.target.value) },
                                      })}
                                    >
                                      <option value="header">header</option>
                                      <option value="query">query</option>
                                    </select>
                                  </Field>
                                ) : null}

                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Header Name">
                                    <input
                                      type="text"
                                      className={inputClassName}
                                      value={requestConfig?.auth.headerName ?? 'Authorization'}
                                      onChange={(event) => updateRequestActionConfig(action.id, {
                                        auth: { headerName: event.target.value },
                                      })}
                                    />
                                  </Field>
                                  <Field label="Query Name">
                                    <input
                                      type="text"
                                      className={inputClassName}
                                      value={requestConfig?.auth.queryName ?? 'api_key'}
                                      onChange={(event) => updateRequestActionConfig(action.id, {
                                        auth: { queryName: event.target.value },
                                      })}
                                    />
                                  </Field>
                                </div>

                                {requestConfig?.auth.mode === 'bearer' ? (
                                  <Field label="Bearer Prefix">
                                    <input
                                      type="text"
                                      className={inputClassName}
                                      value={requestConfig?.auth.prefix ?? 'Bearer '}
                                      onChange={(event) => updateRequestActionConfig(action.id, {
                                        auth: { prefix: event.target.value },
                                      })}
                                    />
                                  </Field>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>

                        <Field label="Timeout (ms)">
                          <input
                            type="number"
                            min="1000"
                            className={inputClassName}
                            value={requestConfig?.timeoutMs ?? 15000}
                            onChange={(event) => updateRequestActionConfig(action.id, {
                              timeoutMs: Number(event.target.value) || 15000,
                            })}
                          />
                        </Field>
                      </>
                    ) : null}
                  </>
                ) : null}

                {action.type === 'refresh' ? (
                  <Field label="Source Keys (comma separated)">
                    <input
                      type="text"
                      className={inputClassName}
                      value={refreshValue}
                      onChange={(event) => updateAction(action.id, (current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          sourceKeys: event.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      }))}
                    />
                  </Field>
                ) : null}

                {action.type === 'open-modal' ? (
                  <>
                    <Field label="Modal Type">
                      <select
                        name={`${action.id}-modalType`}
                        className={inputClassName}
                        value={modalConfig?.modalType ?? 'runtime-modal'}
                        onChange={(event) => updateOpenModalActionConfig(action.id, {
                          modalType: event.target.value === 'project-overlay' ? 'project-overlay' : 'runtime-modal',
                        })}
                      >
                        <option value="runtime-modal">Runtime modal</option>
                        <option value="project-overlay">Project overlay</option>
                      </select>
                    </Field>

                    {modalConfig?.modalType === 'project-overlay' ? (
                      <>
                        <Field label="Target Overlay">
                          <select
                            name={`${action.id}-targetOverlayId`}
                            className={inputClassName}
                            value={modalConfig.targetPageId}
                            onChange={(event) => {
                              const targetPage = pages.find((page) => page.id === event.target.value);
                              updateOpenModalActionConfig(action.id, {
                                modalType: 'project-overlay',
                                targetPageId: targetPage?.id ?? '',
                                title: targetPage?.name ?? modalConfig.title,
                              });
                            }}
                          >
                            <option value="">Choose overlay…</option>
                            {overlayTargets.map((page) => (
                              <option key={page.id} value={page.id}>
                                {page.name} · {page.route}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <SmallActionButton
                          variant="primary"
                          disabled={!onCreateTargetPage}
                          onClick={() => createLinkedTarget(action, 'overlay')}
                        >
                          <Plus size={14} />
                          New Overlay Target
                        </SmallActionButton>
                      </>
                    ) : (
                      <>
                        <Field label="Modal Title">
                          <input
                            type="text"
                            name={`${action.id}-modalTitle`}
                            className={inputClassName}
                            value={modalConfig?.title ?? ''}
                            onChange={(event) => updateOpenModalActionConfig(action.id, {
                              title: event.target.value,
                            })}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            name={`${action.id}-modalDescription`}
                            className={textareaClassName}
                            value={modalConfig?.description ?? ''}
                            onChange={(event) => updateOpenModalActionConfig(action.id, {
                              description: event.target.value,
                            })}
                          />
                        </Field>
                      </>
                    )}
                  </>
                ) : null}

                {action.type === 'set-state' ? (
                  <>
                    <Field label="State Key">
                      <input
                        type="text"
                        className={inputClassName}
                        value={String(action.config?.key ?? '')}
                        onChange={(event) => updateAction(action.id, (current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            key: event.target.value,
                          },
                        }))}
                      />
                    </Field>
                    <Field label="State Value">
                      <textarea
                        key={`${action.id}-value-${stringifyLooseValue(action.config?.value)}`}
                        defaultValue={stringifyLooseValue(action.config?.value)}
                        className={textareaClassName}
                        onBlur={(event) => updateAction(action.id, (current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            value: parseLooseValue(event.target.value),
                          },
                        }))}
                      />
                    </Field>
                  </>
                ) : null}

                {action.type === 'custom' ? (
                  <Field label="Custom Config JSON">
                    <textarea
                      key={`${action.id}-custom-${JSON.stringify(action.config ?? {})}`}
                      defaultValue={JSON.stringify(action.config ?? {}, null, 2)}
                      className={textareaClassName}
                      onBlur={(event) => {
                        try {
                          const config = parseJsonText<Record<string, unknown>>(event.target.value, {});
                          updateAction(action.id, (current) => ({
                            ...current,
                            config,
                          }));
                        } catch (error) {
                          notify({
                            title: 'Invalid custom config JSON',
                            message: getErrorMessage(error),
                            tone: 'danger',
                            durationMs: 7000,
                          });
                        }
                      }}
                    />
                  </Field>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}

export function HandoffSummaryPanel({
  handoff,
  error,
  onExport,
}: {
  handoff: AiHandoffPackage | null;
  error: string | null;
  onExport: () => void;
}) {
  if (error) {
    return (
      <PanelSection title="AI Handoff" description="The handoff package exports only when the current project document is valid.">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      </PanelSection>
    );
  }

  if (!handoff) return null;

  return (
    <PanelSection
      title="AI Handoff"
      description="The export includes page protocol, component summaries, bindings, actions, and integration tasks."
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Pages</div>
          <div className="mt-1 font-semibold text-hr-text">{handoff.summary.pageCount}</div>
        </div>
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Components</div>
          <div className="mt-1 font-semibold text-hr-text">{handoff.summary.componentCount}</div>
        </div>
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Bindings</div>
          <div className="mt-1 font-semibold text-hr-text">{handoff.summary.bindingsCount}</div>
        </div>
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Actions</div>
          <div className="mt-1 font-semibold text-hr-text">{handoff.summary.actionsCount}</div>
        </div>
      </div>

      <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2 text-xs text-hr-muted">
        <div className="mb-1 flex items-center gap-1.5 text-hr-text">
          <DatabaseZap size={14} />
          Data sources: {handoff.summary.dataSourceCount}
        </div>
        <div className="flex items-center gap-1.5 text-hr-text">
          <Bot size={14} />
          Runtime behaviors: {handoff.integrationNeeds.runtimeBehaviors.join(', ') || 'none'}
        </div>
      </div>

      <SmallActionButton onClick={onExport} variant="primary">
        <Bot size={14} />
        Export AI Handoff
      </SmallActionButton>
    </PanelSection>
  );
}
