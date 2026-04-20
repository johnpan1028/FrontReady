import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderWorkspaceScope } from './workspaceScope';
import { useBuilderStore } from '../store/builderStore';
import { WidgetRegistry } from './registry';
import { Move } from 'lucide-react';
import { cn } from '../utils/cn';
import { getWidgetFrameStyle } from '../runtime/frameStyle';
import { createWidgetId } from '../core/projectDocument';
import { getDefaultWidgetSize, isContainerWidget, type WidgetType } from './widgetConfig';

interface WidgetWrapperProps {
  id: string;
}

const KIT_DRAG_WIDGET_SIZE_MIME = 'application/x-kit-widget-size';
const KIT_BOARD_HOST_SELECTOR = '[data-kit-board-host="true"]';
const KIT_ROOT_DROP_PREVIEW_EVENT = 'kit-root-drop-preview';
const KIT_ROOT_DRAG_SESSION_EVENT = 'kit-root-drag-session';
const NESTED_CANVAS_HOST_SELECTOR = '[data-nested-canvas-host="true"]';
const ROOT_RESIZE_PREVIEW_HOST_SELECTOR = '.project-theme-scope--inline';
const BORDERABLE_CONTROL_TYPES = new Set<WidgetType>([
  'heading',
  'text',
  'button',
  'icon_button',
  'divider',
  'text_input',
  'number_input',
  'textarea',
  'select',
  'checkbox',
  'radio',
]);

type LayoutItemShape = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

const findClosestContainerDropTarget = (source: EventTarget | Element | null) => {
  let current = source instanceof Element ? source : null;

  while (current) {
    const widgetId = current.getAttribute('data-builder-node-id');
    const widgetType = current.getAttribute('data-builder-node-type');

    if (widgetId && widgetType && isContainerWidget(widgetType as WidgetType)) {
      return {
        element: current as HTMLElement,
        widgetId,
        widgetType: widgetType as WidgetType,
      };
    }

    current = current.parentElement;
  }

  return null;
};

const isNestedCanvasEventTarget = (source: EventTarget | Element | null) => (
  source instanceof Element && Boolean(source.closest(NESTED_CANVAS_HOST_SELECTOR))
);

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

const clearKitRootDropPreview = () => {
  window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
    detail: { action: 'clear' },
  }));
};

const dispatchKitRootDragSession = (
  action: 'start' | 'end',
  widgetId: string,
  widgetType: WidgetType | null,
) => {
  window.dispatchEvent(new CustomEvent(KIT_ROOT_DRAG_SESSION_EVENT, {
    detail: {
      action,
      widgetId,
      widgetType,
    },
  }));
};

const sortLayoutItems = (items: readonly LayoutItemShape[]) => (
  [...items].sort((left, right) => left.y - right.y || left.x - right.x || left.i.localeCompare(right.i))
);

const reorderWidgetInSameContainer = (
  widgetId: string,
  parentId: string,
  releaseClientY: number,
  containerElement: HTMLElement,
  layouts: Record<string, LayoutItemShape[]>,
  updateLayout: (parentId: string, layout: LayoutItemShape[], scope?: 'page' | 'kit') => void,
) => {
  const currentLayout = layouts[parentId] ?? [];
  if (currentLayout.length < 2) return false;
  const sourceItem = currentLayout.find((item) => item.i === widgetId);
  if (!sourceItem) return false;

  const childElements = Array.from(containerElement.querySelectorAll<HTMLElement>('[data-builder-parent-id]'))
    .filter((element) => element.getAttribute('data-builder-parent-id') === parentId)
    .filter((element) => currentLayout.some((item) => item.i === element.getAttribute('data-builder-node-id')));

  if (childElements.length < 2) return false;

  const orderedElements = childElements
    .map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        id: element.getAttribute('data-builder-node-id') ?? '',
        midpointY: bounds.top + bounds.height / 2,
      };
    })
    .filter((entry) => entry.id)
    .sort((left, right) => left.midpointY - right.midpointY);

  const targetIndex = orderedElements.findIndex((entry) => releaseClientY < entry.midpointY);
  const normalizedTargetIndex = targetIndex === -1 ? orderedElements.length : targetIndex;
  const orderedIds = sortLayoutItems(currentLayout).map((item) => item.i);
  const withoutSource = orderedIds.filter((id) => id !== widgetId);
  const insertIndex = Math.max(0, Math.min(normalizedTargetIndex, withoutSource.length));
  const nextIds = [
    ...withoutSource.slice(0, insertIndex),
    widgetId,
    ...withoutSource.slice(insertIndex),
  ];

  if (nextIds.join('\u0000') === orderedIds.join('\u0000')) return false;

  const layoutById = new Map(currentLayout.map((item) => [item.i, item]));
  let nextY = 0;
  const nextLayout = nextIds.flatMap((id) => {
    const item = layoutById.get(id);
    if (!item) return [];
    const nextItem = {
      ...item,
      y: nextY,
    };
    nextY += Math.max(1, Number(item.h ?? 1));
    return [nextItem];
  });

  updateLayout(parentId, nextLayout, 'kit');
  return true;
};

