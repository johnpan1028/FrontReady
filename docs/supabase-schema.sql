create table if not exists public.builder_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  viewer_name text,
  viewer_email text,
  active_workspace_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.builder_workspaces (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  kind text not null default 'local',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_opened_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, id)
);

create table if not exists public.builder_projects (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  workspace_id text not null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_opened_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, id),
  constraint builder_projects_workspace_fkey
    foreign key (owner_id, workspace_id)
    references public.builder_workspaces (owner_id, id)
    on delete cascade
);

create table if not exists public.builder_project_drafts (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  name text not null,
  document jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, id),
  constraint builder_project_drafts_project_fkey
    foreign key (owner_id, project_id)
    references public.builder_projects (owner_id, id)
    on delete cascade,
  constraint builder_project_drafts_project_unique
    unique (owner_id, project_id)
);

create table if not exists public.builder_project_snapshots (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  project_id text not null,
  name text not null,
  reason text not null,
  document jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  version_number integer not null,
  primary key (owner_id, id),
  constraint builder_project_snapshots_project_fkey
    foreign key (owner_id, project_id)
    references public.builder_projects (owner_id, id)
    on delete cascade,
  constraint builder_project_snapshots_version_unique
    unique (owner_id, project_id, version_number)
);

create table if not exists public.builder_workspace_state (
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id text not null,
  active_project_id text,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, workspace_id),
  constraint builder_workspace_state_workspace_fkey
    foreign key (owner_id, workspace_id)
    references public.builder_workspaces (owner_id, id)
    on delete cascade
);

create index if not exists builder_workspaces_owner_recent_idx
  on public.builder_workspaces (owner_id, last_opened_at desc);

create index if not exists builder_projects_owner_workspace_recent_idx
  on public.builder_projects (owner_id, workspace_id, updated_at desc);

create index if not exists builder_projects_owner_recent_idx
  on public.builder_projects (owner_id, last_opened_at desc);

create index if not exists builder_drafts_owner_updated_idx
  on public.builder_project_drafts (owner_id, updated_at desc);

create index if not exists builder_snapshots_owner_project_idx
  on public.builder_project_snapshots (owner_id, project_id, created_at desc);

alter table public.builder_profiles enable row level security;
alter table public.builder_workspaces enable row level security;
alter table public.builder_projects enable row level security;
alter table public.builder_project_drafts enable row level security;
alter table public.builder_project_snapshots enable row level security;
alter table public.builder_workspace_state enable row level security;

drop policy if exists "builder_profiles_own_rows" on public.builder_profiles;
create policy "builder_profiles_own_rows"
  on public.builder_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "builder_workspaces_own_rows" on public.builder_workspaces;
create policy "builder_workspaces_own_rows"
  on public.builder_workspaces
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "builder_projects_own_rows" on public.builder_projects;
create policy "builder_projects_own_rows"
  on public.builder_projects
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "builder_project_drafts_own_rows" on public.builder_project_drafts;
create policy "builder_project_drafts_own_rows"
  on public.builder_project_drafts
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "builder_project_snapshots_own_rows" on public.builder_project_snapshots;
create policy "builder_project_snapshots_own_rows"
  on public.builder_project_snapshots
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "builder_workspace_state_own_rows" on public.builder_workspace_state;
create policy "builder_workspace_state_own_rows"
  on public.builder_workspace_state
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
