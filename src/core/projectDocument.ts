import { nanoid } from 'nanoid';
import { isWidgetType, type WidgetType } from '../builder/widgetConfig';
import { DEFAULT_BUILDER_THEME_ID, type BuilderThemeId, type BuilderThemeManifest } from '../theme/presets';
import {
  BuilderNodeSchema,
  PageSchema,
  ProjectDocumentSchema,
  PROJECT_SCHEMA_VERSION,
  type BuilderDataSource,
  type BuilderPage,
  type BuilderPageLink,
  type BuilderNodeDocument,
  type BuilderTemplate,
  type ProjectDocument,
  type ProjectArchetype,
  type TargetPlatform,
} from '../schema/project';

export const DEFAULT_PROJECT_ID = 'frontend-experience-orchestrator';
export const DEFAULT_PAGE_ID = 'page-home';
export const DEFAULT_PROJECT_NAME = 'Frontend Experience Orchestrator';
export const DEFAULT_PAGE_NAME = 'Home';

export type LegacyLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type LegacyWidgetData = {
  id: string;
  type: WidgetType;
  props: Record<string, any>;
  parentId: string;
};

export type LegacyTemplateRecord = {
  id: string;
  name: string;
  data: any;
};

export type LegacyBuilderSnapshot = {
  projectId?: string;
  projectName?: string;
  targetPlatform?: TargetPlatform;
  projectArchetype?: ProjectArchetype;
  releaseVersionId?: string | null;
  themeId?: BuilderThemeId;
  themeLibrary?: BuilderThemeManifest[];
  dataSources?: BuilderDataSource[];
  runtimeEnv?: Record<string, string>;
  pages?: BuilderPage[];
  links?: BuilderPageLink[];
  selectedPageId?: string | null;
  widgets: Record<string, LegacyWidgetData>;
  layouts: Record<string, LegacyLayoutItem[]>;
  customTemplates: LegacyTemplateRecord[];
  kitStudioWidgets?: Record<string, LegacyWidgetData>;
  kitStudioLayouts?: Record<string, LegacyLayoutItem[]>;
};

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const toIsoNow = () => new Date().toISOString();

const normalizeWidgetType = (value: unknown): WidgetType => {
  return isWidgetType(value) ? value : 'text';
};

const sanitizeStructuredArray = <T>(value: unknown, fallback: T[]) => {
  return Array.isArray(value) ? cloneJson(value) : fallback;
};

const sanitizeProps = (props: Record<string, any> | undefined) => {
  if (!props || typeof props !== 'object') return {};
  const next = cloneJson(props);
  delete next.bindings;
  delete next.actions;
  return next as Record<string, unknown>;
};

const normalizeNodeInput = (nodeData: any, fallbackLayout?: Partial<BuilderNodeDocument['layout']>): BuilderNodeDocument => {
  const rawLayout = nodeData?.layout ?? nodeData?.localLayout ?? {};
  const candidate: BuilderNodeDocument = {
    id: typeof nodeData?.id === 'string' && nodeData.id ? nodeData.id : createWidgetId(),
    type: normalizeWidgetType(nodeData?.type),
    props: sanitizeProps(nodeData?.props),
    layout: {
      x: Math.round(toNumber(rawLayout?.x, fallbackLayout?.x ?? 0)),
      y: Math.round(toNumber(rawLayout?.y, fallbackLayout?.y ?? 0)),
      w: Math.max(1, toNumber(rawLayout?.w, fallbackLayout?.w ?? 4)),
      h: Math.max(1, toNumber(rawLayout?.h, fallbackLayout?.h ?? 4)),
      minW: rawLayout?.minW != null ? Math.max(1, toNumber(rawLayout.minW, 1)) : undefined,
      minH: rawLayout?.minH != null ? Math.max(1, toNumber(rawLayout.minH, 1)) : undefined,
    },
    bindings: sanitizeStructuredArray(nodeData?.bindings ?? nodeData?.props?.bindings, []),
    actions: sanitizeStructuredArray(nodeData?.actions ?? nodeData?.props?.actions, []),
    children: Array.isArray(nodeData?.children)
      ? nodeData.children.map((child: any) => normalizeNodeInput(child))
      : [],
    meta: typeof nodeData?.meta === 'object' && nodeData.meta ? cloneJson(nodeData.meta) : {},
  };

  return BuilderNodeSchema.parse(candidate);
};

