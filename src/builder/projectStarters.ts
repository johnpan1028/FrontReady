import {
  getBuilderBlueprint,
  type BuilderBlueprintId,
} from './blueprints';
import {
  resolveOverlayOrbitPosition,
  resolvePageBoardSize,
} from './pageTopology';
import {
  buildPageNodesFromLegacy,
  createEmptyProjectDocument,
  createPageDraft,
  createPageLinkId,
} from '../core/projectDocument';
import { ACTION_LINK_ORIGIN } from '../core/actionTargets';
import type { BuilderDataSource, BuilderPage, ProjectArchetype, ProjectDocument, TargetPlatform } from '../schema/project';
import { ProjectDocumentSchema } from '../schema/project';

export type ProjectStarterId = 'blank' | 'standard-sample';

export type ProjectStarterDefinition = {
  id: ProjectStarterId;
  name: string;
  description: string;
  detail: string;
  defaultProjectName: string;
  badge?: string;
  seedReleaseVersion?: boolean;
};

type LegacyBlueprintSeed = {
  dataSources: BuilderDataSource[];
  runtimeEnv: Record<string, string>;
  widgets: Record<string, any>;
  layouts: Record<string, any>;
};

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const requireBlueprintSeed = (blueprintId: BuilderBlueprintId): LegacyBlueprintSeed => {
  const blueprint = getBuilderBlueprint(blueprintId);
  if (!blueprint) {
    throw new Error(`Unknown starter blueprint: ${blueprintId}`);
  }

  return {
    dataSources: cloneJson(blueprint.dataSources),
    runtimeEnv: cloneJson(blueprint.runtimeEnv),
    widgets: cloneJson(blueprint.widgets),
    layouts: cloneJson(blueprint.layouts),
  };
};

const mergeDataSources = (...groups: BuilderDataSource[][]) => {
  const seen = new Set<string>();
  const merged: BuilderDataSource[] = [];

  groups.flat().forEach((source) => {
    if (seen.has(source.id)) return;
    seen.add(source.id);
    merged.push(source);
  });

  return merged;
};