const resolveNestedDropLayoutItem = (
  itemId: string,
  targetParentId: string,
  sourceType: WidgetType,
  sourceLayoutItem: { w?: number; h?: number; minW?: number; minH?: number } | undefined,
  widgets: Record<string, { parentId: string; type: WidgetType }>,
  layouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>,
) => {
  const targetParentWidget = widgets[targetParentId];
  if (!targetParentWidget || !isContainerWidget(targetParentWidget.type)) {
    return null;
  }

  const targetParentLayout = layouts[targetParentWidget.parentId] ?? [];
  const targetParentLayoutItem = targetParentLayout.find((item) => item.i === targetParentId);
  const targetChildLayout = layouts[targetParentId] ?? [];
  const targetMaxCols = Math.max(1, Number(targetParentLayoutItem?.w ?? 12));
  const nextChildY = targetChildLayout.reduce(
    (maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)),
    0,
  );
  const fallbackSize = getDefaultWidgetSize(sourceType, targetMaxCols);
  const width = Math.min(targetMaxCols, Math.max(1, Number(sourceLayoutItem?.w ?? fallbackSize.w)));

  return {
    i: itemId,
    x: 0,
    y: nextChildY,
    w: width,
    h: Math.max(1, Number(sourceLayoutItem?.h ?? fallbackSize.h)),
    minW: sourceLayoutItem?.minW,
    minH: sourceLayoutItem?.minH,
  };
};

const escapeAttributeValue = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, '\\$&');
};

const copyComputedCustomProperties = (source: HTMLElement, target: HTMLElement) => {
  const computedStyle = window.getComputedStyle(source);

  for (const propertyName of computedStyle) {
    if (!propertyName.startsWith('--')) continue;
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (!propertyValue) continue;
    target.style.setProperty(propertyName, propertyValue);
  }
};

