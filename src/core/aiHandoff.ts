import type {
  BuilderDataSource,
  BuilderNodeDocument,
  DataBinding,
  NodeAction,
  ProjectDocument,
  RequestAuthMode,
  RequestConfig,
} from '../schema/project';
import { RequestConfigSchema } from '../schema/project';
import {
  getNavigateActionConfig,
  getOpenModalActionConfig,
} from './actionTargets';

type HandoffNodeSummary = {
  id: string;
  componentId: string;
  parentComponentId: string | null;
  type: BuilderNodeDocument['type'];
  label: string;
  contract?: {
    role?: string;
    key?: string;
    stateKey?: string;
    sourceTemplateId?: string;
    sourceTemplateName?: string;
    sourceTemplateNodeId?: string;
  };
  aiHandover?: string;
  depth: number;
  layout: BuilderNodeDocument['layout'];
  bindings: Array<{
    targetProp: string;
    sourceKey: string;
    path: string;
    fallback: unknown;
  }>;
  actions: Array<{
    id: string;
    type: NodeAction['type'];
    label?: string;
    summary: string;
  }>;
};

type HandoffPageSummary = {
  id: string;
  name: string;
  route: string;
  layoutMode: string;
  componentCount: number;
  bindingsCount: number;
  actionsCount: number;
  componentsByType: Partial<Record<BuilderNodeDocument['type'], number>>;
  nodes: HandoffNodeSummary[];
};

type HandoffDataSourceSummary = {
  id: string;
  name: string;
  kind: BuilderDataSource['kind'];
  request?: {
    method: string;
    url: string;
    pick?: string;
  };
  shapeHints?: string[];
};

type ApiContractDraft = {
  id: string;
  ownerType: 'data-source' | 'action';
  ownerId: string;
  ownerLabel: string;
  method: string;
  url: string;
  pick?: string;
  queryKeys: string[];
  bodyShape: string[];
  authMode: RequestAuthMode;
  authPlacement?: string;
  runtimeEnvKeys: string[];
  responseConsumers: string[];
};

export type AiHandoffPackage = {
  kind: 'ai-handoff-package';
  version: 1;
  generatedAt: string;
  summary: {
    projectId: string;
    projectName: string;
    pageCount: number;
    componentCount: number;
    dataSourceCount: number;
    bindingsCount: number;
    actionsCount: number;
  };
  pages: HandoffPageSummary[];
  dataSources: HandoffDataSourceSummary[];
  integrationNeeds: {
    restEndpoints: Array<{
      sourceId: string;
      method: string;
      url: string;
      pick?: string;
    }>;
    runtimeBehaviors: string[];
    runtimeEnvKeys: string[];
    apiContracts: ApiContractDraft[];
  };
  implementationPlan: string[];
  aiPrompt: {
    system: string;
    user: string;
  };
  document: ProjectDocument;
};

const getNodeLabel = (node: BuilderNodeDocument) => {
  const candidates = [node.props.title, node.props.text, node.props.label, node.type];
  const picked = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof picked === 'string' ? picked : node.type;
};

