import { nanoid } from 'nanoid';
import { create } from 'zustand';
import {
  getBuilderBlueprint,
  type BuilderBlueprintId,
} from '../builder/blueprints';
import {
  createProjectStarterDocument,
  getProjectStarter,
  type ProjectStarterId,
} from '../builder/projectStarters';
import {
  cloneDefaultWidgetProps,
  getDefaultWidgetMinSize,
  isContainerWidget,
  isWidgetType,
  type WidgetType,
} from '../builder/widgetConfig';
import type { BuilderWorkspaceScope } from '../builder/workspaceScope';
import {
  clampPageBoardToTopology,
  derivePageLinkKind,
  getOwnedOverlays,
  getPageById,
  resolveOverlayOrbitPosition,
  resolvePageBoardSize,
  syncOverlayFamilyToOwner,
} from '../builder/pageTopology';
import {
  buildProjectDocument,
  createPageId,
  createPageDraft,
  createEmptyProjectDocument,
  createDefaultDataSources,
  createPageLinkId,
  DEFAULT_PAGE_ID,
  DEFAULT_PAGE_NAME,
  createProjectId,
  createTemplateId,
  createWidgetId,
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_NAME,
  flattenPageNodes,
  flattenProjectDocument,
  type LegacyBuilderSnapshot,
  type LegacyLayoutItem,
  type LegacyTemplateRecord,
} from '../core/projectDocument';
import { synchronizeActionBackedLinks } from '../core/actionTargets';
import {
  ProjectBundleSchema,
  type ProjectBundle,
  analyzeProjectBundleImport,
  parseProjectBundleJson,
  stringifyProjectBundle,
} from '../core/projectBundle';
import {
  builderWorkspaceGateway,
  type BuilderSession,
  type OAuthProvider,
  type ProjectIndexRecord,
  type WorkspaceRecord,
} from '../core/workspaceGateway';
import type { ProjectSnapshotRecord } from '../lib/db';
import { ProjectDocumentSchema, PROJECT_SCHEMA_VERSION, type BuilderDataSource, type BuilderNodeDocument, type BuilderPage, type BuilderPageLink, type ProjectDocument, type TargetPlatform } from '../schema/project';
import type { ProjectArchetype } from '../schema/project';
import { DEFAULT_BUILDER_THEME_ID, type BuilderThemeId, type BuilderThemeManifest } from '../theme/presets';
import { BuilderThemeManifestSchema } from '../theme/schema';

export type { WidgetType } from '../builder/widgetConfig';

const {
  workspaceId: LOCAL_WORKSPACE_ID,
  workspaceName: LOCAL_WORKSPACE_NAME,
  ownerId: LOCAL_OWNER_ID,
} = builderWorkspaceGateway.getLocalWorkspaceDefaults();

export interface WidgetData {
  id: string;
  type: WidgetType;
  props: Record<string, any>;
  parentId: string;
}

type PersistenceState = 'idle' | 'hydrating' | 'saving' | 'switching' | 'saved' | 'error';
export type EditorMode = 'edit' | 'preview';

interface SaveDraftOptions {
  createSnapshot?: boolean;
  reason?: string;
  silent?: boolean;
}

interface ImportProjectOptions {
  overwriteExisting?: boolean;
}

export interface ProjectImportResult {
  outcome: 'overwritten' | 'created' | 'forked';
  projectId: string;
  projectName: string;
  versionCount: number;
  importedOwnerId: string;
}

interface BuilderStore {
  session: BuilderSession | null;
  authPending: boolean;
  workspaces: WorkspaceRecord[];
  workspaceId: string;
  workspaceName: string;
  projects: ProjectIndexRecord[];
  activeProjectId: string;
  projectId: string;
  projectName: string;
  targetPlatform: TargetPlatform;
  projectArchetype: ProjectArchetype;
  themeId: BuilderThemeId;
  themeLibrary: BuilderThemeManifest[];
  schemaVersion: number;
  isHydrated: boolean;
  persistenceState: PersistenceState;
  lastSavedAt: string | null;
  lastError: string | null;
  currentVersionId: string | null;
  releaseVersionId: string | null;
  projectVersions: ProjectSnapshotRecord[];
  widgets: Record<string, WidgetData>;
  layouts: Record<string, LegacyLayoutItem[]>;
  selectedId: string | null;
  kitStudioWidgets: Record<string, WidgetData>;
  kitStudioLayouts: Record<string, LegacyLayoutItem[]>;
  selectedKitStudioId: string | null;
  draggedType: WidgetType | 'template' | null;
  editorMode: EditorMode;
  dataSources: BuilderDataSource[];
  runtimeEnv: Record<string, string>;
  pages: BuilderPage[];
  links: BuilderPageLink[];
  selectedPageId: string | null;
  customTemplates: LegacyTemplateRecord[];
  applyBlueprint: (blueprintId: BuilderBlueprintId) => Promise<void>;
  setThemeId: (themeId: BuilderThemeId) => void;
  upsertTheme: (theme: BuilderThemeManifest, options?: { activate?: boolean }) => void;
  deleteTheme: (themeId: BuilderThemeId) => void;
  setProjectName: (name: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  setDataSources: (sources: BuilderDataSource[]) => void;
  setRuntimeEnv: (env: Record<string, string>) => void;
  setSelectedPage: (pageId: string | null) => void;
  updatePageMeta: (pageId: string, patch: Partial<Pick<BuilderPage, 'name' | 'route'>>) => void;
  createPage: (options?: { kind?: BuilderPage['kind']; name?: string; route?: string; ownerPageId?: string; board?: Partial<BuilderPage['board']>; select?: boolean }) => string | null;
  deletePage: (pageId: string) => void;
  updatePageBoard: (pageId: string, board: Partial<BuilderPage['board']>) => void;
  createPageLink: (sourcePageId: string, targetPageId: string, kind: BuilderPageLink['kind']) => void;
  updatePageLinkMeta: (linkId: string, metaPatch: Record<string, unknown>) => void;
  deletePageLink: (linkId: string) => void;
  hydrateProject: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  createWorkspace: (name?: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createProject: (options?: { name?: string; targetPlatform?: TargetPlatform; archetype?: ProjectArchetype; starterId?: ProjectStarterId }) => Promise<void>;
  applyProjectStarter: (starterId: ProjectStarterId) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveDraft: (options?: SaveDraftOptions) => Promise<void>;
  loadDraft: () => Promise<void>;
  refreshProjectVersions: (projectId?: string) => Promise<void>;
  checkoutProjectVersion: (versionId: string) => Promise<void>;
  setReleaseVersion: (versionId: string | null) => Promise<void>;
  deleteProjectVersion: (versionId: string) => Promise<void>;
  exportProject: () => string;
  importProject: (input: string | ProjectBundle, options?: ImportProjectOptions) => Promise<ProjectImportResult>;
  extractTemplate: (id: string, scope?: BuilderWorkspaceScope) => void;
  addTemplateNode: (template: LegacyTemplateRecord, parentId: string, x: number, y: number, scope?: BuilderWorkspaceScope) => void;
  setDraggedType: (type: WidgetType | 'template' | null) => void;
  addWidget: (id: string, type: WidgetType, layoutItem: LegacyLayoutItem, parentId?: string, initialProps?: any, scope?: BuilderWorkspaceScope) => void;
  moveWidget: (id: string, targetParentId: string, layoutItem: LegacyLayoutItem, scope?: BuilderWorkspaceScope) => void;
  updateLayout: (parentId: string, layout: LegacyLayoutItem[], scope?: BuilderWorkspaceScope) => void;
  updateLayoutItem: (id: string, parentId: string, updates: Partial<LegacyLayoutItem>, scope?: BuilderWorkspaceScope) => void;
  updateWidgetProps: (id: string, props: Record<string, any>, scope?: BuilderWorkspaceScope) => void;
  selectWidget: (id: string | null, scope?: BuilderWorkspaceScope) => void;
  removeWidget: (id: string, scope?: BuilderWorkspaceScope) => void;
}

type LayoutItemShape = LegacyLayoutItem;

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeLayoutItem = (item: Partial<LegacyLayoutItem>): LayoutItemShape => {
  const normalized: LayoutItemShape = {
    i: String(item?.i ?? ''),
    x: Math.round(toNumber(item?.x)),
    y: Math.round(toNumber(item?.y)),
    w: Math.max(1, toNumber(item?.w, 1)),
    h: Math.max(1, toNumber(item?.h, 1)),
  };

  if (item?.minW != null) normalized.minW = Math.max(1, toNumber(item.minW, 1));
  if (item?.minH != null) normalized.minH = Math.max(1, toNumber(item.minH, 1));

  return normalized;
};

const normalizeLayout = (layout: readonly LegacyLayoutItem[] = []): LayoutItemShape[] => {
  return layout
    .filter((item) => item && item.i != null)
    .map(normalizeLayoutItem);
};

const clampLayoutItemToCols = (
  item: LayoutItemShape,
  maxCols: number,
): LayoutItemShape => {
  const cols = Math.max(1, maxCols);
  const minW = item.minW != null ? Math.min(cols, Math.max(1, item.minW)) : undefined;
  const width = Math.min(cols, Math.max(minW ?? 1, item.w));
  const x = Math.max(0, Math.min(item.x, Math.max(0, cols - width)));

  return {
    ...item,
    minW,
    w: width,
    x,
  };
};

const resolveParentMaxCols = (
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
  parentId: string,
) => {
  if (parentId === 'root') {
    return 48;
  }

  const parentWidget = widgets[parentId];
  if (!parentWidget) {
    return 48;
  }

  const parentLayout = layouts[parentWidget.parentId] ?? [];
  const parentLayoutItem = parentLayout.find((item) => item.i === parentId);
  return Math.max(1, Number(parentLayoutItem?.w ?? 48));
};

const clampLayoutToParent = (
  layout: readonly LegacyLayoutItem[],
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
  parentId: string,
) => {
  const maxCols = resolveParentMaxCols(widgets, layouts, parentId);
  return normalizeLayout(layout).map((item) => clampLayoutItemToCols(item, maxCols));
};

const shouldPreserveChildWidthForParentScope = (
  widgets: Record<string, WidgetData>,
  parentId: string,
  scope: BuilderWorkspaceScope,
) => (
  scope === 'kit'
  && parentId !== 'root'
  && isContainerWidget(widgets[parentId]?.type ?? 'heading')
);

const normalizeLayoutForParentScope = (
  layout: readonly LegacyLayoutItem[],
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
  parentId: string,
  scope: BuilderWorkspaceScope,
) => {
  if ((scope === 'kit' && parentId === 'root') || shouldPreserveChildWidthForParentScope(widgets, parentId, scope)) {
    return normalizeLayout(layout);
  }

  return clampLayoutToParent(layout, widgets, layouts, parentId);
};

const normalizeLayoutItemForParentScope = (
  item: Partial<LegacyLayoutItem>,
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
  parentId: string,
  scope: BuilderWorkspaceScope,
) => {
  const normalized = normalizeLayoutItem(item);
  if ((scope === 'kit' && parentId === 'root') || shouldPreserveChildWidthForParentScope(widgets, parentId, scope)) {
    return normalized;
  }

  return clampLayoutItemToCols(
    normalized,
    resolveParentMaxCols(widgets, layouts, parentId),
  );
};

const areLayoutsEqual = (a: readonly LayoutItemShape[], b: readonly LayoutItemShape[]) => {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort((left, right) => left.i.localeCompare(right.i));
  const sortedB = [...b].sort((left, right) => left.i.localeCompare(right.i));

  return sortedA.every((item, index) => {
    const next = sortedB[index];
    if (!next) return false;
    return item.i === next.i &&
      item.x === next.x &&
      item.y === next.y &&
      item.w === next.w &&
      item.h === next.h &&
      item.minW === next.minW &&
      item.minH === next.minH;
  });
};

const layoutItemBelongsToParent = (
  widgets: Record<string, WidgetData>,
  parentId: string,
  item: LayoutItemShape,
) => widgets[item.i]?.parentId === parentId;

const isDescendantParent = (widgets: Record<string, WidgetData>, ancestorId: string, parentId: string) => {
  let cursor: string | undefined = parentId;
  while (cursor && cursor !== 'root') {
    if (cursor === ancestorId) return true;
    cursor = widgets[cursor]?.parentId;
  }
  return false;
};

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const KIT_FACTORY_MASTER_CELL_WIDTH = 28;
const KIT_FACTORY_MASTER_ROW_HEIGHT = 22;
const LEGACY_KIT_ROOT_TITLES = new Set(['Article List', 'Author Bio', 'Lead Capture', 'Lead Capture Card']);

const getTrimmedString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const resolveKitStudioMasterSize = (item: Partial<LegacyLayoutItem>) => ({
  width: Math.max(220, Math.max(1, toNumber(item?.w, 1)) * KIT_FACTORY_MASTER_CELL_WIDTH),
  height: Math.max(140, Math.max(1, toNumber(item?.h, 1)) * KIT_FACTORY_MASTER_ROW_HEIGHT),
});

const isLegacyKitRootNode = (
  widget: WidgetData | undefined,
  layouts: Record<string, LegacyLayoutItem[]>,
  widgets: Record<string, WidgetData>,
) => {
  if (!widget || widget.parentId !== 'root') return false;

  if (widget.type === 'shadcn_login_card') {
    return true;
  }

  const title = getTrimmedString(widget.props?.title);
  if (LEGACY_KIT_ROOT_TITLES.has(title)) {
    return true;
  }

  if (widget.type !== 'panel') return false;

  const kitTemplateName = getTrimmedString(widget.props?.kitTemplateName);
  const childTypes = (layouts[widget.id] ?? [])
    .map((item) => widgets[item.i]?.type)
    .filter((value): value is WidgetType => Boolean(value));

  return childTypes.includes('chart')
    && childTypes.includes('heading')
    && (kitTemplateName === '' || kitTemplateName === 'Trend Chart Card');
};

const removeWidgetTree = (
  widgetId: string,
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
) => {
  (layouts[widgetId] ?? []).forEach((child) => removeWidgetTree(child.i, widgets, layouts));
  delete widgets[widgetId];
  delete layouts[widgetId];
};

const sanitizeKitStudioSnapshot = (
  widgets: Record<string, WidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
) => {
  const rootLayout = normalizeLayout(layouts.root ?? []);
  const legacyRootIds = rootLayout
    .filter((item) => isLegacyKitRootNode(widgets[item.i], layouts, widgets))
    .map((item) => item.i);

  if (legacyRootIds.length === 0) {
    return {
      widgets,
      layouts,
      changed: false,
    };
  }

  const nextWidgets = cloneJson(widgets);
  const nextLayouts = cloneJson(layouts);
  const legacyRootIdSet = new Set(legacyRootIds);

  legacyRootIds.forEach((widgetId) => removeWidgetTree(widgetId, nextWidgets, nextLayouts));

  const remainingRoot = normalizeLayout(nextLayouts.root ?? [])
    .filter((item) => !legacyRootIdSet.has(item.i) && nextWidgets[item.i]);
  const orderedRoot = [...remainingRoot].sort((left, right) => {
    const leftWidget = nextWidgets[left.i];
    const rightWidget = nextWidgets[right.i];
    const leftName = getTrimmedString(leftWidget?.props?.kitTemplateName || leftWidget?.props?.title || leftWidget?.type);
    const rightName = getTrimmedString(rightWidget?.props?.kitTemplateName || rightWidget?.props?.title || rightWidget?.type);
    return leftName.localeCompare(rightName);
  });

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  const maxRowWidth = 1320;

  nextLayouts.root = orderedRoot.map((item) => {
    const size = resolveKitStudioMasterSize(item);
    if (cursorX !== 0 && cursorX + size.width > maxRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + 120;
      rowHeight = 0;
    }

    const nextItem = {
      ...item,
      x: cursorX,
      y: cursorY,
    };

    cursorX += size.width + 120;
    rowHeight = Math.max(rowHeight, size.height);
    return nextItem;
  });

  return {
    widgets: nextWidgets,
    layouts: nextLayouts,
    changed: true,
  };
};

const isLegacyCustomTemplate = (template: LegacyTemplateRecord | undefined) => {
  if (!template) return false;
  const templateName = getTrimmedString(template.name);
  const rootNode = template.data?.root ? template.data.root : template.data;
  const rootTitle = getTrimmedString(rootNode?.props?.title);
  const contractKey = getTrimmedString(rootNode?.props?.contractKey);
  const rootType = rootNode?.type;

  return templateName === 'Lead Capture Card'
    || rootTitle === 'Lead Capture'
    || contractKey === 'card.leadCapture.v1'
    || rootType === 'shadcn_login_card';
};

const normalizeWidgetCollection = (widgets: Record<string, WidgetData> | undefined) => {
  if (!widgets) {
    return {
      widgets: widgets ?? {},
      changed: false,
    };
  }

  let changed = false;
  const nextWidgets = cloneJson(widgets);

  Object.values(nextWidgets).forEach((widget) => {
    if (widget.type !== 'text_input') return;

    const contractKey = getTrimmedString(widget.props?.contractKey);
    const stateKey = getTrimmedString(widget.props?.stateKey);
    if (widget.props?.chrome || (!contractKey.startsWith('shadcn.card.login.') && stateKey !== 'auth.email' && stateKey !== 'auth.password')) {
      return;
    }

    widget.props = {
      ...widget.props,
      chrome: 'field',
    };
    changed = true;
  });

  return {
    widgets: nextWidgets,
    changed,
  };
};

const sanitizeLegacyBuilderSnapshot = <
  T extends Pick<LegacyBuilderSnapshot, 'kitStudioWidgets' | 'kitStudioLayouts'>
  & Partial<Pick<LegacyBuilderSnapshot, 'customTemplates' | 'widgets'>>
>(snapshot: T): T => {
  const sanitizedKitStudio = sanitizeKitStudioSnapshot(
    snapshot.kitStudioWidgets ?? {},
    snapshot.kitStudioLayouts ?? { root: [] },
  );
  const normalizedWidgets = normalizeWidgetCollection(snapshot.widgets);
  const normalizedKitWidgets = normalizeWidgetCollection(sanitizedKitStudio.widgets);
  const nextCustomTemplates = (snapshot.customTemplates ?? []).filter((template) => !isLegacyCustomTemplate(template));
  const customTemplatesChanged = nextCustomTemplates.length !== (snapshot.customTemplates ?? []).length;

  if (!sanitizedKitStudio.changed && !normalizedWidgets.changed && !normalizedKitWidgets.changed && !customTemplatesChanged) {
    return snapshot;
  }

  return {
    ...snapshot,
    ...(snapshot.widgets ? { widgets: normalizedWidgets.widgets } : {}),
    ...(snapshot.customTemplates ? { customTemplates: nextCustomTemplates } : {}),
    kitStudioWidgets: normalizedKitWidgets.widgets,
    kitStudioLayouts: sanitizedKitStudio.layouts,
  };
};

const mergeMetaPatch = (
  meta: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
) => {
  const nextMeta = { ...(meta ?? {}) };

  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) {
      delete nextMeta[key];
      return;
    }

    nextMeta[key] = cloneJson(value);
  });

  return nextMeta;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const findNodeById = (nodes: BuilderNodeDocument[], nodeId: string): BuilderNodeDocument | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const childMatch = findNodeById(node.children, nodeId);
    if (childMatch) return childMatch;
  }
  return null;
};

