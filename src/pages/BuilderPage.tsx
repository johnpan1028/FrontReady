import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent as ReactDragEvent } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { doesWidgetFollowParentWidth, getDefaultWidgetMinSize } from '../builder/widgetConfig';
import { normalizeSlotShellContract } from '../builder/slotShell';
import { BuilderWorkspaceScopeProvider, type BuilderWorkspaceScope } from '../builder/workspaceScope';
import { useBuilderStore, WidgetType } from '../store/builderStore';
import { useAppStore } from '../store/appStore';
import {
  PROJECT_GRID_BREAKPOINTS,
  PROJECT_GRID_COLS,
  WEB_STAGE_SURFACE_LABEL,
  fitStageCanvasToShell,
} from '../builder/responsive';
import { setNestedCanvasComponent } from '../builder/registry';
import { NestedCanvas } from '../components/NestedCanvas';
import { WidgetWrapper } from '../builder/WidgetWrapper';
import { ChevronDown, Eye, Sun, Moon, Monitor, FolderKanban, CircleUserRound, Languages, History, Plus, Save, Trash2, MousePointerClick, LayoutTemplate } from 'lucide-react';
import { cn } from '../utils/cn';
import { buildProjectDocument, createWidgetId } from '../core/projectDocument';
import { RuntimePage } from '../runtime/RuntimePage';
import {
  SessionStatusPanel,
  ThemeLibraryPanel,
  ThemeStudioPanel,
} from '../components/ProtocolPanels';
import { getProjectStarter, type ProjectStarterId } from '../builder/projectStarters';
import { PageShellInspectorPanel, ProjectContractPanel, ProjectWorkspacePanel, RelationInspectorPanel, VersionManagerPanel } from '../components/BuilderShellPanels';
import { WebStageFrame } from '../components/WebStageFrame';
import { PageBoard, type CurvePointToolMode, type RelationPathType, type RelationStrokePattern } from '../components/PageBoard';
import { KitFactoryBoard } from '../components/KitFactoryBoard';
import { useFeedback } from '../components/FeedbackProvider';
import { analyzeProjectBundleImport, parseProjectBundleJson } from '../core/projectBundle';
import { buildAiHandoffPackage } from '../core/aiHandoff';
import { canExportProject, validateProjectExportReadiness } from '../core/exportReadiness';
import { buildFrontendDeliverable, stringifyFrontendDeliverable } from '../core/frontendDeliverable';
import { ProjectDocumentSchema, type BuilderPage as BuilderPageDocument, type BuilderPageLink, type DataBinding, type NodeAction, type ProjectArchetype, type TargetPlatform } from '../schema/project';
import { mergeBuilderThemeManifest } from '../theme/compiler';
import { importBuilderThemeFromText } from '../theme/importer';
import { buildThemeFromReferenceProfile, getThemeReferenceProfile, type ThemeReferenceProfileId } from '../theme/referenceProfiles';
import { getBuilderThemeCatalog, resolveBuilderTheme } from '../theme/presets';
import { ProjectThemeScope } from '../theme/ProjectThemeScope';
import {
  BUILDER_ASSET_WIDGET_MAP,
  type BuilderAssetEntry,
  getBuilderAssetSectionsForSurface,
  getBuiltInAssetTemplate,
} from '../builder/assetLibrary';
import { AssetLibraryRail } from '../components/builder-page/AssetLibraryRail';
import { CanvasSurfaceHeader } from '../components/builder-page/CanvasSurfaceHeader';
import { CreateProjectDialog } from '../components/builder-page/CreateProjectDialog';
import { InspectorPanelShell } from '../components/builder-page/InspectorPanelShell';
import { SurfaceModeToggle, type EditSurfaceMode } from '../components/builder-page/SurfaceModeToggle';
import { VersionCheckoutDialog } from '../components/builder-page/VersionCheckoutDialog';
import { WidgetInspectorPanel } from '../components/builder-page/WidgetInspectorPanel';

// Inject NestedCanvas to avoid circular dependencies
setNestedCanvasComponent(NestedCanvas);

const slugifyThemeId = (value: string) => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'project-theme'
);

const RELATION_KIND_LABELS: Record<BuilderPageLink['kind'], string> = {
  'navigate-page': 'Page flow',
  'open-overlay': 'Open overlay',
  'switch-overlay': 'Overlay switch',
  'return-page': 'Return',
};

const RELATION_KIND_PREFIX: Record<BuilderPageLink['kind'], string> = {
  'navigate-page': 'P',
  'open-overlay': 'O',
  'switch-overlay': 'S',
  'return-page': 'R',
};

const RELATION_STROKE_PATTERNS: Record<BuilderPageLink['kind'], RelationStrokePattern> = {
  'navigate-page': 'solid',
  'open-overlay': 'dashed',
  'switch-overlay': 'dotted',
  'return-page': 'solid',
};

const RELATION_LABEL_FONT_SIZES: Record<BuilderPageLink['kind'], number> = {
  'navigate-page': 11,
  'open-overlay': 11,
  'switch-overlay': 11,
  'return-page': 11,
};

const BUILDER_CONTROL_FAVORITES_STORAGE_KEY = 'builder_control_favorites';

const isRelationStrokePattern = (value: unknown): value is RelationStrokePattern => (
  value === 'solid' || value === 'dashed' || value === 'dotted'
);

const getRelationFallbackLabel = (links: BuilderPageLink[], link: BuilderPageLink) => {
  const actionLabel = typeof link.meta?.actionLabel === 'string' && link.meta.actionLabel.trim().length > 0
    ? link.meta.actionLabel.trim()
    : typeof link.meta?.label === 'string' && link.meta.label.trim().length > 0
      ? link.meta.label.trim()
      : RELATION_KIND_LABELS[link.kind];
  let relationIndex = 0;

  for (const candidate of links) {
    if (candidate.sourcePageId !== link.sourcePageId || candidate.kind !== link.kind) continue;
    relationIndex += 1;
    if (candidate.id === link.id) {
      return `${RELATION_KIND_PREFIX[link.kind]}${relationIndex} · ${actionLabel}`;
    }
  }

  return `${RELATION_KIND_PREFIX[link.kind]}1 · ${actionLabel}`;
};

type InspectorMode = 'project' | 'theme' | 'page' | 'widget' | 'relation' | 'account';
type KitRootResizePreviewEventDetail =
  | { action: 'update'; widgetId: string; cols: number; rows: number }
  | { action: 'clear'; widgetId?: string };

