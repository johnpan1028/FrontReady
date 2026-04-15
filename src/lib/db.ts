import Dexie, { type EntityTable } from 'dexie';
import { nanoid } from 'nanoid';
import type { ProjectDocument } from '../schema/project';

export const LOCAL_WORKSPACE_ID = 'local-workspace';
export const LOCAL_WORKSPACE_NAME = 'Local Workspace';
export const LOCAL_OWNER_ID = 'local-user';

const LEGACY_ACTIVE_PROJECT_META_KEY = 'active-project-id';
const ACTIVE_WORKSPACE_META_KEY = 'active-workspace-id';

const getActiveProjectMetaKey = (workspaceId: string) => `${LEGACY_ACTIVE_PROJECT_META_KEY}:${workspaceId}`;

export const createWorkspaceId = () => `workspace_${nanoid(10)}`;

export type WorkspaceRecord = {
  id: string;
  ownerId: string;
  name: string;
  kind: 'local';
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
};

export type ProjectDraftRecord = {
  id: string;
  projectId: string;
  name: string;
  document: ProjectDocument;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSnapshotRecord = {
  id: string;
  projectId: string;
  name: string;
  reason: string;
  document: ProjectDocument;
  createdAt: string;
  versionNumber?: number;
};

export type ProjectIndexRecord = {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
};

export type BuilderMetaRecord = {
  key: string;
  value: string;
};

class BuilderDatabase extends Dexie {
  drafts!: EntityTable<ProjectDraftRecord, 'id'>;
  snapshots!: EntityTable<ProjectSnapshotRecord, 'id'>;
  projects!: EntityTable<ProjectIndexRecord, 'id'>;
  workspaces!: EntityTable<WorkspaceRecord, 'id'>;
  meta!: EntityTable<BuilderMetaRecord, 'key'>;

  constructor() {
    super('frontend-experience-orchestrator-db');
    this.version(1).stores({
      drafts: 'id, projectId, updatedAt',
      snapshots: 'id, projectId, createdAt',
    });
    this.version(2).stores({
      drafts: 'id, projectId, updatedAt',
      snapshots: 'id, projectId, createdAt',
      projects: 'id, workspaceId, updatedAt, lastOpenedAt',
      meta: 'key',
    }).upgrade(async (tx) => {
      const draftRecords = await tx.table('drafts').toArray() as ProjectDraftRecord[];
      const projectsTable = tx.table('projects');
      const metaTable = tx.table('meta');

      for (const draft of draftRecords) {
        await projectsTable.put({
          id: draft.projectId,
          workspaceId: LOCAL_WORKSPACE_ID,
          ownerId: LOCAL_OWNER_ID,
          name: draft.name,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
          lastOpenedAt: draft.updatedAt,
        } satisfies ProjectIndexRecord);
      }

      const latestDraft = [...draftRecords].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      if (latestDraft) {
        await metaTable.put({
          key: LEGACY_ACTIVE_PROJECT_META_KEY,
          value: latestDraft.projectId,
        } satisfies BuilderMetaRecord);
      }
    });
    this.version(3).stores({
      drafts: 'id, projectId, updatedAt',
      snapshots: 'id, projectId, createdAt',
      projects: 'id, workspaceId, updatedAt, lastOpenedAt',
      workspaces: 'id, ownerId, updatedAt, lastOpenedAt',
      meta: 'key',
    }).upgrade(async (tx) => {
      const projectsTable = tx.table('projects');
      const workspacesTable = tx.table('workspaces');
      const metaTable = tx.table('meta');
      const now = new Date().toISOString();

      const projectRecords = await projectsTable.toArray() as ProjectIndexRecord[];
      const workspaceIds = new Set<string>();

      for (const project of projectRecords) {
        const workspaceId = project.workspaceId || LOCAL_WORKSPACE_ID;
        workspaceIds.add(workspaceId);

        await projectsTable.put({
          ...project,
          workspaceId,
          ownerId: project.ownerId || LOCAL_OWNER_ID,
        } satisfies ProjectIndexRecord);
      }

      if (workspaceIds.size === 0) {
        workspaceIds.add(LOCAL_WORKSPACE_ID);
      }

      for (const workspaceId of workspaceIds) {
        const existingWorkspace = await workspacesTable.get(workspaceId) as WorkspaceRecord | undefined;
        const latestWorkspaceProject = projectRecords
          .filter((project) => (project.workspaceId || LOCAL_WORKSPACE_ID) === workspaceId)
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

        await workspacesTable.put({
          id: workspaceId,
          ownerId: latestWorkspaceProject?.ownerId || existingWorkspace?.ownerId || LOCAL_OWNER_ID,
          name: existingWorkspace?.name || (workspaceId === LOCAL_WORKSPACE_ID ? LOCAL_WORKSPACE_NAME : 'Workspace'),
          kind: 'local',
          createdAt: existingWorkspace?.createdAt || latestWorkspaceProject?.createdAt || now,
          updatedAt: latestWorkspaceProject?.updatedAt || existingWorkspace?.updatedAt || now,
          lastOpenedAt: latestWorkspaceProject?.lastOpenedAt || existingWorkspace?.lastOpenedAt || now,
        } satisfies WorkspaceRecord);
      }

      const activeWorkspaceMeta = await metaTable.get(ACTIVE_WORKSPACE_META_KEY) as BuilderMetaRecord | undefined;
      if (!activeWorkspaceMeta) {
        await metaTable.put({
          key: ACTIVE_WORKSPACE_META_KEY,
          value: LOCAL_WORKSPACE_ID,
        } satisfies BuilderMetaRecord);
      }

      const legacyActiveProjectMeta = await metaTable.get(LEGACY_ACTIVE_PROJECT_META_KEY) as BuilderMetaRecord | undefined;
      if (legacyActiveProjectMeta?.value) {
        await metaTable.put({
          key: getActiveProjectMetaKey(LOCAL_WORKSPACE_ID),
          value: legacyActiveProjectMeta.value,
        } satisfies BuilderMetaRecord);
      }
    });
  }
}

export const builderDb = new BuilderDatabase();

const buildWorkspaceRecord = (
  record: WorkspaceRecord,
  existing?: WorkspaceRecord,
): WorkspaceRecord => ({
  id: record.id,
  ownerId: existing?.ownerId ?? record.ownerId ?? LOCAL_OWNER_ID,
  name: record.name,
  kind: 'local',
  createdAt: existing?.createdAt ?? record.createdAt,
  updatedAt: record.updatedAt,
  lastOpenedAt: record.lastOpenedAt,
});

const buildProjectIndexRecord = (
  record: ProjectDraftRecord,
  existing?: ProjectIndexRecord,
  overrides?: { workspaceId?: string; ownerId?: string },
): ProjectIndexRecord => ({
  id: record.projectId,
  workspaceId: overrides?.workspaceId ?? existing?.workspaceId ?? LOCAL_WORKSPACE_ID,
  ownerId: overrides?.ownerId ?? existing?.ownerId ?? LOCAL_OWNER_ID,
  name: record.name,
  createdAt: existing?.createdAt ?? record.createdAt,
  updatedAt: record.updatedAt,
  lastOpenedAt: record.updatedAt,
});

export const saveWorkspaceRecord = async (
  record: WorkspaceRecord,
  options?: { setActive?: boolean },
) => {
  await builderDb.transaction('rw', builderDb.workspaces, builderDb.meta, async () => {
    const existing = await builderDb.workspaces.get(record.id);
    const next = buildWorkspaceRecord(record, existing);
    await builderDb.workspaces.put(next);

    if (options?.setActive) {
      await builderDb.meta.put({
        key: ACTIVE_WORKSPACE_META_KEY,
        value: next.id,
      });
    }
  });
};

export const listWorkspaceRecords = async () => {
  return builderDb.workspaces.orderBy('lastOpenedAt').reverse().toArray();
};

export const loadWorkspaceRecord = async (workspaceId: string) => {
  return builderDb.workspaces.get(workspaceId);
};

export const loadActiveWorkspaceId = async () => {
  const meta = await builderDb.meta.get(ACTIVE_WORKSPACE_META_KEY);
  return meta?.value ?? null;
};

export const setActiveWorkspaceRecord = async (workspaceId: string) => {
  await builderDb.transaction('rw', builderDb.workspaces, builderDb.meta, async () => {
    const existingWorkspace = await builderDb.workspaces.get(workspaceId);
    if (existingWorkspace) {
      await builderDb.workspaces.put({
        ...existingWorkspace,
        lastOpenedAt: new Date().toISOString(),
      });
    }

    await builderDb.meta.put({
      key: ACTIVE_WORKSPACE_META_KEY,
      value: workspaceId,
    });
  });
};

export const saveProjectDraftRecord = async (
  record: ProjectDraftRecord,
  options?: {
    createSnapshot?: boolean;
    reason?: string;
    setActive?: boolean;
    workspaceId?: string;
    ownerId?: string;
  },
) => {
  await builderDb.transaction(
    'rw',
    [builderDb.drafts, builderDb.snapshots, builderDb.projects, builderDb.workspaces, builderDb.meta],
    async () => {
      const existing = await builderDb.drafts.get(record.id);
      const existingProject = await builderDb.projects.get(record.projectId);
      const workspaceId = options?.workspaceId ?? existingProject?.workspaceId ?? LOCAL_WORKSPACE_ID;
      const ownerId = options?.ownerId ?? existingProject?.ownerId ?? LOCAL_OWNER_ID;
      const existingWorkspace = await builderDb.workspaces.get(workspaceId);

      await builderDb.drafts.put({
        ...record,
        createdAt: existing?.createdAt ?? record.createdAt,
      });

      await builderDb.projects.put(buildProjectIndexRecord({
        ...record,
        createdAt: existing?.createdAt ?? record.createdAt,
      }, existingProject, {
        workspaceId,
        ownerId,
      }));

      await builderDb.workspaces.put(buildWorkspaceRecord({
        id: workspaceId,
        ownerId,
        name: existingWorkspace?.name ?? (workspaceId === LOCAL_WORKSPACE_ID ? LOCAL_WORKSPACE_NAME : 'Workspace'),
        kind: 'local',
        createdAt: existingWorkspace?.createdAt ?? record.createdAt,
        updatedAt: record.updatedAt,
        lastOpenedAt: options?.setActive
          ? record.updatedAt
          : existingWorkspace?.lastOpenedAt ?? record.updatedAt,
      }, existingWorkspace));

      if (options?.createSnapshot) {
        const existingSnapshots = await builderDb.snapshots
          .where('projectId')
          .equals(record.projectId)
          .toArray();
        const nextVersionNumber = existingSnapshots.reduce((max, snapshot) => (
          Math.max(max, snapshot.versionNumber ?? 0)
        ), 0) + 1;

        await builderDb.snapshots.add({
          id: nanoid(12),
          projectId: record.projectId,
          name: record.name,
          reason: options.reason ?? 'manual',
          document: record.document,
          createdAt: record.updatedAt,
          versionNumber: nextVersionNumber,
        });
      }

      if (options?.setActive) {
        await builderDb.meta.bulkPut([
          {
            key: ACTIVE_WORKSPACE_META_KEY,
            value: workspaceId,
          },
          {
            key: LEGACY_ACTIVE_PROJECT_META_KEY,
            value: record.projectId,
          },
          {
            key: getActiveProjectMetaKey(workspaceId),
            value: record.projectId,
          },
        ] satisfies BuilderMetaRecord[]);
      }
    },
  );
};

export const saveProjectBundleRecord = async (
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
) => {
  await builderDb.transaction(
    'rw',
    [builderDb.drafts, builderDb.snapshots, builderDb.projects, builderDb.workspaces, builderDb.meta],
    async () => {
      const { draft, snapshots } = payload;
      const existingDraft = await builderDb.drafts.get(draft.id);
      const existingProject = await builderDb.projects.get(draft.projectId);
      const workspaceId = options?.workspaceId ?? existingProject?.workspaceId ?? LOCAL_WORKSPACE_ID;
      const ownerId = options?.ownerId ?? existingProject?.ownerId ?? LOCAL_OWNER_ID;
      const existingWorkspace = await builderDb.workspaces.get(workspaceId);

      if (options?.replaceExisting) {
        const existingSnapshots = await builderDb.snapshots
          .where('projectId')
          .equals(draft.projectId)
          .toArray();

        if (existingSnapshots.length > 0) {
          await builderDb.snapshots.bulkDelete(existingSnapshots.map((snapshot) => snapshot.id));
        }
      }

      await builderDb.drafts.put({
        ...draft,
        createdAt: existingDraft?.createdAt ?? draft.createdAt,
      });

      await builderDb.projects.put(buildProjectIndexRecord({
        ...draft,
        createdAt: existingDraft?.createdAt ?? draft.createdAt,
      }, existingProject, {
        workspaceId,
        ownerId,
      }));

      await builderDb.workspaces.put(buildWorkspaceRecord({
        id: workspaceId,
        ownerId,
        name: existingWorkspace?.name ?? (workspaceId === LOCAL_WORKSPACE_ID ? LOCAL_WORKSPACE_NAME : 'Workspace'),
        kind: 'local',
        createdAt: existingWorkspace?.createdAt ?? draft.createdAt,
        updatedAt: draft.updatedAt,
        lastOpenedAt: options?.setActive
          ? draft.updatedAt
          : existingWorkspace?.lastOpenedAt ?? draft.updatedAt,
      }, existingWorkspace));

      if (snapshots.length > 0) {
        await builderDb.snapshots.bulkPut(snapshots.map((snapshot) => ({
          ...snapshot,
          projectId: draft.projectId,
          name: draft.name,
        })));
      }

      if (options?.setActive) {
        await builderDb.meta.bulkPut([
          {
            key: ACTIVE_WORKSPACE_META_KEY,
            value: workspaceId,
          },
          {
            key: LEGACY_ACTIVE_PROJECT_META_KEY,
            value: draft.projectId,
          },
          {
            key: getActiveProjectMetaKey(workspaceId),
            value: draft.projectId,
          },
        ] satisfies BuilderMetaRecord[]);
      }
    },
  );
};

export const loadProjectDraftRecord = async (projectId: string) => {
  return builderDb.drafts.get(projectId);
};

export const listProjectSnapshotRecords = async (projectId: string) => {
  return builderDb.transaction('rw', builderDb.snapshots, async () => {
    const snapshots = await builderDb.snapshots
      .where('projectId')
      .equals(projectId)
      .toArray();

    const chronological = [...snapshots].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    let nextVersionNumber = chronological.reduce((max, snapshot) => (
      Math.max(max, snapshot.versionNumber ?? 0)
    ), 0);

    for (const snapshot of chronological) {
      if (snapshot.versionNumber != null) continue;
      nextVersionNumber += 1;
      snapshot.versionNumber = nextVersionNumber;
      await builderDb.snapshots.put(snapshot);
    }

    return chronological
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((snapshot) => ({
        ...snapshot,
        versionNumber: snapshot.versionNumber ?? 0,
      }));
  });
};

export const loadProjectSnapshotRecord = async (snapshotId: string) => {
  return builderDb.snapshots.get(snapshotId);
};

export const deleteProjectSnapshotRecord = async (snapshotId: string) => {
  await builderDb.snapshots.delete(snapshotId);
};

export const deleteProjectRecord = async (projectId: string, workspaceId?: string) => {
  await builderDb.transaction(
    'rw',
    [builderDb.drafts, builderDb.snapshots, builderDb.projects, builderDb.meta],
    async () => {
      const existingProject = await builderDb.projects.get(projectId);
      if (!existingProject) return;

      const resolvedWorkspaceId = workspaceId ?? existingProject.workspaceId ?? LOCAL_WORKSPACE_ID;
      const snapshots = await builderDb.snapshots.where('projectId').equals(projectId).toArray();

      if (snapshots.length > 0) {
        await builderDb.snapshots.bulkDelete(snapshots.map((snapshot) => snapshot.id));
      }

      await builderDb.drafts.delete(projectId);
      await builderDb.projects.delete(projectId);

      const remainingProjects = (await builderDb.projects.toArray())
        .filter((project) => project.workspaceId === resolvedWorkspaceId)
        .sort((left, right) => (
          (right.lastOpenedAt || right.updatedAt).localeCompare(left.lastOpenedAt || left.updatedAt)
        ));

      const scopedKey = getActiveProjectMetaKey(resolvedWorkspaceId);
      const scopedMeta = await builderDb.meta.get(scopedKey);
      const legacyMeta = await builderDb.meta.get(LEGACY_ACTIVE_PROJECT_META_KEY);
      const fallbackProjectId = remainingProjects[0]?.id ?? null;

      if (scopedMeta?.value !== projectId && legacyMeta?.value !== projectId) {
        return;
      }

      if (fallbackProjectId) {
        await builderDb.meta.bulkPut([
          {
            key: LEGACY_ACTIVE_PROJECT_META_KEY,
            value: fallbackProjectId,
          },
          {
            key: scopedKey,
            value: fallbackProjectId,
          },
        ] satisfies BuilderMetaRecord[]);
        return;
      }

      await builderDb.meta.bulkDelete([LEGACY_ACTIVE_PROJECT_META_KEY, scopedKey]);
    },
  );
};

export const listProjectIndexRecords = async (workspaceId?: string) => {
  const projects = await builderDb.projects.orderBy('updatedAt').reverse().toArray();
  return workspaceId
    ? projects.filter((project) => project.workspaceId === workspaceId)
    : projects;
};

export const loadProjectIndexRecord = async (projectId: string) => {
  return builderDb.projects.get(projectId);
};

export const loadActiveProjectId = async (workspaceId?: string) => {
  const resolvedWorkspaceId = workspaceId ?? await loadActiveWorkspaceId() ?? LOCAL_WORKSPACE_ID;
  const scopedMeta = await builderDb.meta.get(getActiveProjectMetaKey(resolvedWorkspaceId));
  if (scopedMeta?.value) return scopedMeta.value;

  const legacyMeta = await builderDb.meta.get(LEGACY_ACTIVE_PROJECT_META_KEY);
  return legacyMeta?.value ?? null;
};

export const setActiveProjectRecord = async (projectId: string, workspaceId?: string) => {
  await builderDb.transaction('rw', builderDb.projects, builderDb.workspaces, builderDb.meta, async () => {
    const existingProject = await builderDb.projects.get(projectId);
    const resolvedWorkspaceId = workspaceId ?? existingProject?.workspaceId ?? LOCAL_WORKSPACE_ID;
    const now = new Date().toISOString();

    if (existingProject) {
      await builderDb.projects.put({
        ...existingProject,
        workspaceId: resolvedWorkspaceId,
        lastOpenedAt: now,
      });
    }

    const existingWorkspace = await builderDb.workspaces.get(resolvedWorkspaceId);
    if (existingWorkspace) {
      await builderDb.workspaces.put({
        ...existingWorkspace,
        lastOpenedAt: now,
      });
    }

    await builderDb.meta.bulkPut([
      {
        key: ACTIVE_WORKSPACE_META_KEY,
        value: resolvedWorkspaceId,
      },
      {
        key: LEGACY_ACTIVE_PROJECT_META_KEY,
        value: projectId,
      },
      {
        key: getActiveProjectMetaKey(resolvedWorkspaceId),
        value: projectId,
      },
    ] satisfies BuilderMetaRecord[]);
  });
};