const readLegacyLocalSnapshot = (): Pick<LegacyBuilderSnapshot, 'widgets' | 'layouts' | 'customTemplates' | 'dataSources' | 'runtimeEnv' | 'themeId' | 'themeLibrary' | 'kitStudioWidgets' | 'kitStudioLayouts'> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const draftRaw = localStorage.getItem('builder_draft');
    const templatesRaw = localStorage.getItem('builder_templates');

    if (!draftRaw && !templatesRaw) return null;

    const parsedDraft = draftRaw ? JSON.parse(draftRaw) : {};
    const parsedTemplates = templatesRaw ? JSON.parse(templatesRaw) : [];

    const snapshot = {
      dataSources: Array.isArray(parsedDraft.dataSources) ? parsedDraft.dataSources : [],
      themeId: typeof parsedDraft.themeId === 'string' ? parsedDraft.themeId as BuilderThemeId : DEFAULT_BUILDER_THEME_ID,
      themeLibrary: Array.isArray(parsedDraft.themeLibrary)
        ? parsedDraft.themeLibrary.flatMap((theme: unknown) => {
            const parsedTheme = BuilderThemeManifestSchema.safeParse(theme);
            return parsedTheme.success ? [parsedTheme.data] : [];
          })
        : [],
      runtimeEnv: typeof parsedDraft.runtimeEnv === 'object' && parsedDraft.runtimeEnv ? parsedDraft.runtimeEnv : {},
      widgets: parsedDraft.widgets ?? {},
      layouts: parsedDraft.layouts ?? { root: [] },
      customTemplates: Array.isArray(parsedTemplates) ? parsedTemplates : [],
      kitStudioWidgets: parsedDraft.kitStudioWidgets ?? {},
      kitStudioLayouts: parsedDraft.kitStudioLayouts ?? { root: [] },
    };

    const sanitizedSnapshot = sanitizeLegacyBuilderSnapshot(snapshot);
    if (sanitizedSnapshot !== snapshot) {
      persistLegacyLocalSnapshot(sanitizedSnapshot);
    }

    return sanitizedSnapshot;
  } catch (error) {
    console.error('Failed to read legacy local builder state:', error);
    return null;
  }
};

const persistLegacyLocalSnapshot = (
  snapshot: Pick<LegacyBuilderSnapshot, 'widgets' | 'layouts' | 'customTemplates' | 'dataSources' | 'runtimeEnv' | 'themeId' | 'themeLibrary' | 'kitStudioWidgets' | 'kitStudioLayouts'>,
) => {
  if (typeof window === 'undefined') return;
  const sanitizedSnapshot = sanitizeLegacyBuilderSnapshot(snapshot);
  localStorage.setItem('builder_draft', JSON.stringify({
    widgets: sanitizedSnapshot.widgets,
    layouts: sanitizedSnapshot.layouts,
    dataSources: sanitizedSnapshot.dataSources ?? [],
    themeId: sanitizedSnapshot.themeId ?? DEFAULT_BUILDER_THEME_ID,
    themeLibrary: sanitizedSnapshot.themeLibrary ?? [],
    runtimeEnv: sanitizedSnapshot.runtimeEnv ?? {},
    kitStudioWidgets: sanitizedSnapshot.kitStudioWidgets ?? {},
    kitStudioLayouts: sanitizedSnapshot.kitStudioLayouts ?? { root: [] },
  }));
  localStorage.setItem('builder_templates', JSON.stringify(sanitizedSnapshot.customTemplates));
};

const toLegacySnapshot = (
  state: Pick<BuilderStore, 'projectId' | 'projectName' | 'targetPlatform' | 'projectArchetype' | 'releaseVersionId' | 'themeId' | 'themeLibrary' | 'widgets' | 'layouts' | 'customTemplates' | 'dataSources' | 'runtimeEnv' | 'pages' | 'links' | 'selectedPageId' | 'kitStudioWidgets' | 'kitStudioLayouts'>,
): LegacyBuilderSnapshot => ({
  projectId: state.projectId,
  projectName: state.projectName,
  targetPlatform: state.targetPlatform,
  projectArchetype: state.projectArchetype,
  releaseVersionId: state.releaseVersionId,
  themeId: state.themeId,
  themeLibrary: state.themeLibrary,
  dataSources: state.dataSources,
  runtimeEnv: state.runtimeEnv,
  pages: state.pages,
  links: state.links,
  selectedPageId: state.selectedPageId,
  widgets: state.widgets,
  layouts: state.layouts,
  customTemplates: state.customTemplates,
  kitStudioWidgets: state.kitStudioWidgets,
  kitStudioLayouts: state.kitStudioLayouts,
});