const normalizeTemplateRecord = (template: LegacyTemplateRecord): BuilderTemplate => {
  return {
    id: typeof template?.id === 'string' && template.id ? template.id : createTemplateId(),
    name: typeof template?.name === 'string' && template.name ? template.name : 'Template',
    root: normalizeNodeInput(template?.data, { x: 0, y: 0, w: 4, h: 4 }),
  };
};

export const createWidgetId = () => `widget_${nanoid(10)}`;
export const createTemplateId = () => `tpl_${nanoid(10)}`;
export const createProjectId = () => `project_${nanoid(10)}`;

const sanitizeIdToken = (value: string) => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'project'
);

export const createPageId = (projectId?: string, kind: BuilderPage['kind'] = 'page') => (
  `${kind}-${sanitizeIdToken(projectId ?? DEFAULT_PROJECT_ID)}-${nanoid(6)}`
);
export const createPageLinkId = () => `plink_${nanoid(10)}`;

export const createDefaultDataSources = (): BuilderDataSource[] => [
  {
    id: 'source_mock_main',
    name: 'Mock Content',
    kind: 'mock',
    config: {
      payload: {
        site: {
          title: 'Frontend Experience Orchestrator',
          subtitle: 'Standard runtime and data skeleton',
        },
        metrics: {
          totalUsers: '12,480',
          conversion: '+18%',
        },
        collection: [
          { title: 'Entry A', summary: 'First mock item' },
          { title: 'Entry B', summary: 'Second mock item' },
        ],
      },
    },
  },
];

