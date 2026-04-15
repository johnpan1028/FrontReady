import React, { useEffect, useMemo } from 'react';
import { getCompactor, ResponsiveGridLayout } from 'react-grid-layout';
import { PROJECT_GRID_BREAKPOINTS, PROJECT_GRID_COLS } from '../builder/responsive';
import { useBuilderWorkspaceScope } from '../builder/workspaceScope';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useBuilderStore, WidgetType } from '../store/builderStore';
import { WidgetWrapper } from '../builder/WidgetWrapper';
import { cn } from '../utils/cn';
import { getDefaultWidgetSize, isContainerWidget } from '../builder/widgetConfig';
import { createWidgetId } from '../core/projectDocument';

interface NestedCanvasProps {
  id: string;
  className?: string;
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
}

type GridLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

const INNER_CONTROL_GUTTER_COLS = 1;

const toGridNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeGridItem = (item: Partial<GridLayoutItem>): GridLayoutItem => ({
  i: String(item.i ?? ''),
  x: Math.max(0, Math.round(toGridNumber(item.x))),
  y: Math.max(0, Math.round(toGridNumber(item.y))),
  w: Math.max(1, Math.round(toGridNumber(item.w, 1))),
  h: Math.max(1, Math.round(toGridNumber(item.h, 1))),
  ...(item.minW != null ? { minW: Math.max(1, Math.round(toGridNumber(item.minW, 1))) } : {}),
  ...(item.minH != null ? { minH: Math.max(1, Math.round(toGridNumber(item.minH, 1))) } : {}),
});

const getCompactContentCols = (cols: number) => Math.max(1, cols - INNER_CONTROL_GUTTER_COLS);

const collides = (left: GridLayoutItem, right: GridLayoutItem) => {
  if (left.i === right.i) return false;
  if (left.x + left.w <= right.x) return false;
  if (right.x + right.w <= left.x) return false;
  if (left.y + left.h <= right.y) return false;
  if (right.y + right.h <= left.y) return false;
  return true;
};

const sortGridLayout = (layout: readonly GridLayoutItem[]) => (
  [...layout].sort((left, right) => left.y - right.y || left.x - right.x || left.i.localeCompare(right.i))
);

const areGridLayoutsEqual = (left: readonly GridLayoutItem[], right: readonly GridLayoutItem[]) => {
  if (left.length !== right.length) return false;

  const sortedLeft = sortGridLayout(left);
  const sortedRight = sortGridLayout(right);

  return sortedLeft.every((item, index) => {
    const next = sortedRight[index];
    return Boolean(
      next
      && item.i === next.i
      && item.x === next.x
      && item.y === next.y
      && item.w === next.w
      && item.h === next.h
      && item.minW === next.minW
      && item.minH === next.minH
    );
  });
};

const findFirstCollision = (
  item: GridLayoutItem,
  siblings: readonly GridLayoutItem[],
) => siblings.find((candidate) => collides(item, candidate)) ?? null;

const clampCompactItem = (
  item: Partial<GridLayoutItem>,
  autoOccupyRow: boolean,
  parentCols: number,
): GridLayoutItem => {
  const normalized = normalizeGridItem(item);
  const contentCols = getCompactContentCols(parentCols);
  const minH = normalized.minH != null ? Math.max(1, normalized.minH) : undefined;

  if (autoOccupyRow) {
    return {
      ...normalized,
      x: 0,
      w: contentCols,
      minW: contentCols,
      minH,
    };
  }

  const minW = normalized.minW != null ? Math.min(contentCols, Math.max(1, normalized.minW)) : undefined;
  const width = Math.min(contentCols, Math.max(minW ?? 1, normalized.w));

  return {
    ...normalized,
    x: Math.max(0, Math.min(normalized.x, Math.max(0, contentCols - width))),
    w: width,
    minW,
    minH,
  };
};