const applyFlattenedProject = (
  payload: LegacyBuilderSnapshot,
  lastSavedAt: string | null,
  currentVersionId: string | null = null,
): Partial<BuilderStore> => {
  const sanitizedPayload = sanitizeLegacyBuilderSnapshot(payload);

  return {
    activeProjectId: sanitizedPayload.projectId ?? DEFAULT_PROJECT_ID,
    projectId: sanitizedPayload.projectId ?? DEFAULT_PROJECT_ID,
    projectName: sanitizedPayload.projectName ?? DEFAULT_PROJECT_NAME,
    targetPlatform: sanitizedPayload.targetPlatform ?? 'desktop-web',
    projectArchetype: sanitizedPayload.projectArchetype ?? 'dashboard-workspace',
    themeId: sanitizedPayload.themeId ?? DEFAULT_BUILDER_THEME_ID,
    themeLibrary: sanitizedPayload.themeLibrary ?? [],
    dataSources: sanitizedPayload.dataSources ?? createDefaultDataSources(),
    runtimeEnv: sanitizedPayload.runtimeEnv ?? {},
    pages: sanitizedPayload.pages ?? [],
    links: getActionSyncedLinks(sanitizedPayload),
    selectedPageId: sanitizedPayload.selectedPageId ?? sanitizedPayload.pages?.[0]?.id ?? null,
    widgets: sanitizedPayload.widgets ?? {},
    layouts: sanitizedPayload.layouts ?? { root: [] },
    customTemplates: sanitizedPayload.customTemplates ?? [],
    kitStudioWidgets: sanitizedPayload.kitStudioWidgets ?? {},
    kitStudioLayouts: sanitizedPayload.kitStudioLayouts ?? { root: [] },
    selectedKitStudioId: null,
    selectedId: null,
    draggedType: null,
    lastSavedAt,
    currentVersionId,
    releaseVersionId: sanitizedPayload.releaseVersionId ?? null,
    persistenceState: lastSavedAt ? 'saved' : 'idle',
    isHydrated: true,
    lastError: null,
  };
};

const getSyncedPages = (
  state: Pick<BuilderStore, 'projectId' | 'projectName' | 'targetPlatform' | 'projectArchetype' | 'releaseVersionId' | 'themeId' | 'themeLibrary' | 'widgets' | 'layouts' | 'customTemplates' | 'dataSources' | 'runtimeEnv' | 'pages' | 'links' | 'selectedPageId' | 'kitStudioWidgets' | 'kitStudioLayouts'>,
) => buildProjectDocument(toLegacySnapshot(state)).project.pages;

const getActionSyncedLinks = (
  snapshot: Pick<LegacyBuilderSnapshot, 'projectId' | 'projectName' | 'targetPlatform' | 'projectArchetype' | 'releaseVersionId' | 'themeId' | 'themeLibrary' | 'widgets' | 'layouts' | 'customTemplates' | 'dataSources' | 'runtimeEnv' | 'pages' | 'links' | 'selectedPageId' | 'kitStudioWidgets' | 'kitStudioLayouts'>,
) => {
  const document = buildProjectDocument(snapshot as LegacyBuilderSnapshot);
  return synchronizeActionBackedLinks(document, snapshot.links ?? []);
};

const getPageViewState = (pages: BuilderPage[], selectedPageId: string | null) => {
  const page = selectedPageId
    ? pages.find((entry) => entry.id === selectedPageId) ?? pages[0] ?? null
    : pages[0] ?? null;
  const flattened = page ? flattenPageNodes(page) : { widgets: {}, layouts: { root: [] } };

  return {
    pages,
    selectedPageId: page?.id ?? null,
    widgets: flattened.widgets,
    layouts: flattened.layouts,
    selectedId: null,
    draggedType: null,
  };
};

const getWorkspaceWidgets = (
  state: Pick<BuilderStore, 'widgets' | 'kitStudioWidgets'>,
  scope: BuilderWorkspaceScope = 'page',
) => (scope === 'kit' ? state.kitStudioWidgets : state.widgets);

const getWorkspaceLayouts = (
  state: Pick<BuilderStore, 'layouts' | 'kitStudioLayouts'>,
  scope: BuilderWorkspaceScope = 'page',
) => (scope === 'kit' ? state.kitStudioLayouts : state.layouts);

const getWorkspaceSelectedId = (
  state: Pick<BuilderStore, 'selectedId' | 'selectedKitStudioId'>,
  scope: BuilderWorkspaceScope = 'page',
) => (scope === 'kit' ? state.selectedKitStudioId : state.selectedId);

const createUntitledProjectName = (projects: ProjectIndexRecord[]) => {
  const existingNames = new Set(projects.map((project) => project.name));
  if (!existingNames.has('Untitled Project')) return 'Untitled Project';

  let index = 2;
  while (existingNames.has(`Untitled Project ${index}`)) {
    index += 1;
  }

  return `Untitled Project ${index}`;
};

const createUntitledWorkspaceName = (workspaces: WorkspaceRecord[]) => {
  const existingNames = new Set(workspaces.map((workspace) => workspace.name));
  if (!existingNames.has('Untitled Workspace')) return 'Untitled Workspace';

  let index = 2;
  while (existingNames.has(`Untitled Workspace ${index}`)) {
    index += 1;
  }

  return `Untitled Workspace ${index}`;
};

const getWorkspaceName = (
  workspaces: WorkspaceRecord[],
  workspaceId: string,
  fallback = LOCAL_WORKSPACE_NAME,
) => {
  return workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? fallback;
};

const getCloudAuthRequiredMessage = (session: BuilderSession | null) => {
  if (session?.auth.status === 'pending-verification') {
    return 'Verify the account email before accessing cloud workspaces.';
  }

  return 'Sign in required before accessing cloud workspaces.';
};

const isCloudAuthLocked = (session: BuilderSession | null) => (
  session?.mode === 'cloud' &&
  session.auth.canSignIn &&
  session.auth.status !== 'authenticated'
);

const toStrictIsoDateTime = (
  value: string | null | undefined,
  fallback = new Date().toISOString(),
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return fallback;
  }

  return new Date(timestamp).toISOString();
};

const hasProjectRecord = (
  projects: ProjectIndexRecord[],
  projectId: string,
) => Boolean(projectId && projects.some((project) => project.id === projectId));

const createNoProjectState = ({
  workspaces,
  workspaceId,
  workspaceName,
  projects,
}: {
  workspaces: WorkspaceRecord[];
  workspaceId: string;
  workspaceName: string;
  projects: ProjectIndexRecord[];
}): Partial<BuilderStore> => ({
  workspaces,
  workspaceId,
  workspaceName,
  projects,
  activeProjectId: '',
  projectId: '',
  projectName: 'No project yet',
  targetPlatform: 'desktop-web',
  projectArchetype: 'dashboard-workspace',
  themeId: DEFAULT_BUILDER_THEME_ID,
  themeLibrary: [],
  widgets: {},
  layouts: { root: [] },
  kitStudioWidgets: {},
  kitStudioLayouts: { root: [] },
  selectedId: null,
  selectedKitStudioId: null,
  draggedType: null,
  dataSources: createDefaultDataSources(),
  runtimeEnv: {},
  pages: [],
  links: [],
  selectedPageId: null,
  customTemplates: [],
  isHydrated: true,
  persistenceState: 'idle',
  lastSavedAt: null,
  lastError: null,
  currentVersionId: null,
  releaseVersionId: null,
  projectVersions: [],
});

const ensureWorkspaceAccess = (session: BuilderSession | null) => {
  if (isCloudAuthLocked(session)) {
    throw new Error(getCloudAuthRequiredMessage(session));
  }
};

const buildPersistedDocument = (
  document: ProjectDocument,
  projectId: string,
  projectName: string,
  timestamp: string,
  currentVersionId: string | null = null,
) => ProjectDocumentSchema.parse({
  ...document,
  project: {
    ...document.project,
    id: projectId,
    name: projectName,
    createdAt: toStrictIsoDateTime(document.project.createdAt, timestamp),
    updatedAt: toStrictIsoDateTime(timestamp, document.project.updatedAt),
  },
  editor: {
    ...document.editor,
    lastSavedAt: toStrictIsoDateTime(timestamp, document.editor.lastSavedAt ?? undefined),
    currentVersionId,
  },
});

const cloneBundleDocumentForImport = (
  document: ProjectDocument,
  options: {
    projectId: string;
    projectName: string;
    currentVersionId: string | null;
    releaseVersionId: string | null;
    projectCreatedAt: string;
    projectUpdatedAt?: string;
  },
) => ProjectDocumentSchema.parse({
  ...document,
  project: {
    ...document.project,
    id: options.projectId,
    name: options.projectName,
    createdAt: toStrictIsoDateTime(options.projectCreatedAt, document.project.createdAt),
    updatedAt: toStrictIsoDateTime(options.projectUpdatedAt ?? document.project.updatedAt, document.project.updatedAt),
  },
  editor: {
    ...document.editor,
    currentVersionId: options.currentVersionId,
    releaseVersionId: options.releaseVersionId,
  },
});

const seedWorkspaceProject = async ({
  workspaceId,
  projectId,
  projectName,
  sourceDocument,
  reason,
  setActive = true,
}: {
  workspaceId: string;
  projectId: string;
  projectName: string;
  sourceDocument: ProjectDocument;
  reason: string;
  setActive?: boolean;
}) => {
  const timestamp = sourceDocument.project.updatedAt;
  const document = buildPersistedDocument(
    sourceDocument,
    projectId,
    projectName,
    timestamp,
    sourceDocument.editor.currentVersionId ?? null,
  );

  await builderWorkspaceGateway.saveProjectDraft({
    id: projectId,
    projectId,
    name: projectName,
    document,
    createdAt: timestamp,
    updatedAt: timestamp,
  }, {
    reason,
    setActive,
    workspaceId,
  });

  return document;
};