export function BuilderPage() {
  const { notify, confirm } = useFeedback();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextAutosaveRef = useRef(false);
  const pendingVersionTransitionRef = useRef<string | null>(null);
  const [editSurfaceMode, setEditSurfaceMode] = useState<EditSurfaceMode>('pages');
  const [forcedInspectorMode, setForcedInspectorMode] = useState<Exclude<InspectorMode, 'widget'> | null>('project');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [curvePointToolMode, setCurvePointToolMode] = useState<CurvePointToolMode>('move');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const [favoriteControlAssetIds, setFavoriteControlAssetIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const raw = window.localStorage.getItem(BUILDER_CONTROL_FAVORITES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  });
  const [showFavoriteControlsOnly, setShowFavoriteControlsOnly] = useState(false);
  const [pageBoardFitRequestKey, setPageBoardFitRequestKey] = useState(0);
  const [kitStudioFitRequestKey, setKitStudioFitRequestKey] = useState(0);
  const [kitStudioFocusRequestKey, setKitStudioFocusRequestKey] = useState(0);
  const [kitRootResizePreview, setKitRootResizePreview] = useState<{
    widgetId: string;
    cols: number;
    rows: number;
  } | null>(null);
  const [projectDraftName, setProjectDraftName] = useState('');
  const [projectDraftArchetype, setProjectDraftArchetype] = useState<ProjectArchetype>('dashboard-workspace');
  const [projectDraftPlatform, setProjectDraftPlatform] = useState<TargetPlatform>('desktop-web');
  const [projectDraftStarterId, setProjectDraftStarterId] = useState<ProjectStarterId>('blank');
  const versionMenuRef = useRef<HTMLDivElement | null>(null);
  const { width, height, containerRef, mounted } = useContainerWidth();
  const shellTheme = useAppStore((state) => state.theme);
  const setShellTheme = useAppStore((state) => state.setTheme);
  const {
    session,
    authPending,
    projects,
    activeProjectId,
    projectId,
    projectName,
    targetPlatform,
    projectArchetype,
    themeId,
    themeLibrary,
    isHydrated,
    persistenceState,
    lastError,
    currentVersionId,
    releaseVersionId,
    projectVersions,
    editorMode,
    dataSources,
    runtimeEnv,
    pages,
    links,
    selectedPageId,
    widgets,
    layouts,
    selectedId,
    selectedSlotShellSlotId,
    kitStudioWidgets,
    kitStudioLayouts,
    selectedKitStudioId,
    selectedKitStudioSlotShellSlotId,
    draggedType,
    customTemplates,
    hydrateProject,
    createProject,
    applyProjectStarter,
    switchProject,
    deleteProject,
    setProjectName,
    saveDraft,
    checkoutProjectVersion,
    setReleaseVersion,
    deleteProjectVersion,
    exportProject,
    importProject,
    signIn,
    signInWithProvider,
    signUp,
    resendVerification,
    refreshSession,
    signOut,
    setThemeId,
    upsertTheme,
    deleteTheme,
    setEditorMode,
    setDataSources,
    setRuntimeEnv,
    setSelectedPage,
    updatePageMeta,
    createPage,
    deletePage,
    updatePageBoard,
    updatePageLinkMeta,
    setDraggedType,
    addWidget,
    moveWidget,
    updateLayout,
    updateLayoutItem,
    updateWidgetProps,
    extractTemplate,
    selectWidget,
    removeWidget,
  } = useBuilderStore();
  const isCloudAuthLocked = session?.mode === 'cloud' && session.auth.canSignIn && session.auth.status !== 'authenticated';
  const cloudActionsLocked = Boolean(isCloudAuthLocked || authPending);
  const hasActiveProject = useMemo(
    () => projects.some((project) => project.id === projectId),
    [projectId, projects],
  );

  useEffect(() => {
    void hydrateProject().catch(() => {});
  }, [hydrateProject]);

  useEffect(() => {
    if (!isHydrated || cloudActionsLocked || !hasActiveProject || pendingVersionId) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void useBuilderStore.getState().saveDraft({ reason: 'autosave' }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [widgets, layouts, kitStudioWidgets, kitStudioLayouts, customTemplates, projectName, themeId, themeLibrary, dataSources, runtimeEnv, pages, links, selectedPageId, isHydrated, cloudActionsLocked, hasActiveProject, pendingVersionId]);

  useEffect(() => {
    if (!isCloudAuthLocked) return;
    setForcedInspectorMode((current) => (current === 'account' ? current : 'account'));
  }, [isCloudAuthLocked]);

  useEffect(() => {
    if (!isVersionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!versionMenuRef.current?.contains(event.target as Node)) {
        setIsVersionMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isVersionMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        BUILDER_CONTROL_FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteControlAssetIds),
      );
    } catch {
      // Ignore storage failures and keep the in-memory favorites state usable.
    }
  }, [favoriteControlAssetIds]);

  useEffect(() => {
    const handleKitRootResizePreview = (event: Event) => {
      const detail = (event as CustomEvent<KitRootResizePreviewEventDetail>).detail;
      if (!detail || detail.action === 'clear') {
        setKitRootResizePreview((current) => (
          !detail?.widgetId || current?.widgetId === detail.widgetId ? null : current
        ));
        return;
      }

      setKitRootResizePreview({
        widgetId: detail.widgetId,
        cols: detail.cols,
        rows: detail.rows,
      });
    };

    window.addEventListener('kit-root-resize-preview', handleKitRootResizePreview);
    return () => window.removeEventListener('kit-root-resize-preview', handleKitRootResizePreview);
  }, []);

  const themeCatalog = useMemo(() => getBuilderThemeCatalog(themeLibrary), [themeLibrary]);
  const projectThemeIds = useMemo(() => themeLibrary.map((theme) => theme.id), [themeLibrary]);
  const activeTheme = useMemo(() => resolveBuilderTheme(themeId, themeLibrary), [themeId, themeLibrary]);
  const isProjectThemeActive = Boolean(activeTheme && projectThemeIds.includes(activeTheme.id));
  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null,
    [pages, selectedPageId],
  );
  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedLinkId) ?? null,
    [links, selectedLinkId],
  );
  const canCreateOverlay = Boolean(selectedPage?.kind === 'page' || selectedPage?.kind === 'overlay' || pages.some((page) => page.kind === 'page'));
  const canApplyProjectBlueprint = pages.length === 0 && links.length === 0;
  const activeWorkspaceScope: BuilderWorkspaceScope = editSurfaceMode === 'kits' ? 'kit' : 'page';
  const activeSelectedId = activeWorkspaceScope === 'kit' ? selectedKitStudioId : selectedId;
  const activeSelectedSlotShellSlotId = activeWorkspaceScope === 'kit'
    ? selectedKitStudioSlotShellSlotId
    : selectedSlotShellSlotId;
  const activeWidgets = activeWorkspaceScope === 'kit' ? kitStudioWidgets : widgets;
  const activeLayouts = activeWorkspaceScope === 'kit' ? kitStudioLayouts : layouts;
  const defaultInspectorMode: InspectorMode = editSurfaceMode === 'kits'
    ? 'project'
    : (selectedPage ? 'page' : 'project');
  const inspectorMode: InspectorMode = activeSelectedId && editSurfaceMode !== 'pages'
    ? 'widget'
    : forcedInspectorMode === 'relation'
      ? (selectedLink ? 'relation' : defaultInspectorMode)
      : forcedInspectorMode ?? defaultInspectorMode;

  const createProjectThemeId = (label: string) => {
    const baseId = slugifyThemeId(label);
    let nextId = baseId;
    let index = 2;

    while (themeCatalog.some((theme) => theme.id === nextId)) {
      nextId = `${baseId}-${index}`;
      index += 1;
    }

    return nextId;
  };

  const handleDuplicateActiveTheme = () => {
    if (!activeTheme) return;

    const duplicatedTheme = mergeBuilderThemeManifest(activeTheme, {
      id: createProjectThemeId(`${activeTheme.name} custom`),
      name: `${activeTheme.name} Custom`,
      source: {
        kind: 'handcrafted',
        label: 'Project Theme Studio',
        notes: `Derived from ${activeTheme.name} inside the project theme editor.`,
        references: activeTheme.source.references,
      },
      importPolicy: {
        strategy: 'derived',
        userFacingBranding: 'generic',
        notes: 'Customized inside the project theme studio.',
      },
    });

    upsertTheme(duplicatedTheme, { activate: true });
  };

  const handleCreateReferenceTheme = (profileId: ThemeReferenceProfileId) => {
    const profile = getThemeReferenceProfile(profileId);
    const baseTheme = activeTheme ?? resolveBuilderTheme(themeId, themeLibrary);
    if (!profile || !baseTheme) return;

    const nextTheme = buildThemeFromReferenceProfile({
      profile,
      baseTheme,
      themeId: createProjectThemeId(profile.name),
    });

    upsertTheme(nextTheme, { activate: true });
  };

  const handleImportThemeText = async (input: string) => {
    const baseTheme = activeTheme ?? resolveBuilderTheme(themeId, themeLibrary);
    if (!baseTheme) {
      throw new Error('No base theme available for import.');
    }

    const importedTheme = importBuilderThemeFromText(input, baseTheme);
    const nextThemeId = themeCatalog.some((theme) => theme.id === importedTheme.id)
      ? createProjectThemeId(importedTheme.name || importedTheme.id)
      : importedTheme.id;

    const nextTheme = mergeBuilderThemeManifest(importedTheme, {
      id: nextThemeId,
      source: {
        ...importedTheme.source,
        notes: importedTheme.source.notes || 'Imported into the project theme library.',
      },
      importPolicy: {
        ...importedTheme.importPolicy,
        strategy: importedTheme.importPolicy.strategy ?? 'derived',
      },
    });

    upsertTheme(nextTheme, { activate: true });
    return nextTheme.name;
  };

  const resolveDraggedTemplate = (dataTransfer?: DataTransfer | null) => {
    const builtInTemplateId = dataTransfer?.getData('application/x-built-in-template-id');
    if (builtInTemplateId) {
      return getBuiltInAssetTemplate(builtInTemplateId);
    }

    const customTemplateId = dataTransfer?.getData('application/x-template-id');
    return customTemplates.find((template) => template.id === customTemplateId) ?? null;
  };

  const resolveTemplatePlaceholder = (dataTransfer?: DataTransfer | null) => {
    const template = resolveDraggedTemplate(dataTransfer);
    const rawRoot = template?.data?.root ? template.data.root : template?.data;
    return {
      w: Math.max(4, Number(rawRoot?.layout?.w ?? 12)),
      h: Math.max(4, Number(rawRoot?.layout?.h ?? 10)),
    };
  };

  const handleDrop = (layout: any[], item: any, e: any) => {
    const movedWidgetId = e.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (e.dataTransfer?.getData('application/x-builder-scope') as BuilderWorkspaceScope | '') || 'page';
    if (movedWidgetId && item && movedWidgetScope === 'page' && widgets[movedWidgetId]) {
      const sourceWidget = widgets[movedWidgetId];
      const sourceLayoutItem = layouts[sourceWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId);
      moveWidget(
        movedWidgetId,
        'root',
        {
          i: movedWidgetId,
          x: item.x,
          y: item.y,
          w: sourceLayoutItem?.w || item.w || 8,
          h: sourceLayoutItem?.h || item.h || 6,
          minW: sourceLayoutItem?.minW,
          minH: sourceLayoutItem?.minH,
        },
        'page',
      );
      setDraggedType(null);
      return;
    }

    const type = (e.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || !item) return;
    
    // Stop propagation so nested layouts don't trigger parent drops
    e.stopPropagation();

    if (type === 'template') {
      const template = resolveDraggedTemplate(e.dataTransfer);
      if (template) {
        useBuilderStore.getState().addTemplateNode(template, 'root', item.x, item.y, 'page');
      }
      setDraggedType(null);
      return;
    }
    
    const id = createWidgetId();
    const paletteItem = BUILDER_ASSET_WIDGET_MAP[type];
    
    addWidget(id, type, {
      i: id,
      x: item.x,
      y: item.y,
      w: paletteItem?.w || 4,
      h: paletteItem?.h || 4,
    }, 'root', undefined, 'page');
    setDraggedType(null);
  };
  const selectedWidget = activeSelectedId ? activeWidgets[activeSelectedId] : null;
  const selectedSlotShellSlot = useMemo(() => {
    if (selectedWidget?.type !== 'slot_shell' || !activeSelectedSlotShellSlotId) return null;
    const contract = normalizeSlotShellContract(selectedWidget.props);

    for (const row of contract.rows) {
      const slot = row.slots.find((entry) => entry.id === activeSelectedSlotShellSlotId);
      if (slot) {
        return slot;
      }
    }

    return null;
  }, [activeSelectedSlotShellSlotId, selectedWidget]);
  const selectedLayoutItem = selectedWidget ? activeLayouts[selectedWidget.parentId]?.find(l => l.i === activeSelectedId) : null;
  const selectedLayoutItemWithResizePreview = (
    activeWorkspaceScope === 'kit'
    && selectedWidget
    && selectedWidget.parentId === 'root'
    && selectedLayoutItem
    && kitRootResizePreview
    && kitRootResizePreview.widgetId === selectedWidget.id
  )
    ? {
        ...selectedLayoutItem,
        w: kitRootResizePreview.cols,
        h: kitRootResizePreview.rows,
      }
    : selectedLayoutItem;
  const selectedParentWidget = selectedWidget && selectedWidget.parentId !== 'root'
    ? activeWidgets[selectedWidget.parentId] ?? null
    : null;
  const selectedParentLayoutItem = selectedParentWidget
    ? activeLayouts[selectedParentWidget.parentId]?.find((item) => item.i === selectedParentWidget.id) ?? null
    : null;
  const selectedCardLayoutCols = Math.max(1, Number(selectedParentLayoutItem?.w ?? 8));
  const selectedCardControlMaxCols = Math.max(1, selectedCardLayoutCols);
  const showCardLayoutControls = Boolean(
    selectedWidget
    && selectedParentWidget?.type === 'panel'
    && selectedWidget.type !== 'panel'
    && selectedWidget.type !== 'canvas'
    && selectedWidget.type !== 'shadcn_login_card',
  );
  const selectedWidgetFollowParentWidth = doesWidgetFollowParentWidth(selectedWidget?.props);
  const selectedKitTemplateId = typeof selectedWidget?.props?.kitTemplateId === 'string'
    ? selectedWidget.props.kitTemplateId
    : null;
  const isSelectedRootMaster = Boolean(selectedWidget && selectedWidget.parentId === 'root');
  const isSelectedPublishedKit = Boolean(selectedKitTemplateId && customTemplates.some((template) => template.id === selectedKitTemplateId));
  const updateSelectedWidgetProps = (props: Record<string, unknown>) => {
    if (!activeSelectedId) return;
    updateWidgetProps(activeSelectedId, props, activeWorkspaceScope);
  };
  const updateSelectedLayoutItem = (updates: Partial<{ x: number; y: number; w: number; h: number; minW: number; minH: number }>) => {
    if (!activeSelectedId || !selectedWidget) return;
    updateLayoutItem(activeSelectedId, selectedWidget.parentId, updates, activeWorkspaceScope);
  };
  const updateSelectedWidgetFollowParentWidth = (checked: boolean) => {
    if (!selectedWidget || !selectedLayoutItem) return;
    updateSelectedWidgetProps({
      followParentWidth: checked,
      autoOccupyRow: false,
    });

    if (!showCardLayoutControls) {
      return;
    }

    updateSelectedLayoutItem({
      x: checked ? 0 : Math.min(selectedLayoutItem.x ?? 0, Math.max(0, selectedCardControlMaxCols - Math.min(selectedLayoutItem.w ?? 1, selectedCardControlMaxCols))),
      w: checked ? selectedCardControlMaxCols : Math.min(selectedLayoutItem.w ?? 1, selectedCardControlMaxCols),
    });
  };
  const removeSelectedWidget = () => {
    const targetId = activeSelectedId;
    if (!targetId) return;

    selectWidget(null, activeWorkspaceScope);

    const performRemoval = () => {
      removeWidget(targetId, activeWorkspaceScope);
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(performRemoval);
      return;
    }

    setTimeout(performRemoval, 0);
  };
  const saveSelectedToKitLibrary = () => {
    if (!activeSelectedId) return;
    extractTemplate(activeSelectedId, activeWorkspaceScope);
    void saveDraft({ reason: 'template-save' }).catch(() => {});
  };

  const paletteItem = draggedType && draggedType !== 'template' ? BUILDER_ASSET_WIDGET_MAP[draggedType] : null;

  const handleDropDragOver = (e: any) => {
    if (draggedType === 'template') {
      return resolveTemplatePlaceholder(e?.dataTransfer);
    }
    return { w: paletteItem?.w || 4, h: paletteItem?.h || 4 };
  };

  const pageRootLayout = layouts.root || [];
  const kitStudioRootLayout = kitStudioLayouts.root || [];
  const kitStudioMasterOptions = useMemo(() => (
    kitStudioRootLayout.map((item, index) => {
      const widget = kitStudioWidgets[item.i];
      const kitTemplateName = typeof widget?.props?.kitTemplateName === 'string'
        ? widget.props.kitTemplateName.trim()
        : '';
      const title = typeof widget?.props?.title === 'string'
        ? widget.props.title.trim()
        : '';
      const label = typeof widget?.props?.label === 'string'
        ? widget.props.label.trim()
        : '';
      const baseLabel = widget
        ? (kitTemplateName || title || label || BUILDER_ASSET_WIDGET_MAP[widget.type]?.label || widget.type)
        : 'Master';

      return {
        id: item.i,
        label: `${baseLabel} · ${index + 1}`,
      };
    })
  ), [kitStudioRootLayout, kitStudioWidgets]);
  const favoriteControlAssetIdSet = useMemo(
    () => new Set(favoriteControlAssetIds),
    [favoriteControlAssetIds],
  );
  const visibleAssetSections = useMemo(() => {
    return getBuilderAssetSectionsForSurface(editSurfaceMode, customTemplates).map((section) => {
      if (section.id !== 'control') return section;

      return {
        ...section,
        assets: section.assets.filter((asset) => (
          !showFavoriteControlsOnly || favoriteControlAssetIdSet.has(asset.id)
        )),
      };
    });
  }, [customTemplates, editSurfaceMode, favoriteControlAssetIdSet, showFavoriteControlsOnly]);
  const gridLayout = useMemo(() => pageRootLayout.map((item) => ({ ...item })), [pageRootLayout]);
  const responsiveLayouts = useMemo(() => ({ lg: gridLayout }), [gridLayout]);
  const canvasSize = useMemo(
    () => fitStageCanvasToShell(
      width,
      height,
      selectedPage?.board.width ?? 1440,
      selectedPage?.board.height ?? 900,
      64,
      64,
    ),
    [height, selectedPage?.board.height, selectedPage?.board.width, width],
  );
  const clearAllSelections = () => {
    selectWidget(null, 'page');
    selectWidget(null, 'kit');
  };
  const handleApplyProjectStarter = async (starterId: ProjectStarterId) => {
    if (!canApplyProjectBlueprint) return;
    await applyProjectStarter(starterId);
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setForcedInspectorMode('page');
    setPageBoardFitRequestKey((value) => value + 1);
  };

  const syncLayoutStop = (currentLayout: any[]) => {
    updateLayout('root', [...(currentLayout as any[])], 'page');
  };

  const handleSaveDraft = () => {
    if (cloudActionsLocked || !hasActiveProject) return;
    void saveDraft({ createSnapshot: true, reason: 'manual-save' }).catch(() => {});
  };

  const handleToggleFavoriteControlAsset = (assetId: string) => {
    setFavoriteControlAssetIds((current) => (
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    ));
  };

  const handleVersionSelect = (versionId: string) => {
    if (!versionId || cloudActionsLocked) return;
    if (versionId === activeVersionId) return;
    setIsVersionMenuOpen(false);
    setPendingVersionId(versionId);
  };

  const handleVersionCheckout = (mode: 'save' | 'discard') => {
    if (!pendingVersionId || cloudActionsLocked) return;
    const targetVersionId = pendingVersionId;
    setPendingVersionId(null);
    skipNextAutosaveRef.current = true;
    pendingVersionTransitionRef.current = targetVersionId;

    void (async () => {
      if (mode === 'save') {
        await saveDraft({ createSnapshot: true, reason: 'manual-save-before-version-switch' });
      }
      await checkoutProjectVersion(targetVersionId);
    })().catch(() => {
      skipNextAutosaveRef.current = false;
      pendingVersionTransitionRef.current = null;
    });
  };

  const handleProjectSwitch = (nextProjectId: string) => {
    if (!nextProjectId || cloudActionsLocked) return;

    void (async () => {
      await switchProject(nextProjectId);
      clearAllSelections();
      setSelectedLinkId(null);
      setCurvePointToolMode('move');
      setForcedInspectorMode('project');
      setEditSurfaceMode('pages');
      setPageBoardFitRequestKey((current) => current + 1);
    })().catch(() => {});
  };

  const handleDeleteVersion = (versionId: string) => {
    if (!versionId || versionId === currentVersionId || cloudActionsLocked) return;
    const targetVersion = versionOptions.find((version) => version.id === versionId);
    void (async () => {
      const confirmed = await confirm({
        title: `Delete ${targetVersion?.shortLabel ?? 'this version'}?`,
        message: 'This removes the saved snapshot from version history.',
        tone: 'warning',
        confirmLabel: 'Delete',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
      void deleteProjectVersion(versionId).catch(() => {});
    })();
  };

  const handleDeleteProject = (targetProjectId: string) => {
    if (!targetProjectId || cloudActionsLocked) return;
    const targetProject = projects.find((project) => project.id === targetProjectId);
    if (!targetProject) return;

    void (async () => {
      const confirmed = await confirm({
        title: `Delete ${targetProject.name}?`,
        message: 'This removes the project, its drafts, and every saved version from the current workspace.',
        tone: 'danger',
        confirmLabel: 'Delete',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
      void deleteProject(targetProjectId).catch(() => {});
    })();
  };

  const handleExportProject = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'project';
    link.href = url;
    link.download = `${safeName}.project-bundle.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDeliverable = () => {
    if (!releaseVersionId) {
      notify({
        title: 'Deliverable export blocked',
        message: 'Mark a saved version as the release version first.',
        tone: 'warning',
      });
      return;
    }

    const releaseVersion = projectVersions.find((version) => version.id === releaseVersionId);
    if (!releaseVersion) {
      notify({
        title: 'Deliverable export failed',
        message: 'The current release version could not be found.',
        tone: 'danger',
        durationMs: 6000,
      });
      return;
    }

    const releaseDocument = ProjectDocumentSchema.parse({
      ...releaseVersion.document,
      editor: {
        ...releaseVersion.document.editor,
        currentVersionId: releaseVersion.id,
        releaseVersionId,
      },
    });
    const readinessIssues = validateProjectExportReadiness(releaseDocument);
    if (!canExportProject(readinessIssues)) {
      notify({
        title: 'Deliverable export blocked',
        message: 'Fix the shell contract before exporting the deliverable.',
        details: readinessIssues.map((issue) => issue.message),
        tone: 'warning',
        durationMs: 7000,
      });
      return;
    }

    const deliverable = buildFrontendDeliverable({
      document: releaseDocument,
      aiHandoff: buildAiHandoffPackage(releaseDocument),
      readinessIssues,
    });

    const json = stringifyFrontendDeliverable(deliverable);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'project';
    link.href = url;
    link.download = `${safeName}.frontend-deliverable.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (cloudActionsLocked) return;
    importInputRef.current?.click();
  };

  const handleCreateProject = () => {
    if (cloudActionsLocked) return;
    setProjectDraftName('');
    setProjectDraftArchetype('dashboard-workspace');
    setProjectDraftPlatform('desktop-web');
    setProjectDraftStarterId('blank');
    setIsCreateProjectOpen(true);
  };

  const handleSubmitProjectCreate = () => {
    if (cloudActionsLocked) return;
    void createProject({
      name: projectDraftName,
      archetype: projectDraftArchetype,
      targetPlatform: projectDraftPlatform,
      starterId: projectDraftStarterId,
    }).then(() => {
      setIsCreateProjectOpen(false);
      setForcedInspectorMode('project');
      setEditSurfaceMode('pages');
    }).catch(() => {});
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (cloudActionsLocked) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const bundle = parseProjectBundleJson(text);
      const currentOwnerId = session?.viewer.id ?? projects.find((project) => project.id === projectId)?.ownerId ?? 'local-user';
      const analysis = analyzeProjectBundleImport({
        bundle,
        currentOwnerId,
        existingProjectIds: projects.map((project) => project.id),
      });

      if (analysis.requiresOverwriteConfirmation) {
        const confirmed = await confirm({
          title: `Overwrite ${bundle.project.name}?`,
          message: 'This package matches an existing project in your workspace.',
          details: ['The current project and all of its saved versions will be replaced.'],
          tone: 'warning',
          confirmLabel: 'Overwrite',
          confirmVariant: 'danger',
        });
        if (!confirmed) {
          event.target.value = '';
          return;
        }
      }

      const result = await importProject(bundle, {
        overwriteExisting: analysis.requiresOverwriteConfirmation,
      });

      if (result.outcome === 'overwritten') {
        notify({
          title: 'Project overwritten',
          message: `${result.projectName} · ${result.versionCount} version${result.versionCount === 1 ? '' : 's'} imported.`,
          tone: 'success',
        });
      } else if (result.outcome === 'forked') {
        notify({
          title: 'Project imported as a copy',
          message: `${result.projectName} · ${result.versionCount} version${result.versionCount === 1 ? '' : 's'} imported.`,
          tone: 'success',
        });
      } else {
        notify({
          title: 'Project imported',
          message: `${result.projectName} · ${result.versionCount} version${result.versionCount === 1 ? '' : 's'} imported.`,
          tone: 'success',
        });
      }
    } catch (error) {
      notify({
        title: 'Import failed',
        message: error instanceof Error ? error.message : String(error),
        tone: 'danger',
        durationMs: 7000,
      });
    } finally {
      event.target.value = '';
    }
  };

  const versionOptions = useMemo(() => {
    return projectVersions.map((version, index, versions) => {
      const versionNumber = version.versionNumber ?? versions.length - index;
      const timestampLabel = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(version.createdAt));

      return {
        id: version.id,
        shortLabel: `v${versionNumber}`,
        detailLabel: index === 0
          ? `v${versionNumber} · Latest · ${timestampLabel}`
          : `v${versionNumber} · ${timestampLabel}`,
      };
    });
  }, [projectVersions]);

  const latestVersionOption = versionOptions[0] ?? null;
  const activeVersionId = currentVersionId ?? latestVersionOption?.id ?? '';
  const activeVersionOption = versionOptions.find((version) => version.id === activeVersionId) ?? latestVersionOption ?? null;
  const pendingVersionOption = pendingVersionId
    ? (versionOptions.find((version) => version.id === pendingVersionId) ?? null)
    : null;
  const selectedProjectStarter = getProjectStarter(projectDraftStarterId);
  const selectedLinkDefaultLabel = useMemo(
    () => (selectedLink ? getRelationFallbackLabel(links, selectedLink) : ''),
    [links, selectedLink],
  );
  const selectedLinkEffectiveLabel = useMemo(() => {
    if (!selectedLink) return '';
    return typeof selectedLink.meta?.labelText === 'string'
      ? selectedLink.meta.labelText
      : selectedLinkDefaultLabel;
  }, [selectedLink, selectedLinkDefaultLabel]);
  const selectedLinkPathType: RelationPathType = selectedLink?.meta?.pathType === 'curve' ? 'curve' : 'elbow';
  const selectedLinkStrokeColor = useMemo(() => {
    if (!selectedLink) return '#4f7cff';
    return typeof selectedLink.meta?.strokeColor === 'string' && selectedLink.meta.strokeColor.trim().length > 0
      ? selectedLink.meta.strokeColor
      : ({
          'navigate-page': '#4f7cff',
          'open-overlay': '#d97706',
          'switch-overlay': '#7c3aed',
          'return-page': '#10b981',
        } satisfies Record<BuilderPageLink['kind'], string>)[selectedLink.kind];
  }, [selectedLink]);
  const selectedLinkStrokeWidth = useMemo(() => {
    if (!selectedLink) return 2.2;
    const nextValue = Number(selectedLink.meta?.strokeWidth);
    if (!Number.isFinite(nextValue)) {
      return ({
        'navigate-page': 2.4,
        'open-overlay': 2.1,
        'switch-overlay': 1.9,
        'return-page': 1.9,
      } satisfies Record<BuilderPageLink['kind'], number>)[selectedLink.kind];
    }
    return Math.min(5, Math.max(1.25, nextValue));
  }, [selectedLink]);
  const selectedLinkStrokePattern: RelationStrokePattern = selectedLink
    ? (isRelationStrokePattern(selectedLink.meta?.strokePattern)
      ? selectedLink.meta.strokePattern
      : RELATION_STROKE_PATTERNS[selectedLink.kind])
    : 'solid';
  const selectedLinkLabelFontSize = useMemo(() => {
    if (!selectedLink) return 11;
    const nextValue = Number(selectedLink.meta?.labelFontSize);
    if (!Number.isFinite(nextValue)) {
      return RELATION_LABEL_FONT_SIZES[selectedLink.kind];
    }
    return Math.min(18, Math.max(9, nextValue));
  }, [selectedLink]);
  const selectedLinkCurvePointCount = useMemo(() => {
    if (!selectedLink || selectedLinkPathType !== 'curve') return 0;
    return Array.isArray(selectedLink.meta?.curvePoints) ? selectedLink.meta.curvePoints.length : 0;
  }, [selectedLink, selectedLinkPathType]);
  const selectedLinkSourcePageName = useMemo(
    () => pages.find((page) => page.id === selectedLink?.sourcePageId)?.name ?? 'Unknown source',
    [pages, selectedLink?.sourcePageId],
  );
  const selectedLinkTargetPageName = useMemo(
    () => pages.find((page) => page.id === selectedLink?.targetPageId)?.name ?? 'Unknown target',
    [pages, selectedLink?.targetPageId],
  );

  useEffect(() => {
    if (selectedLinkId && !selectedLink) {
      setSelectedLinkId(null);
      setCurvePointToolMode('move');
      setForcedInspectorMode((current) => (current === 'relation' ? (selectedPage ? 'page' : 'project') : current));
    }
  }, [selectedLink, selectedLinkId, selectedPage]);

  useEffect(() => {
    if (selectedLinkPathType !== 'curve' && curvePointToolMode !== 'move') {
      setCurvePointToolMode('move');
    }
  }, [curvePointToolMode, selectedLinkPathType]);

  useEffect(() => {
    if (editSurfaceMode === 'pages') return;
    if (forcedInspectorMode === 'relation') {
      setForcedInspectorMode(defaultInspectorMode);
    }
    if (selectedLinkId) {
      setSelectedLinkId(null);
    }
    if (curvePointToolMode !== 'move') {
      setCurvePointToolMode('move');
    }
  }, [curvePointToolMode, defaultInspectorMode, editSurfaceMode, forcedInspectorMode, selectedLinkId]);

  const inspectorQuickMode = inspectorMode === 'theme'
    ? 'theme'
    : inspectorMode === 'project'
      ? 'project'
      : null;

  const openProjectInspector = () => {
    clearAllSelections();
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setForcedInspectorMode('project');
  };

  const openThemeInspector = () => {
    clearAllSelections();
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setForcedInspectorMode('theme');
  };

  const openAccountInspector = () => {
    clearAllSelections();
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setForcedInspectorMode('account');
  };

  const handleAssetDragStart = (asset: BuilderAssetEntry, event: ReactDragEvent<HTMLDivElement>) => {
    if (asset.kind === 'shell') {
      if (asset.shellKind === 'overlay' && !canCreateOverlay) return;
      event.dataTransfer.setData('application/x-page-kind', asset.shellKind);
      setDraggedType(null);
      setForcedInspectorMode('page');
      return;
    }

    if (asset.kind === 'starter') {
      if (!canApplyProjectBlueprint) return;
      event.dataTransfer.setData('application/x-project-starter-id', asset.starterId);
      setDraggedType(null);
      setForcedInspectorMode('project');
      return;
    }

    if (asset.kind === 'template') {
      event.dataTransfer.setData('text/plain', 'template');
      if (asset.templateSource === 'built-in') {
        event.dataTransfer.setData('application/x-built-in-template-id', asset.templateId);
      } else {
        event.dataTransfer.setData('application/x-template-id', asset.templateId);
      }
      setDraggedType('template');
      return;
    }

    event.dataTransfer.setData('text/plain', asset.widgetType);
    setDraggedType(asset.widgetType);
  };

  const handleSelectBoardLink = (linkId: string | null) => {
    clearAllSelections();
    setSelectedLinkId(linkId);
    setCurvePointToolMode('move');
    setForcedInspectorMode(linkId ? 'relation' : (selectedPage ? 'page' : 'project'));
  };

  const handleCreateFirstPageShell = () => {
    if (cloudActionsLocked || !hasActiveProject) return;
    const createdPageId = createPage({ kind: 'page', select: true });
    if (!createdPageId) return;
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setSelectedPage(createdPageId);
    setForcedInspectorMode('page');
  };

  const projectDocumentState = useMemo(() => {
    try {
      const document = buildProjectDocument({
        projectId,
        projectName,
        targetPlatform,
        projectArchetype,
        releaseVersionId,
        themeId,
        themeLibrary,
        pages,
        links,
        selectedPageId,
        dataSources,
        runtimeEnv,
        widgets,
        layouts,
        customTemplates,
        kitStudioWidgets,
        kitStudioLayouts,
      });

      return {
        document,
        error: null as string | null,
      };
    } catch (error) {
      return {
        document: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [customTemplates, dataSources, kitStudioLayouts, kitStudioWidgets, layouts, links, pages, projectArchetype, projectId, projectName, releaseVersionId, runtimeEnv, selectedPageId, targetPlatform, themeId, themeLibrary, widgets]);

  const previewState = useMemo(() => {
    if (!projectDocumentState.document) {
      return {
        project: null,
        page: null,
        error: projectDocumentState.error,
      };
    }

    return {
      project: projectDocumentState.document.project,
      page: projectDocumentState.document.project.pages.find((entry) => entry.id === selectedPageId) ?? projectDocumentState.document.project.pages[0],
      error: null as string | null,
    };
  }, [projectDocumentState.document, projectDocumentState.error, selectedPageId]);

  const sourceOptions = useMemo(
    () => ([
      { value: 'state', label: 'Runtime State (state)' },
      { value: 'env', label: 'Runtime Env (env)' },
      ...dataSources.map((source) => ({ value: source.id, label: `${source.name} (${source.id})` })),
    ]),
    [dataSources],
  );
  const selectedBindings = useMemo<DataBinding[]>(
    () => (Array.isArray(selectedWidget?.props?.bindings) ? selectedWidget.props.bindings as DataBinding[] : []),
    [selectedWidget?.props?.bindings],
  );
  const selectedActions = useMemo<NodeAction[]>(
    () => (Array.isArray(selectedWidget?.props?.actions) ? selectedWidget.props.actions as NodeAction[] : []),
    [selectedWidget?.props?.actions],
  );
  const handleCreateActionTargetPage = (kind: BuilderPageDocument['kind']) => {
    if (cloudActionsLocked) return null;

    const ownerPageId = kind === 'overlay'
      ? (selectedPage?.kind === 'overlay' ? selectedPage.ownerPageId : selectedPage?.id)
      : undefined;

    if (kind === 'overlay' && !ownerPageId) return null;

    const pageId = createPage({
      kind,
      ownerPageId,
      select: false,
    });

    return pageId
      ? useBuilderStore.getState().pages.find((page) => page.id === pageId) ?? null
      : null;
  };
  const accountLabel = session?.viewer.name?.trim() || 'Account';
  const accountInitial = accountLabel.slice(0, 1).toUpperCase();
  const isSavingDraft = persistenceState === 'saving';
  const isSwitchingVersion = persistenceState === 'switching';
  const isVersionControlBusy = isSavingDraft || isSwitchingVersion;
  const selectedWidgetSourceName = typeof selectedWidget?.props?.sourceName === 'string'
    ? selectedWidget.props.sourceName.trim()
    : '';
  const selectedWidgetInspectorLabel = selectedWidget?.type === 'panel'
    ? 'Card Shell'
    : selectedWidget?.type === 'shadcn_login_card'
      ? 'Shadcn Login'
      : selectedWidget?.type === 'slot_shell'
        ? (selectedSlotShellSlot
          ? (
            selectedSlotShellSlot.type === 'text'
              ? 'Text Slot'
              : selectedSlotShellSlot.type === 'media'
                ? 'Media Slot'
                : selectedSlotShellSlot.type === 'divider'
                  ? 'Divider Slot'
                  : selectedSlotShellSlot.type === 'spacer'
                    ? 'Spacer Slot'
                    : selectedSlotShellSlot.type === 'object'
                      ? 'Object Slot'
                      : 'Empty Slot'
          )
          : 'Slot Shell')
      : selectedWidget?.type === 'icon'
        ? 'Icon'
      : selectedWidget?.type === 'heading'
        ? 'Heading'
        : selectedWidget?.type === 'text'
          ? 'Paragraph'
          : selectedWidget?.type === 'text_input'
            ? 'Text Input'
            : selectedWidget?.type === 'button'
              ? 'Inline Shell'
              : 'Component';
  const selectedWidgetLayerLabel = selectedWidget?.type === 'panel' || selectedWidget?.type === 'shadcn_login_card'
    ? 'Card'
    : 'Control';
  const selectedWidgetSourceBadge = selectedWidgetSourceName.toLowerCase().includes('shadcn')
    || selectedWidget?.props?.sourceTemplateId === 'card_shadcn_login'
    ? 'shadcn/ui'
    : '';
  const inspectorMeta = useMemo(() => {
    if (inspectorMode === 'theme') {
      return {
        title: 'Theme Inspector',
      };
    }
    if (inspectorMode === 'account') {
      return {
        title: 'Account Inspector',
      };
    }
    if (inspectorMode === 'relation') {
      return {
        title: 'Relation Inspector',
      };
    }
    if (inspectorMode === 'page') {
      return {
        title: 'Shell Inspector',
      };
    }
    if (inspectorMode === 'widget') {
      return {
        title: selectedWidgetInspectorLabel,
      };
    }

    return {
      title: 'Project Inspector',
    };
  }, [inspectorMode, selectedWidgetInspectorLabel]);
  const widgetInspectorFooter = selectedWidget ? (
    <div className="pt-4 mt-1 border-t border-hr-border">
      {editSurfaceMode === 'kits' ? (
        <button
          className="mb-2 w-full flex items-center justify-center gap-2 rounded-md bg-hr-primary/10 px-4 py-2 text-sm font-medium text-hr-primary transition-colors hover:bg-hr-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={saveSelectedToKitLibrary}
          disabled={!isSelectedRootMaster}
          title={isSelectedRootMaster
            ? (isSelectedPublishedKit ? 'Update this published master in My Kits' : 'Publish this master into My Kits')
            : 'Select a top-level master block to publish into My Kits'}
        >
          <Save size={16} />
          {isSelectedPublishedKit ? 'Update My Kit' : 'Publish to My Kits'}
        </button>
      ) : null}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 rounded-md text-sm font-medium transition-colors"
        onClick={removeSelectedWidget}
      >
        <Trash2 size={16} />
        Delete Component
      </button>
    </div>
  ) : null;

  useEffect(() => {
    const targetVersionId = pendingVersionTransitionRef.current;
    if (!targetVersionId || currentVersionId !== targetVersionId) return;
    pendingVersionTransitionRef.current = null;
    clearAllSelections();
    setSelectedLinkId(null);
    setCurvePointToolMode('move');
    setForcedInspectorMode('project');
    setEditSurfaceMode('pages');
    setPageBoardFitRequestKey((current) => current + 1);
  }, [currentVersionId]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-hr-bg">
      <div className="relative h-14 border-b border-hr-border bg-hr-panel px-4 shrink-0 z-20">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex shrink-0 items-center gap-2 font-bold text-hr-text">
              <LayoutTemplate size={18} className="text-hr-primary" />
              Builder Center
            </span>
            <div className="absolute left-[300px] top-1/2 hidden min-w-0 -translate-y-1/2 xl:flex">
              <span className="truncate text-sm font-medium text-hr-text">{projectName}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="hidden md:flex items-center rounded-lg border border-hr-border bg-hr-bg p-1">
              <button
                onClick={() => setEditorMode('edit')}
                className={cn(
                  'builder-toolbar-control rounded-md px-3 text-sm transition-colors',
                  editorMode === 'edit'
                    ? 'bg-hr-primary text-white shadow-sm'
                    : 'text-hr-muted hover:text-hr-text',
                )}
              >
                Edit
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={cn(
                  'builder-toolbar-control rounded-md px-3 text-sm transition-colors flex items-center gap-1.5',
                  editorMode === 'preview'
                    ? 'bg-hr-primary text-white shadow-sm'
                    : 'text-hr-muted hover:text-hr-text',
                )}
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 justify-self-end">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={cloudActionsLocked || isVersionControlBusy || !hasActiveProject}
              className="builder-toolbar-control builder-toolbar-pill-control inline-flex gap-1.5 rounded-full border border-hr-border bg-hr-bg text-xs font-semibold text-hr-text transition-colors hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-50"
              title="Create a new saved version"
              aria-label="Save current draft as a new version"
            >
              <Save size={14} />
              {isSavingDraft ? 'Saving' : 'Save'}
            </button>
            <div ref={versionMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsVersionMenuOpen((open) => !open)}
                disabled={cloudActionsLocked || isVersionControlBusy || !hasActiveProject || versionOptions.length === 0}
                className="builder-toolbar-control builder-toolbar-pill-control inline-flex gap-1.5 rounded-full border border-hr-border bg-hr-bg text-xs font-semibold text-hr-text transition-colors hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-50"
                title={activeVersionOption ? `Open version history · ${activeVersionOption.shortLabel}` : 'No saved versions yet'}
                aria-label="Project versions"
              >
                <History size={13} />
                <span>{activeVersionOption?.shortLabel ?? 'No versions'}</span>
                <ChevronDown size={14} className={cn('transition-transform', isVersionMenuOpen && 'rotate-180')} />
              </button>
              {isVersionMenuOpen && versionOptions.length > 0 ? (
                <div className="absolute right-0 top-11 z-30 flex w-64 flex-col gap-1 rounded-xl border border-hr-border bg-hr-panel p-2 shadow-2xl">
                  {versionOptions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => handleVersionSelect(version.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors',
                        version.id === activeVersionId
                          ? 'bg-hr-primary/10 text-hr-primary'
                          : 'text-hr-text hover:bg-hr-bg',
                      )}
                    >
                      <span>{version.detailLabel}</span>
                      {version.id === activeVersionId ? (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Current</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShellTheme(shellTheme === 'dark' ? 'light' : 'dark')}
              className="builder-toolbar-control builder-toolbar-icon-control inline-flex rounded-full border border-hr-border bg-hr-bg text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary"
              title={shellTheme === 'dark' ? 'Switch platform shell to light mode' : 'Switch platform shell to dark mode'}
              aria-label={shellTheme === 'dark' ? 'Switch platform shell to light mode' : 'Switch platform shell to dark mode'}
            >
              {shellTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className="builder-toolbar-control builder-toolbar-pill-control inline-flex gap-1 rounded-full border border-hr-border bg-hr-bg text-xs font-semibold text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary"
              title="English interface placeholder"
              aria-label="English interface placeholder"
            >
              <Languages size={14} />
              ENG
            </button>
            <button
              type="button"
              onClick={openAccountInspector}
              className="builder-toolbar-control inline-flex gap-2 rounded-full border border-hr-border bg-hr-bg px-2 text-hr-text transition-colors hover:border-hr-primary"
              title={`${accountLabel} · open account inspector`}
              aria-label="Open account panel"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-hr-primary/10 text-xs font-semibold text-hr-primary">
                {accountInitial}
              </span>
              <CircleUserRound size={16} className="text-hr-muted" />
            </button>
          </div>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        name="projectBundleImport"
        accept="application/json,.json"
        className="hidden"
        disabled={cloudActionsLocked}
        onChange={handleImportFile}
      />

      {editorMode === 'preview' ? (
        <div className="flex-1 overflow-hidden">
          {previewState.error ? (
            <div className="h-full w-full p-8 bg-hr-bg">
              <div className="max-w-4xl mx-auto rounded-2xl border border-red-300 bg-red-50 px-5 py-4">
                <div className="text-sm font-semibold text-red-700 mb-1">Preview build failed</div>
                <div className="text-sm text-red-600">{previewState.error}</div>
              </div>
            </div>
          ) : !previewState.page ? (
            <div className="h-full w-full p-8 bg-hr-bg">
              <div className="mx-auto flex h-full max-w-4xl items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-panel/70 px-8 text-center">
                <div>
                  <Monitor size={40} className="mx-auto mb-4 text-hr-muted/70" />
                  <h2 className="mb-2 text-lg font-semibold text-hr-text">Preview needs a page shell</h2>
                  <p className="text-sm text-hr-muted">Create at least one page shell in Pages Board before entering runtime preview.</p>
                </div>
              </div>
            </div>
          ) : previewState.page ? (
            <RuntimePage
              project={previewState.project!}
              page={previewState.page}
            />
          ) : null}
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">
      {/* Left Asset Rail */}
      <AssetLibraryRail
        sections={visibleAssetSections}
        canCreateOverlay={canCreateOverlay}
        canApplyProjectBlueprint={canApplyProjectBlueprint}
        favoriteControlAssetIdSet={favoriteControlAssetIdSet}
        showFavoriteControlsOnly={showFavoriteControlsOnly}
        onAssetDragStart={handleAssetDragStart}
        onToggleFavoriteControlAsset={handleToggleFavoriteControlAsset}
        onToggleFavoriteControlsOnly={() => setShowFavoriteControlsOnly((current) => !current)}
      />

      {/* Center Canvas */}
      <div
        ref={containerRef}
        className="relative flex flex-1 flex-col overflow-hidden bg-hr-bg"
        onClick={() => clearAllSelections()}
        onDragOver={(e) => e.preventDefault()}
      >
        {editSurfaceMode !== 'pages' ? (
          <CanvasSurfaceHeader
            mode={editSurfaceMode}
            selectedPage={selectedPage}
            kitMasterOptions={kitStudioMasterOptions}
            selectedKitStudioId={selectedKitStudioId}
            onChangeMode={setEditSurfaceMode}
            onSelectKitStudioMaster={(id) => selectWidget(id, 'kit')}
            onFocusKitStudioMaster={() => setKitStudioFocusRequestKey((value) => value + 1)}
            onFitKitStudioBoard={() => setKitStudioFitRequestKey((value) => value + 1)}
            onRemoveSelectedWidget={removeSelectedWidget}
          />
        ) : null}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {editSurfaceMode === 'pages' ? (
            <ProjectThemeScope
              themeId={themeId}
              projectThemes={themeLibrary}
              className="h-full w-full"
            >
              <div className="relative h-full w-full">
                <PageBoard
                  pages={pages}
                  links={links}
                  selectedPageId={selectedPageId}
                  selectedLinkId={selectedLinkId}
                  curvePointToolMode={curvePointToolMode}
                  onSelectPage={(pageId) => {
                    setSelectedLinkId(null);
                    setCurvePointToolMode('move');
                    setSelectedPage(pageId);
                    setForcedInspectorMode(pageId ? 'page' : 'project');
                  }}
                  onSelectLink={handleSelectBoardLink}
                  onCurvePointToolModeChange={setCurvePointToolMode}
                  onOpenPage={(pageId) => {
                    setSelectedLinkId(null);
                    setCurvePointToolMode('move');
                    setSelectedPage(pageId);
                    setForcedInspectorMode('page');
                    setEditSurfaceMode('canvas');
                  }}
                  onCreatePage={createPage}
                  onApplyStarter={handleApplyProjectStarter}
                  canApplyStarter={canApplyProjectBlueprint}
                  onUpdatePageBoard={updatePageBoard}
                  onUpdatePageLinkMeta={updatePageLinkMeta}
                  onDeletePage={deletePage}
                  surfaceMode={editSurfaceMode}
                  onChangeSurfaceMode={setEditSurfaceMode}
                  fitRequestKey={pageBoardFitRequestKey}
                />
                {!hasActiveProject ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-hr-border bg-hr-panel/92 p-6 text-center shadow-xl backdrop-blur-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-hr-border bg-hr-bg text-hr-primary">
                        <FolderKanban size={22} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-hr-text">Create your first project</h3>
                      <p className="mt-2 text-sm text-hr-muted">
                        Use the highlighted plus button in the right Projects panel to define the project boundary first.
                      </p>
                    </div>
                  </div>
                ) : pages.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-hr-border bg-hr-panel/92 p-6 text-center shadow-xl backdrop-blur-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-hr-border bg-hr-bg text-hr-primary">
                        <Monitor size={22} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-hr-text">Start with a page shell</h3>
                      <p className="mt-2 text-sm text-hr-muted">
                        Create the first page shell, then start placing modules inside it.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleCreateFirstPageShell}
                          className="inline-flex items-center gap-2 rounded-lg bg-hr-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-hr-primary/90"
                        >
                          <Plus size={14} />
                          Create first page shell
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ProjectThemeScope>
          ) : editSurfaceMode === 'canvas' ? (
            <div className="min-h-full p-8">
              {!selectedPage ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-panel/70 px-8 text-center">
                  <div>
                  <Monitor size={40} className="mx-auto mb-4 text-hr-muted/70" />
                  <h3 className="text-lg font-medium text-hr-text mb-1">No page shell yet</h3>
                    <p className="text-sm text-hr-muted">Go back to Pages Board, drop in a page shell, then open the shell canvas.</p>
                  </div>
                </div>
              ) : (
                <BuilderWorkspaceScopeProvider scope="page">
                  <div className="flex justify-center">
                    <WebStageFrame
                      canvasWidth={canvasSize.width}
                      canvasHeight={canvasSize.height}
                      surfaceLabel={WEB_STAGE_SURFACE_LABEL}
                      modeLabel={`Page Canvas · ${selectedPage.name}`}
                      className="shrink-0"
                      bodyClassName="web-stage-editor-body"
                    >
                      <div className="web-stage-editor-surface">
                        <ProjectThemeScope
                          themeId={themeId}
                          projectThemes={themeLibrary}
                          className="web-stage-project-scope"
                        >
                          <div
                            data-project-stage-frame
                            data-stage-width={canvasSize.width}
                            data-stage-height={canvasSize.height}
                            className="relative min-h-full w-full"
                            style={{ minHeight: `${canvasSize.height}px` }}
                          >
                            {mounted && (
                              <ResponsiveGridLayout
                                className="layout min-h-full"
                                style={{ minHeight: `${canvasSize.height}px` }}
                                layouts={responsiveLayouts}
                                width={canvasSize.width}
                                breakpoints={PROJECT_GRID_BREAKPOINTS}
                                cols={PROJECT_GRID_COLS}
                                rowHeight={20}
                                onDrop={handleDrop as any}
                                dragConfig={{
                                  enabled: true,
                                  handle: '.widget-wrapper[data-widget-drag-armed="true"]',
                                  cancel: '.widget-delete-button, .widget-delete-button *',
                                }}
                                dropConfig={{
                                  enabled: true,
                                  defaultItem: { w: paletteItem?.w || 4, h: paletteItem?.h || 4 },
                                  onDragOver: handleDropDragOver as any
                                }}
                                onDragStop={syncLayoutStop as any}
                                onResizeStop={syncLayoutStop as any}
                                margin={[6, 6]}
                              >
                                {pageRootLayout.map((item) => {
                                  const widget = widgets[item.i];
                                  if (!widget) return <div key={item.i} />;
                                  const isSelected = selectedId === item.i;
                                  const defaultMinSize = getDefaultWidgetMinSize(widget.type);

                                  return (
                                    <div
                                      key={item.i}
                                      data-grid={{
                                        x: item.x,
                                        y: item.y,
                                        w: item.w,
                                        h: item.h,
                                        minW: item.minW || defaultMinSize.minW,
                                        minH: item.minH || defaultMinSize.minH,
                                      }}
                                      className={cn(isSelected && "z-10")}
                                    >
                                      <WidgetWrapper id={item.i} />
                                    </div>
                                  );
                                })}
                              </ResponsiveGridLayout>
                            )}

                            {pageRootLayout.length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center text-hr-muted bg-hr-panel/80 backdrop-blur-sm p-8 rounded-2xl border border-hr-border shadow-sm">
                                  <MousePointerClick size={48} className="mx-auto mb-4 opacity-50" />
                                  <h3 className="text-lg font-medium text-hr-text mb-1">Canvas is empty</h3>
                                  <p className="text-sm">Drag components or custom kits from the left rail into this page shell.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </ProjectThemeScope>
                      </div>
                    </WebStageFrame>
                  </div>
                </BuilderWorkspaceScopeProvider>
              )}
            </div>
          ) : (
            <div className="h-full w-full">
              <BuilderWorkspaceScopeProvider scope="kit">
                <div className="page-board-shell h-full w-full relative overflow-hidden">
                  <KitFactoryBoard
                    fitRequestKey={kitStudioFitRequestKey}
                    focusRequestKey={kitStudioFocusRequestKey}
                  />
                </div>
              </BuilderWorkspaceScopeProvider>
            </div>
          )}
        </div>
      </div>

      {/* Right Inspector Panel */}
      <InspectorPanelShell
        title={inspectorMeta.title}
        quickMode={inspectorQuickMode}
        onOpenProject={openProjectInspector}
        onOpenTheme={openThemeInspector}
      >
            {inspectorMode === 'project' ? (
              <>
                <ProjectWorkspacePanel
                  activeProjectId={activeProjectId}
                  projects={projects}
                  cloudActionsLocked={cloudActionsLocked}
                  highlightCreateProject={!hasActiveProject}
                  onSwitchProject={handleProjectSwitch}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                />
                {hasActiveProject ? (
                  <>
                    <ProjectContractPanel
                      projectId={projectId}
                      projectName={projectName}
                      targetPlatform={targetPlatform}
                      projectArchetype={projectArchetype}
                      cloudActionsLocked={cloudActionsLocked}
                      onProjectNameChange={setProjectName}
                      onImportJson={handleImportClick}
                      onExportJson={handleExportProject}
                      onExportDeliverable={handleExportDeliverable}
                    />
                    <VersionManagerPanel
                      versions={projectVersions}
                      currentVersionId={currentVersionId}
                      releaseVersionId={releaseVersionId}
                      cloudActionsLocked={cloudActionsLocked}
                      onSwitchVersion={handleVersionSelect}
                      onSetReleaseVersion={(versionId) => void setReleaseVersion(versionId).catch(() => {})}
                      onDeleteVersion={handleDeleteVersion}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {inspectorMode === 'theme' ? (
              <>
                <ThemeLibraryPanel
                  themes={themeCatalog}
                  projectThemeIds={projectThemeIds}
                  activeThemeId={themeId}
                  onApply={setThemeId}
                />

                <ThemeStudioPanel
                  activeTheme={activeTheme}
                  isProjectTheme={isProjectThemeActive}
                  onDuplicateActiveTheme={handleDuplicateActiveTheme}
                  onSaveTheme={(theme) => upsertTheme(theme, { activate: true })}
                  onDeleteTheme={deleteTheme}
                  onCreateReferenceTheme={handleCreateReferenceTheme}
                  onImportThemeText={handleImportThemeText}
                />
              </>
            ) : null}

            {inspectorMode === 'account' ? (
              <SessionStatusPanel
                session={session}
                authPending={authPending}
                authError={lastError}
                onSignIn={async (email, password) => {
                  await signIn(email, password);
                }}
                onSignInWithProvider={async (provider) => {
                  await signInWithProvider(provider);
                }}
                onSignUp={async (email, password) => {
                  await signUp(email, password);
                }}
                onResendVerification={async (email) => {
                  await resendVerification(email);
                }}
                onRefreshSession={async () => {
                  await refreshSession();
                }}
                onSignOut={async () => {
                  await signOut();
                }}
              />
            ) : null}

            {inspectorMode === 'page' ? (
              selectedPage ? (
                <PageShellInspectorPanel
                  page={selectedPage}
                  onChangeName={(value) => updatePageMeta(selectedPage.id, { name: value })}
                  onChangeRoute={(value) => updatePageMeta(selectedPage.id, { route: value })}
                />
              ) : (
                <div className="text-sm text-hr-muted text-center py-4">
                  Create a page shell on the board first, then edit its shell properties here.
                </div>
              )
            ) : null}

            {inspectorMode === 'relation' ? (
              selectedLink ? (
                <RelationInspectorPanel
                  relation={selectedLink}
                  sourcePageName={selectedLinkSourcePageName}
                  targetPageName={selectedLinkTargetPageName}
                  effectiveLabelText={selectedLinkEffectiveLabel}
                  defaultLabelText={selectedLinkDefaultLabel}
                  labelFontSize={selectedLinkLabelFontSize}
                  strokeColor={selectedLinkStrokeColor}
                  strokeWidth={selectedLinkStrokeWidth}
                  strokePattern={selectedLinkStrokePattern}
                  pathType={selectedLinkPathType}
                  curvePointCount={selectedLinkCurvePointCount}
                  curvePointToolMode={curvePointToolMode}
                  onChangeLabelText={(value) => updatePageLinkMeta(selectedLink.id, {
                    labelText: value === selectedLinkDefaultLabel ? undefined : value,
                  })}
                  onChangeLabelFontSize={(value) => updatePageLinkMeta(selectedLink.id, {
                    labelFontSize: value,
                  })}
                  onChangeStrokeColor={(value) => updatePageLinkMeta(selectedLink.id, {
                    strokeColor: value,
                  })}
                  onChangeStrokeWidth={(value) => updatePageLinkMeta(selectedLink.id, {
                    strokeWidth: value,
                  })}
                  onChangeStrokePattern={(value) => updatePageLinkMeta(selectedLink.id, {
                    strokePattern: value,
                  })}
                  onChangePathType={(value) => {
                    setCurvePointToolMode('move');
                    updatePageLinkMeta(selectedLink.id, {
                      pathType: value === 'curve' ? 'curve' : undefined,
                    });
                  }}
                  onChangeCurvePointToolMode={setCurvePointToolMode}
                />
              ) : (
                <div className="text-sm text-hr-muted text-center py-4">
                  Select a relation on the board to edit its line contract.
                </div>
              )
            ) : null}

            {inspectorMode !== 'widget' ? null : (
              <WidgetInspectorPanel
                selectedWidget={selectedWidget}
                selectedLayoutItem={selectedLayoutItemWithResizePreview}
                selectedPage={selectedPage}
                pages={pages}
                sourceOptions={sourceOptions}
                selectedBindings={selectedBindings}
                selectedActions={selectedActions}
                selectedSlotShellSlotId={activeSelectedSlotShellSlotId}
                selectedWidgetLayerLabel={selectedWidgetLayerLabel}
                selectedWidgetInspectorLabel={selectedWidgetInspectorLabel}
                selectedWidgetSourceBadge={selectedWidgetSourceBadge}
                selectedWidgetSourceName={selectedWidgetSourceName}
                showCardLayoutControls={showCardLayoutControls}
                selectedCardControlMaxCols={selectedCardControlMaxCols}
                selectedWidgetFollowParentWidth={selectedWidgetFollowParentWidth}
                widgetInspectorFooter={widgetInspectorFooter}
                updateSelectedWidgetProps={updateSelectedWidgetProps}
                updateSelectedLayoutItem={updateSelectedLayoutItem}
                updateSelectedWidgetFollowParentWidth={updateSelectedWidgetFollowParentWidth}
                handleCreateActionTargetPage={handleCreateActionTargetPage}
              />
            )}
      </InspectorPanelShell>
      </div>
      )}
      {isCreateProjectOpen ? (
        <CreateProjectDialog
          projectDraftName={projectDraftName}
          projectDraftArchetype={projectDraftArchetype}
          projectDraftPlatform={projectDraftPlatform}
          projectDraftStarterId={projectDraftStarterId}
          selectedProjectStarter={selectedProjectStarter}
          onClose={() => setIsCreateProjectOpen(false)}
          onSubmit={handleSubmitProjectCreate}
          onProjectDraftNameChange={(event) => setProjectDraftName(event.target.value)}
          onProjectDraftArchetypeChange={setProjectDraftArchetype}
          onProjectDraftPlatformChange={setProjectDraftPlatform}
          onProjectDraftStarterIdChange={setProjectDraftStarterId}
        />
      ) : null}
      {pendingVersionOption ? (
        <VersionCheckoutDialog
          versionShortLabel={pendingVersionOption.shortLabel}
          onCancel={() => setPendingVersionId(null)}
          onDiscard={() => handleVersionCheckout('discard')}
          onSave={() => handleVersionCheckout('save')}
        />
      ) : null}
    </div>
  );
}
