import { z } from 'zod';
import { PROJECT_GRID_BREAKPOINTS } from '../builder/responsive';
import { WIDGET_TYPES } from '../builder/widgetConfig';
import {
  BuilderThemeIdSchema,
  BuilderThemeManifestSchema,
  DEFAULT_BUILDER_THEME_ID,
} from '../theme/schema';

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const WidgetTypeSchema = z.enum(WIDGET_TYPES);
export const LayoutModeSchema = z.enum(['grid', 'flex-row', 'flex-col']);
export const DataSourceKindSchema = z.enum(['mock', 'rest']);
export const RequestAuthModeSchema = z.enum(['none', 'bearer', 'api-key']);
export const PageKindSchema = z.enum(['page', 'overlay']);
export const PageLinkKindSchema = z.enum(['navigate-page', 'open-overlay', 'switch-overlay', 'return-page']);
export const TargetPlatformSchema = z.enum(['desktop-web', 'tablet-web', 'mobile-web']);
export const ProjectArchetypeSchema = z.enum(['website-blog', 'dashboard-workspace']);
export const ActionTypeSchema = z.enum([
  'navigate',
  'request',
  'refresh',
  'open-modal',
  'set-state',
  'custom',
]);

export const RequestAuthSchema = z.object({
  mode: RequestAuthModeSchema.default('none'),
  placement: z.enum(['header', 'query']).default('header'),
  tokenTemplate: z.string().default(''),
  headerName: z.string().default('Authorization'),
  queryName: z.string().default('api_key'),
  prefix: z.string().default('Bearer '),
});

export const RequestConfigSchema = z.object({
  url: z.string().default(''),
  method: z.string().default('GET'),
  headers: z.record(z.string(), z.string()).default({}),
  query: z.record(z.string(), z.unknown()).default({}),
  body: z.unknown().optional(),
  pick: z.string().optional(),
  auth: RequestAuthSchema.default({
    mode: 'none',
    placement: 'header',
    tokenTemplate: '',
    headerName: 'Authorization',
    queryName: 'api_key',
    prefix: 'Bearer ',
  }),
  timeoutMs: z.number().int().positive().default(15000),
});

export const NodeLayoutSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
});

export const DataBindingSchema = z.object({
  id: z.string().min(1),
  sourceKey: z.string().min(1),
  path: z.string().min(1),
  fallback: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const NodeActionSchema = z.object({
  id: z.string().min(1),
  type: ActionTypeSchema,
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export interface BuilderNodeDocument {
  id: string;
  type: z.infer<typeof WidgetTypeSchema>;
  props: Record<string, unknown>;
  layout: z.infer<typeof NodeLayoutSchema>;
  bindings: z.infer<typeof DataBindingSchema>[];
  actions: z.infer<typeof NodeActionSchema>[];
  children: BuilderNodeDocument[];
  meta: Record<string, unknown>;
}

export const BuilderNodeSchema: z.ZodType<BuilderNodeDocument> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: WidgetTypeSchema,
    props: z.record(z.string(), z.unknown()).default({}),
    layout: NodeLayoutSchema,
    bindings: z.array(DataBindingSchema).default([]),
    actions: z.array(NodeActionSchema).default([]),
    children: z.array(BuilderNodeSchema).default([]),
    meta: z.record(z.string(), z.unknown()).default({}),
  }),
);

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  root: BuilderNodeSchema,
});

export const MockDataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal('mock'),
  config: z.object({
    payload: z.unknown().default({}),
  }).default({ payload: {} }),
});

export const RestDataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal('rest'),
  config: RequestConfigSchema.default({
    url: '',
    method: 'GET',
    headers: {},
    query: {},
    auth: {
      mode: 'none',
      placement: 'header',
      tokenTemplate: '',
      headerName: 'Authorization',
      queryName: 'api_key',
      prefix: 'Bearer ',
    },
    timeoutMs: 15000,
  }),
});

export const DataSourceSchema = z.discriminatedUnion('kind', [MockDataSourceSchema, RestDataSourceSchema]);

export const PageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().min(1),
  kind: PageKindSchema.default('page'),
  ownerPageId: z.string().optional(),
  board: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().positive().default(1440),
    height: z.number().positive().default(900),
  }).default({
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  }),
  layoutMode: LayoutModeSchema.default('grid'),
  nodes: z.array(BuilderNodeSchema).default([]),
});

export const PageLinkSchema = z.object({
  id: z.string().min(1),
  sourcePageId: z.string().min(1),
  targetPageId: z.string().min(1),
  kind: PageLinkKindSchema,
  sourceNodeId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  pages: z.array(PageSchema).default([]),
  links: z.array(PageLinkSchema).default([]),
  templates: z.array(TemplateSchema).default([]),
  dataSources: z.array(DataSourceSchema).default([]),
  settings: z.object({
    homePageId: z.string().min(1).nullable().default(null),
    targetPlatform: TargetPlatformSchema.default('desktop-web'),
    archetype: ProjectArchetypeSchema.default('dashboard-workspace'),
    themeId: BuilderThemeIdSchema.default(DEFAULT_BUILDER_THEME_ID),
    themeLibrary: z.array(BuilderThemeManifestSchema).default([]),
    runtimeEnv: z.record(z.string(), z.string()).default({}),
    breakpoints: z.record(z.string(), z.number().int().nonnegative()).default(PROJECT_GRID_BREAKPOINTS),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProjectDocumentSchema = z.object({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  project: ProjectSchema,
  editor: z.object({
    selectedPageId: z.string().min(1).nullable().default(null),
    lastSavedAt: z.string().datetime().nullable().default(null),
    currentVersionId: z.string().min(1).nullable().default(null),
    releaseVersionId: z.string().min(1).nullable().default(null),
    kitStudio: z.object({
      nodes: z.array(BuilderNodeSchema).default([]),
    }).default({
      nodes: [],
    }),
  }),
});

export type NodeLayout = z.infer<typeof NodeLayoutSchema>;
export type DataBinding = z.infer<typeof DataBindingSchema>;
export type NodeAction = z.infer<typeof NodeActionSchema>;
export type RequestAuthMode = z.infer<typeof RequestAuthModeSchema>;
export type RequestAuth = z.infer<typeof RequestAuthSchema>;
export type RequestConfig = z.infer<typeof RequestConfigSchema>;
export type BuilderTemplate = z.infer<typeof TemplateSchema>;
export type BuilderPage = z.infer<typeof PageSchema>;
export type BuilderPageLink = z.infer<typeof PageLinkSchema>;
export type BuilderDataSource = z.infer<typeof DataSourceSchema>;
export type BuilderProject = z.infer<typeof ProjectSchema>;
export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;
export type TargetPlatform = z.infer<typeof TargetPlatformSchema>;
export type ProjectArchetype = z.infer<typeof ProjectArchetypeSchema>;
