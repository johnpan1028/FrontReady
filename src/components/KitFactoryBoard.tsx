import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import { getBuiltInAssetTemplate } from '../builder/assetLibrary';
import { getDefaultWidgetSize, isContainerWidget } from '../builder/widgetConfig';
import { WidgetWrapper } from '../builder/WidgetWrapper';
import { createWidgetId } from '../core/projectDocument';
import { useBuilderStore, type WidgetType } from '../store/builderStore';
import { ProjectThemeScope } from '../theme/ProjectThemeScope';
import { cn } from '../utils/cn';

type MasterNodeData = {
  widgetId: string;
};

type MasterBoardNode = Node<MasterNodeData, 'master'>;
type PreviewBoardNode = Node<{ width: number; height: number }, 'preview'>;
type KitRootDropPreviewEventDetail =
  | { action: 'clear' }
  | {
      action: 'show';
      left: number;
      top: number;
      width: number;
      height: number;
      widgetType: WidgetType;
      widgetId?: string;
      clientX?: number;
      clientY?: number;
    };

const MASTER_CELL_WIDTH = 28;
const MASTER_ROW_HEIGHT = 22;
const ROOT_CONTROL_ROW_HEIGHT = 18;
const ROOT_NODE_GAP = 12;
const KIT_DRAG_WIDGET_SIZE_MIME = 'application/x-kit-widget-size';
const NESTED_CANVAS_HOST_SELECTOR = '[data-nested-canvas-host="true"]';

type RootLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type RootWidgetMeta = {
  type: WidgetType;
  props?: Record<string, unknown>;
};

const isBoardManagedWidget = (widget?: RootWidgetMeta | null) => {
  if (!widget) return true;
  const publishedMasterName = typeof widget.props?.kitTemplateName === 'string'
    ? widget.props.kitTemplateName.trim()
    : '';

  return isContainerWidget(widget.type) || publishedMasterName.length > 0;
};

const resolveMasterNodeSize = (
  layoutItem: { w: number; h: number },
  widget?: RootWidgetMeta | null,
) => {
  const width = Math.max(1, layoutItem.w * MASTER_CELL_WIDTH);
  const height = Math.max(1, layoutItem.h * (isBoardManagedWidget(widget) ? MASTER_ROW_HEIGHT : ROOT_CONTROL_ROW_HEIGHT));

  if (!isBoardManagedWidget(widget)) {
    return { width, height };
  }

  return {
    width: Math.max(220, width),
    height: Math.max(140, height),
  };
};

const parseDraggedWidgetMetrics = (dataTransfer: DataTransfer | null | undefined) => {
  const rawSize = dataTransfer?.getData(KIT_DRAG_WIDGET_SIZE_MIME);
  if (!rawSize) return null;

  try {
    const parsed = JSON.parse(rawSize) as { width?: unknown; height?: unknown; offsetX?: unknown; offsetY?: unknown };
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const offsetX = Number(parsed.offsetX);
    const offsetY = Number(parsed.offsetY);

    return {
      width,
      height,
      offsetX: Number.isFinite(offsetX) && offsetX > 0 ? offsetX : 0,
      offsetY: Number.isFinite(offsetY) && offsetY > 0 ? offsetY : 0,
    };
  } catch {
    return null;
  }
};

const resolveTemplateRootLayout = (template: { data?: any } | null | undefined) => {
  const rootNode = template?.data?.root ? template.data.root : template?.data;
  const layout = rootNode?.layout ?? rootNode?.localLayout ?? {};

  return {
    w: Math.max(1, Number(layout.w ?? 12)),
    h: Math.max(1, Number(layout.h ?? 8)),
  };
};