let hydrateProjectPromise: Promise<void> | null = null;

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  session: null,
  authPending: false,
  workspaces: [],
  workspaceId: LOCAL_WORKSPACE_ID,
  workspaceName: LOCAL_WORKSPACE_NAME,
  projects: [],
  activeProjectId: DEFAULT_PROJECT_ID,
  projectId: DEFAULT_PROJECT_ID,
  projectName: DEFAULT_PROJECT_NAME,
  targetPlatform: 'desktop-web',
  projectArchetype: 'dashboard-workspace',
  themeId: DEFAULT_BUILDER_THEME_ID,
  themeLibrary: [],
  schemaVersion: PROJECT_SCHEMA_VERSION,
  isHydrated: false,
  persistenceState: 'idle',
  lastSavedAt: null,
  lastError: null,
  currentVersionId: null,
  releaseVersionId: null,
  projectVersions: [],
  widgets: {},
  layouts: { root: [] },
  kitStudioWidgets: {},
  kitStudioLayouts: { root: [] },
  selectedId: null,
  selectedKitStudioId: null,
  draggedType: null,
  editorMode: 'edit',
  dataSources: createDefaultDataSources(),
  runtimeEnv: {},
  pages: [],
  links: [],
  selectedPageId: null,
  customTemplates: [],

  applyBlueprint: async (blueprintId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);

    const blueprint = getBuilderBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error(`Unknown blueprint: ${blueprintId}`);
    }

    set({
      ...applyFlattenedProject(
        flattenProjectDocument(buildProjectDocument({
          projectId: state.projectId,
          projectName: blueprint.projectName,
          targetPlatform: state.targetPlatform,
          projectArchetype: state.projectArchetype,
          releaseVersionId: state.releaseVersionId,
          themeId: blueprint.themeId,
          themeLibrary: state.themeLibrary,
          dataSources: cloneJson(blueprint.dataSources),
          runtimeEnv: cloneJson(blueprint.runtimeEnv),
          widgets: cloneJson(blueprint.widgets),
          layouts: cloneJson(blueprint.layouts),
          customTemplates: [],
          kitStudioWidgets: {},
          kitStudioLayouts: { root: [] },
        })),
        state.lastSavedAt,
        state.currentVersionId,
      ),
      lastError: null,
      isHydrated: true,
    });

    await get().saveDraft({
      reason: `apply-blueprint:${blueprint.id}`,
      createSnapshot: true,
    });
  },

  setThemeId: (themeId) => set({ themeId }),
  upsertTheme: (theme, options) => {
    const parsedTheme = BuilderThemeManifestSchema.parse(theme);
    set((state) => ({
      themeLibrary: [
        ...state.themeLibrary.filter((entry) => entry.id !== parsedTheme.id),
        parsedTheme,
      ],
      themeId: options?.activate ? parsedTheme.id : state.themeId,
    }));
  },
  deleteTheme: (themeId) => {
    set((state) => ({
      themeLibrary: state.themeLibrary.filter((theme) => theme.id !== themeId),
      themeId: state.themeId === themeId ? DEFAULT_BUILDER_THEME_ID : state.themeId,
    }));
  },
  setProjectName: (name) => set({ projectName: name.trim() || DEFAULT_PROJECT_NAME }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setDataSources: (sources) => set({ dataSources: cloneJson(sources) }),
  setRuntimeEnv: (env) => set({ runtimeEnv: cloneJson(env) }),
  updatePageMeta: (pageId, patch) => set((state) => ({
    pages: state.pages.map((page) => (
      page.id === pageId
        ? {
            ...page,
            name: patch.name?.trim() || page.name,
            route: patch.route?.trim() || page.route,
          }
        : page
    )),
  })),
  setSelectedPage: (pageId) => set((state) => {
    const syncedPages = getSyncedPages(state);
    return {
      ...getPageViewState(syncedPages, pageId),
      links: state.links,
    };
  }),
  createPage: (options) => {
    let createdPageId: string | null = null;

    set((state) => {
      const syncedPages = getSyncedPages(state);
      const selectedPage = syncedPages.find((page) => page.id === state.selectedPageId) ?? syncedPages[0];
      const nextKind = options?.kind ?? 'page';
      const pageIndex = syncedPages.filter((page) => page.kind === 'page').length + 1;
      const overlayIndex = syncedPages.filter((page) => page.kind === 'overlay').length + 1;
      const name = options?.name?.trim() || (nextKind === 'overlay' ? `Overlay ${overlayIndex}` : `Page ${pageIndex}`);
      const route = options?.route?.trim() || (nextKind === 'overlay' ? `/overlay-${overlayIndex}` : `/page-${pageIndex}`);
      const lastBoardX = syncedPages.reduce((maxX, page) => Math.max(maxX, page.board.x + page.board.width), 0);
      const ownerPageId = nextKind === 'overlay'
        ? (options.ownerPageId ?? (selectedPage?.kind === 'overlay' ? selectedPage.ownerPageId : selectedPage?.id))
        : undefined;
      const ownerPage = ownerPageId ? syncedPages.find((page) => page.id === ownerPageId) : null;
      if (nextKind === 'overlay' && !ownerPage) {
        return state;
      }
      const size = resolvePageBoardSize(nextKind, ownerPage);
      const overlayOrbit = ownerPage && nextKind === 'overlay' && options?.board?.x == null && options?.board?.y == null
        ? resolveOverlayOrbitPosition(
            ownerPage,
            options?.board?.width ?? size.width,
            options?.board?.height ?? size.height,
            getOwnedOverlays(syncedPages, ownerPage.id).length,
          )
        : null;
      const page = createPageDraft(name, route, {
        id: createPageId(state.projectId, nextKind),
        kind: nextKind,
        ownerPageId: ownerPageId ?? undefined,
        board: {
          x: options?.board?.x ?? overlayOrbit?.x ?? (ownerPage ? ownerPage.board.x + ownerPage.board.width + 120 : lastBoardX + 160),
          y: options?.board?.y ?? overlayOrbit?.y ?? (ownerPage ? ownerPage.board.y + 120 : (nextKind === 'overlay' ? 180 : 0)),
          width: options?.board?.width ?? size.width,
          height: options?.board?.height ?? size.height,
        },
      });
      const nextPages = [...syncedPages, page];
      const nextSelectedPageId = options?.select === false && state.selectedPageId
        ? state.selectedPageId
        : page.id;

      createdPageId = page.id;

      return {
        ...getPageViewState(nextPages, nextSelectedPageId),
        links: state.links,
      };
    });

    return createdPageId;
  },
  deletePage: (pageId) => set((state) => {
    const syncedPages = getSyncedPages(state);
    const removable = syncedPages.find((page) => page.id === pageId);
    if (!removable) return state;
    const removeIds = new Set<string>([pageId]);
    if (removable.kind === 'page') {
      syncedPages
        .filter((page) => page.ownerPageId === pageId)
        .forEach((page) => removeIds.add(page.id));
    }

    const remainingPages = syncedPages.filter((page) => !removeIds.has(page.id));
    if (remainingPages.length === 0) {
      return {
        ...getPageViewState([], null),
        links: [],
      };
    }

    const nextSelectedPageId = state.selectedPageId && removeIds.has(state.selectedPageId)
      ? (remainingPages.find((page) => page.kind === 'page')?.id ?? remainingPages[0].id)
      : state.selectedPageId;

    return {
      ...getPageViewState(
        remainingPages.map((page) => (
          removeIds.has(page.ownerPageId ?? '') ? { ...page, ownerPageId: undefined } : page
        )),
        nextSelectedPageId,
      ),
      links: state.links.filter((link) => !removeIds.has(link.sourcePageId) && !removeIds.has(link.targetPageId)),
    };
  }),
  updatePageBoard: (pageId, board) => set((state) => {
    const syncedPages = getSyncedPages(state);
    const nextPages = syncedPages.map((page) => (
      page.id === pageId
        ? {
            ...page,
            board: clampPageBoardToTopology(syncedPages, page, cloneJson(board)),
          }
        : page
    ));
    return {
      pages: nextPages,
    };
  }),
  createPageLink: (sourcePageId, targetPageId, kind) => set((state) => {
    if (sourcePageId === targetPageId) return state;
    const sourcePage = getPageById(state.pages, sourcePageId);
    const targetPage = getPageById(state.pages, targetPageId);
    if (!sourcePage || !targetPage) {
      return state;
    }
    if (derivePageLinkKind(sourcePage, targetPage) !== kind) {
      return state;
    }

    const exists = state.links.some((link) => (
      link.sourcePageId === sourcePageId &&
      link.targetPageId === targetPageId &&
      link.kind === kind
    ));
    if (exists) return state;

    return {
      links: [
        ...state.links,
        {
          id: createPageLinkId(),
          sourcePageId,
          targetPageId,
          kind,
          meta: {},
        },
      ],
    };
  }),
  updatePageLinkMeta: (linkId, metaPatch) => set((state) => ({
    links: state.links.map((link) => (
      link.id === linkId
        ? {
            ...link,
            meta: mergeMetaPatch(link.meta, metaPatch),
          }
        : link
    )),
  })),
  deletePageLink: (linkId) => set((state) => ({
    links: state.links.filter((link) => link.id !== linkId),
  })),

  hydrateProject: async () => {
    if (get().isHydrated && get().projects.length > 0 && get().workspaces.length > 0) return;
    if (hydrateProjectPromise) return hydrateProjectPromise;

    hydrateProjectPromise = (async () => {
      set({ persistenceState: 'hydrating', lastError: null });

      try {
        const session = await builderWorkspaceGateway.getSession();
        if (isCloudAuthLocked(session)) {
          set({
            session,
            authPending: false,
            workspaces: [],
            projects: [],
            workspaceId: LOCAL_WORKSPACE_ID,
            workspaceName: LOCAL_WORKSPACE_NAME,
            activeProjectId: DEFAULT_PROJECT_ID,
            projectId: DEFAULT_PROJECT_ID,
          projectName: DEFAULT_PROJECT_NAME,
          themeId: DEFAULT_BUILDER_THEME_ID,
          themeLibrary: [],
            targetPlatform: 'desktop-web',
            projectArchetype: 'dashboard-workspace',
            widgets: {},
            layouts: { root: [] },
            kitStudioWidgets: {},
            kitStudioLayouts: { root: [] },
            dataSources: createDefaultDataSources(),
            runtimeEnv: {},
            pages: [],
            links: [],
            selectedPageId: null,
            customTemplates: [],
            selectedId: null,
            selectedKitStudioId: null,
            draggedType: null,
            isHydrated: true,
            persistenceState: 'idle',
            lastSavedAt: null,
            lastError: null,
            currentVersionId: null,
            releaseVersionId: null,
            projectVersions: [],
          });
          return;
        }

        let workspaces = await builderWorkspaceGateway.listWorkspaces();
        if (workspaces.length === 0) {
          const timestamp = new Date().toISOString();
          await builderWorkspaceGateway.saveWorkspace({
            id: LOCAL_WORKSPACE_ID,
            ownerId: LOCAL_OWNER_ID,
            name: LOCAL_WORKSPACE_NAME,
            kind: 'local',
            createdAt: timestamp,
            updatedAt: timestamp,
            lastOpenedAt: timestamp,
          }, {
            setActive: true,
          });
          workspaces = await builderWorkspaceGateway.listWorkspaces();
        }

        let activeWorkspaceId = await builderWorkspaceGateway.getActiveWorkspaceId() ?? workspaces[0]?.id ?? LOCAL_WORKSPACE_ID;
        const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
        activeWorkspaceId = activeWorkspace?.id ?? LOCAL_WORKSPACE_ID;
        await builderWorkspaceGateway.setActiveWorkspace(activeWorkspaceId);

        let projects = await builderWorkspaceGateway.listProjects(activeWorkspaceId);

        if (projects.length === 0) {
          const legacy = readLegacyLocalSnapshot();
          const shouldMigrateLegacy = Boolean(
            legacy &&
            activeWorkspaceId === LOCAL_WORKSPACE_ID &&
            (await builderWorkspaceGateway.listProjects()).length === 0,
          );

          if (shouldMigrateLegacy && legacy) {
            const projectId = DEFAULT_PROJECT_ID;
            const projectName = DEFAULT_PROJECT_NAME;
            const seedDocument = buildProjectDocument({
              projectId,
              projectName,
              projectArchetype: 'dashboard-workspace',
              releaseVersionId: null,
              dataSources: legacy.dataSources,
              runtimeEnv: legacy.runtimeEnv,
            themeLibrary: legacy.themeLibrary,
            widgets: legacy.widgets,
            layouts: legacy.layouts,
            customTemplates: legacy.customTemplates,
            kitStudioWidgets: legacy.kitStudioWidgets,
            kitStudioLayouts: legacy.kitStudioLayouts,
          });

            await seedWorkspaceProject({
              workspaceId: activeWorkspaceId,
              projectId,
              projectName,
              sourceDocument: seedDocument,
              reason: 'legacy-migration',
              setActive: true,
            });

            projects = await builderWorkspaceGateway.listProjects(activeWorkspaceId);
          }
        }

        if (projects.length === 0) {
          const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
          set({
            session,
            ...createNoProjectState({
              workspaces: nextWorkspaces,
              workspaceId: activeWorkspaceId,
              workspaceName: getWorkspaceName(nextWorkspaces, activeWorkspaceId),
              projects: [],
            }),
          });
          return;
        }

        const activeProjectId = await builderWorkspaceGateway.getActiveProjectId(activeWorkspaceId) ?? projects[0]?.id ?? DEFAULT_PROJECT_ID;
        if (activeProjectId) {
          await builderWorkspaceGateway.setActiveProject(activeProjectId, activeWorkspaceId);
        }

        const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
        const nextProjects = await builderWorkspaceGateway.listProjects(activeWorkspaceId);
        const activeProject = nextProjects.find((project) => project.id === activeProjectId);

        set({
          session,
          workspaces: nextWorkspaces,
          projects: nextProjects,
          workspaceId: activeWorkspaceId,
          workspaceName: getWorkspaceName(nextWorkspaces, activeWorkspaceId),
          activeProjectId,
          projectId: activeProjectId,
          projectName: activeProject?.name ?? DEFAULT_PROJECT_NAME,
          targetPlatform: 'desktop-web',
          projectArchetype: 'dashboard-workspace',
          themeId: DEFAULT_BUILDER_THEME_ID,
          themeLibrary: [],
          isHydrated: false,
          projectVersions: [],
        });

        await get().loadDraft();
      } catch (error) {
        set({
          isHydrated: true,
          persistenceState: 'error',
          lastError: getErrorMessage(error),
        });
        throw error;
      } finally {
        hydrateProjectPromise = null;
      }
    })();

    return hydrateProjectPromise;
  },

  signIn: async (email, password) => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.signIn({ email, password });
      set({
        session,
        isHydrated: false,
        workspaces: [],
        projects: [],
        persistenceState: 'hydrating',
        lastError: null,
      });
      await get().hydrateProject();
      set({ authPending: false });
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  signInWithProvider: async (provider) => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.signInWithProvider(provider);
      set({
        session,
        authPending: false,
        persistenceState: 'idle',
        lastError: null,
      });
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  signUp: async (email, password) => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.signUp({
        email,
        password,
      });
      set({
        session,
        isHydrated: false,
        workspaces: [],
        projects: [],
        persistenceState: 'hydrating',
        lastError: null,
      });
      await get().hydrateProject();
      set({ authPending: false });
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  resendVerification: async (email) => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.resendVerification({
        email,
      });
      set({
        session,
        authPending: false,
        persistenceState: 'idle',
        lastError: null,
      });
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  refreshSession: async () => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.getSession();
      set({
        session,
      });

      if (session.auth.status === 'authenticated') {
        set({
          isHydrated: false,
          workspaces: [],
          projects: [],
          persistenceState: 'hydrating',
          lastError: null,
        });
        await get().hydrateProject();
        set({ authPending: false });
      } else {
        set({
          authPending: false,
          persistenceState: 'idle',
          lastError: null,
        });
      }
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ authPending: true, lastError: null });

    try {
      const session = await builderWorkspaceGateway.signOut();
      set({
        session,
        authPending: false,
        workspaces: [],
        projects: [],
        workspaceId: LOCAL_WORKSPACE_ID,
        workspaceName: LOCAL_WORKSPACE_NAME,
        activeProjectId: DEFAULT_PROJECT_ID,
        projectId: DEFAULT_PROJECT_ID,
        projectName: DEFAULT_PROJECT_NAME,
        themeId: DEFAULT_BUILDER_THEME_ID,
        themeLibrary: [],
        targetPlatform: 'desktop-web',
        projectArchetype: 'dashboard-workspace',
  widgets: {},
  layouts: { root: [] },
  selectedId: null,
  kitStudioWidgets: {},
  kitStudioLayouts: { root: [] },
  selectedKitStudioId: null,
  draggedType: null,
        dataSources: createDefaultDataSources(),
        runtimeEnv: {},
        pages: [],
        links: [],
        selectedPageId: null,
        customTemplates: [],
        isHydrated: true,
        persistenceState: 'idle',
        lastSavedAt: null,
        lastError: null,
        currentVersionId: null,
        releaseVersionId: null,
        projectVersions: [],
      });
    } catch (error) {
      set({
        authPending: false,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  createWorkspace: async (name) => {
    const currentState = get();
    ensureWorkspaceAccess(currentState.session);
    if (currentState.isHydrated && hasProjectRecord(currentState.projects, currentState.projectId)) {
      await currentState.saveDraft({ reason: 'before-create-workspace' }).catch(() => {});
    }

    const workspaceId = builderWorkspaceGateway.createWorkspaceId();
    const workspaceName = name?.trim() || createUntitledWorkspaceName(currentState.workspaces);
    const timestamp = new Date().toISOString();

    await builderWorkspaceGateway.saveWorkspace({
      id: workspaceId,
      ownerId: LOCAL_OWNER_ID,
      name: workspaceName,
      kind: 'local',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
    }, {
      setActive: true,
    });

    const workspaces = await builderWorkspaceGateway.listWorkspaces();
    const projects = await builderWorkspaceGateway.listProjects(workspaceId);

    set({
      ...createNoProjectState({
        workspaces,
        workspaceId,
        workspaceName,
        projects,
      }),
    });
  },

  switchWorkspace: async (workspaceId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    if (workspaceId === state.workspaceId) return;

    if (state.isHydrated && hasProjectRecord(state.projects, state.projectId)) {
      await state.saveDraft({ reason: 'before-switch-workspace' }).catch(() => {});
    }

    const workspaces = await builderWorkspaceGateway.listWorkspaces();
    const targetWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!targetWorkspace) return;

    await builderWorkspaceGateway.setActiveWorkspace(workspaceId);

    const projects = await builderWorkspaceGateway.listProjects(workspaceId);

    if (projects.length === 0) {
      const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
      set({
        ...createNoProjectState({
          workspaces: nextWorkspaces,
          workspaceId,
          workspaceName: getWorkspaceName(nextWorkspaces, workspaceId, targetWorkspace.name),
          projects: [],
        }),
      });
      return;
    }

    const activeProjectId = await builderWorkspaceGateway.getActiveProjectId(workspaceId) ?? projects[0]?.id ?? DEFAULT_PROJECT_ID;
    if (activeProjectId) {
      await builderWorkspaceGateway.setActiveProject(activeProjectId, workspaceId);
    }

    const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
    const nextProjects = await builderWorkspaceGateway.listProjects(workspaceId);
    const activeProject = nextProjects.find((project) => project.id === activeProjectId);

    set({
      workspaces: nextWorkspaces,
      projects: nextProjects,
      workspaceId,
      workspaceName: getWorkspaceName(nextWorkspaces, workspaceId, targetWorkspace.name),
      activeProjectId,
      projectId: activeProjectId,
      projectName: activeProject?.name ?? DEFAULT_PROJECT_NAME,
      targetPlatform: 'desktop-web',
      projectArchetype: 'dashboard-workspace',
      isHydrated: false,
      persistenceState: 'hydrating',
      lastError: null,
      selectedId: null,
      selectedKitStudioId: null,
      draggedType: null,
      currentVersionId: null,
      releaseVersionId: null,
      projectVersions: [],
    });

    await get().loadDraft();
  },

  createProject: async (options) => {
    const currentState = get();
    ensureWorkspaceAccess(currentState.session);
    if (currentState.isHydrated && hasProjectRecord(currentState.projects, currentState.projectId)) {
      await currentState.saveDraft({ reason: 'before-create-project' }).catch(() => {});
    }

    const starter = getProjectStarter(options?.starterId ?? 'blank');
    const projectId = createProjectId();
    const projectName = options?.name?.trim()
      || (starter.id === 'blank' ? createUntitledProjectName(currentState.projects) : starter.defaultProjectName);
    const targetPlatform = options?.targetPlatform ?? 'desktop-web';
    const archetype = options?.archetype ?? 'dashboard-workspace';
    const timestamp = new Date().toISOString();
    let document = buildPersistedDocument(
      createProjectStarterDocument({
        starterId: starter.id,
        projectId,
        projectName,
        targetPlatform,
        archetype,
      }),
      projectId,
      projectName,
      timestamp,
      null,
    );

    await builderWorkspaceGateway.saveProjectDraft({
      id: projectId,
      projectId,
      name: projectName,
      document,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, {
      createSnapshot: Boolean(starter.seedReleaseVersion),
      reason: starter.id === 'blank' ? 'create-project' : `create-project:${starter.id}`,
      setActive: true,
      workspaceId: currentState.workspaceId,
    });

    let projectVersions = await builderWorkspaceGateway.listProjectVersions(projectId);
    let currentVersionId: string | null = null;
    let releaseVersionId: string | null = null;

    if (starter.seedReleaseVersion && projectVersions[0]) {
      const seedVersionId = projectVersions[0].id;
      const releaseTimestamp = new Date().toISOString();
      document = buildPersistedDocument(
        ProjectDocumentSchema.parse({
          ...document,
          editor: {
            ...document.editor,
            currentVersionId: seedVersionId,
            releaseVersionId: seedVersionId,
          },
        }),
        projectId,
        projectName,
        releaseTimestamp,
        seedVersionId,
      );

      await builderWorkspaceGateway.saveProjectDraft({
        id: projectId,
        projectId,
        name: projectName,
        document,
        createdAt: timestamp,
        updatedAt: releaseTimestamp,
      }, {
        createSnapshot: false,
        reason: `seed-release:${starter.id}`,
        setActive: true,
        workspaceId: currentState.workspaceId,
      });

      currentVersionId = seedVersionId;
      releaseVersionId = seedVersionId;
      projectVersions = await builderWorkspaceGateway.listProjectVersions(projectId);
    }

    const workspaces = await builderWorkspaceGateway.listWorkspaces();
    const projects = await builderWorkspaceGateway.listProjects(currentState.workspaceId);
    const flattened = flattenProjectDocument(document);

    set({
      ...applyFlattenedProject(flattened, document.editor.lastSavedAt ?? timestamp),
      workspaces,
      workspaceId: currentState.workspaceId,
      workspaceName: getWorkspaceName(workspaces, currentState.workspaceId, currentState.workspaceName),
      projects,
      activeProjectId: projectId,
      currentVersionId,
      releaseVersionId,
      projectVersions,
    });
  },

  applyProjectStarter: async (starterId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);

    const starter = getProjectStarter(starterId);
    const timestamp = new Date().toISOString();
    const currentDocument = buildProjectDocument(toLegacySnapshot(state));
    const starterDocument = createProjectStarterDocument({
      starterId: starter.id,
      projectId: state.projectId,
      projectName: state.projectName,
      targetPlatform: state.targetPlatform,
      archetype: state.projectArchetype,
    });
    const persistedDocument = buildPersistedDocument(
      ProjectDocumentSchema.parse({
        ...starterDocument,
        project: {
          ...starterDocument.project,
          templates: currentDocument.project.templates,
          settings: {
            ...starterDocument.project.settings,
            themeLibrary: state.themeLibrary,
          },
        },
        editor: {
          ...starterDocument.editor,
          kitStudio: {
            ...starterDocument.editor.kitStudio,
            nodes: currentDocument.editor.kitStudio.nodes,
          },
        },
      }),
      state.projectId,
      state.projectName,
      timestamp,
      state.currentVersionId,
    );
    const flattened = flattenProjectDocument(persistedDocument);

    set({
      ...applyFlattenedProject(flattened, persistedDocument.editor.lastSavedAt ?? timestamp, persistedDocument.editor.currentVersionId ?? state.currentVersionId),
      projects: state.projects,
      projectVersions: state.projectVersions,
      activeProjectId: state.projectId,
      projectId: state.projectId,
      projectName: state.projectName,
      currentVersionId: persistedDocument.editor.currentVersionId ?? state.currentVersionId,
      releaseVersionId: persistedDocument.editor.releaseVersionId ?? state.releaseVersionId,
    });

    await get().saveDraft({
      reason: `apply-project-starter:${starter.id}`,
      createSnapshot: true,
    });
  },

  switchProject: async (projectId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    if (projectId === state.activeProjectId) return;

    if (state.isHydrated) {
      await state.saveDraft({ reason: 'before-switch-project', silent: true }).catch(() => {});
    }

    const projects = await builderWorkspaceGateway.listProjects(state.workspaceId);
    const targetProject = projects.find((project) => project.id === projectId);
    if (!targetProject) return;

    await builderWorkspaceGateway.setActiveProject(projectId, state.workspaceId);
    const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
    const nextProjects = await builderWorkspaceGateway.listProjects(state.workspaceId);

    set({
      workspaces: nextWorkspaces,
      projects: nextProjects,
      workspaceId: state.workspaceId,
      workspaceName: getWorkspaceName(nextWorkspaces, state.workspaceId, state.workspaceName),
      activeProjectId: projectId,
      projectId,
      projectName: targetProject.name,
      targetPlatform: 'desktop-web',
      projectArchetype: 'dashboard-workspace',
      isHydrated: false,
      persistenceState: 'hydrating',
      lastError: null,
      selectedId: null,
      selectedKitStudioId: null,
      draggedType: null,
      currentVersionId: null,
      releaseVersionId: null,
      projectVersions: [],
    });

    await get().loadDraft();
  },

  deleteProject: async (projectId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    const targetProject = state.projects.find((project) => project.id === projectId);
    if (!targetProject) return;

    const deletingActiveProject = projectId === state.activeProjectId;
    await builderWorkspaceGateway.deleteProject(projectId, state.workspaceId);

    const nextProjects = await builderWorkspaceGateway.listProjects(state.workspaceId);
    if (!deletingActiveProject) {
      set({ projects: nextProjects });
      return;
    }

    if (nextProjects.length === 0) {
      const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();
      set({
        ...createNoProjectState({
          workspaces: nextWorkspaces,
          workspaceId: state.workspaceId,
          workspaceName: getWorkspaceName(nextWorkspaces, state.workspaceId, state.workspaceName),
          projects: [],
        }),
      });
      return;
    }

    const nextActiveProjectId = await builderWorkspaceGateway.getActiveProjectId(state.workspaceId) ?? nextProjects[0]?.id ?? null;
    const nextActiveProject = nextProjects.find((project) => project.id === nextActiveProjectId) ?? nextProjects[0];
    if (!nextActiveProject) return;

    await builderWorkspaceGateway.setActiveProject(nextActiveProject.id, state.workspaceId);
    const nextWorkspaces = await builderWorkspaceGateway.listWorkspaces();

    set({
      workspaces: nextWorkspaces,
      projects: nextProjects,
      workspaceId: state.workspaceId,
      workspaceName: getWorkspaceName(nextWorkspaces, state.workspaceId, state.workspaceName),
      activeProjectId: nextActiveProject.id,
      projectId: nextActiveProject.id,
      projectName: nextActiveProject.name,
      targetPlatform: 'desktop-web',
      projectArchetype: 'dashboard-workspace',
      isHydrated: false,
      persistenceState: 'hydrating',
      lastError: null,
      kitStudioWidgets: {},
      kitStudioLayouts: { root: [] },
      selectedId: null,
      selectedKitStudioId: null,
      draggedType: null,
      currentVersionId: null,
      releaseVersionId: null,
      projectVersions: [],
    });

    await get().loadDraft();
  },

  saveDraft: async (options) => {
    const state = get();
    if (isCloudAuthLocked(state.session)) {
      set({ persistenceState: 'idle', lastError: null });
      return;
    }
    if (!hasProjectRecord(state.projects, state.projectId)) {
      set({ persistenceState: 'idle', lastError: null });
      return;
    }

    const timestamp = new Date().toISOString();
    const persistedDocument = buildPersistedDocument(
      buildProjectDocument(toLegacySnapshot(state)),
      state.projectId,
      state.projectName,
      timestamp,
      state.currentVersionId,
    );
    const shouldSurfaceStatus = !options?.silent;
    const fallbackPersistenceState = state.persistenceState === 'error' ? 'idle' : state.persistenceState;

    if (shouldSurfaceStatus) {
      set({ persistenceState: 'saving', lastError: null });
    } else {
      set({ lastError: null });
    }

    try {
      await builderWorkspaceGateway.saveProjectDraft({
        id: state.projectId,
        projectId: state.projectId,
        name: state.projectName,
        document: persistedDocument,
        createdAt: state.lastSavedAt ?? timestamp,
        updatedAt: timestamp,
      }, {
        createSnapshot: options?.createSnapshot ?? false,
        reason: options?.reason ?? 'manual',
        setActive: true,
        workspaceId: state.workspaceId,
      });

      const workspaces = await builderWorkspaceGateway.listWorkspaces();
      const projects = await builderWorkspaceGateway.listProjects(state.workspaceId);
      const projectVersions = await builderWorkspaceGateway.listProjectVersions(state.projectId);
      const nextCurrentVersionId = options?.createSnapshot
        ? (projectVersions[0]?.id ?? state.currentVersionId)
        : state.currentVersionId;

      if (nextCurrentVersionId !== persistedDocument.editor.currentVersionId) {
        const syncedDocument = buildPersistedDocument(
          persistedDocument,
          state.projectId,
          state.projectName,
          timestamp,
          nextCurrentVersionId,
        );

        await builderWorkspaceGateway.saveProjectDraft({
          id: state.projectId,
          projectId: state.projectId,
          name: state.projectName,
          document: syncedDocument,
          createdAt: state.lastSavedAt ?? timestamp,
          updatedAt: timestamp,
        }, {
          createSnapshot: false,
          reason: options?.reason ?? 'manual',
          setActive: true,
          workspaceId: state.workspaceId,
        });
      }

      persistLegacyLocalSnapshot({
        dataSources: state.dataSources,
        runtimeEnv: state.runtimeEnv,
        themeId: state.themeId,
        themeLibrary: state.themeLibrary,
        widgets: state.widgets,
        layouts: state.layouts,
        customTemplates: state.customTemplates,
        kitStudioWidgets: state.kitStudioWidgets,
        kitStudioLayouts: state.kitStudioLayouts,
      });

      set({
        lastSavedAt: timestamp,
        persistenceState: shouldSurfaceStatus ? 'saved' : fallbackPersistenceState,
        lastError: null,
        isHydrated: true,
        workspaces,
        projects,
        workspaceId: state.workspaceId,
        workspaceName: getWorkspaceName(workspaces, state.workspaceId, state.workspaceName),
        activeProjectId: state.projectId,
        currentVersionId: nextCurrentVersionId,
        projectVersions,
      });
    } catch (error) {
      set({
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  loadDraft: async () => {
    ensureWorkspaceAccess(get().session);
    set({ persistenceState: 'hydrating', lastError: null });

    try {
      const currentProjectId = get().projectId;
      const currentWorkspaceId = get().workspaceId;
      const workspaces = await builderWorkspaceGateway.listWorkspaces();
      const projects = await builderWorkspaceGateway.listProjects(currentWorkspaceId);
      if (!currentProjectId || !hasProjectRecord(projects, currentProjectId)) {
        set({
          ...createNoProjectState({
            workspaces,
            workspaceId: currentWorkspaceId,
            workspaceName: getWorkspaceName(workspaces, currentWorkspaceId, get().workspaceName),
            projects,
          }),
        });
        return;
      }
      const projectVersions = await builderWorkspaceGateway.listProjectVersions(currentProjectId);
      const currentProject = projects.find((project) => project.id === currentProjectId);
      const fallbackProjectName = currentProject?.name ?? get().projectName ?? DEFAULT_PROJECT_NAME;
      const stored = await builderWorkspaceGateway.loadProjectDraft(currentProjectId);

      if (stored?.document) {
        const flattened = flattenProjectDocument(stored.document);
        set({
          ...applyFlattenedProject(
            flattened,
            stored.updatedAt,
            stored.document.editor.currentVersionId ?? projectVersions[0]?.id ?? null,
          ),
          workspaces,
          workspaceId: currentWorkspaceId,
          workspaceName: getWorkspaceName(workspaces, currentWorkspaceId, get().workspaceName),
          projects,
          activeProjectId: currentProjectId,
          projectVersions,
        });
        return;
      }

      const emptyDocument = createEmptyProjectDocument(
        fallbackProjectName,
        currentProjectId,
        undefined,
        [],
        get().targetPlatform,
        get().projectArchetype,
      );
      const flattened = flattenProjectDocument(emptyDocument);

      set({
        ...applyFlattenedProject(
          flattened,
          emptyDocument.editor.lastSavedAt ?? null,
          emptyDocument.editor.currentVersionId ?? null,
        ),
        workspaces,
        workspaceId: currentWorkspaceId,
        workspaceName: getWorkspaceName(workspaces, currentWorkspaceId, get().workspaceName),
        projects,
        activeProjectId: currentProjectId,
        isHydrated: true,
        persistenceState: 'idle',
        lastError: null,
        projectVersions,
      });
    } catch (error) {
      set({
        isHydrated: true,
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  refreshProjectVersions: async (projectId) => {
    const targetProjectId = projectId ?? get().projectId;
    const projectVersions = await builderWorkspaceGateway.listProjectVersions(targetProjectId);
    set({ projectVersions });
  },

  checkoutProjectVersion: async (versionId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    if (!versionId) return;

    set({ persistenceState: 'switching', lastError: null });

    try {
      const version = state.projectVersions.find((entry) => entry.id === versionId)
        ?? await builderWorkspaceGateway.loadProjectVersion(versionId);
      if (!version) {
        throw new Error('Version not found.');
      }

      const timestamp = new Date().toISOString();
      const restoredDocument = buildPersistedDocument(
        ProjectDocumentSchema.parse({
          ...version.document,
          editor: {
            ...version.document.editor,
            releaseVersionId: state.releaseVersionId,
          },
        }),
        state.projectId,
        version.document.project.name,
        timestamp,
        versionId,
      );
      const flattened = flattenProjectDocument(restoredDocument);

      persistLegacyLocalSnapshot({
        dataSources: flattened.dataSources ?? createDefaultDataSources(),
        runtimeEnv: flattened.runtimeEnv ?? {},
        themeId: flattened.themeId ?? DEFAULT_BUILDER_THEME_ID,
        themeLibrary: flattened.themeLibrary ?? [],
        widgets: flattened.widgets ?? {},
        layouts: flattened.layouts ?? { root: [] },
        customTemplates: flattened.customTemplates ?? [],
        kitStudioWidgets: flattened.kitStudioWidgets ?? {},
        kitStudioLayouts: flattened.kitStudioLayouts ?? { root: [] },
      });

      set({
        ...applyFlattenedProject(
          flattened,
          restoredDocument.editor.lastSavedAt ?? timestamp,
          versionId,
        ),
        workspaces: state.workspaces,
        workspaceId: state.workspaceId,
        workspaceName: state.workspaceName,
        projects: state.projects,
        activeProjectId: state.projectId,
        currentVersionId: versionId,
        projectVersions: state.projectVersions,
        persistenceState: 'switching',
        lastError: null,
      });

      await builderWorkspaceGateway.saveProjectDraft({
        id: state.projectId,
        projectId: state.projectId,
        name: restoredDocument.project.name,
        document: restoredDocument,
        createdAt: restoredDocument.project.createdAt,
        updatedAt: timestamp,
      }, {
        createSnapshot: false,
        reason: `checkout:${versionId}`,
        setActive: true,
        workspaceId: state.workspaceId,
      });

      const workspaces = await builderWorkspaceGateway.listWorkspaces();
      const projects = await builderWorkspaceGateway.listProjects(state.workspaceId);

      set({
        workspaces,
        workspaceId: state.workspaceId,
        workspaceName: getWorkspaceName(workspaces, state.workspaceId, state.workspaceName),
        projects,
        activeProjectId: state.projectId,
        currentVersionId: versionId,
        persistenceState: 'saved',
        lastError: null,
      });
    } catch (error) {
      set({
        persistenceState: 'error',
        lastError: getErrorMessage(error),
      });
      throw error;
    }
  },

  setReleaseVersion: async (versionId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    const nextReleaseVersionId = versionId ?? null;
    if (nextReleaseVersionId === state.releaseVersionId) return;
    if (nextReleaseVersionId && !state.projectVersions.some((version) => version.id === nextReleaseVersionId)) {
      throw new Error('Release version not found.');
    }

    const timestamp = new Date().toISOString();
    const syncedDocument = buildPersistedDocument(
      ProjectDocumentSchema.parse({
        ...buildProjectDocument(toLegacySnapshot(state)),
        editor: {
          ...buildProjectDocument(toLegacySnapshot(state)).editor,
          releaseVersionId: nextReleaseVersionId,
        },
      }),
      state.projectId,
      state.projectName,
      timestamp,
      state.currentVersionId,
    );

    await builderWorkspaceGateway.saveProjectDraft({
      id: state.projectId,
      projectId: state.projectId,
      name: state.projectName,
      document: syncedDocument,
      createdAt: state.lastSavedAt ?? timestamp,
      updatedAt: timestamp,
    }, {
      createSnapshot: false,
      reason: nextReleaseVersionId ? `set-release:${nextReleaseVersionId}` : 'clear-release',
      setActive: true,
      workspaceId: state.workspaceId,
    });

    const workspaces = await builderWorkspaceGateway.listWorkspaces();
    const projects = await builderWorkspaceGateway.listProjects(state.workspaceId);
    set({
      workspaces,
      projects,
      workspaceId: state.workspaceId,
      workspaceName: getWorkspaceName(workspaces, state.workspaceId, state.workspaceName),
      lastSavedAt: timestamp,
      persistenceState: 'saved',
      lastError: null,
      releaseVersionId: nextReleaseVersionId,
    });
  },

  deleteProjectVersion: async (versionId) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    if (!versionId || versionId === state.currentVersionId) return;

    await builderWorkspaceGateway.deleteProjectVersion(versionId);
    const projectVersions = await builderWorkspaceGateway.listProjectVersions(state.projectId);
    if (state.releaseVersionId === versionId) {
      await get().setReleaseVersion(null);
    }
    set({
      projectVersions,
      releaseVersionId: state.releaseVersionId === versionId ? null : state.releaseVersionId,
    });
  },

  exportProject: () => {
    const state = get();
    if (!hasProjectRecord(state.projects, state.projectId)) {
      throw new Error('Create or import a project before exporting.');
    }
    const timestamp = new Date().toISOString();
    const activeProject = state.projects.find((project) => project.id === state.projectId);
    const currentDocument = buildProjectDocument(toLegacySnapshot(state));
    const draftDocument = ProjectDocumentSchema.parse({
      ...currentDocument,
      project: {
        ...currentDocument.project,
        id: state.projectId,
        name: state.projectName,
        createdAt: toStrictIsoDateTime(activeProject?.createdAt ?? currentDocument.project.createdAt, currentDocument.project.createdAt),
        updatedAt: toStrictIsoDateTime(timestamp, currentDocument.project.updatedAt),
      },
      editor: {
        ...currentDocument.editor,
        lastSavedAt: state.lastSavedAt ? toStrictIsoDateTime(state.lastSavedAt, timestamp) : null,
        currentVersionId: state.currentVersionId,
      },
    });

    const bundle = ProjectBundleSchema.parse({
      bundleKind: 'project-bundle',
      bundleSchemaVersion: 1,
      exportedAt: timestamp,
      source: {
        platform: 'frontend-experience-orchestrator',
        ownerId: activeProject?.ownerId ?? state.session?.viewer.id ?? LOCAL_OWNER_ID,
        ownerName: state.session?.viewer.name?.trim() || undefined,
        workspaceId: state.workspaceId,
      },
      project: {
        id: state.projectId,
        name: state.projectName,
        targetPlatform: state.targetPlatform,
        archetype: state.projectArchetype,
      },
      currentVersionId: state.currentVersionId,
      releaseVersionId: state.releaseVersionId,
      draft: draftDocument,
      versions: state.projectVersions.map((version, index, versions) => ({
        snapshotId: version.id,
        versionNumber: version.versionNumber ?? Math.max(1, versions.length - index),
        name: version.name,
        reason: version.reason,
        createdAt: version.createdAt,
        document: ProjectDocumentSchema.parse(version.document),
      })),
    });

    return stringifyProjectBundle(bundle);
  },

  importProject: async (input, options) => {
    const state = get();
    ensureWorkspaceAccess(state.session);
    const bundle = typeof input === 'string'
      ? parseProjectBundleJson(input)
      : ProjectBundleSchema.parse(input);
    const currentOwnerId = state.session?.viewer.id ?? LOCAL_OWNER_ID;
    const analysis = analyzeProjectBundleImport({
      bundle,
      currentOwnerId,
      existingProjectIds: state.projects.map((project) => project.id),
    });

    if (analysis.requiresOverwriteConfirmation && !options?.overwriteExisting) {
      throw new Error('Import requires overwrite confirmation for the existing project.');
    }

    const timestamp = new Date().toISOString();
    const targetProjectId = analysis.willForkProject ? createProjectId() : bundle.project.id;
    const targetProjectName = bundle.project.name;
    const existingProject = state.projects.find((project) => project.id === bundle.project.id);
    const importedProjectCreatedAt = analysis.willForkProject
      ? timestamp
      : existingProject?.createdAt ?? bundle.draft.project.createdAt ?? timestamp;
    const versionIdMap = new Map<string, string>();

    bundle.versions.forEach((version) => {
      versionIdMap.set(version.snapshotId, nanoid(12));
    });

    const mappedCurrentVersionId = bundle.currentVersionId
      ? (versionIdMap.get(bundle.currentVersionId) ?? null)
      : null;
    const sourceReleaseVersionId = bundle.releaseVersionId ?? bundle.draft.editor.releaseVersionId ?? null;
    const mappedReleaseVersionId = sourceReleaseVersionId
      ? (versionIdMap.get(sourceReleaseVersionId) ?? null)
      : null;

    const snapshots = bundle.versions.map((version) => ({
      id: versionIdMap.get(version.snapshotId) ?? nanoid(12),
      projectId: targetProjectId,
      name: targetProjectName,
      reason: version.reason,
        document: cloneBundleDocumentForImport(version.document, {
          projectId: targetProjectId,
          projectName: targetProjectName,
          currentVersionId: mappedCurrentVersionId,
          releaseVersionId: mappedReleaseVersionId,
          projectCreatedAt: importedProjectCreatedAt,
        }),
      createdAt: version.createdAt,
      versionNumber: version.versionNumber,
    }));

    const draftDocument = cloneBundleDocumentForImport(bundle.draft, {
      projectId: targetProjectId,
      projectName: targetProjectName,
      currentVersionId: mappedCurrentVersionId,
      releaseVersionId: mappedReleaseVersionId,
      projectCreatedAt: importedProjectCreatedAt,
      projectUpdatedAt: timestamp,
    });

    const persistedDocument = buildPersistedDocument(
      draftDocument,
      targetProjectId,
      targetProjectName,
      timestamp,
      mappedCurrentVersionId,
    );

    await builderWorkspaceGateway.saveProjectBundle({
      draft: {
        id: targetProjectId,
        projectId: targetProjectId,
        name: targetProjectName,
        document: persistedDocument,
        createdAt: importedProjectCreatedAt,
        updatedAt: timestamp,
      },
      snapshots,
    }, {
      replaceExisting: analysis.requiresOverwriteConfirmation,
      setActive: true,
      workspaceId: state.workspaceId,
      ownerId: currentOwnerId,
    });

    const workspaces = await builderWorkspaceGateway.listWorkspaces();
    const projects = await builderWorkspaceGateway.listProjects(state.workspaceId);
    const projectVersions = await builderWorkspaceGateway.listProjectVersions(targetProjectId);
    const flattened = flattenProjectDocument(persistedDocument);

    set({
      ...applyFlattenedProject(
        flattened,
        persistedDocument.editor.lastSavedAt ?? timestamp,
        mappedCurrentVersionId,
      ),
      workspaces,
      workspaceId: state.workspaceId,
      workspaceName: getWorkspaceName(workspaces, state.workspaceId, state.workspaceName),
      projects,
      activeProjectId: targetProjectId,
      currentVersionId: mappedCurrentVersionId,
      releaseVersionId: mappedReleaseVersionId,
      projectVersions,
    });

    return {
      outcome: analysis.willForkProject ? 'forked' : analysis.requiresOverwriteConfirmation ? 'overwritten' : 'created',
      projectId: targetProjectId,
      projectName: targetProjectName,
      versionCount: projectVersions.length,
      importedOwnerId: bundle.source.ownerId,
    };
  },

  setDraggedType: (type) => set({ draggedType: type }),

  addWidget: (id, type, layoutItem, parentId = 'root', initialProps, scope = 'page') => set((state) => {
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const currentWidgets = getWorkspaceWidgets(state, scope);
    const newLayouts = { ...currentLayouts };
    if (!newLayouts[parentId]) newLayouts[parentId] = [];
    const defaultMinSize = getDefaultWidgetMinSize(type);
    const newWidgets = {
      ...currentWidgets,
      [id]: {
        id,
        type,
        parentId,
        props: initialProps ? cloneJson(initialProps) : cloneDefaultWidgetProps(type),
      },
    };
    newLayouts[parentId] = normalizeLayoutForParentScope(
      [...newLayouts[parentId], normalizeLayoutItem({
        ...layoutItem,
        minW: layoutItem.minW ?? defaultMinSize.minW,
        minH: layoutItem.minH ?? defaultMinSize.minH,
      })],
      newWidgets,
      newLayouts,
      parentId,
      scope,
    );

    return {
      ...(scope === 'kit'
        ? {
            kitStudioWidgets: newWidgets,
            kitStudioLayouts: newLayouts,
            selectedKitStudioId: id,
          }
        : {
            widgets: newWidgets,
            layouts: newLayouts,
            selectedId: id,
            links: getActionSyncedLinks(toLegacySnapshot({
              ...state,
              widgets: newWidgets,
              layouts: newLayouts,
            })),
          }),
    };
  }),

  moveWidget: (id, targetParentId, layoutItem, scope = 'page') => set((state) => {
    const currentWidgets = getWorkspaceWidgets(state, scope);
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const widget = currentWidgets[id];
    if (!widget) return state;
    if (targetParentId === id) return state;
    if (isDescendantParent(currentWidgets, id, targetParentId)) return state;

    const normalizedItem = normalizeLayoutItem({ ...layoutItem, i: id });
    const nextLayouts = { ...currentLayouts };

    const sourceParentId = widget.parentId;
    if (nextLayouts[sourceParentId]) {
      nextLayouts[sourceParentId] = nextLayouts[sourceParentId].filter((item) => item.i !== id);
    }

    if (!nextLayouts[targetParentId]) nextLayouts[targetParentId] = [];
    const nextWidgets = {
      ...currentWidgets,
      [id]: { ...widget, parentId: targetParentId },
    };
    nextLayouts[targetParentId] = normalizeLayoutForParentScope([
      ...nextLayouts[targetParentId].filter((item) => item.i !== id),
      normalizedItem,
    ], nextWidgets, nextLayouts, targetParentId, scope);

    return {
      ...(scope === 'kit'
        ? {
            kitStudioWidgets: nextWidgets,
            kitStudioLayouts: nextLayouts,
            selectedKitStudioId: id,
          }
        : {
            widgets: nextWidgets,
            layouts: nextLayouts,
            selectedId: id,
          }),
    };
  }),

  updateLayout: (parentId, layout, scope = 'page') => set((state) => {
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const currentWidgets = getWorkspaceWidgets(state, scope);
    const currentLayout = normalizeLayout(currentLayouts[parentId] || [])
      .filter((item) => layoutItemBelongsToParent(currentWidgets, parentId, item));
    const incomingLayout = normalizeLayoutForParentScope(layout, currentWidgets, currentLayouts, parentId, scope)
      .filter((item) => layoutItemBelongsToParent(currentWidgets, parentId, item));
    const layoutIds = new Set(incomingLayout.map((item) => item.i));
    const missing = currentLayout.filter((item) => (
      !layoutIds.has(item.i) && layoutItemBelongsToParent(currentWidgets, parentId, item)
    ));
    const nextLayout = normalizeLayoutForParentScope(
      [...incomingLayout, ...missing],
      currentWidgets,
      currentLayouts,
      parentId,
      scope,
    ).filter((item) => layoutItemBelongsToParent(currentWidgets, parentId, item));

    if (areLayoutsEqual(currentLayout, nextLayout)) {
      return state;
    }

    return {
      ...(scope === 'kit'
        ? {
            kitStudioLayouts: {
              ...currentLayouts,
              [parentId]: nextLayout,
            },
          }
        : {
            layouts: {
              ...currentLayouts,
              [parentId]: nextLayout,
            },
          }),
    };
  }),

  updateLayoutItem: (id, parentId, updates, scope = 'page') => set((state) => {
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const currentLayout = currentLayouts[parentId] || [];
    const currentWidgets = getWorkspaceWidgets(state, scope);
    let changed = false;
    const newLayout = currentLayout.map((item) => {
      if (item.i !== id) return item;

      const merged = { ...item, ...updates };
      const minW = merged.minW != null ? Math.max(1, toNumber(merged.minW, 1)) : undefined;
      const minH = merged.minH != null ? Math.max(1, toNumber(merged.minH, 1)) : undefined;
      const width = Math.max(1, toNumber(merged.w, 1));
      const height = Math.max(1, toNumber(merged.h, 1));
      const nextItem = normalizeLayoutItemForParentScope({
        ...merged,
        minW,
        minH,
        w: Math.max(width, minW ?? 1),
        h: Math.max(height, minH ?? 1),
      }, currentWidgets, currentLayouts, parentId, scope);

      if (
        nextItem.x !== item.x ||
        nextItem.y !== item.y ||
        nextItem.w !== item.w ||
        nextItem.h !== item.h ||
        nextItem.minW !== item.minW ||
        nextItem.minH !== item.minH
      ) {
        changed = true;
        return nextItem;
      }

      return item;
    });

    if (!changed) {
      return state;
    }

    return {
      ...(scope === 'kit'
        ? {
            kitStudioLayouts: {
              ...currentLayouts,
              [parentId]: newLayout,
            },
          }
        : {
            layouts: {
              ...currentLayouts,
              [parentId]: newLayout,
            },
          }),
    };
  }),

  updateWidgetProps: (id, props, scope = 'page') => set((state) => {
    const currentWidgets = getWorkspaceWidgets(state, scope);
    if (!currentWidgets[id]) return state;

    const currentWidget = currentWidgets[id];
    const nextWidgetProps = {
      ...currentWidget.props,
      ...props,
    };

    if (
      currentWidget.type === 'panel'
      && props.showHeader === true
    ) {
      const nextHeaderText = typeof nextWidgetProps.title === 'string'
        ? nextWidgetProps.title.trim()
        : '';

      if (nextHeaderText.length === 0) {
        nextWidgetProps.title = 'Header';
      }
    }

    if (currentWidget.type === 'panel') {
      const fallbackHorizontal = Number.isFinite(Number(nextWidgetProps.paddingX))
        ? Number(nextWidgetProps.paddingX)
        : 16;
      const fallbackVertical = Number.isFinite(Number(nextWidgetProps.paddingY))
        ? Number(nextWidgetProps.paddingY)
        : 16;

      const resolvePanelPadding = (value: unknown, fallback: number) => {
        const nextValue = Number(value);
        return Number.isFinite(nextValue) ? Math.max(0, Math.round(nextValue)) : fallback;
      };

      const horizontalLinked = nextWidgetProps.linkHorizontalPadding !== false;
      const verticalLinked = nextWidgetProps.linkVerticalPadding !== false;

      let nextPaddingLeft = resolvePanelPadding(nextWidgetProps.paddingLeft, fallbackHorizontal);
      let nextPaddingRight = resolvePanelPadding(nextWidgetProps.paddingRight, fallbackHorizontal);
      let nextPaddingTop = resolvePanelPadding(nextWidgetProps.paddingTop, fallbackVertical);
      let nextPaddingBottom = resolvePanelPadding(nextWidgetProps.paddingBottom, fallbackVertical);

      if (horizontalLinked) {
        if (props.paddingRight !== undefined && props.paddingLeft === undefined) {
          nextPaddingLeft = nextPaddingRight;
        } else {
          nextPaddingRight = nextPaddingLeft;
        }
      }

      if (verticalLinked) {
        if (props.paddingBottom !== undefined && props.paddingTop === undefined) {
          nextPaddingTop = nextPaddingBottom;
        } else {
          nextPaddingBottom = nextPaddingTop;
        }
      }

      nextWidgetProps.linkHorizontalPadding = horizontalLinked;
      nextWidgetProps.linkVerticalPadding = verticalLinked;
      nextWidgetProps.paddingLeft = nextPaddingLeft;
      nextWidgetProps.paddingRight = nextPaddingRight;
      nextWidgetProps.paddingTop = nextPaddingTop;
      nextWidgetProps.paddingBottom = nextPaddingBottom;
      nextWidgetProps.paddingX = nextPaddingLeft;
      nextWidgetProps.paddingY = nextPaddingTop;
    }

    const nextWidgets = {
      ...currentWidgets,
      [id]: {
        ...currentWidget,
        props: nextWidgetProps,
      },
    };

    return {
      ...(scope === 'kit'
        ? {
            kitStudioWidgets: nextWidgets,
          }
        : {
            widgets: nextWidgets,
            links: props.actions !== undefined
              ? getActionSyncedLinks(toLegacySnapshot({
                  ...state,
                  widgets: nextWidgets,
                }))
              : state.links,
          }),
    };
  }),

  selectWidget: (id, scope = 'page') => set(
    scope === 'kit'
      ? { selectedKitStudioId: id }
      : { selectedId: id },
  ),

  removeWidget: (id, scope = 'page') => set((state) => {
    const currentWidgets = getWorkspaceWidgets(state, scope);
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const widget = currentWidgets[id];
    if (!widget) return state;

    const newWidgets = { ...currentWidgets };
    const newLayouts = { ...currentLayouts };
    const removedIds = new Set<string>();

    const removeRecursively = (nodeId: string) => {
      const current = newWidgets[nodeId];
      if (!current) return;

      const children = (newLayouts[nodeId] ?? []).map((item) => item.i);
      children.forEach(removeRecursively);
      removedIds.add(nodeId);
      delete newWidgets[nodeId];
      delete newLayouts[nodeId];
    };

    if (newLayouts[widget.parentId]) {
      newLayouts[widget.parentId] = newLayouts[widget.parentId].filter((item) => item.i !== id);
    }

    removeRecursively(id);

    const nextSelectedId = removedIds.has(state.selectedId ?? '') ? null : state.selectedId;
    const nextSelectedKitStudioId = removedIds.has(state.selectedKitStudioId ?? '') ? null : state.selectedKitStudioId;

    return {
      ...(scope === 'kit'
        ? {
            kitStudioWidgets: newWidgets,
            kitStudioLayouts: newLayouts,
            selectedKitStudioId: nextSelectedKitStudioId,
          }
        : {
            widgets: newWidgets,
            layouts: newLayouts,
            selectedId: nextSelectedId,
            links: getActionSyncedLinks(toLegacySnapshot({
              ...state,
              widgets: newWidgets,
              layouts: newLayouts,
            })),
          }),
    };
  }),

  extractTemplate: (id, scope = 'page') => set((state) => {
    const document = buildProjectDocument(toLegacySnapshot(state));
    const sourceNodes = scope === 'kit'
      ? document.editor.kitStudio.nodes
      : (document.project.pages.find((entry) => entry.id === document.editor.selectedPageId) ?? document.project.pages[0])?.nodes;
    if (!sourceNodes) return state;
    const rootNode = findNodeById(sourceNodes, id);
    if (!rootNode) return state;

    const currentWidgets = getWorkspaceWidgets(state, scope);
    const currentWidget = currentWidgets[id];
    const existingTemplateId = typeof currentWidget?.props?.kitTemplateId === 'string' && currentWidget.props.kitTemplateId.trim().length > 0
      ? currentWidget.props.kitTemplateId.trim()
      : null;
    const baseName = typeof currentWidget?.props?.title === 'string' && currentWidget.props.title
      ? String(currentWidget.props.title)
      : typeof currentWidget?.props?.text === 'string' && currentWidget.props.text
        ? String(currentWidget.props.text)
        : `Template ${state.customTemplates.length + 1}`;
    const templateId = existingTemplateId ?? createTemplateId();
    const templateRoot = cloneJson(rootNode);
    templateRoot.props = {
      ...(templateRoot.props ?? {}),
      kitTemplateId: templateId,
    };

    const nextTemplate: LegacyTemplateRecord = {
      id: templateId,
      name: baseName,
      data: templateRoot,
    };

    const nextCustomTemplates = existingTemplateId
      ? state.customTemplates.map((template) => (
          template.id === existingTemplateId ? nextTemplate : template
        ))
      : [...state.customTemplates, nextTemplate];

    return {
      customTemplates: nextCustomTemplates,
      ...(scope === 'kit' && currentWidget
        ? {
            kitStudioWidgets: {
              ...state.kitStudioWidgets,
              [id]: {
                ...currentWidget,
                props: {
                  ...currentWidget.props,
                  kitTemplateId: templateId,
                },
              },
            },
          }
        : {}),
    };
  }),

  addTemplateNode: (template, parentId, x, y, scope = 'page') => set((state) => {
    const currentWidgets = getWorkspaceWidgets(state, scope);
    const currentLayouts = getWorkspaceLayouts(state, scope);
    const nextWidgets = { ...currentWidgets };
    const nextLayouts = { ...currentLayouts };

    const instantiateNode = (
      rawNode: any,
      targetParentId: string,
      positionOverride?: Partial<LegacyLayoutItem>,
    ): string | null => {
      const nodeType = isWidgetType(rawNode?.type) ? rawNode.type : null;
      if (!nodeType) return null;

      const layoutInput = rawNode?.layout ?? rawNode?.localLayout ?? {};
      const defaultMinSize = getDefaultWidgetMinSize(nodeType);
      const newId = createWidgetId();
      const layoutItem = normalizeLayoutItem({
        i: newId,
        x: positionOverride?.x ?? layoutInput.x ?? 0,
        y: positionOverride?.y ?? layoutInput.y ?? 0,
        w: positionOverride?.w ?? layoutInput.w ?? 4,
        h: positionOverride?.h ?? layoutInput.h ?? 4,
        minW: positionOverride?.minW ?? layoutInput.minW ?? defaultMinSize.minW,
        minH: positionOverride?.minH ?? layoutInput.minH ?? defaultMinSize.minH,
      });

      if (!nextLayouts[targetParentId]) nextLayouts[targetParentId] = [];
      nextLayouts[targetParentId] = [...nextLayouts[targetParentId], layoutItem];

      const childBindings = Array.isArray(rawNode?.bindings) ? cloneJson(rawNode.bindings) : [];
      const childActions = Array.isArray(rawNode?.actions) ? cloneJson(rawNode.actions) : [];

      nextWidgets[newId] = {
        id: newId,
        type: nodeType,
        parentId: targetParentId,
        props: {
          ...cloneDefaultWidgetProps(nodeType),
          ...(rawNode?.props ? (() => {
            const nextProps = cloneJson(rawNode.props);
            if (scope === 'page') {
              delete nextProps.kitTemplateId;
            }
            return nextProps;
          })() : {}),
          sourceTemplateId: typeof template.id === 'string' ? template.id : undefined,
          sourceTemplateName: typeof template.name === 'string' ? template.name : undefined,
          sourceTemplateNodeId: typeof rawNode?.id === 'string' ? rawNode.id : undefined,
          bindings: childBindings,
          actions: childActions,
        },
      };

      if (Array.isArray(rawNode?.children) && rawNode.children.length > 0) {
        nextLayouts[newId] = [];
        rawNode.children.forEach((child: any) => {
          instantiateNode(child, newId);
        });
      }

      return newId;
    };

    const rootNode = template.data?.root ? template.data.root : template.data;
    const createdId = instantiateNode(rootNode, parentId, { x, y });
    if (createdId && nextWidgets[createdId]) {
      nextWidgets[createdId] = {
        ...nextWidgets[createdId],
        props: {
          ...nextWidgets[createdId].props,
          kitTemplateName: typeof template.name === 'string' && template.name.trim()
            ? template.name.trim()
            : nextWidgets[createdId].props.kitTemplateName,
        },
      };
    }

    return {
      ...(scope === 'kit'
        ? {
            kitStudioWidgets: nextWidgets,
            kitStudioLayouts: nextLayouts,
            selectedKitStudioId: createdId,
          }
        : {
            widgets: nextWidgets,
            layouts: nextLayouts,
            selectedId: createdId,
            links: getActionSyncedLinks(toLegacySnapshot({
              ...state,
              widgets: nextWidgets,
              layouts: nextLayouts,
            })),
          }),
    };
  }),
}));
