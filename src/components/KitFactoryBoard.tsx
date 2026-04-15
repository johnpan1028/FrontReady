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
import { getDefaultWidgetSize } from '../builder/widgetConfig';
import { WidgetWrapper } from '../builder/WidgetWrapper';
import { createWidgetId } from '../core/projectDocument';
import { useBuilderStore, type WidgetType } from '../store/builderStore';
import { ProjectThemeScope } from '../theme/ProjectThemeScope';
import { cn } from '../utils/cn';

type MasterNodeData = {
  widgetId: string;
};

type MasterBoardNode = Node<MasterNodeData, 'master'>;

const MASTER_CELL_WIDTH = 28;
const MASTER_ROW_HEIGHT = 22;

const resolveDropNodeSize = (layoutItem: { w?: number; h?: number }) => {
  const size = resolveMasterNodeSize({
    w: Math.max(1, Number(layoutItem.w ?? 8)),
    h: Math.max(1, Number(layoutItem.h ?? 6)),
  });

  return {
    width: size.width,
    height: size.height,
  };
};

const resolveTemplateRootLayout = (template: { data?: any } | null | undefined) => {
  const rootNode = template?.data?.root ? template.data.root : template?.data;
  const layout = rootNode?.layout ?? rootNode?.localLayout ?? {};

  return {
    w: Math.max(1, Number(layout.w ?? 12)),
    h: Math.max(1, Number(layout.h ?? 8)),
  };
};

const resolveCenteredFlowPosition = (
  flowPosition: { x: number; y: number },
  dimensions: { width: number; height: number },
) => ({
  x: Math.round(flowPosition.x - dimensions.width / 2),
  y: Math.round(flowPosition.y - dimensions.height / 2),
});

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
      <div
        className={cn(
          'h-full w-full overflow-visible',
          dragging && 'cursor-grabbing',
        )}
      >
        <MasterNodeBody widgetId={nodeData.widgetId} dragging={Boolean(dragging)} />
      </div>
    </div>
  );
});

const nodeTypes = {
  master: MasterNode,
};

const resolveMasterNodeSize = (layoutItem: { w: number; h: number }) => ({
  width: Math.max(220, layoutItem.w * MASTER_CELL_WIDTH),
  height: Math.max(140, layoutItem.h * MASTER_ROW_HEIGHT),
});

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
  const updateLayoutItem = useBuilderStore((state) => state.updateLayoutItem);
  const selectWidget = useBuilderStore((state) => state.selectWidget);

  const rootLayout = kitStudioLayouts.root ?? [];
  const nodes = useMemo<MasterBoardNode[]>(() => (
    rootLayout.map((layoutItem) => {
      const size = resolveMasterNodeSize(layoutItem);

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
        dragHandle: '.kit-root-move-handle',
        selected: selectedKitStudioId === layoutItem.i,
        data: {
          widgetId: layoutItem.i,
        },
      };
    })
  ), [rootLayout, selectedKitStudioId]);
  const [displayNodes, setDisplayNodes] = useState<MasterBoardNode[]>(nodes);

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
    if (!flowRef.current || !boardHost || hasAppliedInitialViewportRef.current || displayNodes.length === 0) return;
    hasAppliedInitialViewportRef.current = true;
    flowRef.current.setViewport(resolveViewportAtActualScale(displayNodes, boardHost.getBoundingClientRect()), {
      duration: 0,
    });
  }, [boardHost, displayNodes]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const flow = flowRef.current;
    const hostRect = boardHost?.getBoundingClientRect();
    const flowPosition = flow
      ? flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : {
          x: Math.max(24, event.clientX - (hostRect?.left ?? 0)),
          y: Math.max(24, event.clientY - (hostRect?.top ?? 0)),
        };

    const movedWidgetId = event.dataTransfer?.getData('application/x-widget-id');
    const movedWidgetScope = event.dataTransfer?.getData('application/x-builder-scope');
    if (movedWidgetId && movedWidgetScope === 'kit' && kitStudioWidgets[movedWidgetId]) {
      const existingRootLayoutItem = (kitStudioLayouts.root ?? []).find((item) => item.i === movedWidgetId);
      const centeredPosition = resolveCenteredFlowPosition(
        flowPosition,
        resolveDropNodeSize(existingRootLayoutItem ?? { w: 8, h: 6 }),
      );
      updateLayoutItem(movedWidgetId, 'root', {
        x: centeredPosition.x,
        y: centeredPosition.y,
      }, 'kit');
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
        const centeredPosition = resolveCenteredFlowPosition(
          flowPosition,
          resolveDropNodeSize(resolveTemplateRootLayout(template)),
        );
        addTemplateNode(
          template,
          'root',
          centeredPosition.x,
          centeredPosition.y,
          'kit',
        );
      }
      setDraggedType(null);
      return;
    }

    const nextId = createWidgetId();
    const centeredPosition = resolveCenteredFlowPosition(
      flowPosition,
      resolveDropNodeSize(getDefaultWidgetSize(type, 48)),
    );
    addWidget(nextId, type, {
      i: nextId,
      x: centeredPosition.x,
      y: centeredPosition.y,
      ...getDefaultWidgetSize(type, 48),
    }, 'root', undefined, 'kit');
    setDraggedType(null);
  }, [addTemplateNode, addWidget, boardHost, customTemplates, draggedType, kitStudioWidgets, selectWidget, setDraggedType, updateLayoutItem]);

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
    updateLayoutItem(node.id, 'root', {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    }, 'kit');
  }, [updateLayoutItem]);

  const handleFocusSelected = useCallback(() => {
    if (!flowRef.current || !selectedKitStudioId) return;
    const targetNode = displayNodes.find((node) => node.id === selectedKitStudioId);
    if (!targetNode) return;

    const width = typeof targetNode.width === 'number' ? targetNode.width : 220;
    const height = typeof targetNode.height === 'number' ? targetNode.height : 140;

    flowRef.current.fitBounds({
      x: targetNode.position.x - 120,
      y: targetNode.position.y - 120,
      width: width + 240,
      height: height + 240,
    }, { duration: 240, padding: 0.18 });
  }, [displayNodes, selectedKitStudioId]);

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
      className="relative h-full w-full"
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
    >
      <ReactFlow
        className="page-board-flow"
        nodes={displayNodes}
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