const resolveAnchoredFlowPosition = (
  event: React.DragEvent<HTMLDivElement>,
  flow: ReactFlowInstance | null,
  hostRect: DOMRect | undefined,
  dragMetrics?: { offsetX?: number; offsetY?: number } | null,
) => {
  const anchorScreenPosition = {
    x: event.clientX - Number(dragMetrics?.offsetX ?? 0),
    y: event.clientY - Number(dragMetrics?.offsetY ?? 0),
  };

  if (flow) {
    const position = flow.screenToFlowPosition(anchorScreenPosition);
    return {
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
  }

  return {
    x: Math.round(Math.max(24, anchorScreenPosition.x - (hostRect?.left ?? 0))),
    y: Math.round(Math.max(24, anchorScreenPosition.y - (hostRect?.top ?? 0))),
  };
};

const MasterNodeBody = memo(function MasterNodeBody({
  widgetId,
  dragging,
}: {
  widgetId: string;
  dragging: boolean;
}) {
  const themeId = useBuilderStore((state) => state.themeId);
  const themeLibrary = useBuilderStore((state) => state.themeLibrary);

  return (
    <ProjectThemeScope
      themeId={themeId}
      projectThemes={themeLibrary}
      className={cn(
        'project-theme-scope--inline h-full w-full contain-layout contain-paint',
        dragging && 'pointer-events-none',
      )}
    >
      <WidgetWrapper id={widgetId} />
    </ProjectThemeScope>
  );
});

const MasterNode = memo(function MasterNode({ data, dragging }: NodeProps) {
  const nodeData = data as MasterNodeData;

  return (
    <div className={cn('relative h-full w-full select-none', dragging && 'will-change-transform')}>
      <div className="h-full w-full overflow-visible">
        <MasterNodeBody widgetId={nodeData.widgetId} dragging={Boolean(dragging)} />
      </div>
    </div>
  );
});

const PreviewNode = memo(function PreviewNode({ data }: NodeProps) {
  const previewData = data as { width: number; height: number };
  const themeId = useBuilderStore((state) => state.themeId);
  const themeLibrary = useBuilderStore((state) => state.themeLibrary);

  return (
    <ProjectThemeScope
      themeId={themeId}
      projectThemes={themeLibrary}
      className="project-theme-scope--inline h-full w-full"
    >
      <div
        className="kit-board-drop-preview"
        style={{
          width: `${Math.max(1, Number(previewData.width ?? 0))}px`,
          height: `${Math.max(1, Number(previewData.height ?? 0))}px`,
        }}
      />
    </ProjectThemeScope>
  );
});

const nodeTypes = {
  master: MasterNode,
  preview: PreviewNode,
};

const rectsOverlap = (
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) => {
  if (left.x + left.width + ROOT_NODE_GAP <= right.x) return false;
  if (right.x + right.width + ROOT_NODE_GAP <= left.x) return false;
  if (left.y + left.height + ROOT_NODE_GAP <= right.y) return false;
  if (right.y + right.height + ROOT_NODE_GAP <= left.y) return false;
  return true;
};

const layoutItemToRect = (
  layoutItem: RootLayoutItem,
  widget?: RootWidgetMeta | null,
) => {
  const size = resolveMasterNodeSize(layoutItem, widget);

  return {
    x: Number(layoutItem.x) || 0,
    y: Number(layoutItem.y) || 0,
    width: size.width,
    height: size.height,
  };
};

const findRootLayoutCollision = (
  candidate: RootLayoutItem,
  rootLayout: readonly RootLayoutItem[],
  widgets: Record<string, RootWidgetMeta>,
  candidateWidget: RootWidgetMeta | undefined,
  ignoreId?: string,
) => {
  const candidateRect = layoutItemToRect(candidate, candidateWidget);

  for (const item of rootLayout) {
    if (item.i === ignoreId || item.i === candidate.i) continue;
    const widget = widgets[item.i];
    if (!widget) continue;
    const itemRect = layoutItemToRect(item, widget);
    if (rectsOverlap(candidateRect, itemRect)) {
      return itemRect;
    }
  }

  return null;
};

const placeRootLayoutItemWithoutOverlap = (
  candidate: RootLayoutItem,
  rootLayout: readonly RootLayoutItem[],
  widgets: Record<string, RootWidgetMeta>,
  candidateWidget: RootWidgetMeta | undefined,
  ignoreId?: string,
) => {
  let nextItem = { ...candidate };
  let guard = 0;

  while (guard < 200) {
    const collision = findRootLayoutCollision(nextItem, rootLayout, widgets, candidateWidget, ignoreId);
    if (!collision) return nextItem;
    nextItem = {
      ...nextItem,
      y: Math.ceil((collision.y + collision.height + ROOT_NODE_GAP) / ROOT_CONTROL_ROW_HEIGHT) * ROOT_CONTROL_ROW_HEIGHT,
    };
    guard += 1;
  }

  return nextItem;
};

const resolveRootLayoutSize = (
  sourceLayoutItem: { w?: number; h?: number; minW?: number; minH?: number } | undefined,
  sourceWidget: RootWidgetMeta,
  draggedSize: { width: number; height: number } | null,
) => {
  if (!isBoardManagedWidget(sourceWidget) && draggedSize) {
    return {
      w: Math.max(1, draggedSize.width / MASTER_CELL_WIDTH),
      h: Math.max(1, draggedSize.height / ROOT_CONTROL_ROW_HEIGHT),
    };
  }

  return {
    w: sourceLayoutItem?.w ?? 8,
    h: sourceLayoutItem?.h ?? 6,
  };
};

const resolveViewportAtActualScale = (
  nodes: MasterBoardNode[],
  hostRect: DOMRect,
) => {
  if (nodes.length === 0) {
    return {
      x: hostRect.width * 0.5,
      y: hostRect.height * 0.5,
      zoom: 1,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + (typeof node.width === 'number' ? node.width : 220)));
  const maxY = Math.max(...nodes.map((node) => node.position.y + (typeof node.height === 'number' ? node.height : 140)));

  return {
    x: Math.round((hostRect.width - (maxX - minX)) * 0.5 - minX),
    y: Math.round((hostRect.height - (maxY - minY)) * 0.5 - minY),
    zoom: 1,
  };
};

const isPointInsideElement = (
  element: HTMLElement,
  clientX: number,
  clientY: number,
) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
};