export const createEmptyProjectDocument = (
  projectName = DEFAULT_PROJECT_NAME,
  projectId = DEFAULT_PROJECT_ID,
  themeId: BuilderThemeId = DEFAULT_BUILDER_THEME_ID,
  themeLibrary: BuilderThemeManifest[] = [],
  targetPlatform: TargetPlatform = 'desktop-web',
  archetype: ProjectArchetype = 'dashboard-workspace',
): ProjectDocument => {
  const timestamp = toIsoNow();
  return ProjectDocumentSchema.parse({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: {
      id: projectId,
      name: projectName,
      pages: [],
      templates: [],
      dataSources: createDefaultDataSources(),
      settings: {
        homePageId: null,
        targetPlatform,
        archetype,
        themeId,
        themeLibrary,
        runtimeEnv: {},
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    editor: {
      selectedPageId: null,
      lastSavedAt: null,
      currentVersionId: null,
      releaseVersionId: null,
      kitStudio: {
        nodes: [],
      },
    },
  });
};

export const createPageDraft = (
  name: string,
  route: string,
  options?: Partial<BuilderPage>,
): BuilderPage => PageSchema.parse({
  id: options?.id ?? createPageId(undefined, options?.kind ?? 'page'),
  name,
  route,
  kind: options?.kind ?? 'page',
  ownerPageId: options?.ownerPageId,
  board: {
    x: options?.board?.x ?? 0,
    y: options?.board?.y ?? 0,
    width: options?.board?.width ?? 1440,
    height: options?.board?.height ?? 900,
  },
  layoutMode: options?.layoutMode ?? 'grid',
  nodes: options?.nodes ?? [],
});

const serializeNode = (
  nodeId: string,
  parentId: string,
  widgets: Record<string, LegacyWidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
): BuilderNodeDocument | null => {
  const widget = widgets[nodeId];
  if (!widget) return null;

  const layoutItem = layouts[parentId]?.find((item) => item.i === nodeId);
  if (!layoutItem) return null;

  const children = (layouts[nodeId] ?? [])
    .map((childLayout) => serializeNode(childLayout.i, nodeId, widgets, layouts))
    .filter((node): node is BuilderNodeDocument => Boolean(node));

  return BuilderNodeSchema.parse({
    id: widget.id,
    type: widget.type,
    props: sanitizeProps(widget.props),
    layout: {
      x: Math.round(toNumber(layoutItem.x)),
      y: Math.round(toNumber(layoutItem.y)),
      w: Math.max(1, toNumber(layoutItem.w, 1)),
      h: Math.max(1, toNumber(layoutItem.h, 1)),
      minW: layoutItem.minW != null ? Math.max(1, toNumber(layoutItem.minW, 1)) : undefined,
      minH: layoutItem.minH != null ? Math.max(1, toNumber(layoutItem.minH, 1)) : undefined,
    },
    bindings: sanitizeStructuredArray(widget.props?.bindings, []),
    actions: sanitizeStructuredArray(widget.props?.actions, []),
    children,
    meta: {},
  });
};

export const buildPageNodesFromLegacy = (snapshot: Pick<LegacyBuilderSnapshot, 'widgets' | 'layouts'>) => {
  return (snapshot.layouts.root ?? [])
    .map((layoutItem) => serializeNode(layoutItem.i, 'root', snapshot.widgets, snapshot.layouts))
    .filter((node): node is BuilderNodeDocument => Boolean(node));
};

export const buildNodesFromLegacy = (
  widgets: Record<string, LegacyWidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
) => {
  return (layouts.root ?? [])
    .map((layoutItem) => serializeNode(layoutItem.i, 'root', widgets, layouts))
    .filter((node): node is BuilderNodeDocument => Boolean(node));
};

export const flattenPageNodes = (page: BuilderPage) => {
  const widgets: Record<string, LegacyWidgetData> = {};
  const layouts: Record<string, LegacyLayoutItem[]> = { root: [] };

  page.nodes.forEach((node) => flattenNode(node, 'root', widgets, layouts));

  return { widgets, layouts };
};

export const buildProjectDocument = (snapshot: LegacyBuilderSnapshot): ProjectDocument => {
  const current = createEmptyProjectDocument(
    snapshot.projectName ?? DEFAULT_PROJECT_NAME,
    snapshot.projectId ?? DEFAULT_PROJECT_ID,
    snapshot.themeId ?? DEFAULT_BUILDER_THEME_ID,
    snapshot.themeLibrary ?? [],
    snapshot.targetPlatform ?? 'desktop-web',
    snapshot.projectArchetype ?? 'dashboard-workspace',
  );
  const timestamp = toIsoNow();
  const selectedPageId = snapshot.selectedPageId
    ?? snapshot.pages?.[0]?.id
    ?? current.editor.selectedPageId;
  const nodes = buildPageNodesFromLegacy(snapshot);
  const legacyKitStudioNodes = buildNodesFromLegacy(
    snapshot.kitStudioWidgets ?? {},
    snapshot.kitStudioLayouts ?? { root: [] },
  );
  const kitStudioNodes = legacyKitStudioNodes.length > 0
    ? legacyKitStudioNodes
    : (snapshot.customTemplates ?? []).map((template) => {
        const normalizedTemplate = normalizeTemplateRecord(template);
        return BuilderNodeSchema.parse({
          ...normalizedTemplate.root,
          props: {
            ...normalizedTemplate.root.props,
            kitTemplateId: normalizedTemplate.id,
          },
        });
      });
  const basePages = Array.isArray(snapshot.pages)
    ? cloneJson(snapshot.pages)
    : current.project.pages;
  const nextPages = (() => {
    if (selectedPageId && basePages.some((page) => page.id === selectedPageId)) {
      return basePages.map((page) => (page.id === selectedPageId ? { ...page, nodes } : page));
    }

    if (selectedPageId) {
      return [
        ...basePages,
        createPageDraft(DEFAULT_PAGE_NAME, '/', {
          id: selectedPageId,
          nodes,
        }),
      ];
    }

    if (nodes.length > 0) {
      return [
        ...basePages,
        createPageDraft(DEFAULT_PAGE_NAME, '/', {
          id: DEFAULT_PAGE_ID,
          nodes,
        }),
      ];
    }

    return basePages;
  })();
  const resolvedSelectedPageId = selectedPageId ?? nextPages[0]?.id ?? null;
  const homePageId = nextPages.some((page) => page.id === current.project.settings.homePageId)
    ? current.project.settings.homePageId
    : nextPages.find((page) => page.kind === 'page')?.id ?? null;

  return ProjectDocumentSchema.parse({
    ...current,
    project: {
      ...current.project,
      id: snapshot.projectId ?? current.project.id,
      name: snapshot.projectName ?? current.project.name,
      pages: nextPages,
      links: cloneJson(snapshot.links ?? current.project.links ?? []),
      templates: (snapshot.customTemplates ?? []).map(normalizeTemplateRecord),
      dataSources: snapshot.dataSources && snapshot.dataSources.length > 0
        ? cloneJson(snapshot.dataSources)
        : current.project.dataSources,
      settings: {
        ...current.project.settings,
        homePageId,
        targetPlatform: snapshot.targetPlatform ?? current.project.settings.targetPlatform,
        archetype: snapshot.projectArchetype ?? current.project.settings.archetype,
        themeId: snapshot.themeId ?? current.project.settings.themeId,
        themeLibrary: cloneJson(snapshot.themeLibrary ?? current.project.settings.themeLibrary ?? []),
        runtimeEnv: cloneJson(snapshot.runtimeEnv ?? current.project.settings.runtimeEnv),
      },
      updatedAt: timestamp,
    },
    editor: {
      ...current.editor,
      selectedPageId: resolvedSelectedPageId,
      releaseVersionId: snapshot.releaseVersionId ?? current.editor.releaseVersionId,
      kitStudio: {
        nodes: kitStudioNodes,
      },
    },
  });
};

const flattenNode = (
  node: BuilderNodeDocument,
  parentId: string,
  widgets: Record<string, LegacyWidgetData>,
  layouts: Record<string, LegacyLayoutItem[]>,
) => {
  widgets[node.id] = {
    id: node.id,
    type: node.type,
    parentId,
    props: {
      ...cloneJson(node.props),
      bindings: cloneJson(node.bindings),
      actions: cloneJson(node.actions),
    },
  };

  if (!layouts[parentId]) {
    layouts[parentId] = [];
  }

  layouts[parentId].push({
    i: node.id,
    x: node.layout.x,
    y: node.layout.y,
    w: node.layout.w,
    h: node.layout.h,
    minW: node.layout.minW,
    minH: node.layout.minH,
  });

  if (node.children.length > 0) {
    layouts[node.id] = [];
    node.children.forEach((child) => flattenNode(child, node.id, widgets, layouts));
  }
};

export const flattenProjectDocument = (document: ProjectDocument): LegacyBuilderSnapshot => {
  const parsed = ProjectDocumentSchema.parse(document);
  const page = parsed.editor.selectedPageId
    ? parsed.project.pages.find((entry) => entry.id === parsed.editor.selectedPageId) ?? parsed.project.pages[0]
    : parsed.project.pages[0];
  const { widgets, layouts } = page ? flattenPageNodes(page) : { widgets: {}, layouts: { root: [] } };
  const kitStudioSourceNodes = parsed.editor.kitStudio.nodes.length > 0
    ? parsed.editor.kitStudio.nodes
    : parsed.project.templates.map((template) => BuilderNodeSchema.parse({
        ...template.root,
        props: {
          ...template.root.props,
          kitTemplateId: template.id,
        },
      }));
  const flattenedKitStudio = kitStudioSourceNodes.length > 0
    ? flattenPageNodes({
        id: 'kit-studio',
        name: 'Kit Studio',
        route: '/kit-studio',
        kind: 'page',
        board: {
          x: 0,
          y: 0,
          width: 1600,
          height: 1000,
        },
        layoutMode: 'grid',
        nodes: kitStudioSourceNodes,
      })
    : { widgets: {}, layouts: { root: [] } };

  return {
    projectId: parsed.project.id,
    projectName: parsed.project.name,
    targetPlatform: parsed.project.settings.targetPlatform,
    projectArchetype: parsed.project.settings.archetype,
    releaseVersionId: parsed.editor.releaseVersionId,
    themeId: parsed.project.settings.themeId,
    themeLibrary: cloneJson(parsed.project.settings.themeLibrary ?? []),
    dataSources: cloneJson(parsed.project.dataSources),
    runtimeEnv: cloneJson(parsed.project.settings.runtimeEnv ?? {}),
    pages: cloneJson(parsed.project.pages),
    links: cloneJson(parsed.project.links),
    selectedPageId: parsed.editor.selectedPageId,
    widgets,
    layouts,
    customTemplates: parsed.project.templates.map((template) => ({
      id: template.id,
      name: template.name,
      data: cloneJson(template.root),
    })),
    kitStudioWidgets: flattenedKitStudio.widgets,
    kitStudioLayouts: flattenedKitStudio.layouts,
  };
};

export const parseProjectDocumentJson = (value: string) => {
  return ProjectDocumentSchema.parse(JSON.parse(value));
};

export const stringifyProjectDocument = (document: ProjectDocument) => {
  const parsed = ProjectDocumentSchema.parse(document);
  return JSON.stringify(parsed, null, 2);
};