const parseTransformScale = (transform: string | null | undefined) => {
  if (!transform || transform === 'none') return 1;

  const matrix3dMatch = transform.match(/matrix3d\((.+)\)/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(',').map((value) => Number(value.trim()));
    const scale = values[0];
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  const matrixMatch = transform.match(/matrix\((.+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map((value) => Number(value.trim()));
    const scale = values[0];
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const scale = Number(scaleMatch[1].split(',')[0]?.trim());
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  return 1;
};

const getKitBoardViewportScale = (source: HTMLElement) => {
  const boardHost = source.closest(KIT_BOARD_HOST_SELECTOR) ?? document.querySelector(KIT_BOARD_HOST_SELECTOR);
  const viewport = boardHost?.querySelector<HTMLElement>('.react-flow__viewport');
  return parseTransformScale(viewport ? window.getComputedStyle(viewport).transform : null);
};

export function WidgetWrapper({ id }: WidgetWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragProxyRef = useRef<HTMLElement | null>(null);
  const dragProxyOffsetRef = useRef({ x: 0, y: 0 });
  const rootResizePreviewHostRef = useRef<HTMLElement | null>(null);
  const scope = useBuilderWorkspaceScope();
  const widget = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioWidgets[id] : state.widgets[id]));
  const isSelected = useBuilderStore((state) => (
    scope === 'kit' ? state.selectedKitStudioId === id : state.selectedId === id
  ));
  const selectWidget = useBuilderStore((state) => state.selectWidget);
  const draggedType = useBuilderStore((state) => state.draggedType);
  const setDraggedType = useBuilderStore((state) => state.setDraggedType);
  const scopedWidgets = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioWidgets : state.widgets));
  const scopedLayouts = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioLayouts : state.layouts));
  const moveWidget = useBuilderStore((state) => state.moveWidget);
  const addWidget = useBuilderStore((state) => state.addWidget);
  const updateLayout = useBuilderStore((state) => state.updateLayout);
  const updateLayoutItem = useBuilderStore((state) => state.updateLayoutItem);
  const [isDragActive, setIsDragActive] = useState(false);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const resizeSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWidthPx: number;
    startHeightPx: number;
    minCols: number;
    minRows: number;
    pixelPerCol: number;
    pixelPerRow: number;
    viewportScale: number;
    lastCols: number;
    lastRows: number;
    lastWidthPx: number;
    lastHeightPx: number;
  } | null>(null);

  const shouldHideMoveHandle = false;
  const showControlsOnHover = true;
  const widgetType = widget?.type ?? null;
  const Component = widgetType ? WidgetRegistry[widgetType] : null;
  const widgetParentId = widget?.parentId ?? 'root';
  const widgetProps = widget?.props ?? {};
  const isRootKitWidget = scope === 'kit' && widgetParentId === 'root';
  const publishedMasterName = typeof widgetProps?.kitTemplateName === 'string'
    ? widgetProps.kitTemplateName.trim()
    : '';

  const widgetStyle = getWidgetFrameStyle(widgetProps);
  const canAcceptChildDrop = widgetType ? isContainerWidget(widgetType) : false;
  const isBoardManagedKitNode = isRootKitWidget && (canAcceptChildDrop || publishedMasterName.length > 0);
  const showSmartMoveHandle = scope === 'kit' && (!isRootKitWidget || !isBoardManagedKitNode);
  const childLayout = scopedLayouts[id] ?? [];
  const targetLayoutItem = scopedLayouts[widgetParentId]?.find((item) => item.i === id);
  const targetMaxCols = Math.max(1, Number(targetLayoutItem?.w ?? 12));
  const nextChildY = childLayout.reduce((maxY, item) => Math.max(maxY, Number(item.y ?? 0) + Number(item.h ?? 1)), 0);

  const getNestedDropLayoutItem = (
    itemId: string,
    sourceLayoutItem?: { w?: number; h?: number; minW?: number; minH?: number },
    widgetType?: WidgetType,
  ) => {
    const fallbackSize = widgetType ? getDefaultWidgetSize(widgetType, targetMaxCols) : { w: 8, h: 4 };
    const width = Math.min(targetMaxCols, Math.max(1, Number(sourceLayoutItem?.w ?? fallbackSize.w)));

    return {
      i: itemId,
      x: 0,
      y: nextChildY,
      w: width,
      h: Math.max(1, Number(sourceLayoutItem?.h ?? fallbackSize.h)),
      minW: sourceLayoutItem?.minW,
      minH: sourceLayoutItem?.minH,
    };
  };

  const clearRootResizePreviewStyles = useCallback(() => {
    const wrapperNode = wrapperRef.current;
    if (wrapperNode) {
      wrapperNode.style.removeProperty('width');
      wrapperNode.style.removeProperty('min-width');
      wrapperNode.style.removeProperty('height');
      wrapperNode.style.removeProperty('min-height');
    }

    const previewHost = rootResizePreviewHostRef.current;
    if (previewHost) {
      previewHost.style.removeProperty('width');
      previewHost.style.removeProperty('min-width');
      previewHost.style.removeProperty('height');
      previewHost.style.removeProperty('min-height');
    }
    rootResizePreviewHostRef.current = null;
  }, []);

  const stopRootResize = useCallback(() => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }

    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
      resizeCleanupRef.current = null;
    }

    resizeSessionRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleRootResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!(scope === 'kit' && widgetParentId === 'root' && widgetType === 'panel')) return;
    if (!targetLayoutItem) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    rootResizePreviewHostRef.current = wrapper.closest(ROOT_RESIZE_PREVIEW_HOST_SELECTOR) as HTMLElement | null;

    event.preventDefault();
    event.stopPropagation();
    selectWidget(id, scope);

    const bounds = wrapper.getBoundingClientRect();
    const viewportScale = getKitBoardViewportScale(wrapper);
    const startWidthPx = bounds.width / viewportScale;
    const startHeightPx = bounds.height / viewportScale;
    const baseCols = Math.max(1, Number(targetLayoutItem.w ?? 1));
    const minCols = Math.max(1, Number(targetLayoutItem.minW ?? 1));
    const pixelPerCol = Math.max(1, startWidthPx / baseCols);

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidthPx,
      startHeightPx,
      minCols,
      minRows: Math.max(1, Number(targetLayoutItem.minH ?? 1)),
      pixelPerCol,
      pixelPerRow: Math.max(1, startHeightPx / Math.max(1, Number(targetLayoutItem.h ?? 1))),
      viewportScale,
      lastCols: baseCols,
      lastRows: Math.max(1, Number(targetLayoutItem.h ?? 1)),
      lastWidthPx: startWidthPx,
      lastHeightPx: startHeightPx,
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || moveEvent.pointerId !== session.pointerId) return;

      moveEvent.preventDefault();
      const currentScale = getKitBoardViewportScale(wrapperRef.current ?? wrapper);
      session.viewportScale = currentScale;
      const deltaX = (moveEvent.clientX - session.startX) / currentScale;
      const deltaY = (moveEvent.clientY - session.startY) / currentScale;
      const nextWidthPx = Math.max(session.minCols * session.pixelPerCol, session.startWidthPx + deltaX);
      const nextHeightPx = Math.max(session.minRows * session.pixelPerRow, session.startHeightPx + deltaY);
      const nextCols = Math.max(session.minCols, Math.round(nextWidthPx / session.pixelPerCol));
      const nextRows = Math.max(session.minRows, Math.round(nextHeightPx / session.pixelPerRow));
      session.lastWidthPx = nextWidthPx;
      session.lastHeightPx = nextHeightPx;

      const nextWidthStyle = `${Math.round(nextWidthPx)}px`;
      const nextHeightStyle = `${Math.round(nextHeightPx)}px`;
      const previewHost = rootResizePreviewHostRef.current;
      if (
        nextCols === session.lastCols
        && nextRows === session.lastRows
        && wrapperRef.current?.style.width === nextWidthStyle
        && wrapperRef.current?.style.height === nextHeightStyle
        && (!previewHost || (
          previewHost.style.width === nextWidthStyle
          && previewHost.style.height === nextHeightStyle
        ))
      ) return;
      session.lastCols = nextCols;
      session.lastRows = nextRows;

      if (resizeFrameRef.current != null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = window.requestAnimationFrame(() => {
        const wrapperNode = wrapperRef.current;
        const previewHostNode = rootResizePreviewHostRef.current;
        if (wrapperNode) {
          wrapperNode.style.width = nextWidthStyle;
          wrapperNode.style.minWidth = nextWidthStyle;
          wrapperNode.style.height = nextHeightStyle;
          wrapperNode.style.minHeight = nextHeightStyle;
        }
        if (previewHostNode) {
          previewHostNode.style.width = nextWidthStyle;
          previewHostNode.style.minWidth = nextWidthStyle;
          previewHostNode.style.height = nextHeightStyle;
          previewHostNode.style.minHeight = nextHeightStyle;
        }
        resizeFrameRef.current = null;
      });
    };

    const handlePointerEnd = (endEvent: PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || endEvent.pointerId !== session.pointerId) return;
      const wrapperNode = wrapperRef.current;
      const currentScale = getKitBoardViewportScale(wrapperNode ?? wrapper);
      const finalWidthPx = wrapperNode
        ? wrapperNode.getBoundingClientRect().width / currentScale
        : session.lastWidthPx;
      const finalHeightPx = wrapperNode
        ? wrapperNode.getBoundingClientRect().height / currentScale
        : session.lastHeightPx;
      const nextCols = Math.max(session.minCols, Math.round(finalWidthPx / session.pixelPerCol));
      const nextRows = Math.max(session.minRows, Math.round(finalHeightPx / session.pixelPerRow));
      updateLayoutItem(id, 'root', { w: nextCols, h: nextRows }, 'kit');
      window.setTimeout(() => {
        clearRootResizePreviewStyles();
      }, 0);
      stopRootResize();
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerEnd, true);
    window.addEventListener('pointercancel', handlePointerEnd, true);
    resizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerEnd, true);
      window.removeEventListener('pointercancel', handlePointerEnd, true);
    };
  }, [
    id,
    clearRootResizePreviewStyles,
    scope,
    selectWidget,
    stopRootResize,
    targetLayoutItem,
    updateLayoutItem,
    widgetParentId,
    widgetType,
  ]);

  const updateDragProxyPosition = useCallback((clientX: number, clientY: number) => {
    const dragProxy = dragProxyRef.current;
    if (!dragProxy || (clientX <= 0 && clientY <= 0)) return;

    const left = Math.round(clientX - dragProxyOffsetRef.current.x);
    const top = Math.round(clientY - dragProxyOffsetRef.current.y);
    dragProxy.style.transform = `translate3d(${left}px, ${top}px, 0)`;

    const boardHost = document.querySelector<HTMLElement>(KIT_BOARD_HOST_SELECTOR);
    if (
      scope !== 'kit'
      || !isRootKitWidget
      || !widgetType
      || !boardHost
      || !isPointInsideElement(boardHost, clientX, clientY)
    ) {
      clearKitRootDropPreview();
      return;
    }

    window.dispatchEvent(new CustomEvent(KIT_ROOT_DROP_PREVIEW_EVENT, {
      detail: {
        action: 'show',
        widgetId: id,
        widgetType,
        left,
        top,
        width: dragProxy.offsetWidth || dragProxy.getBoundingClientRect().width,
        height: dragProxy.offsetHeight || dragProxy.getBoundingClientRect().height,
        clientX,
        clientY,
      },
    }));
  }, [id, isRootKitWidget, scope, widgetType]);

  const cleanupDragProxy = useCallback(() => {
    if (dragProxyRef.current?.parentNode) {
      dragProxyRef.current.parentNode.removeChild(dragProxyRef.current);
    }
    dragProxyRef.current = null;
    clearKitRootDropPreview();
  }, []);

  const ensureTransparentDragImage = useCallback(() => {
    const pixel = document.createElement('canvas');
    pixel.width = 1;
    pixel.height = 1;
    return pixel;
  }, []);

  const createDragProxy = useCallback((clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;

    const bounds = wrapper.getBoundingClientRect();
    const dragProxy = wrapper.cloneNode(true);
    if (!(dragProxy instanceof HTMLElement)) return null;
    copyComputedCustomProperties(wrapper, dragProxy);

    dragProxyOffsetRef.current = {
      x: Math.max(0, clientX > 0 ? clientX - bounds.left : 0),
      y: Math.max(0, clientY > 0 ? clientY - bounds.top : 0),
    };

    dragProxy.setAttribute('data-widget-drag-proxy', 'true');
    dragProxy.setAttribute('data-widget-selected', 'false');
    dragProxy.setAttribute('data-widget-dragging', 'false');
    dragProxy.classList.remove('drag-over');
    dragProxy.querySelectorAll<HTMLElement>('[data-widget-selected]').forEach((element) => {
      element.setAttribute('data-widget-selected', 'false');
    });
    dragProxy.style.width = `${bounds.width}px`;
    dragProxy.style.height = `${bounds.height}px`;
    dragProxy.style.position = 'fixed';
    dragProxy.style.top = '0';
    dragProxy.style.left = '0';
    dragProxy.style.margin = '0';
    dragProxy.style.pointerEvents = 'none';
    dragProxy.style.overflow = 'visible';
    dragProxy.style.zIndex = '9999';
    dragProxy.style.display = 'block';
    dragProxy.style.boxSizing = 'border-box';
    dragProxy.style.transform = 'translate3d(-2000px, -2000px, 0)';
    document.body.appendChild(dragProxy);
    dragProxyRef.current = dragProxy;
    updateDragProxyPosition(clientX, clientY);
    return bounds;
  }, [updateDragProxyPosition]);

  const handleLiveReorder = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (scope !== 'kit') return;

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');
    if (!movedWidgetId || movedWidgetScope !== 'kit') return;

    const latestState = useBuilderStore.getState();
    const sourceWidget = latestState.kitStudioWidgets[movedWidgetId];
    if (!sourceWidget) return;

    const reorderParentId = canAcceptChildDrop ? id : widgetParentId;
    if (sourceWidget.parentId !== reorderParentId) return;

    const containerElement = canAcceptChildDrop
      ? wrapperRef.current
      : document.querySelector<HTMLElement>(`[data-builder-node-id="${escapeAttributeValue(reorderParentId)}"]`);

    if (!containerElement) return;

    reorderWidgetInSameContainer(
      movedWidgetId,
      reorderParentId,
      Number(event.clientY ?? 0),
      containerElement,
      latestState.kitStudioLayouts as Record<string, LayoutItemShape[]>,
      updateLayout,
    );
  }, [canAcceptChildDrop, id, scope, updateLayout, widgetParentId]);

  const handleContainerDropCapture = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!canAcceptChildDrop) return;
    if (isNestedCanvasEventTarget(event.target)) return;

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');

    if (movedWidgetId && movedWidgetScope === scope && scopedWidgets[movedWidgetId]) {
      const sourceWidget = scopedWidgets[movedWidgetId];
      if (sourceWidget.id === id || sourceWidget.parentId === id || isContainerWidget(sourceWidget.type)) {
        return;
      }

      const sourcePublishedMasterName = typeof sourceWidget.props?.kitTemplateName === 'string'
        ? sourceWidget.props.kitTemplateName.trim()
        : '';
      if (scope === 'kit' && sourceWidget.parentId === 'root' && sourcePublishedMasterName) {
        return;
      }

      const sourceLayoutItem = scopedLayouts[sourceWidget.parentId]?.find((item) => item.i === movedWidgetId);
      event.preventDefault();
      event.stopPropagation();
      moveWidget(
        movedWidgetId,
        id,
        getNestedDropLayoutItem(movedWidgetId, sourceLayoutItem, sourceWidget.type),
        scope,
      );
      setDraggedType(null);
      return;
    }

    const type = (event.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || type === 'template' || !getDefaultWidgetSize(type as WidgetType) || isContainerWidget(type as WidgetType)) {
      return;
    }

    const nextId = createWidgetId();
    event.preventDefault();
    event.stopPropagation();
    addWidget(
      nextId,
      type as WidgetType,
      getNestedDropLayoutItem(nextId, undefined, type as WidgetType),
      id,
      undefined,
      scope,
    );
    setDraggedType(null);
  }, [
    addWidget,
    canAcceptChildDrop,
    draggedType,
    getNestedDropLayoutItem,
    id,
    moveWidget,
    scope,
    scopedLayouts,
    scopedWidgets,
    setDraggedType,
  ]);

  const handleSmartDragEnd = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (scope !== 'kit') {
      setDraggedType(null);
      return;
    }

    const currentX = Number(event.clientX ?? 0);
    const currentY = Number(event.clientY ?? 0);
    if (currentX <= 0 && currentY <= 0) {
      setDraggedType(null);
      return;
    }

    const dropElement = document.elementFromPoint(currentX, currentY);
    const targetContainer = findClosestContainerDropTarget(dropElement);

    if (!targetContainer) {
      setDraggedType(null);
      return;
    }

    const { kitStudioWidgets, kitStudioLayouts, updateLayout } = useBuilderStore.getState();
    const latestWidget = kitStudioWidgets[id];
    if (!latestWidget || latestWidget.id === targetContainer.widgetId) {
      setDraggedType(null);
      return;
    }

    if (latestWidget.parentId === targetContainer.widgetId) {
      reorderWidgetInSameContainer(
        id,
        targetContainer.widgetId,
        currentY,
        targetContainer.element,
        kitStudioLayouts as Record<string, LayoutItemShape[]>,
        updateLayout,
      );
      setDraggedType(null);
      return;
    }

    const latestSourceLayoutItem = (kitStudioLayouts[latestWidget.parentId] ?? []).find((item) => item.i === id);
    const proposedItem = resolveNestedDropLayoutItem(
      id,
      targetContainer.widgetId,
      latestWidget.type,
      latestSourceLayoutItem,
      kitStudioWidgets as Record<string, { parentId: string; type: WidgetType }>,
      kitStudioLayouts as Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>,
    );

    if (!proposedItem) {
      setDraggedType(null);
      return;
    }

    moveWidget(id, targetContainer.widgetId, proposedItem, 'kit');
    setDraggedType(null);
  }, [id, moveWidget, scope, setDraggedType]);

  useEffect(() => {
    if (!isDragActive) return;

    const handleDocumentDragOver = (event: DragEvent) => {
      updateDragProxyPosition(Number(event.clientX ?? 0), Number(event.clientY ?? 0));
    };

    const handleDocumentDrag = (event: DragEvent) => {
      updateDragProxyPosition(Number(event.clientX ?? 0), Number(event.clientY ?? 0));
    };

    document.addEventListener('dragover', handleDocumentDragOver, true);
    document.addEventListener('drag', handleDocumentDrag, true);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver, true);
      document.removeEventListener('drag', handleDocumentDrag, true);
    };
  }, [isDragActive, updateDragProxyPosition]);

  useEffect(() => cleanupDragProxy, [cleanupDragProxy]);

  useEffect(() => () => {
    stopRootResize();
    clearRootResizePreviewStyles();
  }, [clearRootResizePreviewStyles, stopRootResize]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    // Container widgets (cards/panels) need to accept drops from children
    if (canAcceptChildDrop) {
      const handleDragOver = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) {
          node.classList.remove('drag-over');
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        // Add visual feedback
        node.classList.add('drag-over');
      };
      const handleDragLeave = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        node.classList.remove('drag-over');
      };
      const handleDrop = (event: DragEvent) => {
        if (isNestedCanvasEventTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        node.classList.remove('drag-over');
        handleContainerDropCapture(event as unknown as React.DragEvent<HTMLDivElement>);
      };

      node.addEventListener('dragover', handleDragOver);
      node.addEventListener('dragleave', handleDragLeave);
      node.addEventListener('drop', handleDrop);

      return () => {
        node.removeEventListener('dragover', handleDragOver);
        node.removeEventListener('dragleave', handleDragLeave);
        node.removeEventListener('drop', handleDrop);
      };
    }

    // Non-container widgets need to allow their parent to capture the drop
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    node.addEventListener('dragover', handleDragOver);

    return () => {
      node.removeEventListener('dragover', handleDragOver);
    };
  }, [canAcceptChildDrop, handleContainerDropCapture]);

  if (!widget || !Component) {
    return null;
  }

  return (
    <div 
      ref={wrapperRef}
      data-builder-node-id={widget.id}
      data-builder-node-type={widget.type}
      data-builder-parent-id={widget.parentId}
      data-widget-border-style={typeof widget.props?.borderStyle === 'string'
        ? (widget.props.borderStyle === 'transparent' ? 'transparent' : 'solid')
        : (BORDERABLE_CONTROL_TYPES.has(widget.type) ? 'solid' : 'transparent')}
      data-widget-selected={isSelected ? 'true' : 'false'}
      data-widget-dragging={isDragActive ? 'true' : 'false'}
      className={cn(
        'widget-wrapper relative group w-full h-full overflow-visible'
      )}
      onDragOverCapture={(e) => {
        handleLiveReorder(e);
        if (!canAcceptChildDrop) return;
        if (isNestedCanvasEventTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDropCapture={handleContainerDropCapture}
      onClick={(e) => {
        e.stopPropagation();
        selectWidget(id, scope);
      }}
    >
      <div className="w-full h-full" style={widgetStyle}>
        {showSmartMoveHandle && (
          <div
            className={cn(
              "external-move-handle absolute top-1 left-1 z-20 p-1 rounded bg-hr-panel/80 border border-hr-border text-hr-muted cursor-grab active:cursor-grabbing",
              shouldHideMoveHandle
                ? 'pointer-events-none opacity-0'
                : (isSelected ? "opacity-100" : showControlsOnHover ? "opacity-0 group-hover:opacity-100" : "opacity-0")
            )}
            draggable={isRootKitWidget}
            onMouseDown={(e) => {
              if (isRootKitWidget) {
                e.stopPropagation();
              }
            }}
            onDragStart={(e) => {
              if (!isRootKitWidget) {
                e.preventDefault();
                return;
              }
              e.stopPropagation();
              dispatchKitRootDragSession('start', id, widgetType);

              const bounds = createDragProxy(e.clientX, e.clientY);
              if (bounds) {
                e.dataTransfer.setDragImage(ensureTransparentDragImage(), 0, 0);
                e.dataTransfer.setData(KIT_DRAG_WIDGET_SIZE_MIME, JSON.stringify({
                  width: bounds.width,
                  height: bounds.height,
                  offsetX: e.clientX > 0 ? e.clientX - bounds.left : 0,
                  offsetY: e.clientY > 0 ? e.clientY - bounds.top : 0,
                }));
              }

              e.dataTransfer.setData('application/x-widget-id', id);
              e.dataTransfer.setData('application/x-builder-scope', scope);
              e.dataTransfer.effectAllowed = 'move';
              if (widgetType) {
                setDraggedType(widgetType);
              }
              setIsDragActive(true);
            }}
            onDrag={(e) => {
              updateDragProxyPosition(Number(e.clientX ?? 0), Number(e.clientY ?? 0));
            }}
            onDragEnd={(e) => {
              dispatchKitRootDragSession('end', id, widgetType);
              cleanupDragProxy();
              setIsDragActive(false);
              handleSmartDragEnd(e);
            }}
            title="Drag to move"
          >
            <Move size={12} />
          </div>
        )}
        {isBoardManagedKitNode ? (
          <div
            className={cn(
              "kit-root-board-handle absolute top-1 left-1 z-20 p-1 rounded bg-hr-panel/80 border border-hr-border text-hr-muted cursor-grab active:cursor-grabbing",
              shouldHideMoveHandle
                ? 'pointer-events-none opacity-0'
                : (isSelected ? "opacity-100" : showControlsOnHover ? "opacity-0 group-hover:opacity-100" : "opacity-0")
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            title="Drag on board"
          >
            <Move size={12} />
          </div>
        ) : null}
        {scope === 'kit' && widgetParentId === 'root' && widgetType === 'panel' ? (
          <span
            className={cn(
              "react-resizable-handle react-resizable-handle-se absolute z-20 transition-opacity",
              isSelected ? "opacity-100" : showControlsOnHover ? "opacity-0 group-hover:opacity-100" : "opacity-0",
            )}
            onPointerDown={handleRootResizePointerDown}
            title="Resize card width"
          />
        ) : null}
        <Component id={widget.id} {...widget.props} />
      </div>
    </div>
  );
}