const hasContainerDropAncestorAtPoint = (
  source: HTMLElement | null,
  widgets: Record<string, { type: WidgetType }>,
  clientX: number,
  clientY: number,
) => {
  let current: HTMLElement | null = source;

  while (current) {
    const widgetId = current.dataset.builderNodeId;
    if (
      widgetId
      && widgets[widgetId]
      && isContainerWidget(widgets[widgetId].type)
      && isPointInsideElement(current, clientX, clientY)
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
};

const isNestedCanvasTargetAtPoint = (
  source: HTMLElement | null,
  clientX: number,
  clientY: number,
) => {
  const nestedCanvas = source?.closest(NESTED_CANVAS_HOST_SELECTOR);
  return nestedCanvas instanceof HTMLElement && isPointInsideElement(nestedCanvas, clientX, clientY);
};

const isPointInsideNestedCanvas = (clientX: number, clientY: number) => (
  Array.from(document.querySelectorAll<HTMLElement>(NESTED_CANVAS_HOST_SELECTOR))
    .some((element) => isPointInsideElement(element, clientX, clientY))
);

const isPointInsideContainerWidget = (
  clientX: number,
  clientY: number,
  widgets: Record<string, { type: WidgetType }>,
) => (
  Array.from(document.querySelectorAll<HTMLElement>('[data-builder-node-id][data-builder-node-type]'))
    .some((element) => {
      const widgetId = element.dataset.builderNodeId;
      return Boolean(
        widgetId
        && widgets[widgetId]
        && isContainerWidget(widgets[widgetId].type)
        && isPointInsideElement(element, clientX, clientY),
      );
    })
);

const shouldDeferRootDropAtPoint = (
  source: HTMLElement | null,
  widgets: Record<string, { type: WidgetType }>,
  clientX: number,
  clientY: number,
) => (
  hasContainerDropAncestorAtPoint(source, widgets, clientX, clientY)
  || isNestedCanvasTargetAtPoint(source, clientX, clientY)
  || isPointInsideNestedCanvas(clientX, clientY)
  || isPointInsideContainerWidget(clientX, clientY, widgets)
);

type KitFactoryBoardProps = {
  fitRequestKey?: number;
  focusRequestKey?: number;
};

export function KitFactoryBoard({
  fitRequestKey = 0,
  focusRequestKey = 0,
}: KitFactoryBoardProps) {
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const [boardHost, setBoardHost] = useState<HTMLDivElement | null>(null);
  const [dropPreviewNode, setDropPreviewNode] = useState<PreviewBoardNode | null>(null);
  const lastHandledFitRequestRef = useRef(0);
  const lastHandledFocusRequestRef = useRef(0);
  const hasAppliedInitialViewportRef = useRef(false);
  const isNodeDraggingRef = useRef(false);
  const draggedType = useBuilderStore((state) => state.draggedType);
  const setDraggedType = useBuilderStore((state) => state.setDraggedType);
  const customTemplates = useBuilderStore((state) => state.customTemplates);
  const kitStudioWidgets = useBuilderStore((state) => state.kitStudioWidgets);
  const kitStudioLayouts = useBuilderStore((state) => state.kitStudioLayouts);
  const selectedKitStudioId = useBuilderStore((state) => state.selectedKitStudioId);
  const addWidget = useBuilderStore((state) => state.addWidget);
  const addTemplateNode = useBuilderStore((state) => state.addTemplateNode);
  const moveWidget = useBuilderStore((state) => state.moveWidget);
  const updateLayoutItem = useBuilderStore((state) => state.updateLayoutItem);
  const selectWidget = useBuilderStore((state) => state.selectWidget);

  const rootLayout = kitStudioLayouts.root ?? [];
  const nodes = useMemo<MasterBoardNode[]>(() => (
    rootLayout.map((layoutItem) => {
      const widget = kitStudioWidgets[layoutItem.i];
      const size = resolveMasterNodeSize(layoutItem, widget);

      return {
        id: layoutItem.i,
        type: 'master',
        position: {
          x: Number(layoutItem.x) || 0,
          y: Number(layoutItem.y) || 0,
        },
        width: size.width,
        height: size.height,
        draggable: true,
        dragHandle: '.kit-root-board-handle',
        selected: selectedKitStudioId === layoutItem.i,
        data: {
          widgetId: layoutItem.i,
        },
      };
    })
  ), [kitStudioWidgets, rootLayout, selectedKitStudioId]);
  const [displayNodes, setDisplayNodes] = useState<MasterBoardNode[]>(nodes);
  const visibleDisplayNodes = useMemo(
    () => displayNodes.filter((node) => Boolean(kitStudioWidgets[node.id])),
    [displayNodes, kitStudioWidgets],
  );
  const boardNodes = useMemo<Array<MasterBoardNode | PreviewBoardNode>>(
    () => (dropPreviewNode ? [...visibleDisplayNodes, dropPreviewNode] : visibleDisplayNodes),
    [dropPreviewNode, visibleDisplayNodes],
  );

  useEffect(() => {
    setDisplayNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((node) => [node.id, node]));

      return nodes.map((node) => {
        const currentNode = currentById.get(node.id);
        return {
          ...node,
          position: isNodeDraggingRef.current && currentNode ? currentNode.position : node.position,
        };
      });
    });
  }, [nodes]);

  useEffect(() => {
    if (!flowRef.current || !boardHost || hasAppliedInitialViewportRef.current || visibleDisplayNodes.length === 0) return;
    hasAppliedInitialViewportRef.current = true;
    flowRef.current.setViewport(resolveViewportAtActualScale(visibleDisplayNodes, boardHost.getBoundingClientRect()), {
      duration: 0,
    });
  }, [boardHost, visibleDisplayNodes]);

  const clearDropPreview = useCallback(() => {
    setDropPreviewNode(null);
  }, []);

  const updateDropPreview = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const dropTarget = event.target as HTMLElement | null;
    const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
    if (
      shouldDeferRootDropAtPoint(dropTarget, kitStudioWidgets, event.clientX, event.clientY)
      || shouldDeferRootDropAtPoint(
        pointTarget instanceof HTMLElement ? pointTarget : null,
        kitStudioWidgets,
        event.clientX,
        event.clientY,
      )
    ) {
      clearDropPreview();
      return;
    }

    const flow = flowRef.current;
    const hostRect = boardHost?.getBoundingClientRect();
    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');

    if (movedWidgetId && movedWidgetScope === 'kit' && kitStudioWidgets[movedWidgetId]) {
      const sourceWidget = kitStudioWidgets[movedWidgetId];
      const sourceLayoutItem = (kitStudioLayouts[sourceWidget.parentId] ?? []).find((item) => item.i === movedWidgetId);
      const dragMetrics = parseDraggedWidgetMetrics(event.dataTransfer);
      const rootLayoutSize = resolveRootLayoutSize(sourceLayoutItem, sourceWidget, dragMetrics);
      const anchoredPosition = resolveAnchoredFlowPosition(event, flow, hostRect, dragMetrics);
      const proposedItem = placeRootLayoutItemWithoutOverlap({
        i: movedWidgetId,
        x: anchoredPosition.x,
        y: anchoredPosition.y,
        w: rootLayoutSize.w,
        h: rootLayoutSize.h,
        minW: sourceLayoutItem?.minW,
        minH: sourceLayoutItem?.minH,
      }, rootLayout as RootLayoutItem[], kitStudioWidgets, sourceWidget, movedWidgetId);
      const size = resolveMasterNodeSize(proposedItem, sourceWidget);

      setDropPreviewNode({
        id: '__kit_drop_preview__',
        type: 'preview',
        position: { x: proposedItem.x, y: proposedItem.y },
        width: size.width,
        height: size.height,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        style: { pointerEvents: 'none', zIndex: 1000 },
        data: { width: size.width, height: size.height },
      });
      return;
    }

    const type = (event.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type) {
      clearDropPreview();
      return;
    }

    if (type === 'template') {
      const customTemplateId = event.dataTransfer?.getData('application/x-template-id');
      const builtInTemplateId = event.dataTransfer?.getData('application/x-built-in-template-id');
      const template = builtInTemplateId
        ? getBuiltInAssetTemplate(builtInTemplateId)
        : customTemplates.find((entry) => entry.id === customTemplateId);

      if (!template) {
        clearDropPreview();
        return;
      }

      const flowPosition = resolveAnchoredFlowPosition(event, flow, hostRect);
      const templateRootLayout = resolveTemplateRootLayout(template);
      const proposedItem = placeRootLayoutItemWithoutOverlap({
        i: '__template_drop_preview__',
        x: flowPosition.x,
        y: flowPosition.y,
        ...templateRootLayout,
      }, rootLayout as RootLayoutItem[], kitStudioWidgets, undefined);
      const size = resolveMasterNodeSize(proposedItem, undefined);

      setDropPreviewNode({
        id: '__kit_drop_preview__',
        type: 'preview',
        position: { x: proposedItem.x, y: proposedItem.y },
        width: size.width,
        height: size.height,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        style: { pointerEvents: 'none', zIndex: 1000 },
        data: { width: size.width, height: size.height },
      });
      return;
    }

    const flowPosition = resolveAnchoredFlowPosition(event, flow, hostRect);
    const nextWidget = { type };
    const proposedItem = placeRootLayoutItemWithoutOverlap({
      i: '__widget_drop_preview__',
      x: flowPosition.x,
      y: flowPosition.y,
      ...getDefaultWidgetSize(type, 48),
    }, rootLayout as RootLayoutItem[], kitStudioWidgets, nextWidget);
    const size = resolveMasterNodeSize(proposedItem, nextWidget);

    setDropPreviewNode({
      id: '__kit_drop_preview__',
      type: 'preview',
      position: { x: proposedItem.x, y: proposedItem.y },
      width: size.width,
      height: size.height,
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
      focusable: false,
      style: { pointerEvents: 'none', zIndex: 1000 },
      data: { width: size.width, height: size.height },
    });
  }, [boardHost, clearDropPreview, customTemplates, draggedType, kitStudioLayouts, kitStudioWidgets, rootLayout]);

  useEffect(() => {
    const handleGlobalDragEnd = () => clearDropPreview();
    const handleGlobalDragOver = (event: DragEvent) => {
      const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
      const targetElement = pointTarget instanceof HTMLElement ? pointTarget : null;
      if (shouldDeferRootDropAtPoint(targetElement, kitStudioWidgets, event.clientX, event.clientY)) {
        clearDropPreview();
      }
    };
    const handleKitRootDropPreview = (event: Event) => {
      const detail = (event as CustomEvent<KitRootDropPreviewEventDetail>).detail;
      if (!detail || detail.action === 'clear') {
        clearDropPreview();
        return;
      }
      const clientX = Number(detail.clientX);
      const clientY = Number(detail.clientY);
      const hasPointer = Number.isFinite(clientX) && Number.isFinite(clientY);
      const hostRect = boardHost?.getBoundingClientRect();
      const pointTarget = hasPointer ? document.elementFromPoint(clientX, clientY) : null;

      if (
        hasPointer
        && (
          !hostRect
          || clientX < hostRect.left
          || clientX > hostRect.right
          || clientY < hostRect.top
          || clientY > hostRect.bottom
          || shouldDeferRootDropAtPoint(
            pointTarget instanceof HTMLElement ? pointTarget : null,
            kitStudioWidgets,
            clientX,
            clientY,
          )
        )
      ) {
        clearDropPreview();
        return;
      }

      const flow = flowRef.current;
      const position = flow
        ? flow.screenToFlowPosition({ x: detail.left, y: detail.top })
        : {
            x: Math.round(detail.left - (hostRect?.left ?? 0)),
            y: Math.round(detail.top - (hostRect?.top ?? 0)),
          };
      const candidateWidget = { type: detail.widgetType };
      const proposedItem = placeRootLayoutItemWithoutOverlap({
        i: detail.widgetId ?? '__kit_drag_preview__',
        x: Math.round(position.x),
        y: Math.round(position.y),
        w: Math.max(1, detail.width / MASTER_CELL_WIDTH),
        h: Math.max(1, detail.height / ROOT_CONTROL_ROW_HEIGHT),
      }, rootLayout as RootLayoutItem[], kitStudioWidgets, candidateWidget, detail.widgetId);
      const size = resolveMasterNodeSize(proposedItem, candidateWidget);

      setDropPreviewNode({
        id: '__kit_drop_preview__',
        type: 'preview',
        position: { x: proposedItem.x, y: proposedItem.y },
        width: size.width,
        height: size.height,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
        style: { pointerEvents: 'none', zIndex: 1000 },
        data: { width: size.width, height: size.height },
      });
    };

    document.addEventListener('dragover', handleGlobalDragOver, true);
    document.addEventListener('drop', handleGlobalDragEnd, true);
    document.addEventListener('dragend', handleGlobalDragEnd, true);
    window.addEventListener('kit-root-drop-preview', handleKitRootDropPreview);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver, true);
      document.removeEventListener('drop', handleGlobalDragEnd, true);
      document.removeEventListener('dragend', handleGlobalDragEnd, true);
      window.removeEventListener('kit-root-drop-preview', handleKitRootDropPreview);
    };
  }, [boardHost, clearDropPreview, kitStudioWidgets, rootLayout]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearDropPreview();

    const dropTarget = event.target as HTMLElement | null;
    const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
    if (
      shouldDeferRootDropAtPoint(dropTarget, kitStudioWidgets, event.clientX, event.clientY)
      || shouldDeferRootDropAtPoint(
        pointTarget instanceof HTMLElement ? pointTarget : null,
        kitStudioWidgets,
        event.clientX,
        event.clientY,
      )
    ) {
      return;
    }

    const flow = flowRef.current;
    const hostRect = boardHost?.getBoundingClientRect();
    const flowPosition = resolveAnchoredFlowPosition(event, flow, hostRect);

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');
    if (movedWidgetId && movedWidgetScope === 'kit' && kitStudioWidgets[movedWidgetId]) {
      const sourceWidget = kitStudioWidgets[movedWidgetId];
      const sourceLayoutItem = (kitStudioLayouts[sourceWidget.parentId] ?? []).find((item) => item.i === movedWidgetId);
      const dragMetrics = parseDraggedWidgetMetrics(event.dataTransfer);
      const rootLayoutSize = resolveRootLayoutSize(
        sourceLayoutItem,
        sourceWidget,
        dragMetrics,
      );
      const anchoredPosition = resolveAnchoredFlowPosition(event, flow, hostRect, dragMetrics);
      const proposedItem = placeRootLayoutItemWithoutOverlap({
        i: movedWidgetId,
        x: anchoredPosition.x,
        y: anchoredPosition.y,
        w: rootLayoutSize.w,
        h: rootLayoutSize.h,
        minW: sourceLayoutItem?.minW,
        minH: sourceLayoutItem?.minH,
      }, rootLayout as RootLayoutItem[], kitStudioWidgets, sourceWidget, movedWidgetId);

      moveWidget(movedWidgetId, 'root', proposedItem, 'kit');
      selectWidget(movedWidgetId, 'kit');
      setDraggedType(null);
      return;
    }

    const type = (event.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type) return;

    if (type === 'template') {
      const customTemplateId = event.dataTransfer?.getData('application/x-template-id');
      const builtInTemplateId = event.dataTransfer?.getData('application/x-built-in-template-id');
      const template = builtInTemplateId
        ? getBuiltInAssetTemplate(builtInTemplateId)
        : customTemplates.find((entry) => entry.id === customTemplateId);

      if (template) {
        const templateRootLayout = resolveTemplateRootLayout(template);
        const proposedItem = placeRootLayoutItemWithoutOverlap(
          {
            i: '__template_drop__',
            x: flowPosition.x,
            y: flowPosition.y,
            ...templateRootLayout,
          },
          rootLayout as RootLayoutItem[],
          kitStudioWidgets,
          undefined,
        );
        addTemplateNode(
          template,
          'root',
          proposedItem.x,
          proposedItem.y,
          'kit',
        );
      }
      setDraggedType(null);
      return;
    }

    const nextId = createWidgetId();
    const defaultSize = getDefaultWidgetSize(type, 48);
    const nextWidget = { type };
    const proposedItem = placeRootLayoutItemWithoutOverlap({
      i: nextId,
      x: flowPosition.x,
      y: flowPosition.y,
      ...defaultSize,
    }, rootLayout as RootLayoutItem[], kitStudioWidgets, nextWidget);
    addWidget(nextId, type, proposedItem, 'root', undefined, 'kit');
    setDraggedType(null);
  }, [addTemplateNode, addWidget, boardHost, clearDropPreview, customTemplates, draggedType, kitStudioLayouts, kitStudioWidgets, moveWidget, rootLayout, selectWidget, setDraggedType]);

  const handleNodeClick = useCallback<NodeMouseHandler>((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    selectWidget(node.id, 'kit');
  }, [selectWidget]);

  const handleNodesChange = useCallback((changes: NodeChange<MasterBoardNode>[]) => {
    setDisplayNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const handleNodeDragStart = useCallback<NodeMouseHandler>(() => {
    isNodeDraggingRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback<NodeMouseHandler>((_, node) => {
    isNodeDraggingRef.current = false;
    const sourceLayoutItem = rootLayout.find((item) => item.i === node.id);
    const sourceWidget = kitStudioWidgets[node.id];
    const proposedItem = placeRootLayoutItemWithoutOverlap({
      i: node.id,
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      w: sourceLayoutItem?.w ?? 8,
      h: sourceLayoutItem?.h ?? 6,
      minW: sourceLayoutItem?.minW,
      minH: sourceLayoutItem?.minH,
    }, rootLayout as RootLayoutItem[], kitStudioWidgets, sourceWidget, node.id);

    updateLayoutItem(node.id, 'root', {
      x: proposedItem.x,
      y: proposedItem.y,
    }, 'kit');
  }, [kitStudioWidgets, rootLayout, updateLayoutItem]);

  const handleFocusSelected = useCallback(() => {
    if (!flowRef.current || !selectedKitStudioId) return;
    const targetNode = visibleDisplayNodes.find((node) => node.id === selectedKitStudioId);
    if (!targetNode) return;

    const width = typeof targetNode.width === 'number' ? targetNode.width : 220;
    const height = typeof targetNode.height === 'number' ? targetNode.height : 140;

    flowRef.current.fitBounds({
      x: targetNode.position.x - 120,
      y: targetNode.position.y - 120,
      width: width + 240,
      height: height + 240,
    }, { duration: 240, padding: 0.18 });
  }, [selectedKitStudioId, visibleDisplayNodes]);

  const handleFitAll = useCallback(() => {
    flowRef.current?.fitView({ duration: 260, padding: 0.18 });
  }, []);

  useEffect(() => {
    if (!fitRequestKey || !flowRef.current) return;
    if (fitRequestKey === lastHandledFitRequestRef.current) return;
    lastHandledFitRequestRef.current = fitRequestKey;

    window.requestAnimationFrame(() => {
      handleFitAll();
    });
  }, [fitRequestKey, handleFitAll]);

  useEffect(() => {
    if (!focusRequestKey || !flowRef.current) return;
    if (focusRequestKey === lastHandledFocusRequestRef.current) return;
    lastHandledFocusRequestRef.current = focusRequestKey;

    window.requestAnimationFrame(() => {
      handleFocusSelected();
    });
  }, [focusRequestKey, handleFocusSelected]);

  return (
    <div
      ref={setBoardHost}
      data-kit-board-host="true"
      className="relative h-full w-full"
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        updateDropPreview(event);
      }}
      onDragLeave={(event) => {
        const host = boardHost;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const isOutside = event.clientX < rect.left
          || event.clientX > rect.right
          || event.clientY < rect.top
          || event.clientY > rect.bottom;

        if (isOutside) {
          clearDropPreview();
        }
      }}
    >
      <ReactFlow
        className="page-board-flow"
        nodes={boardNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        minZoom={0.18}
        maxZoom={1.5}
        panOnDrag
        nodesConnectable={false}
        elementsSelectable
        onNodesChange={handleNodesChange}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        onPaneClick={() => selectWidget(null, 'kit')}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
      >
        <Background gap={28} size={1} color="color-mix(in srgb, var(--shell-border) 68%, transparent 32%)" />
        {nodes.length > 0 ? (
          <MiniMap
            pannable
            zoomable
            className="page-board-minimap"
            style={{
              background: 'color-mix(in srgb, var(--shell-panel) 92%, transparent 8%)',
            }}
            nodeColor={(node) => (node.selected ? '#4f7cff' : '#4f7cff')}
            maskColor="rgba(15, 23, 42, 0.10)"
          />
        ) : null}
        <Controls className="page-board-controls" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