const normalizeCompactLayout = (
  sourceLayout: readonly GridLayoutItem[],
  widgets: Record<string, { props?: Record<string, unknown> }>,
  parentCols: number,
  enabled: boolean,
) => {
  if (!enabled) {
    return sourceLayout.map((item) => ({ ...normalizeGridItem(item) }));
  }

  const placed: GridLayoutItem[] = [];

  sortGridLayout(sourceLayout.map((item) => normalizeGridItem(item))).forEach((item) => {
    const autoOccupyRow = Boolean(widgets[item.i]?.props?.autoOccupyRow);
    let candidate = clampCompactItem(item, autoOccupyRow, parentCols);
    let guard = 0;

    while (guard < 200) {
      const collision = findFirstCollision(candidate, placed);
      if (!collision) break;
      candidate = {
        ...candidate,
        y: collision.y + collision.h,
      };
      guard += 1;
    }

    placed.push(candidate);
  });

  return placed;
};

const canPlaceCompactItem = (
  item: Partial<GridLayoutItem>,
  itemId: string | undefined,
  widgets: Record<string, { props?: Record<string, unknown> }>,
  parentCols: number,
  enabled: boolean,
  currentLayout: readonly GridLayoutItem[],
) => {
  if (!enabled) return true;
  const autoOccupyRow = Boolean(itemId ? widgets[itemId]?.props?.autoOccupyRow : false);
  const candidate = clampCompactItem(item, autoOccupyRow, parentCols);
  const siblings = currentLayout.filter((layoutItem) => layoutItem.i !== candidate.i);
  return !findFirstCollision(candidate, siblings);
};