const getStringProp = (node: BuilderNodeDocument, key: string) => {
  const value = node.props[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getNodeContract = (node: BuilderNodeDocument): HandoffNodeSummary['contract'] | undefined => {
  const contract = {
    role: getStringProp(node, 'contractRole'),
    key: getStringProp(node, 'contractKey'),
    stateKey: getStringProp(node, 'stateKey'),
    sourceTemplateId: getStringProp(node, 'sourceTemplateId'),
    sourceTemplateName: getStringProp(node, 'sourceTemplateName'),
    sourceTemplateNodeId: getStringProp(node, 'sourceTemplateNodeId'),
  };

  return Object.values(contract).some(Boolean) ? contract : undefined;
};

const getBindingTargetProp = (binding: DataBinding) => {
  const explicit = typeof binding.meta?.prop === 'string' ? binding.meta.prop : null;
  if (explicit) return explicit;
  return binding.id.split('.').pop() || 'value';
};

const summarizeAction = (action: NodeAction) => {
  switch (action.type) {
    case 'navigate': {
      const config = getNavigateActionConfig(action.config);
      return config.destinationType === 'project-page'
        ? `Navigate to project page ${config.targetPageId || '(unset)'}`
        : `Navigate to ${config.href}`;
    }
    case 'request':
      return typeof action.config?.sourceKey === 'string' && action.config.sourceKey
        ? `Request via source ${action.config.sourceKey}`
        : `Inline request ${String(action.config?.method ?? 'GET')} ${String(action.config?.url ?? '')}`;
    case 'refresh':
      return `Refresh ${Array.isArray(action.config?.sourceKeys) ? action.config.sourceKeys.join(', ') || 'all sources' : 'all sources'}`;
    case 'open-modal': {
      const config = getOpenModalActionConfig(action.config);
      return config.modalType === 'project-overlay'
        ? `Open project overlay ${config.targetPageId || '(unset)'}`
        : `Open modal ${String(config.title ?? action.label ?? action.id)}`;
    }
    case 'set-state':
      return `Set runtime state ${String(action.config?.key ?? action.id)}`;
    case 'custom':
    default:
      return 'Run custom runtime hook';
  }
};

const templatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;

const collectTemplateTokens = (input: unknown): string[] => {
  if (typeof input === 'string') {
    return Array.from(input.matchAll(templatePattern)).map((match) => match[1]);
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => collectTemplateTokens(item));
  }

  if (input && typeof input === 'object') {
    return Object.values(input).flatMap((item) => collectTemplateTokens(item));
  }

  return [];
};

const collectRuntimeEnvKeys = (input: unknown) => {
  return Array.from(new Set(
    collectTemplateTokens(input)
      .filter((token) => token.startsWith('env.'))
      .map((token) => token.slice(4).split('.')[0])
      .filter(Boolean),
  ));
};

const describeShape = (input: unknown): string[] => {
  if (Array.isArray(input)) return ['array'];
  if (input && typeof input === 'object') return Object.keys(input as Record<string, unknown>).slice(0, 12);
  if (input == null) return [];
  return [typeof input];
};

const normalizeRequestConfig = (config: unknown): RequestConfig => RequestConfigSchema.parse(config ?? {});

const collectBindingConsumers = (
  pages: ProjectDocument['project']['pages'],
  matcher: (binding: DataBinding) => boolean,
): string[] => {
  const walkNodes = (pageName: string, nodes: BuilderNodeDocument[]): string[] => {
    return nodes.flatMap((node) => {
      const local = node.bindings
        .filter(matcher)
        .map((binding) => `${pageName}/${getNodeLabel(node)}#${node.id}.${getBindingTargetProp(binding)} <= ${binding.sourceKey}:${binding.path}`);

      return [...local, ...walkNodes(pageName, node.children)];
    });
  };

  return Array.from(new Set(pages.flatMap((page) => walkNodes(page.name, page.nodes))));
};

const collectEnvBindingKeys = (document: ProjectDocument): string[] => {
  return Array.from(new Set(
    collectBindingConsumers(
      document.project.pages,
      (binding) => binding.sourceKey === 'env' && Boolean(binding.path.trim()),
    ).map((entry) => entry.split(' <= env:')[1]?.split('.')[0] ?? '').filter(Boolean),
  ));
};

const buildApiContractDraft = ({
  id,
  ownerType,
  ownerId,
  ownerLabel,
  config,
  responseConsumers,
}: {
  id: string;
  ownerType: ApiContractDraft['ownerType'];
  ownerId: string;
  ownerLabel: string;
  config: RequestConfig;
  responseConsumers: string[];
}): ApiContractDraft => ({
  id,
  ownerType,
  ownerId,
  ownerLabel,
  method: String(config.method ?? 'GET').toUpperCase(),
  url: String(config.url ?? ''),
  pick: typeof config.pick === 'string' && config.pick ? config.pick : undefined,
  queryKeys: Object.keys(config.query ?? {}),
  bodyShape: describeShape(config.body),
  authMode: config.auth.mode,
  authPlacement: config.auth.mode === 'none' ? undefined : config.auth.placement,
  runtimeEnvKeys: collectRuntimeEnvKeys({
    url: config.url,
    headers: config.headers,
    query: config.query,
    body: config.body,
    auth: config.auth,
  }),
  responseConsumers,
});

const collectNodes = (
  nodes: BuilderNodeDocument[],
  depth = 0,
  parentComponentId: string | null = null,
  stats?: {
    componentCount: number;
    bindingsCount: number;
    actionsCount: number;
    componentsByType: Partial<Record<BuilderNodeDocument['type'], number>>;
  },
): HandoffNodeSummary[] => {
  return nodes.flatMap((node) => {
    if (stats) {
      stats.componentCount += 1;
      stats.bindingsCount += node.bindings.length;
      stats.actionsCount += node.actions.length;
      stats.componentsByType[node.type] = (stats.componentsByType[node.type] ?? 0) + 1;
    }

    const current: HandoffNodeSummary = {
      id: node.id,
      componentId: node.id,
      parentComponentId,
      type: node.type,
      label: getNodeLabel(node),
      contract: getNodeContract(node),
      aiHandover: typeof node.props.aiHandover === 'string' && node.props.aiHandover.trim()
        ? node.props.aiHandover.trim()
        : undefined,
      depth,
      layout: node.layout,
      bindings: node.bindings.map((binding) => ({
        targetProp: getBindingTargetProp(binding),
        sourceKey: binding.sourceKey,
        path: binding.path,
        fallback: binding.fallback,
      })),
      actions: node.actions.map((action) => ({
        id: action.id,
        type: action.type,
        label: action.label,
        summary: summarizeAction(action),
      })),
    };

    return [current, ...collectNodes(node.children, depth + 1, node.id, stats)];
  });
};

const collectRequestActions = (nodes: BuilderNodeDocument[]) => {
  return nodes.flatMap((node) => {
    const current = node.actions
      .filter((action) => action.type === 'request')
      .map((action) => ({
        nodeId: node.id,
        nodeLabel: getNodeLabel(node),
        action,
      }));

    return [...current, ...collectRequestActions(node.children)];
  });
};

const summarizeDataSource = (source: BuilderDataSource): HandoffDataSourceSummary => {
  if (source.kind === 'rest') {
    return {
      id: source.id,
      name: source.name,
      kind: source.kind,
      request: {
        method: String(source.config?.method ?? 'GET').toUpperCase(),
        url: String(source.config?.url ?? ''),
        pick: typeof source.config?.pick === 'string' ? source.config.pick : undefined,
      },
    };
  }

  const payload = source.config?.payload;
  const shapeHints = payload && typeof payload === 'object'
    ? Object.keys(payload as Record<string, unknown>).slice(0, 8)
    : [];

  return {
    id: source.id,
    name: source.name,
    kind: source.kind,
    shapeHints,
  };
};

const buildImplementationPlan = (
  document: ProjectDocument,
  pageSummaries: HandoffPageSummary[],
  dataSources: HandoffDataSourceSummary[],
  apiContracts: ApiContractDraft[],
  runtimeEnvKeys: string[],
) => {
  const tasks = [
    'Create routed front-end pages from the project document and keep widget IDs stable.',
    'Map every binding sourceKey/path into rendered widget props using the targetProp field.',
    'Implement runtime actions exactly as described in the action summaries and config payloads.',
  ];

  if (dataSources.some((source) => source.kind === 'rest')) {
    tasks.push('Build REST client wrappers for all rest data sources, including headers, method, body, and pick path.');
  }

  if (apiContracts.length > 0) {
    tasks.push('Generate typed API contracts for request actions and data sources, then map responses into bindings or runtime state result keys.');
  }

  if (apiContracts.some((contract) => contract.authMode !== 'none')) {
    tasks.push('Implement authenticated request handling for protected endpoints and keep secrets/runtime tokens outside hard-coded widget props.');
  }

  if (runtimeEnvKeys.length > 0) {
    tasks.push(`Provide runtime environment injection for ${runtimeEnvKeys.join(', ')} and preserve the same key names across environments.`);
  }

  if (pageSummaries.some((page) => page.actionsCount > 0)) {
    tasks.push('Add end-to-end verification for interactive flows, including request, refresh, modal, and navigate actions.');
  }

  if (document.project.templates.length > 0) {
    tasks.push('Preserve reusable templates as shared components so future edits can stay aligned with the builder.');
  }

  if (pageSummaries.some((page) => page.nodes.some((node) => node.aiHandover))) {
    tasks.push('Implement all explicit AI Handover notes attached to components before replacing placeholders or mount targets.');
  }

  return tasks;
};

export const buildAiHandoffPackage = (document: ProjectDocument): AiHandoffPackage => {
  const pageSummaries = document.project.pages.map((page) => {
    const stats = {
      componentCount: 0,
      bindingsCount: 0,
      actionsCount: 0,
      componentsByType: {} as Partial<Record<BuilderNodeDocument['type'], number>>,
    };

    const nodes = collectNodes(page.nodes, 0, null, stats);

    return {
      id: page.id,
      name: page.name,
      route: page.route,
      layoutMode: page.layoutMode,
      componentCount: stats.componentCount,
      bindingsCount: stats.bindingsCount,
      actionsCount: stats.actionsCount,
      componentsByType: stats.componentsByType,
      nodes,
    };
  });

  const dataSourceSummaries = document.project.dataSources.map(summarizeDataSource);
  const restEndpoints = dataSourceSummaries
    .filter((source): source is HandoffDataSourceSummary & { request: NonNullable<HandoffDataSourceSummary['request']> } => Boolean(source.request?.url))
    .map((source) => ({
      sourceId: source.id,
      method: source.request.method,
      url: source.request.url,
      pick: source.request.pick,
    }));

  const componentCount = pageSummaries.reduce((sum, page) => sum + page.componentCount, 0);
  const bindingsCount = pageSummaries.reduce((sum, page) => sum + page.bindingsCount, 0);
  const actionsCount = pageSummaries.reduce((sum, page) => sum + page.actionsCount, 0);

  const runtimeBehaviors = Array.from(new Set(
    pageSummaries.flatMap((page) => page.nodes.flatMap((node) => node.actions.map((action) => action.type))),
  ));

  const restContracts = document.project.dataSources.flatMap((source) => {
    if (source.kind !== 'rest' || !source.config.url.trim()) return [];

    return [buildApiContractDraft({
      id: `source:${source.id}`,
      ownerType: 'data-source',
      ownerId: source.id,
      ownerLabel: source.name,
      config: source.config,
      responseConsumers: collectBindingConsumers(document.project.pages, (binding) => binding.sourceKey === source.id),
    })];
  });

  const actionContracts = document.project.pages.flatMap((page) => {
    const requestActions = collectRequestActions(page.nodes);

    return requestActions.flatMap(({ nodeId, nodeLabel, action }) => {
      const rawConfig = action.config && typeof action.config === 'object'
        ? action.config as Record<string, unknown>
        : {};
      const sourceKey = typeof rawConfig.sourceKey === 'string' ? rawConfig.sourceKey : '';
      const resultKey = typeof rawConfig.resultKey === 'string' ? rawConfig.resultKey : '';

      const requestConfig = (() => {
        if (!sourceKey) return normalizeRequestConfig(action.config);

        const source = document.project.dataSources.find((item) => item.id === sourceKey);
        return source?.kind === 'rest' ? source.config : null;
      })();

      if (!requestConfig || !requestConfig.url.trim()) return [];

      return [buildApiContractDraft({
        id: `action:${nodeId}:${action.id}`,
        ownerType: 'action',
        ownerId: `${nodeId}:${action.id}`,
        ownerLabel: `${page.name}/${nodeLabel}/${action.label ?? action.id}`,
        config: requestConfig,
        responseConsumers: resultKey
          ? collectBindingConsumers(
              document.project.pages,
              (binding) => binding.sourceKey === 'state' && (binding.path === resultKey || binding.path.startsWith(`${resultKey}.`)),
            )
          : [],
      })];
    });
  });

  const apiContracts = [...restContracts, ...actionContracts];
  const runtimeEnvKeys = Array.from(new Set([
    ...Object.keys(document.project.settings.runtimeEnv ?? {}),
    ...collectEnvBindingKeys(document),
    ...apiContracts.flatMap((contract) => contract.runtimeEnvKeys),
  ])).sort();

  const implementationPlan = buildImplementationPlan(
    document,
    pageSummaries,
    dataSourceSummaries,
    apiContracts,
    runtimeEnvKeys,
  );

  return {
    kind: 'ai-handoff-package',
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      projectId: document.project.id,
      projectName: document.project.name,
      pageCount: document.project.pages.length,
      componentCount,
      dataSourceCount: dataSourceSummaries.length,
      bindingsCount,
      actionsCount,
    },
    pages: pageSummaries,
    dataSources: dataSourceSummaries,
    integrationNeeds: {
      restEndpoints,
      runtimeBehaviors,
      runtimeEnvKeys,
      apiContracts,
    },
    implementationPlan,
    aiPrompt: {
      system: 'You are implementing a production front-end from a structured builder document. Respect stable IDs, routes, bindings, and actions. Keep the runtime behavior aligned with the supplied schema.',
      user: `Implement project "${document.project.name}" with ${document.project.pages.length} page(s), ${componentCount} components, ${dataSourceSummaries.length} data source(s), ${bindingsCount} binding(s), and ${actionsCount} action(s). Use the structured document, ${apiContracts.length} API contract draft(s), and runtime env keys [${runtimeEnvKeys.join(', ')}] to generate maintainable front-end code plus the backend/API integration surface.`,
    },
    document,
  };
};

export const stringifyAiHandoffPackage = (payload: AiHandoffPackage) => {
  return JSON.stringify(payload, null, 2);
};