const createPageFromSeed = ({
  projectId,
  name,
  route,
  kind = 'page',
  ownerPageId,
  board,
  seed,
}: {
  projectId: string;
  name: string;
  route: string;
  kind?: BuilderPage['kind'];
  ownerPageId?: string;
  board: BuilderPage['board'];
  seed: LegacyBlueprintSeed;
}) => (
  createPageDraft(name, route, {
    id: `${kind}-${projectId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/-+$/g, ''),
    kind,
    ownerPageId,
    board,
    nodes: buildPageNodesFromLegacy({
      widgets: seed.widgets,
      layouts: seed.layouts,
    }),
  })
);

const patchNodeActions = (
  page: BuilderPage,
  nodeId: string,
  actions: BuilderPage['nodes'][number]['actions'],
): BuilderPage => ({
  ...page,
  nodes: page.nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        actions: cloneJson(actions),
      };
    }

    if (node.children.length > 0) {
      const patchedChildPage = patchNodeActions({
        ...page,
        nodes: node.children,
      }, nodeId, actions);

      return {
        ...node,
        children: patchedChildPage.nodes,
      };
    }

    return node;
  }),
});

const createStandardSampleDocument = ({
  projectId,
  projectName,
  targetPlatform,
  archetype,
}: {
  projectId: string;
  projectName: string;
  targetPlatform: TargetPlatform;
  archetype: ProjectArchetype;
}): ProjectDocument => {
  const timestamp = new Date().toISOString();
  const baseDocument = createEmptyProjectDocument(
    projectName,
    projectId,
    'paper-editorial',
    [],
    targetPlatform,
    archetype,
  );

  const homeSeed = requireBlueprintSeed('launch-page');
  const metricsSeed = requireBlueprintSeed('ops-dashboard');
  const requestSeed = requireBlueprintSeed('client-intake');

  const homeSource = homeSeed.dataSources[0];
  if (homeSource?.kind === 'mock') {
    const payload = homeSource.config.payload as Record<string, any>;
    payload.hero = {
      ...payload.hero,
      kicker: 'Governed desktop starter',
      title: 'Start with a governed starter flow, then replace blocks with your own product structure.',
      summary: 'This starter seeds page shells, an overlay orbit, relation lines, mock data, and a ready-made release branch for deliverable export.',
      primaryCta: 'Open request overlay',
      secondaryCta: 'Open metrics page',
    };
    payload.proof = {
      ...payload.proof,
      buildTime: '2 pages',
      handoffReady: '1 overlay',
      modules: '3 relations',
    };
  }
  if (homeSeed.widgets.launch_note) {
    homeSeed.widgets.launch_note.props.text = 'Topology rule: main pages connect on the horizontal rail, overlays stay in the owner page orbit, and release export always reads from a saved version.';
  }
  if (homeSeed.widgets.launch_primary_cta?.props) {
    homeSeed.widgets.launch_primary_cta.props.actions = [
      {
        id: 'starter_home_overlay_modal',
        type: 'open-modal',
        label: 'Request overlay relation',
        config: {
          title: 'Overlay relation is seeded',
          description: 'In the topology board this CTA is wired to the request overlay. Runtime overlay routing will later be handled by the published frontend renderer.',
        },
      },
    ];
  }
  if (homeSeed.widgets.launch_secondary_cta?.props) {
    homeSeed.widgets.launch_secondary_cta.props.actions = [
      {
        id: 'starter_home_page_modal',
        type: 'open-modal',
        label: 'Metrics page relation',
        config: {
          title: 'Page relation is seeded',
          description: 'In the topology board this CTA points to the metrics page so the project structure is visible at a glance.',
        },
      },
    ];
  }

  const metricsSource = metricsSeed.dataSources[0];
  if (metricsSource?.kind === 'mock') {
    const payload = metricsSource.config.payload as Record<string, any>;
    payload.status = {
      ...payload.status,
      title: 'This second page proves that the starter is not a single-screen toy. It carries its own data, widgets, and action surface.',
      action: 'Refresh starter metrics',
    };
  }
  if (metricsSeed.widgets.ops_title) {
    metricsSeed.widgets.ops_title.props.text = 'Metrics Page';
  }
  if (metricsSeed.widgets.ops_subtitle) {
    metricsSeed.widgets.ops_subtitle.props.text = 'Use this page to inspect a second shell, mock bindings, and a page-to-page branch inside the same desktop project.';
  }

  const requestSource = requestSeed.dataSources[0];
  if (requestSource?.kind === 'mock') {
    const payload = requestSource.config.payload as Record<string, any>;
    payload.page = {
      ...payload.page,
      title: 'Request Overlay',
      summary: 'This overlay lives in the home page orbit and demonstrates how form-like modules can be designed without leaving the topology board.',
      cta: 'Close overlay',
    };
  }
  if (requestSeed.widgets.intake_note) {
    requestSeed.widgets.intake_note.props.text = 'Keep overlay work scoped: it can be freely edited and previewed, but it cannot exceed the owner page shell boundary.';
  }

  const homePage = createPageFromSeed({
    projectId,
    name: 'Home',
    route: '/',
    board: {
      x: 680,
      y: 260,
      width: 1440,
      height: 900,
    },
    seed: homeSeed,
  });

  const metricsPage = createPageFromSeed({
    projectId,
    name: 'Metrics',
    route: '/metrics',
    board: {
      x: homePage.board.x + homePage.board.width + 320,
      y: homePage.board.y,
      width: 1440,
      height: 900,
    },
    seed: metricsSeed,
  });

  const overlaySize = resolvePageBoardSize('overlay', homePage);
  const overlayPosition = resolveOverlayOrbitPosition(
    homePage,
    overlaySize.width,
    overlaySize.height,
    0,
  );

  const requestOverlay = createPageFromSeed({
    projectId,
    name: 'Request Overlay',
    route: '/overlay-request',
    kind: 'overlay',
    ownerPageId: homePage.id,
    board: {
      x: overlayPosition.x,
      y: overlayPosition.y,
      width: overlaySize.width,
      height: overlaySize.height,
    },
    seed: requestSeed,
  });
  const wiredHomePage = patchNodeActions(
    patchNodeActions(homePage, 'launch_primary_cta', [
      {
        id: 'starter_home_overlay_modal',
        type: 'open-modal',
        label: 'Open request overlay',
        config: {
          modalType: 'project-overlay',
          targetPageId: requestOverlay.id,
          title: requestOverlay.name,
          description: 'Open the project overlay attached to this home page.',
        },
      },
    ]),
    'launch_secondary_cta',
    [
      {
        id: 'starter_home_page_modal',
        type: 'navigate',
        label: 'Open metrics page',
        config: {
          destinationType: 'project-page',
          targetPageId: metricsPage.id,
          href: metricsPage.route,
          target: '_self',
        },
      },
    ],
  );
  const wiredRequestOverlay = patchNodeActions(requestOverlay, 'intake_submit', [
    {
      id: 'starter_overlay_return_home',
      type: 'navigate',
      label: 'Return home',
      config: {
        destinationType: 'project-page',
        targetPageId: homePage.id,
        href: homePage.route,
        target: '_self',
      },
    },
  ]);

  return ProjectDocumentSchema.parse({
    ...baseDocument,
    project: {
      ...baseDocument.project,
      pages: [
        wiredHomePage,
        metricsPage,
        wiredRequestOverlay,
      ],
      links: [
        {
          id: createPageLinkId(),
          sourcePageId: homePage.id,
          targetPageId: metricsPage.id,
          kind: 'navigate-page',
          sourceNodeId: 'launch_secondary_cta',
          meta: {
            origin: ACTION_LINK_ORIGIN,
            sourceActionId: 'starter_home_page_modal',
            sourceActionType: 'navigate',
            actionLabel: 'Open metrics page',
          },
        },
        {
          id: createPageLinkId(),
          sourcePageId: homePage.id,
          targetPageId: requestOverlay.id,
          kind: 'open-overlay',
          sourceNodeId: 'launch_primary_cta',
          meta: {
            origin: ACTION_LINK_ORIGIN,
            sourceActionId: 'starter_home_overlay_modal',
            sourceActionType: 'open-modal',
            actionLabel: 'Open request overlay',
          },
        },
        {
          id: createPageLinkId(),
          sourcePageId: requestOverlay.id,
          targetPageId: homePage.id,
          kind: 'return-page',
          sourceNodeId: 'intake_submit',
          meta: {
            origin: ACTION_LINK_ORIGIN,
            sourceActionId: 'starter_overlay_return_home',
            sourceActionType: 'navigate',
            actionLabel: 'Return home',
          },
        },
      ],
      dataSources: mergeDataSources(
        homeSeed.dataSources,
        metricsSeed.dataSources,
        requestSeed.dataSources,
      ),
      settings: {
        ...baseDocument.project.settings,
        homePageId: homePage.id,
        targetPlatform,
        themeId: 'paper-editorial',
        runtimeEnv: {
          ...homeSeed.runtimeEnv,
          ...metricsSeed.runtimeEnv,
          ...requestSeed.runtimeEnv,
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    editor: {
      ...baseDocument.editor,
      selectedPageId: homePage.id,
    },
  });
};

export const PROJECT_STARTERS: ProjectStarterDefinition[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from an empty desktop project shell with no pages or versions.',
    detail: 'Best when you already know the page topology and want to place shells manually.',
    defaultProjectName: 'Untitled Project',
  },
  {
    id: 'standard-sample',
    name: 'Guided Starter',
    description: 'Seed a governed desktop starter with 2 pages, 1 overlay, 3 relations, and a release branch.',
    detail: 'Best for learning the topology model before replacing sections with your own product modules.',
    defaultProjectName: 'Desktop Starter Project',
    badge: 'Recommended',
    seedReleaseVersion: true,
  },
];

export const getProjectStarter = (starterId: ProjectStarterId) => (
  PROJECT_STARTERS.find((starter) => starter.id === starterId) ?? PROJECT_STARTERS[0]
);

export const createProjectStarterDocument = ({
  starterId,
  projectId,
  projectName,
  targetPlatform,
  archetype,
}: {
  starterId: ProjectStarterId;
  projectId: string;
  projectName: string;
  targetPlatform: TargetPlatform;
  archetype: ProjectArchetype;
}) => {
  if (starterId === 'standard-sample') {
    return createStandardSampleDocument({
      projectId,
      projectName,
      targetPlatform,
      archetype,
    });
  }

  return createEmptyProjectDocument(
    projectName,
    projectId,
    undefined,
    [],
    targetPlatform,
    archetype,
  );
};