export const NestedCanvas: React.FC<NestedCanvasProps> = ({ id, className, compact = false, layoutMode = 'grid' }) => {
  const scope = useBuilderWorkspaceScope();
  const {
    widgets,
    layouts,
    selectedId,
    kitStudioWidgets,
    kitStudioLayouts,
    selectedKitStudioId,
    draggedType,
    setDraggedType,
    addWidget,
    moveWidget,
    updateLayout,
  } = useBuilderStore();
  const { width, containerRef, mounted } = useContainerWidth();
  const scopedWidgets = scope === 'kit' ? kitStudioWidgets : widgets;
  const scopedLayouts = scope === 'kit' ? kitStudioLayouts : layouts;
  const scopedSelectedId = scope === 'kit' ? selectedKitStudioId : selectedId;

  const layout = scopedLayouts[id] || [];
  const containerWidget = scopedWidgets[id];
  const containerLayout = containerWidget ? (scopedLayouts[containerWidget.parentId] || []) : [];
  const containerLayoutItem = containerLayout.find((item) => item.i === id);
  const parentCols = Math.max(1, Number(containerLayoutItem?.w || 8));
  const compactGridRulesEnabled = compact && layoutMode === 'grid';
  const compactCols = Math.max(1, parentCols);
  const compactContentCols = getCompactContentCols(compactCols);
  const gridLayout = useMemo(
    () => normalizeCompactLayout(layout as GridLayoutItem[], scopedWidgets, parentCols, compactGridRulesEnabled),
    [compactGridRulesEnabled, layout, parentCols, scopedWidgets],
  );
  const responsiveLayouts = useMemo(() => ({ lg: gridLayout }), [gridLayout]);
  const canvasWidth = Math.max(width, 120);
  const rowHeight = 18;
  const compactDropZoneMinHeight = rowHeight * 4 + 8;
  const cols = compact
    ? {
        lg: compactCols,
        md: compactCols,
        sm: compactCols,
        xs: compactCols,
        xxs: compactCols,
      }
    : PROJECT_GRID_COLS;
  const margin = compact ? [1, 1] : [1, 1];
  const containerPadding = compact ? [1, 1] : [0, 0];

  useEffect(() => {
    if (!compactGridRulesEnabled) return;
    const normalizedSource = normalizeCompactLayout(layout as GridLayoutItem[], scopedWidgets, parentCols, true);
    const currentSource = (layout as GridLayoutItem[]).map((item) => normalizeGridItem(item));
    if (areGridLayoutsEqual(currentSource, normalizedSource)) return;
    updateLayout(id, normalizedSource as any[], scope);
  }, [compactGridRulesEnabled, id, layout, parentCols, scopedWidgets, scope, updateLayout]);

  const canNestExistingWidget = (widgetId: string) => {
    const sourceWidget = scopedWidgets[widgetId];
    if (!sourceWidget) return false;
    if (isContainerWidget(sourceWidget.type)) return false;

    const publishedMasterName = typeof sourceWidget.props?.kitTemplateName === 'string'
      ? sourceWidget.props.kitTemplateName.trim()
      : '';

    if (scope === 'kit' && sourceWidget.parentId === 'root' && publishedMasterName) {
      return false;
    }

    return true;
  };

  const getPlaceholderSize = (type: string | null) => {
    let w = 4;
    let h = 4;
    if (type === 'template') {
      w = 1;
      h = 1;
    } else if (type) {
      const size = getDefaultWidgetSize(type as WidgetType, compact ? compactContentCols : 48);
      w = size.w;
      h = size.h;
    }
    const maxCols = compact ? compactContentCols : 48;
    w = Math.min(w, maxCols);
    return { w, h };
  };

  const handleDrop = (nextLayout: any[], item: any, e: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const movedWidgetId = e.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (e.dataTransfer?.getData('application/x-builder-scope') as 'page' | 'kit' | '') || 'page';
    if (movedWidgetId && item && movedWidgetScope === scope && scopedWidgets[movedWidgetId]) {
      const sourceWidget = scopedWidgets[movedWidgetId];
      if (!canNestExistingWidget(movedWidgetId)) {
        setDraggedType(null);
        return;
      }
      const sourceLayoutItem = scopedLayouts[sourceWidget.parentId]?.find((layoutItem) => layoutItem.i === movedWidgetId);
      const proposedItem = {
        i: movedWidgetId,
        x: item.x,
        y: item.y,
        w: sourceLayoutItem?.w || item.w || 8,
        h: sourceLayoutItem?.h || item.h || 6,
        minW: sourceLayoutItem?.minW,
        minH: sourceLayoutItem?.minH,
      };
      if (!canPlaceCompactItem(
        proposedItem,
        movedWidgetId,
        scopedWidgets,
        parentCols,
        compactGridRulesEnabled,
        gridLayout,
      )) {
        setDraggedType(null);
        return;
      }
      moveWidget(movedWidgetId, id, proposedItem, scope);
      setDraggedType(null);
      return;
    }

    const type = (e.dataTransfer?.getData('text/plain') || draggedType) as WidgetType | 'template';
    if (!type || !item) return;

    if (type === 'template') {
      setDraggedType(null);
      return;
    }
    if (isContainerWidget(type as WidgetType)) {
      setDraggedType(null);
      return;
    }

    const newId = createWidgetId();
    const { w, h } = getPlaceholderSize(type as WidgetType);
    const proposedItem = {
      i: newId,
      x: item.x,
      y: item.y,
      w,
      h,
    };

    if (!canPlaceCompactItem(
      proposedItem,
      undefined,
      scopedWidgets,
      parentCols,
      compactGridRulesEnabled,
      gridLayout,
    )) {
      setDraggedType(null);
      return;
    }

    addWidget(newId, type as WidgetType, proposedItem, id, undefined, scope);
    setDraggedType(null);
  };

  const handleDropDragOver = (e: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const movedWidgetId = e?.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = (e?.dataTransfer?.getData('application/x-builder-scope') as 'page' | 'kit' | '') || 'page';
    if (movedWidgetId && movedWidgetScope === scope && !canNestExistingWidget(movedWidgetId)) {
      return false;
    }
    if (draggedType === 'template') {
      return false;
    }
    if (draggedType && isContainerWidget(draggedType as WidgetType)) {
      return false;
    }
    return getPlaceholderSize(draggedType);
  };

  const syncLayoutStop = (currentLayout: any[], oldItem: any, newItem: any) => {
    if (
      compactGridRulesEnabled
      && newItem
      && oldItem
      && !canPlaceCompactItem(newItem, newItem.i, scopedWidgets, parentCols, true, gridLayout)
    ) {
      updateLayout(id, gridLayout as any[], scope);
      return;
    }
    updateLayout(
      id,
      normalizeCompactLayout(currentLayout as GridLayoutItem[], scopedWidgets, parentCols, compactGridRulesEnabled) as any[],
      scope,
    );
  };

  if (layoutMode === 'flex-row' || layoutMode === 'flex-col') {
    const flexDir = layoutMode === 'flex-row' ? 'flex-row' : 'flex-col';
    return (
      <div
        ref={containerRef}
        className={cn('relative flex h-full w-full gap-1 overflow-auto p-1 group/canvas', flexDir, className)}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {layout.map((item) => {
          const widget = scopedWidgets[item.i];
          if (!widget) return null;
          const isSelected = scopedSelectedId === item.i;
          return (
            <div key={item.i} className={cn('shrink-0', isSelected && 'z-10')}>
              <WidgetWrapper id={item.i} />
            </div>
          );
        })}
        {layout.length === 0 && (
          <div className="flex flex-1 items-center justify-center opacity-0 transition-opacity pointer-events-none group-hover/canvas:opacity-100">
            <p className="text-xs text-hr-muted">Drop widgets here</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        compactGridRulesEnabled ? 'relative group/canvas min-h-full w-full' : 'relative group/canvas h-full w-full',
        className,
      )}
      style={compactGridRulesEnabled ? { minHeight: compactDropZoneMinHeight } : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      ref={containerRef}
    >
      {mounted && (
        <ResponsiveGridLayout
          className={cn(
            'layout nested-layout w-full',
            compactGridRulesEnabled ? 'min-h-full' : 'h-full min-h-0',
          )}
          style={compactGridRulesEnabled ? { minHeight: compactDropZoneMinHeight } : undefined}
          layouts={responsiveLayouts}
          width={canvasWidth}
          autoSize={compactGridRulesEnabled}
          breakpoints={PROJECT_GRID_BREAKPOINTS}
          cols={cols}
          rowHeight={rowHeight}
          containerPadding={containerPadding as [number, number]}
          compactor={compactGridRulesEnabled ? getCompactor(null, false, true) : undefined}
          onDrop={handleDrop as any}
          dropConfig={{
            enabled: draggedType !== 'template',
            defaultItem: getPlaceholderSize(draggedType),
            onDragOver: handleDropDragOver as any,
          }}
          onDragStop={syncLayoutStop as any}
          onResizeStop={syncLayoutStop as any}
          margin={margin as [number, number]}
          dragConfig={{ enabled: true, cancel: '.external-move-handle', bounded: true }}
          resizeConfig={{ enabled: true }}
        >
          {gridLayout.map((item) => {
            const widget = scopedWidgets[item.i];
            if (!widget) return <div key={item.i} />;

            const isSelected = scopedSelectedId === item.i;

            return (
              <div
                key={item.i}
                data-grid={{
                  x: item.x,
                  y: item.y,
                  w: item.w,
                  h: item.h,
                  minW: item.minW || 1,
                  minH: item.minH || 1,
                }}
                className={cn(isSelected && 'z-10')}
              >
                <WidgetWrapper id={item.i} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

      {layout.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity pointer-events-none group-hover/canvas:opacity-100">
          <div className="rounded-xl border border-dashed border-hr-border bg-hr-panel/50 p-4 text-center text-hr-muted backdrop-blur-sm">
            <p className="text-xs">Drop widgets here</p>
          </div>
        </div>
      )}
    </div>
  );
};
