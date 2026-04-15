import {
  type BuilderNodeDocument,
  type BuilderPage,
  type BuilderPageLink,
  type NodeAction,
  type ProjectDocument,
} from '../schema/project';
import { createPageLinkId } from './projectDocument';
import { derivePageLinkKind, getPageById } from '../builder/pageTopology';

export const ACTION_LINK_ORIGIN = 'action-sync' as const;

export type NavigateActionConfig = {
  destinationType: 'url' | 'project-page';
  href: string;
  target: string;
  targetPageId: string;
};

export type OpenModalActionConfig = {
  modalType: 'runtime-modal' | 'project-overlay';
  title: string;
  description: string;
  targetPageId: string;
};

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const getNavigateActionConfig = (configInput: unknown): NavigateActionConfig => {
  const raw = configInput && typeof configInput === 'object'
    ? configInput as Record<string, unknown>
    : {};

  return {
    destinationType: raw.destinationType === 'project-page' ? 'project-page' : 'url',
    href: typeof raw.href === 'string' ? raw.href : '',
    target: typeof raw.target === 'string' && raw.target ? raw.target : '_self',
    targetPageId: typeof raw.targetPageId === 'string' ? raw.targetPageId : '',
  };
};

export const mergeNavigateActionConfig = (
  configInput: unknown,
  patch: Partial<NavigateActionConfig>,
): Record<string, unknown> => {
  return {
    ...getNavigateActionConfig(configInput),
    ...patch,
  };
};

export const getOpenModalActionConfig = (configInput: unknown): OpenModalActionConfig => {
  const raw = configInput && typeof configInput === 'object'
    ? configInput as Record<string, unknown>
    : {};

  return {
    modalType: raw.modalType === 'project-overlay' ? 'project-overlay' : 'runtime-modal',
    title: typeof raw.title === 'string' ? raw.title : 'Runtime action works',
    description: typeof raw.description === 'string'
      ? raw.description
      : 'This modal is opened by the standard action editor.',
    targetPageId: typeof raw.targetPageId === 'string' ? raw.targetPageId : '',
  };
};

export const mergeOpenModalActionConfig = (
  configInput: unknown,
  patch: Partial<OpenModalActionConfig>,
): Record<string, unknown> => {
  return {
    ...getOpenModalActionConfig(configInput),
    ...patch,
  };
};

export const isActionGeneratedLink = (link: BuilderPageLink) => (
  link.meta?.origin === ACTION_LINK_ORIGIN &&
  typeof link.meta?.sourceActionId === 'string'
);

type ActionLinkedTarget = {
  targetPageId: string;
  kind: BuilderPageLink['kind'];
};

const resolveActionLinkedTarget = (
  pages: BuilderPage[],
  sourcePage: BuilderPage,
  action: NodeAction,
): ActionLinkedTarget | null => {
  if (action.type === 'navigate') {
    const config = getNavigateActionConfig(action.config);
    if (config.destinationType !== 'project-page' || !config.targetPageId) return null;
    const targetPage = getPageById(pages, config.targetPageId);
    if (!targetPage) return null;
    const kind = derivePageLinkKind(sourcePage, targetPage);
    if (kind !== 'navigate-page' && kind !== 'return-page') return null;

    return {
      targetPageId: targetPage.id,
      kind,
    };
  }

  if (action.type === 'open-modal') {
    const config = getOpenModalActionConfig(action.config);
    if (config.modalType !== 'project-overlay' || !config.targetPageId) return null;
    const targetPage = getPageById(pages, config.targetPageId);
    if (!targetPage) return null;
    const kind = derivePageLinkKind(sourcePage, targetPage);
    if (kind !== 'open-overlay' && kind !== 'switch-overlay') return null;

    return {
      targetPageId: targetPage.id,
      kind,
    };
  }

  return null;
};

const walkNodes = (
  nodes: BuilderNodeDocument[],
  visitor: (node: BuilderNodeDocument) => void,
) => {
  nodes.forEach((node) => {
    visitor(node);
    if (node.children.length > 0) {
      walkNodes(node.children, visitor);
    }
  });
};

const buildActionLinkKey = (link: Pick<BuilderPageLink, 'sourcePageId' | 'sourceNodeId' | 'targetPageId' | 'kind'>) => (
  [
    link.sourcePageId,
    link.sourceNodeId ?? '',
    link.targetPageId,
    link.kind,
  ].join('::')
);

const buildActionOwnershipKey = (
  sourcePageId: string,
  sourceNodeId: string,
  sourceActionId: string,
) => `${sourcePageId}::${sourceNodeId}::${sourceActionId}`;

export const synchronizeActionBackedLinks = (
  document: ProjectDocument,
  existingLinks: BuilderPageLink[],
): BuilderPageLink[] => {
  const parsedDocument = cloneJson(document);
  const manualLinks = existingLinks.filter((link) => !isActionGeneratedLink(link));
  const previousActionLinks = existingLinks.filter(isActionGeneratedLink);
  const nextActionLinks: BuilderPageLink[] = [];

  parsedDocument.project.pages.forEach((page) => {
    walkNodes(page.nodes, (node) => {
      node.actions.forEach((action) => {
        const target = resolveActionLinkedTarget(parsedDocument.project.pages, page, action);
        if (!target) return;

        const ownershipKey = buildActionOwnershipKey(page.id, node.id, action.id);
        const previous = previousActionLinks.find((link) => (
          typeof link.sourceNodeId === 'string' &&
          buildActionOwnershipKey(
            link.sourcePageId,
            link.sourceNodeId,
            typeof link.meta?.sourceActionId === 'string' ? link.meta.sourceActionId : '',
          ) === ownershipKey
        ));

        nextActionLinks.push({
          id: previous?.id ?? createPageLinkId(),
          sourcePageId: page.id,
          targetPageId: target.targetPageId,
          kind: target.kind,
          sourceNodeId: node.id,
          meta: {
            ...(previous?.meta ?? {}),
            origin: ACTION_LINK_ORIGIN,
            sourceActionId: action.id,
            sourceActionType: action.type,
            actionLabel: action.label ?? '',
          },
        });
      });
    });
  });

  const generatedKeys = new Set(nextActionLinks.map((link) => buildActionLinkKey(link)));

  return [
    ...manualLinks.filter((link) => !generatedKeys.has(buildActionLinkKey(link))),
    ...nextActionLinks,
  ];
};
