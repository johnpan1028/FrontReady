import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BaseEdge,
  ConnectionLineType,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeMouseHandler,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  ExternalLink,
  Focus,
  Layers3,
  Monitor,
  Package,
  PanelTop,
  Scan,
  Trash2,
} from 'lucide-react';
import type { ProjectStarterId } from '../builder/projectStarters';
import { getOwnedOverlays, getOwnerPage } from '../builder/pageTopology';
import type { BuilderNodeDocument, BuilderPage, BuilderPageLink } from '../schema/project';
import { cn } from '../utils/cn';

type PageBoardProps = {
  pages: BuilderPage[];
  links: BuilderPageLink[];
  selectedPageId: string | null;
  fitRequestKey?: number;
  selectedLinkId?: string | null;
  curvePointToolMode?: CurvePointToolMode;
  onSelectPage: (pageId: string | null) => void;
  onSelectLink?: (linkId: string | null) => void;
  onCurvePointToolModeChange?: (mode: CurvePointToolMode) => void;
  onOpenPage?: (pageId: string) => void;
  onCreatePage: (options?: {
    kind?: BuilderPage['kind'];
    ownerPageId?: string;
    board?: Partial<BuilderPage['board']>;
  }) => void;
  onApplyStarter?: (starterId: ProjectStarterId) => void | Promise<void>;
  canApplyStarter?: boolean;
  onUpdatePageBoard: (pageId: string, board: Partial<BuilderPage['board']>) => void;
  onUpdatePageLinkMeta: (linkId: string, metaPatch: Record<string, unknown>) => void;
  onDeletePage: (pageId: string) => void;
  surfaceMode?: 'pages' | 'canvas' | 'kits';
  onChangeSurfaceMode?: (mode: 'pages' | 'canvas' | 'kits') => void;
};

type PageBoardFeedback = {
  tone: 'neutral' | 'success' | 'warning';
  text: string;
};

const NODE_HANDLES = {
  targetLeft: 'target-left',
  targetTop: 'target-top',
  targetRight: 'target-right',
  targetBottom: 'target-bottom',
  sourceLeft: 'source-left',
  sourceTop: 'source-top',
  sourceRight: 'source-right',
  sourceBottom: 'source-bottom',
  sourceOverlayOut: 'source-overlay-out',
  targetOverlayIn: 'target-overlay-in',
  sourceOverlayReturn: 'source-overlay-return',
  targetPageReturn: 'target-page-return',
} as const;

const SOURCE_SHELL_HANDLES = [
  NODE_HANDLES.sourceRight,
  NODE_HANDLES.sourceBottom,
  NODE_HANDLES.sourceLeft,
  NODE_HANDLES.sourceTop,
  NODE_HANDLES.sourceOverlayOut,
  NODE_HANDLES.sourceOverlayReturn,
] as const;

const TARGET_SHELL_HANDLES = [
  NODE_HANDLES.targetLeft,
  NODE_HANDLES.targetTop,
  NODE_HANDLES.targetRight,
  NODE_HANDLES.targetBottom,
  NODE_HANDLES.targetOverlayIn,
  NODE_HANDLES.targetPageReturn,
] as const;

type PageNodeData = {
  page: BuilderPage;
  scale: number;
  selected: boolean;
  ownerName: string | null;
  orbitCount: number;
  relationCount: number;
  previewNodes: PagePreviewNode[];
  sourceAnchorLabels: Record<string, string[]>;
  relationBadges: PageRelationBadge[];
  shellBookmarks: PageShellBookmark[];
  onSelectPage: (pageId: string) => void;
  onSelectLink: (linkId: string) => void;
  onPreviewShellBookmark: (linkId: string, anchor: BorderAnchor | null) => void;
  onCommitShellBookmark: (linkId: string, anchor: BorderAnchor) => void;
  onOpenPage?: (pageId: string) => void;
};

type PagePreviewNode = {
  id: string;
  type: BuilderNodeDocument['type'];
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type PageRelationBadge = {
  code: string;
  label: string;
  kind: BuilderPageLink['kind'];
};

type PageLinkMarker = PageRelationBadge & {
  actionLabel: string;
};

type PageShellBookmark = PageRelationBadge & {
  linkId: string;
  title: string;
  anchor: BorderAnchor;
  selected: boolean;
};

type LinkAnchorMode = 'auto' | 'component' | 'shell';
type BorderSide = 'top' | 'right' | 'bottom' | 'left';
export type RelationPathType = 'elbow' | 'curve';
export type CurvePointToolMode = 'move' | 'insert' | 'delete';
export type RelationStrokePattern = 'solid' | 'dashed' | 'dotted';

type FlowPositionOffset = {
  x: number;
  y: number;
};

type FlowRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type BorderAnchor = {
  side: BorderSide;
  ratio: number;
};

const getFlowRectFromInternalNode = (internalNode: InternalNode<Node> | undefined): FlowRect | null => {
  const absolutePosition = internalNode?.internals.positionAbsolute;
  const width = internalNode?.measured.width ?? internalNode?.width ?? internalNode?.initialWidth;
  const height = internalNode?.measured.height ?? internalNode?.height ?? internalNode?.initialHeight;

  if (!absolutePosition || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    left: absolutePosition.x,
    top: absolutePosition.y,
    right: absolutePosition.x + width,
    bottom: absolutePosition.y + height,
    width,
    height,
  };
};

type ResolvedBorderAnchor = {
  anchor: BorderAnchor;
  point: FlowPositionOffset;
  position: Position;
};

type PageRelationEdgeData = Record<string, unknown> & {
  kind: BuilderPageLink['kind'];
  markerLabel: string;
  labelFontSize: number;
  strokeColor: string;
  strokeWidth: number;
  strokePattern: RelationStrokePattern;
  sourcePageId: string;
  targetPageId: string;
  sourceBorderAnchor?: BorderAnchor;
  targetBorderAnchor?: BorderAnchor;
  targetBlockedRatiosBySide?: Partial<Record<BorderSide, number[]>>;
  pathType: RelationPathType;
  curvePoints: FlowPositionOffset[];
  elbowBendPoints: FlowPositionOffset[];
  curvePointMode: CurvePointToolMode;
  labelProgress: number;
  defaultLabelProgress: number;
  labelProgressRange: [number, number];
  onLabelProgressChange: (linkId: string, progress: number) => void;
  onBorderAnchorChange: (linkId: string, role: 'source' | 'target', anchor: BorderAnchor) => void;
  onCurvePointsChange: (linkId: string, points: FlowPositionOffset[]) => void;
  onElbowBendPointsChange: (linkId: string, points: FlowPositionOffset[]) => void;
  onInsertCurvePoint: (linkId: string, point: FlowPositionOffset, insertAt: number) => void;
  onDeleteCurvePoint: (linkId: string, pointIndex: number) => void;
  onSelectLink: (linkId: string) => void;
};

type PageRelationEdge = Edge<PageRelationEdgeData, 'pageRelation'>;

const BOARD_TOP_SAFE_SHIFT = 88;

const LINK_LABELS: Record<BuilderPageLink['kind'], string> = {
  'navigate-page': 'Page flow',
  'open-overlay': 'Open overlay',
  'switch-overlay': 'Overlay switch',
  'return-page': 'Return',
};

const LINK_STROKE_PATTERNS: Record<BuilderPageLink['kind'], RelationStrokePattern> = {
  'navigate-page': 'solid',
  'open-overlay': 'dashed',
  'switch-overlay': 'dotted',
  'return-page': 'solid',
};

const LINK_STYLES: Record<BuilderPageLink['kind'], Pick<Edge, 'label' | 'style' | 'animated' | 'labelStyle' | 'labelBgStyle' | 'labelBgPadding' | 'labelBgBorderRadius'>> = {
  'navigate-page': {
    label: LINK_LABELS['navigate-page'],
    style: { stroke: '#4f7cff', strokeWidth: 2.4 },
    labelStyle: { fill: '#1f3f99', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: 'rgba(255,255,255,0.9)' },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 2,
    animated: false,
  },
  'open-overlay': {
    label: LINK_LABELS['open-overlay'],
    style: { stroke: '#d97706', strokeWidth: 2.1, strokeDasharray: '8 6' },
    labelStyle: { fill: '#92400e', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: 'rgba(255,255,255,0.9)' },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 2,
    animated: false,
  },
  'switch-overlay': {
    label: LINK_LABELS['switch-overlay'],
    style: { stroke: '#7c3aed', strokeWidth: 1.9, strokeDasharray: '3 5' },
    labelStyle: { fill: '#5b21b6', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: 'rgba(255,255,255,0.9)' },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 2,
    animated: false,
  },
  'return-page': {
    label: LINK_LABELS['return-page'],
    style: { stroke: '#10b981', strokeWidth: 1.9 },
    labelStyle: { fill: '#047857', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: 'rgba(255,255,255,0.9)' },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 2,
    animated: true,
  },
};

const resolveLinkHandles = (kind: BuilderPageLink['kind']) => {
  switch (kind) {
    case 'navigate-page':
      return { sourceHandle: NODE_HANDLES.sourceRight, targetHandle: NODE_HANDLES.targetLeft };
    case 'open-overlay':
      return { sourceHandle: NODE_HANDLES.sourceOverlayOut, targetHandle: NODE_HANDLES.targetOverlayIn };
    case 'switch-overlay':
      return { sourceHandle: NODE_HANDLES.sourceRight, targetHandle: NODE_HANDLES.targetLeft };
    case 'return-page':
      return { sourceHandle: NODE_HANDLES.sourceOverlayReturn, targetHandle: NODE_HANDLES.targetPageReturn };
    default:
      return { sourceHandle: NODE_HANDLES.sourceRight, targetHandle: NODE_HANDLES.targetLeft };
  }
};

const isSourceShellHandle = (value: unknown): value is (typeof SOURCE_SHELL_HANDLES)[number] => (
  typeof value === 'string' && SOURCE_SHELL_HANDLES.includes(value as (typeof SOURCE_SHELL_HANDLES)[number])
);

const isTargetShellHandle = (value: unknown): value is (typeof TARGET_SHELL_HANDLES)[number] => (
  typeof value === 'string' && TARGET_SHELL_HANDLES.includes(value as (typeof TARGET_SHELL_HANDLES)[number])
);

const getLinkAnchorMode = (link: BuilderPageLink): LinkAnchorMode => {
  const value = link.meta?.sourceAnchorMode;
  if (value === 'component' || value === 'shell') return value;
  return 'auto';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const BORDER_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left'];
const BOOKMARK_EDGE_PADDING = 0.08;
const BOOKMARK_MIN_GAP = 0.08;

const isBorderAnchor = (value: unknown): value is BorderAnchor => (
  typeof value === 'object' &&
  value !== null &&
  ['top', 'right', 'bottom', 'left'].includes((value as BorderAnchor).side) &&
  Number.isFinite(Number((value as BorderAnchor).ratio))
);

const getDefaultLabelProgress = (kind: BuilderPageLink['kind'], hasReversePair: boolean) => {
  if (kind === 'open-overlay') {
    return hasReversePair ? 0.18 : 0.5;
  }

  if (kind === 'return-page') {
    return hasReversePair ? 0.18 : 0.5;
  }

  return 0.5;
};

const getLabelProgressRange = (kind: BuilderPageLink['kind'], hasReversePair: boolean): [number, number] => {
  void kind;
  void hasReversePair;
  return [0, 1];
};

const getLabelProgress = (link: BuilderPageLink, defaultProgress: number, range: [number, number]) => {
  const progress = Number(link.meta?.labelProgress);
  if (!Number.isFinite(progress)) return defaultProgress;
  return clamp(progress, range[0], range[1]);
};

const getLinkPathType = (link: BuilderPageLink): RelationPathType => (
  link.meta?.pathType === 'curve' ? 'curve' : 'elbow'
);

const isRelationStrokePattern = (value: unknown): value is RelationStrokePattern => (
  value === 'solid' || value === 'dashed' || value === 'dotted'
);

const getLinkStrokePattern = (link: BuilderPageLink): RelationStrokePattern => (
  isRelationStrokePattern(link.meta?.strokePattern)
    ? link.meta.strokePattern
    : LINK_STROKE_PATTERNS[link.kind]
);

const getRelationDashArray = (pattern: RelationStrokePattern, strokeWidth: number) => {
  if (pattern === 'dashed') {
    return `${Math.max(7, strokeWidth * 3.8)} ${Math.max(5, strokeWidth * 2.8)}`;
  }

  if (pattern === 'dotted') {
    return `${Math.max(1.5, strokeWidth)} ${Math.max(5, strokeWidth * 2.6)}`;
  }

  return undefined;
};

const getLinkStrokeColor = (link: BuilderPageLink, fallback: string) => (
  typeof link.meta?.strokeColor === 'string' && link.meta.strokeColor.trim().length > 0
    ? link.meta.strokeColor
    : fallback
);

const getLinkStrokeWidth = (link: BuilderPageLink, fallback: number) => {
  const value = Number(link.meta?.strokeWidth);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, 1.25, 5);
};

const getLinkLabelText = (link: BuilderPageLink, fallback: string) => (
  typeof link.meta?.labelText === 'string'
    ? link.meta.labelText
    : fallback
);

const getLinkLabelFontSize = (link: BuilderPageLink, fallback: number) => {
  const value = Number(link.meta?.labelFontSize);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, 9, 18);
};

const ORTHOGONAL_HANDLE_DIRECTIONS: Record<Position, FlowPositionOffset> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

const getOrthogonalDirection = ({
  source,
  sourcePosition = Position.Bottom,
  target,
}: {
  source: FlowPositionOffset;
  sourcePosition?: Position;
  target: FlowPositionOffset;
}) => {
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
};

const distanceBetweenPoints = (pointA: FlowPositionOffset, pointB: FlowPositionOffset) => (
  Math.sqrt((pointB.x - pointA.x) ** 2 + (pointB.y - pointA.y) ** 2)
);

const buildDefaultOrthogonalRoute = ({
  source,
  sourcePosition = Position.Bottom,
  target,
  targetPosition = Position.Top,
  center,
  offset,
  stepPosition = 0.5,
}: {
  source: FlowPositionOffset;
  sourcePosition?: Position;
  target: FlowPositionOffset;
  targetPosition?: Position;
  center?: FlowPositionOffset | null;
  offset: number;
  stepPosition?: number;
}) => {
  const sourceDir = ORTHOGONAL_HANDLE_DIRECTIONS[sourcePosition];
  const targetDir = ORTHOGONAL_HANDLE_DIRECTIONS[targetPosition];
  const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
  const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
  const direction = getOrthogonalDirection({
    source: sourceGapped,
    sourcePosition,
    target: targetGapped,
  });
  const axis = direction.x !== 0 ? 'x' : 'y';
  const currentAxisDirection = direction[axis];
  let routePoints: FlowPositionOffset[] = [];
  let centerX: number;
  let centerY: number;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };

  if (sourceDir[axis] * targetDir[axis] === -1) {
    if (axis === 'x') {
      centerX = center?.x ?? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
      centerY = center?.y ?? (sourceGapped.y + targetGapped.y) / 2;
    } else {
      centerX = center?.x ?? (sourceGapped.x + targetGapped.x) / 2;
      centerY = center?.y ?? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
    }

    const verticalSplit = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y },
    ];
    const horizontalSplit = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY },
    ];

    routePoints = sourceDir[axis] === currentAxisDirection
      ? (axis === 'x' ? verticalSplit : horizontalSplit)
      : (axis === 'x' ? horizontalSplit : verticalSplit);
  } else {
    const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }];
    const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }];

    routePoints = axis === 'x'
      ? (sourceDir.x === currentAxisDirection ? targetSource : sourceTarget)
      : (sourceDir.y === currentAxisDirection ? sourceTarget : targetSource);

    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[axis] - target[axis]);
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[axis] === currentAxisDirection) {
          sourceGapOffset[axis] = (sourceGapped[axis] > source[axis] ? -1 : 1) * gapOffset;
        } else {
          targetGapOffset[axis] = (targetGapped[axis] > target[axis] ? -1 : 1) * gapOffset;
        }
      }
    }

    if (sourcePosition !== targetPosition) {
      const oppositeAxis = axis === 'x' ? 'y' : 'x';
      const sameDirection = sourceDir[axis] === targetDir[oppositeAxis];
      const sourceGreater = sourceGapped[oppositeAxis] > targetGapped[oppositeAxis];
      const sourceLesser = sourceGapped[oppositeAxis] < targetGapped[oppositeAxis];
      const shouldFlip = (sourceDir[axis] === 1 && ((!sameDirection && sourceGreater) || (sameDirection && sourceLesser)))
        || (sourceDir[axis] !== 1 && ((!sameDirection && sourceLesser) || (sameDirection && sourceGreater)));

      if (shouldFlip) {
        routePoints = axis === 'x' ? sourceTarget : targetSource;
      }
    }
  }

  const sourceGapPoint = {
    x: sourceGapped.x + sourceGapOffset.x,
    y: sourceGapped.y + sourceGapOffset.y,
  };
  const targetGapPoint = {
    x: targetGapped.x + targetGapOffset.x,
    y: targetGapped.y + targetGapOffset.y,
  };

  return [
    source,
    ...(sourceGapPoint.x !== routePoints[0]?.x || sourceGapPoint.y !== routePoints[0]?.y ? [sourceGapPoint] : []),
    ...routePoints,
    ...(targetGapPoint.x !== routePoints[routePoints.length - 1]?.x || targetGapPoint.y !== routePoints[routePoints.length - 1]?.y ? [targetGapPoint] : []),
    target,
  ];
};

const buildOrthogonalBend = (pointA: FlowPositionOffset, pointB: FlowPositionOffset, pointC: FlowPositionOffset, radius: number) => {
  const bendSize = Math.min(
    distanceBetweenPoints(pointA, pointB) / 2,
    distanceBetweenPoints(pointB, pointC) / 2,
    radius,
  );
  const { x, y } = pointB;

  if ((pointA.x === x && x === pointC.x) || (pointA.y === y && y === pointC.y)) {
    return `L${x} ${y}`;
  }

  if (pointA.y === y) {
    const xDirection = pointA.x < pointC.x ? -1 : 1;
    const yDirection = pointA.y < pointC.y ? 1 : -1;
    return `L ${x + bendSize * xDirection},${y}Q ${x},${y} ${x},${y + bendSize * yDirection}`;
  }

  const xDirection = pointA.x < pointC.x ? 1 : -1;
  const yDirection = pointA.y < pointC.y ? -1 : 1;
  return `L ${x},${y + bendSize * yDirection}Q ${x},${y} ${x + bendSize * xDirection},${y}`;
};

const buildOrthogonalPath = (points: FlowPositionOffset[], borderRadius: number) => {
  void borderRadius;
  if (points.length < 2) {
    return ['', 0, 0] as const;
  }

  const path = points.reduce((result, point, index) => (
    index === 0
      ? `M${point.x} ${point.y}`
      : `${result}L${point.x} ${point.y}`
  ), '');

  let longestSegmentLength = -1;
  let labelPoint = {
    x: (points[0].x + points[points.length - 1].x) / 2,
    y: (points[0].y + points[points.length - 1].y) / 2,
  };

  for (let index = 0; index < points.length - 1; index += 1) {
    const pointA = points[index];
    const pointB = points[index + 1];
    const segmentLength = distanceBetweenPoints(pointA, pointB);
    if (segmentLength > longestSegmentLength) {
      longestSegmentLength = segmentLength;
      labelPoint = {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
      };
    }
  }

  return [path, labelPoint.x, labelPoint.y] as const;
};

const areFlowPointsEqual = (pointA: FlowPositionOffset, pointB: FlowPositionOffset) => (
  Math.abs(pointA.x - pointB.x) <= 0.01 && Math.abs(pointA.y - pointB.y) <= 0.01
);

const dedupeAdjacentOrthogonalPoints = (points: FlowPositionOffset[]) => points.filter((point, index, collection) => {
  if (index === 0) return true;
  return !areFlowPointsEqual(collection[index - 1], point);
});

const simplifyOrthogonalRoute = (points: FlowPositionOffset[]) => {
  let current = dedupeAdjacentOrthogonalPoints(points);

  while (true) {
    const withoutCollinearPoints = current.filter((point, index, collection) => {
      if (index === 0 || index === collection.length - 1) return true;
      const previous = collection[index - 1];
      const next = collection[index + 1];
      const sameX = Math.abs(previous.x - point.x) <= 0.01 && Math.abs(point.x - next.x) <= 0.01;
      const sameY = Math.abs(previous.y - point.y) <= 0.01 && Math.abs(point.y - next.y) <= 0.01;
      return !(sameX || sameY);
    });

    const deduped = dedupeAdjacentOrthogonalPoints(withoutCollinearPoints);
    const unchanged = deduped.length === current.length
      && deduped.every((point, index) => areFlowPointsEqual(point, current[index]));

    if (unchanged) {
      return deduped;
    }

    current = deduped;
  }
};

const normalizeOrthogonalRoute = (points: FlowPositionOffset[]) => {
  const deduped = dedupeAdjacentOrthogonalPoints(points);

  const orthogonalPoints = deduped.flatMap((point, index, collection) => {
    if (index === 0) return [point];
    const previous = collection[index - 1];
    const isOrthogonal = Math.abs(previous.x - point.x) <= 0.01 || Math.abs(previous.y - point.y) <= 0.01;

    if (isOrthogonal) {
      return [point];
    }

    const beforePrevious = collection[index - 2] ?? previous;
    const preferHorizontalFirst = Math.abs(beforePrevious.y - previous.y) <= Math.abs(beforePrevious.x - previous.x);

    return [
      preferHorizontalFirst
        ? { x: point.x, y: previous.y }
        : { x: previous.x, y: point.y },
      point,
    ];
  });

  return simplifyOrthogonalRoute(orthogonalPoints);
};

const isOrthogonalRoute = (points: FlowPositionOffset[]) => points.every((point, index, collection) => {
  if (index === 0) return true;
  const previous = collection[index - 1];
  return Math.abs(previous.x - point.x) <= 0.01 || Math.abs(previous.y - point.y) <= 0.01;
});

const buildRenderableOrthogonalRoute = (points: FlowPositionOffset[]) => {
  const orthogonalized = points.reduce<FlowPositionOffset[]>((result, point, index) => {
    if (index === 0) {
      result.push(point);
      return result;
    }

    const previous = result[result.length - 1];
    const isOrthogonal = Math.abs(previous.x - point.x) <= 0.01 || Math.abs(previous.y - point.y) <= 0.01;

    if (!isOrthogonal) {
      const beforePrevious = result[result.length - 2] ?? previous;
      const preferHorizontalFirst = Math.abs(beforePrevious.y - previous.y) <= Math.abs(beforePrevious.x - previous.x);
      const helperPoint = preferHorizontalFirst
        ? { x: point.x, y: previous.y }
        : { x: previous.x, y: point.y };

      if (Math.abs(helperPoint.x - previous.x) > 0.01 || Math.abs(helperPoint.y - previous.y) > 0.01) {
        result.push(helperPoint);
      }
    }

    result.push(point);
    return result;
  }, []);

  return normalizeOrthogonalRoute(orthogonalized);
};

const isVerticalSegment = (pointA: FlowPositionOffset, pointB: FlowPositionOffset) => (
  Math.abs(pointA.x - pointB.x) <= 0.01 && Math.abs(pointA.y - pointB.y) > 0.01
);

const isHorizontalSegment = (pointA: FlowPositionOffset, pointB: FlowPositionOffset) => (
  Math.abs(pointA.y - pointB.y) <= 0.01 && Math.abs(pointA.x - pointB.x) > 0.01
);

const ORTHOGONAL_MERGE_SNAP_THRESHOLD = 12;

const getOrthogonalSegmentAxisCoordinate = (
  pointA: FlowPositionOffset,
  pointB: FlowPositionOffset,
  horizontal: boolean,
) => (horizontal ? pointA.y : pointA.x);

const snapOrthogonalSegmentCoordinate = ({
  routePoints,
  segmentIndex,
  horizontal,
  coordinate,
}: {
  routePoints: FlowPositionOffset[];
  segmentIndex: number;
  horizontal: boolean;
  coordinate: number;
}) => {
  let snappedCoordinate = coordinate;
  let bestDistance = ORTHOGONAL_MERGE_SNAP_THRESHOLD + 0.01;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    if (index === segmentIndex) continue;
    const pointA = routePoints[index];
    const pointB = routePoints[index + 1];
    if (!pointA || !pointB) continue;

    const segmentMatchesOrientation = horizontal
      ? isHorizontalSegment(pointA, pointB)
      : isVerticalSegment(pointA, pointB);

    if (!segmentMatchesOrientation) continue;

    const candidateCoordinate = getOrthogonalSegmentAxisCoordinate(pointA, pointB, horizontal);
    const distance = Math.abs(candidateCoordinate - coordinate);

    if (distance < bestDistance) {
      bestDistance = distance;
      snappedCoordinate = candidateCoordinate;
    }
  }

  return snappedCoordinate;
};

const lockOrthogonalEndpointSegment = ({
  endpoint,
  point,
  position,
  offset,
}: {
  endpoint: FlowPositionOffset;
  point: FlowPositionOffset;
  position: Position;
  offset: number;
}) => {
  const direction = ORTHOGONAL_HANDLE_DIRECTIONS[position];

  if (direction.x !== 0) {
    const outwardX = endpoint.x + direction.x * offset;
    return {
      x: direction.x > 0 ? Math.max(point.x, outwardX) : Math.min(point.x, outwardX),
      y: endpoint.y,
    };
  }

  const outwardY = endpoint.y + direction.y * offset;
  return {
    x: endpoint.x,
    y: direction.y > 0 ? Math.max(point.y, outwardY) : Math.min(point.y, outwardY),
  };
};

const enforceOrthogonalEndpointLocks = ({
  points,
  sourcePosition,
  targetPosition,
  offset,
}: {
  points: FlowPositionOffset[];
  sourcePosition: Position;
  targetPosition: Position;
  offset: number;
}) => {
  if (points.length <= 3) {
    return points;
  }

  const nextRoute = points.map((point) => ({ ...point }));
  nextRoute[1] = lockOrthogonalEndpointSegment({
    endpoint: nextRoute[0],
    point: nextRoute[1],
    position: sourcePosition,
    offset,
  });
  nextRoute[nextRoute.length - 2] = lockOrthogonalEndpointSegment({
    endpoint: nextRoute[nextRoute.length - 1],
    point: nextRoute[nextRoute.length - 2],
    position: targetPosition,
    offset,
  });

  return normalizeOrthogonalRoute(nextRoute);
};

const adaptOrthogonalRouteToEndpoints = (points: FlowPositionOffset[]) => {
  if (points.length <= 2) {
    return points;
  }

  const nextRoute = points.map((point) => ({ ...point }));
  const sourcePoint = nextRoute[0];
  const targetPoint = nextRoute[nextRoute.length - 1];

  if (nextRoute.length === 3) {
    const bendPoint = nextRoute[1];
    const verticalThenHorizontal = { x: sourcePoint.x, y: targetPoint.y };
    const horizontalThenVertical = { x: targetPoint.x, y: sourcePoint.y };
    nextRoute[1] = distanceBetweenPoints(bendPoint, verticalThenHorizontal) <= distanceBetweenPoints(bendPoint, horizontalThenVertical)
      ? verticalThenHorizontal
      : horizontalThenVertical;
    return normalizeOrthogonalRoute(nextRoute);
  }

  const firstBendPoint = { ...nextRoute[1] };
  const secondRoutePoint = nextRoute[2];

  if (isVerticalSegment(firstBendPoint, secondRoutePoint)) {
    firstBendPoint.y = sourcePoint.y;
  } else if (isHorizontalSegment(firstBendPoint, secondRoutePoint)) {
    firstBendPoint.x = sourcePoint.x;
  } else if (Math.abs(firstBendPoint.x - sourcePoint.x) <= Math.abs(firstBendPoint.y - sourcePoint.y)) {
    firstBendPoint.x = sourcePoint.x;
  } else {
    firstBendPoint.y = sourcePoint.y;
  }

  nextRoute[1] = firstBendPoint;

  const lastBendIndex = nextRoute.length - 2;
  const lastBendPoint = { ...nextRoute[lastBendIndex] };
  const previousRoutePoint = nextRoute[lastBendIndex - 1];

  if (isVerticalSegment(previousRoutePoint, lastBendPoint)) {
    lastBendPoint.y = targetPoint.y;
  } else if (isHorizontalSegment(previousRoutePoint, lastBendPoint)) {
    lastBendPoint.x = targetPoint.x;
  } else if (Math.abs(lastBendPoint.x - targetPoint.x) <= Math.abs(lastBendPoint.y - targetPoint.y)) {
    lastBendPoint.x = targetPoint.x;
  } else {
    lastBendPoint.y = targetPoint.y;
  }

  nextRoute[lastBendIndex] = lastBendPoint;

  return normalizeOrthogonalRoute(nextRoute);
};

const getPointToSegmentDistanceSquared = (point: FlowPositionOffset, start: FlowPositionOffset, end: FlowPositionOffset) => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }

  const projection = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
    0,
    1,
  );
  const projectedPoint = {
    x: start.x + projection * segmentX,
    y: start.y + projection * segmentY,
  };

  return (point.x - projectedPoint.x) ** 2 + (point.y - projectedPoint.y) ** 2;
};

const readFlowPointArray = (value: unknown): FlowPositionOffset[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const x = Number((entry as { x?: unknown }).x);
    const y = Number((entry as { y?: unknown }).y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];

    return [{
      x,
      y,
    }];
  });
};

const getLinkCurvePoints = (link: BuilderPageLink) => readFlowPointArray(link.meta?.curvePoints);

const getLinkElbowBendPoints = (link: BuilderPageLink) => readFlowPointArray(link.meta?.elbowBendPoints);

const normalizeFlowPoint = (point: FlowPositionOffset): FlowPositionOffset => ({
  x: Number(point.x.toFixed(2)),
  y: Number(point.y.toFixed(2)),
});

const normalizeFlowPointList = (points: FlowPositionOffset[]) => points.map(normalizeFlowPoint);

const getCurvePath = (points: FlowPositionOffset[]) => {
  if (points.length < 2) {
    return ['', 0, 0] as const;
  }

  if (points.length === 2) {
    const [source, target] = points;
    return [
      `M${source.x},${source.y} L${target.x},${target.y}`,
      (source.x + target.x) / 2,
      (source.y + target.y) / 2,
    ] as const;
  }

  let path = `M${points[0].x},${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const prev = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;

    const controlPointA = {
      x: current.x + (next.x - prev.x) / 6,
      y: current.y + (next.y - prev.y) / 6,
    };
    const controlPointB = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };

    path += ` C${controlPointA.x},${controlPointA.y} ${controlPointB.x},${controlPointB.y} ${next.x},${next.y}`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  return [path, (first.x + last.x) / 2, (first.y + last.y) / 2] as const;
};

const getBorderAnchorAxisGap = (side: BorderSide) => (
  side === 'left' || side === 'right' ? BOOKMARK_MIN_GAP : BOOKMARK_MIN_GAP + 0.02
);

const getPositionForBorderSide = (side: BorderSide) => {
  switch (side) {
    case 'top':
      return Position.Top;
    case 'right':
      return Position.Right;
    case 'bottom':
      return Position.Bottom;
    case 'left':
    default:
      return Position.Left;
  }
};

const anchorToPoint = (rect: FlowRect, anchor: BorderAnchor): FlowPositionOffset => {
  const ratio = clamp(anchor.ratio, 0, 1);

  switch (anchor.side) {
    case 'top':
      return { x: rect.left + rect.width * ratio, y: rect.top };
    case 'right':
      return { x: rect.right, y: rect.top + rect.height * ratio };
    case 'bottom':
      return { x: rect.left + rect.width * ratio, y: rect.bottom };
    case 'left':
    default:
      return { x: rect.left, y: rect.top + rect.height * ratio };
  }
};

const projectPointToBorder = (rect: FlowRect, point: FlowPositionOffset): ResolvedBorderAnchor => {
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const distances: Array<{ side: BorderSide; distance: number }> = [
    { side: 'left', distance: Math.abs(point.x - rect.left) },
    { side: 'right', distance: Math.abs(point.x - rect.right) },
    { side: 'top', distance: Math.abs(point.y - rect.top) },
    { side: 'bottom', distance: Math.abs(point.y - rect.bottom) },
  ];
  distances.sort((left, right) => left.distance - right.distance);

  const side = distances[0]?.side ?? 'right';
  const ratio = side === 'left' || side === 'right'
    ? clamp((point.y - rect.top) / height, 0, 1)
    : clamp((point.x - rect.left) / width, 0, 1);
  const anchor = { side, ratio } satisfies BorderAnchor;

  return {
    anchor,
    point: anchorToPoint(rect, anchor),
    position: getPositionForBorderSide(side),
  };
};

const resolveBorderAnchor = (
  rect: FlowRect,
  explicitAnchor: BorderAnchor | null,
  fallbackPoint: FlowPositionOffset,
): ResolvedBorderAnchor => {
  if (explicitAnchor) {
    return {
      anchor: {
        side: explicitAnchor.side,
        ratio: clamp(explicitAnchor.ratio, 0, 1),
      },
      point: anchorToPoint(rect, explicitAnchor),
      position: getPositionForBorderSide(explicitAnchor.side),
    };
  }

  return projectPointToBorder(rect, fallbackPoint);
};

const findNearestAvailableRatio = (
  preferredRatio: number,
  occupiedRatios: number[],
  side: BorderSide,
  padding = BOOKMARK_EDGE_PADDING,
) => {
  const min = padding;
  const max = 1 - padding;
  const gap = getBorderAnchorAxisGap(side);
  const preferred = clamp(preferredRatio, min, max);

  if (occupiedRatios.every((ratio) => Math.abs(ratio - preferred) >= gap)) {
    return Number(preferred.toFixed(3));
  }

  let bestRatio = preferred;
  let bestDistance = Number.POSITIVE_INFINITY;
  const sampleCount = 320;

  for (let index = 0; index <= sampleCount; index += 1) {
    const candidate = min + (index / sampleCount) * (max - min);
    if (occupiedRatios.some((ratio) => Math.abs(ratio - candidate) < gap)) continue;

    const distance = Math.abs(candidate - preferred);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRatio = candidate;
    }
  }

  return Number(bestRatio.toFixed(3));
};

const distributeAnchorsOnSide = <Item extends { id: string; preferredAnchor: BorderAnchor }>(
  items: Item[],
  blockedRatios: number[] = [],
) => {
  const resolvedAnchors = new Map<string, BorderAnchor>();
  const occupiedRatios = [...blockedRatios];

  [...items]
    .sort((left, right) => left.preferredAnchor.ratio - right.preferredAnchor.ratio)
    .forEach((item) => {
      const ratio = findNearestAvailableRatio(item.preferredAnchor.ratio, occupiedRatios, item.preferredAnchor.side);
      occupiedRatios.push(ratio);
      resolvedAnchors.set(item.id, {
        side: item.preferredAnchor.side,
        ratio,
      });
    });

  return resolvedAnchors;
};

const buildBorderAnchorLookup = (anchors: BorderAnchor[]) => anchors.reduce<Partial<Record<BorderSide, number[]>>>((lookup, anchor) => {
  lookup[anchor.side] = [...(lookup[anchor.side] ?? []), anchor.ratio];
  return lookup;
}, {});

const getDefaultBorderAnchorForLink = ({
  link,
  role,
  sourcePage,
  targetPage,
  hasReversePair,
}: {
  link: BuilderPageLink;
  role: 'source' | 'target';
  sourcePage: BuilderPage | null;
  targetPage: BuilderPage | null;
  hasReversePair: boolean;
}): BorderAnchor => {
  const sourceCenterX = sourcePage ? sourcePage.board.x + sourcePage.board.width / 2 : 0;
  const sourceCenterY = sourcePage ? sourcePage.board.y + sourcePage.board.height / 2 : 0;
  const targetCenterX = targetPage ? targetPage.board.x + targetPage.board.width / 2 : 0;
  const targetCenterY = targetPage ? targetPage.board.y + targetPage.board.height / 2 : 0;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  let sourceSide: BorderSide;
  let targetSide: BorderSide;

  if (Math.abs(dx) >= Math.abs(dy)) {
    sourceSide = dx >= 0 ? 'right' : 'left';
    targetSide = dx >= 0 ? 'left' : 'right';
  } else {
    sourceSide = dy >= 0 ? 'bottom' : 'top';
    targetSide = dy >= 0 ? 'top' : 'bottom';
  }

  let ratio = 0.5;
  if (hasReversePair && link.kind === 'open-overlay') ratio = 0.42;
  if (hasReversePair && link.kind === 'return-page') ratio = 0.58;

  return {
    side: role === 'source' ? sourceSide : targetSide,
    ratio,
  };
};

const getShellBookmarkStyle = (anchor: BorderAnchor) => {
  switch (anchor.side) {
    case 'top':
      return {
        left: `${anchor.ratio * 100}%`,
        top: '0%',
        transform: 'translate(-50%, -52%)',
      };
    case 'right':
      return {
        left: '100%',
        top: `${anchor.ratio * 100}%`,
        transform: 'translate(-48%, -50%)',
      };
    case 'bottom':
      return {
        left: `${anchor.ratio * 100}%`,
        top: '100%',
        transform: 'translate(-50%, -48%)',
      };
    case 'left':
    default:
      return {
        left: '0%',
        top: `${anchor.ratio * 100}%`,
        transform: 'translate(-52%, -50%)',
      };
  }
};

const resolveBlockedBorderAnchor = (
  anchor: BorderAnchor,
  blockedLookup: Partial<Record<BorderSide, number[]>> | undefined,
) => {
  const blockedRatios = blockedLookup?.[anchor.side] ?? [];
  if (blockedRatios.length === 0) return anchor;

  return {
    side: anchor.side,
    ratio: findNearestAvailableRatio(anchor.ratio, blockedRatios, anchor.side),
  } satisfies BorderAnchor;
};

const resolveSourceHandle = ({
  link,
  fallbackHandle,
  hasReversePair,
  hasComponentAnchor,
}: {
  link: BuilderPageLink;
  fallbackHandle: string;
  hasReversePair: boolean;
  hasComponentAnchor: boolean;
}) => {
  const anchorMode = getLinkAnchorMode(link);
  const shouldPreferComponentAnchor = anchorMode === 'component' || (
    anchorMode === 'auto' &&
    hasComponentAnchor &&
    !(hasReversePair && (link.kind === 'open-overlay' || link.kind === 'return-page'))
  );

  if (shouldPreferComponentAnchor && link.sourceNodeId) {
    return createSourceAnchorHandleId(link.sourceNodeId);
  }

  return isSourceShellHandle(link.meta?.sourceHandle) ? link.meta.sourceHandle : fallbackHandle;
};

const resolveTargetHandle = (link: BuilderPageLink, fallbackHandle: string) => (
  isTargetShellHandle(link.meta?.targetHandle) ? link.meta.targetHandle : fallbackHandle
);

const getLinkCodePrefix = (kind: BuilderPageLink['kind']) => {
  switch (kind) {
    case 'navigate-page':
      return 'P';
    case 'open-overlay':
    case 'switch-overlay':
      return 'O';
    case 'return-page':
      return 'R';
    default:
      return 'L';
  }
};

const getLinkActionLabel = (link: BuilderPageLink) => {
  if (typeof link.meta?.actionLabel === 'string' && link.meta.actionLabel.trim()) {
    return link.meta.actionLabel.trim();
  }

  if (typeof link.meta?.label === 'string' && link.meta.label.trim()) {
    return link.meta.label.trim();
  }

  return LINK_LABELS[link.kind];
};

const buildReverseLinkKey = (sourcePageId: string, targetPageId: string) => `${sourcePageId}::${targetPageId}`;

const PAGE_NODE_CHROME_HEIGHT = 18;
const ROOT_PAGE_GRID_SPEC = {
  cols: 48,
  rowHeight: 20,
  marginX: 6,
  marginY: 6,
  paddingX: 0,
  paddingY: 0,
} as const;

function createSourceAnchorHandleId(nodeId: string) {
  return `source-anchor-${nodeId}`;
}

const resolveCompactGridSpec = (parentCols: number, parentRows: number) => ({
  cols: Math.max(1, parentCols),
  rowHeight: Math.max(14, Math.min(22, Number((25 - 54 / Math.max(1, parentRows)).toFixed(2)))),
  marginX: 1,
  marginY: 1,
  paddingX: 1,
  paddingY: 1,
});

const resolveNodeInset = (type: BuilderNodeDocument['type']) => {
  if (type === 'canvas') {
    return { x: 4, y: 14 };
  }

  if (type === 'panel') {
    return { x: 4, y: 4 };
  }

  return { x: 2, y: 2 };
};

const projectGridNodeToPixels = ({
  layout,
  containerWidth,
  spec,
}: {
  layout: BuilderNodeDocument['layout'];
  containerWidth: number;
  spec: {
    cols: number;
    rowHeight: number;
    marginX: number;
    marginY: number;
    paddingX: number;
    paddingY: number;
  };
}) => {
  const colWidth = Math.max(
    1,
    (containerWidth - spec.paddingX * 2 - spec.marginX * Math.max(0, spec.cols - 1)) / Math.max(1, spec.cols),
  );

  return {
    x: spec.paddingX + layout.x * (colWidth + spec.marginX),
    y: spec.paddingY + layout.y * (spec.rowHeight + spec.marginY),
    w: colWidth * layout.w + spec.marginX * Math.max(0, layout.w - 1),
    h: spec.rowHeight * layout.h + spec.marginY * Math.max(0, layout.h - 1),
  };
};

const flattenPagePreviewNodes = ({
  nodes,
  containerWidth,
  offsetX = 0,
  offsetY = 0,
  depth = 0,
  spec = ROOT_PAGE_GRID_SPEC,
}: {
  nodes: BuilderNodeDocument[];
  containerWidth: number;
  offsetX?: number;
  offsetY?: number;
  depth?: number;
  spec?: {
    cols: number;
    rowHeight: number;
    marginX: number;
    marginY: number;
    paddingX: number;
    paddingY: number;
  };
}): PagePreviewNode[] => (
  nodes.flatMap((node) => {
    const box = projectGridNodeToPixels({
      layout: node.layout,
      containerWidth,
      spec,
    });

    const absoluteNode: PagePreviewNode = {
      id: node.id,
      type: node.type,
      depth,
      x: offsetX + box.x,
      y: offsetY + box.y,
      w: box.w,
      h: box.h,
    };

    if (node.children.length === 0) {
      return [absoluteNode];
    }

    const inset = resolveNodeInset(node.type);
    const nextContainerWidth = Math.max(24, box.w - inset.x * 2);
    const nextSpec = resolveCompactGridSpec(node.layout.w, node.layout.h);

    return [
      absoluteNode,
      ...flattenPagePreviewNodes({
        nodes: node.children,
        containerWidth: nextContainerWidth,
        offsetX: absoluteNode.x + inset.x,
        offsetY: absoluteNode.y + inset.y,
        depth: depth + 1,
        spec: nextSpec,
      }),
    ];
  })
);

const PageBoardNode = memo(function PageBoardNode({ data }: NodeProps<Node<PageNodeData>>) {
  const {
    page,
    scale,
    selected,
    ownerName,
    orbitCount,
    relationCount,
    previewNodes,
    sourceAnchorLabels,
    relationBadges,
    shellBookmarks,
    onSelectPage,
    onSelectLink,
    onPreviewShellBookmark,
    onCommitShellBookmark,
    onOpenPage,
  } = data;
  const nodeRef = useRef<HTMLButtonElement | null>(null);
  const bookmarkDragRef = useRef<{
    pointerId: number;
    linkId: string;
  } | null>(null);
  const [localBookmarkPreview, setLocalBookmarkPreview] = useState<Record<string, BorderAnchor>>({});
  const previewWidth = Math.max(88, Math.round(page.board.width * scale));
  const previewHeight = Math.max(70, Math.round(page.board.height * scale));
  const previewBodyHeight = Math.max(36, previewHeight - PAGE_NODE_CHROME_HEIGHT);
  const previewScaleX = previewWidth / Math.max(1, page.board.width);
  const previewScaleY = previewBodyHeight / Math.max(1, page.board.height);
  const shellLabel = `${page.board.width}×${page.board.height}`;

  const projectClientPointToShellBorder = useCallback((clientX: number, clientY: number): BorderAnchor | null => {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return projectPointToBorder({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }, {
      x: clientX,
      y: clientY,
    }).anchor;
  }, []);

  const resolvedShellBookmarks = useMemo(() => {
    const sideBuckets = new Map<BorderSide, Array<PageShellBookmark & {
      id: string;
      preferredAnchor: BorderAnchor;
    }>>();

    shellBookmarks.forEach((bookmark) => {
      const preferredAnchor = localBookmarkPreview[bookmark.linkId] ?? bookmark.anchor;
      sideBuckets.set(preferredAnchor.side, [
        ...(sideBuckets.get(preferredAnchor.side) ?? []),
        {
          id: bookmark.linkId,
          ...bookmark,
          preferredAnchor,
        },
      ]);
    });

    const resolvedById = new Map<string, BorderAnchor>();
    BORDER_SIDES.forEach((side) => {
      const items = sideBuckets.get(side) ?? [];
      if (items.length === 0) return;

      const resolved = distributeAnchorsOnSide(items);
      items.forEach((item) => {
        resolvedById.set(item.linkId, resolved.get(item.linkId) ?? item.preferredAnchor);
      });
    });

    return shellBookmarks.map((bookmark) => ({
      ...bookmark,
      anchor: resolvedById.get(bookmark.linkId) ?? bookmark.anchor,
    }));
  }, [localBookmarkPreview, shellBookmarks]);

  const handleBookmarkPointerDown = (event: React.PointerEvent<HTMLSpanElement>, linkId: string) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectLink(linkId);
    event.currentTarget.setPointerCapture(event.pointerId);
    bookmarkDragRef.current = {
      pointerId: event.pointerId,
      linkId,
    };
    const anchor = projectClientPointToShellBorder(event.clientX, event.clientY);
    if (anchor) {
      setLocalBookmarkPreview((current) => ({
        ...current,
        [linkId]: anchor,
      }));
      onPreviewShellBookmark(linkId, anchor);
    }
  };

  const handleBookmarkPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!bookmarkDragRef.current || bookmarkDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const linkId = bookmarkDragRef.current.linkId;
    const anchor = projectClientPointToShellBorder(event.clientX, event.clientY);
    if (anchor) {
      setLocalBookmarkPreview((current) => ({
        ...current,
        [linkId]: anchor,
      }));
      onPreviewShellBookmark(linkId, anchor);
    }
  };

  const handleBookmarkPointerUp = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!bookmarkDragRef.current || bookmarkDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const linkId = bookmarkDragRef.current.linkId;
    const anchor = projectClientPointToShellBorder(event.clientX, event.clientY);
    bookmarkDragRef.current = null;

    if (anchor) {
      setLocalBookmarkPreview((current) => {
        const { [linkId]: _removed, ...rest } = current;
        return rest;
      });
      onCommitShellBookmark(linkId, anchor);
      return;
    }

    setLocalBookmarkPreview((current) => {
      const { [linkId]: _removed, ...rest } = current;
      return rest;
    });
    onPreviewShellBookmark(linkId, null);
  };

  return (
    <div className="page-board-node-wrap">
      <Handle id={NODE_HANDLES.targetLeft} type="target" position={Position.Left} className="page-board-handle page-board-handle-left" />
      <Handle id={NODE_HANDLES.targetTop} type="target" position={Position.Top} className="page-board-handle page-board-handle-top" />
      <Handle id={NODE_HANDLES.targetRight} type="target" position={Position.Right} className="page-board-handle page-board-handle-right" />
      <Handle id={NODE_HANDLES.targetBottom} type="target" position={Position.Bottom} className="page-board-handle page-board-handle-bottom" />
      <Handle id={NODE_HANDLES.sourceLeft} type="source" position={Position.Left} className="page-board-handle page-board-handle-left" />
      <Handle id={NODE_HANDLES.sourceTop} type="source" position={Position.Top} className="page-board-handle page-board-handle-top" />
      <Handle id={NODE_HANDLES.sourceRight} type="source" position={Position.Right} className="page-board-handle page-board-handle-right" />
      <Handle id={NODE_HANDLES.sourceBottom} type="source" position={Position.Bottom} className="page-board-handle page-board-handle-bottom" />
      <Handle id={NODE_HANDLES.sourceOverlayOut} type="source" position={Position.Bottom} className="page-board-handle page-board-handle-bottom" style={{ left: '46%' }} />
      <Handle id={NODE_HANDLES.targetOverlayIn} type="target" position={Position.Top} className="page-board-handle page-board-handle-top" style={{ left: '46%' }} />
      <Handle id={NODE_HANDLES.sourceOverlayReturn} type="source" position={Position.Top} className="page-board-handle page-board-handle-top" style={{ left: '54%' }} />
      <Handle id={NODE_HANDLES.targetPageReturn} type="target" position={Position.Bottom} className="page-board-handle page-board-handle-bottom" style={{ left: '54%' }} />
      <button
        ref={nodeRef}
        type="button"
        onClick={() => onSelectPage(page.id)}
        onDoubleClick={() => onOpenPage?.(page.id)}
        className={cn(
          'page-board-node text-left',
          page.kind === 'overlay' && 'page-board-node-overlay',
          selected && 'page-board-node-selected',
        )}
      >
        <div className="page-board-node-head">
          <div className="flex items-center gap-2 min-w-0">
            {page.kind === 'overlay' ? <PanelTop size={14} /> : <Monitor size={14} />}
            <span className="truncate">{page.name}</span>
          </div>
          <span className="page-board-node-kind">{page.kind}</span>
        </div>
        <div className="page-board-node-shell" style={{ width: previewWidth, height: previewHeight }}>
          <div className="page-board-node-chrome">
            <span className="page-board-node-dot bg-red-400/90" />
            <span className="page-board-node-dot bg-amber-400/90" />
            <span className="page-board-node-dot bg-emerald-400/90" />
          </div>
          <div className="page-board-node-body">
            <div className="page-board-node-grid" />
            <div className="page-board-node-outline" />
            {previewNodes.map((previewNode) => {
              const left = Math.max(0, Math.min(previewWidth - 6, previewNode.x * previewScaleX));
              const top = Math.max(0, Math.min(previewBodyHeight - 4, previewNode.y * previewScaleY));
              const width = Math.max(6, previewNode.w * previewScaleX);
              const height = Math.max(4, previewNode.h * previewScaleY);
              const anchorLabels = sourceAnchorLabels[previewNode.id] ?? [];
              const isAnchor = anchorLabels.length > 0;
              const anchorX = Math.max(4, Math.min(previewWidth - 4, left + width / 2));
              const anchorY = Math.max(4, Math.min(previewBodyHeight - 4, top + height / 2));

              return (
                <div key={previewNode.id}>
                  <div
                    className={cn(
                      'page-board-node-block',
                      previewNode.depth > 0 && 'page-board-node-block-child',
                      previewNode.type === 'button' && 'page-board-node-block-action',
                      previewNode.type === 'panel' && 'page-board-node-block-container',
                      previewNode.type === 'canvas' && 'page-board-node-block-container',
                      isAnchor && 'page-board-node-block-anchor',
                    )}
                    style={{
                      left,
                      top,
                      width,
                      height,
                    }}
                  />
                  {isAnchor ? (
                    <>
                      <Handle
                        id={createSourceAnchorHandleId(previewNode.id)}
                        type="source"
                        position={Position.Top}
                        className="page-board-anchor-handle"
                        style={{
                          left: anchorX,
                          top: anchorY,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                      <span
                        className="page-board-anchor-dot"
                        style={{
                          left: anchorX,
                          top: anchorY,
                        }}
                      />
                      <span
                        className="page-board-anchor-code"
                        title={anchorLabels.join(' · ')}
                        style={{
                          left: anchorX,
                          top: anchorY,
                        }}
                      >
                        {anchorLabels.length > 1 ? `${anchorLabels[0]}+${anchorLabels.length - 1}` : anchorLabels[0]}
                      </span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="page-board-node-meta">
          <span>{page.route}</span>
          <span>·</span>
          <span>{shellLabel}</span>
        </div>
        {relationBadges.length > 0 ? (
          <div className="page-board-node-relation-tags">
            {relationBadges.slice(0, 5).map((badge) => (
              <span
                key={`${badge.code}-${badge.label}`}
                className={cn('page-board-node-relation-tag', `page-board-node-relation-tag-${badge.kind}`)}
                title={badge.label}
              >
                {badge.code}
              </span>
            ))}
            {relationBadges.length > 5 ? (
              <span className="page-board-node-relation-tag page-board-node-relation-tag-more">
                +{relationBadges.length - 5}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="page-board-node-footer">
          <span>{page.kind === 'page' ? `${orbitCount} overlays in orbit` : `Owner · ${ownerName ?? 'Detached'}`}</span>
          <span>{relationCount} relations</span>
        </div>
        <div className="page-board-node-footer">
          <span>{page.nodes.length} root nodes</span>
          <span className="inline-flex items-center gap-1">
            Double click
            <ExternalLink size={12} />
          </span>
        </div>
      </button>
      {resolvedShellBookmarks.map((bookmark) => (
        <span
          key={bookmark.linkId}
          role="button"
          tabIndex={-1}
          onPointerDown={(event) => handleBookmarkPointerDown(event, bookmark.linkId)}
          onPointerMove={handleBookmarkPointerMove}
          onPointerUp={handleBookmarkPointerUp}
          onPointerCancel={handleBookmarkPointerUp}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelectLink(bookmark.linkId);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            'page-board-shell-bookmark nodrag nopan nowheel',
            `page-board-shell-bookmark-${bookmark.kind}`,
            `page-board-shell-bookmark-${bookmark.anchor.side}`,
            bookmark.selected && 'page-board-shell-bookmark-selected',
          )}
          style={getShellBookmarkStyle(bookmark.anchor)}
          aria-label={`${bookmark.code} shell bookmark`}
          title={bookmark.title}
        >
          {bookmark.code}
        </span>
      ))}
    </div>
  );
});

const PageRelationEdgeComponent = memo(function PageRelationEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  style,
  selected,
  data,
  pathOptions,
  interactionWidth,
}: EdgeProps<PageRelationEdge>) {
  const { screenToFlowPosition } = useReactFlow();
  const sourceNodeId = data?.sourcePageId ?? source;
  const targetNodeId = data?.targetPageId ?? target;
  const sourceInternalNode = useInternalNode(sourceNodeId);
  const targetInternalNode = useInternalNode(targetNodeId);
  const labelProgress = data?.labelProgress ?? data?.defaultLabelProgress ?? 0.5;
  const labelProgressMin = data?.labelProgressRange?.[0] ?? 0;
  const labelProgressMax = data?.labelProgressRange?.[1] ?? 1;
  const [liveProgress, setLiveProgress] = useState(labelProgress);
  const [liveAnchor, setLiveAnchor] = useState<{
    role: 'source' | 'target';
    anchor: BorderAnchor;
    position: FlowPositionOffset;
  } | null>(null);
  const [liveCurvePoints, setLiveCurvePoints] = useState<FlowPositionOffset[] | null>(null);
  const [liveElbowBendPoints, setLiveElbowBendPoints] = useState<FlowPositionOffset[] | null>(null);
  const labelDragRef = useRef<{
    pointerId: number;
  } | null>(null);
  const anchorDragRef = useRef<{
    pointerId: number;
    role: 'source' | 'target';
  } | null>(null);
  const curvePointDragRef = useRef<{
    pointerId: number;
    pointIndex: number;
  } | null>(null);
  const elbowSegmentDragRef = useRef<{
    pointerId: number;
    segmentIndex: number;
    routePoints: FlowPositionOffset[];
  } | null>(null);

  const getNodeFlowRect = useCallback((nodeId: string): FlowRect | null => {
    if (typeof document === 'undefined') return null;

    const escapedNodeId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(nodeId)
      : nodeId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const nodeElement = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${escapedNodeId}"]`);
    if (!nodeElement) return null;

    const rect = nodeElement.getBoundingClientRect();
    const topLeft = screenToFlowPosition({ x: rect.left, y: rect.top });
    const bottomRight = screenToFlowPosition({ x: rect.right, y: rect.bottom });
    const width = Math.max(1, bottomRight.x - topLeft.x);
    const height = Math.max(1, bottomRight.y - topLeft.y);

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: topLeft.x + width,
      bottom: topLeft.y + height,
      width,
      height,
    };
  }, [screenToFlowPosition]);

  const sourceRect = getFlowRectFromInternalNode(sourceInternalNode) ?? getNodeFlowRect(sourceNodeId);

  const targetRect = getFlowRectFromInternalNode(targetInternalNode) ?? getNodeFlowRect(targetNodeId);

  const sourceResolved = useMemo<ResolvedBorderAnchor>(() => {
    if (liveAnchor?.role === 'source' && sourceRect) {
      return {
        anchor: liveAnchor.anchor,
        point: liveAnchor.position,
        position: getPositionForBorderSide(liveAnchor.anchor.side),
      };
    }

    if (!sourceRect) {
      const fallbackAnchor = { side: 'right', ratio: 0.5 } satisfies BorderAnchor;
      return {
        anchor: fallbackAnchor,
        point: { x: sourceX, y: sourceY },
        position: sourcePosition,
      };
    }

    return resolveBorderAnchor(
      sourceRect,
      isBorderAnchor(data?.sourceBorderAnchor) ? data.sourceBorderAnchor : null,
      { x: sourceX, y: sourceY },
    );
  }, [data?.sourceBorderAnchor, liveAnchor, sourcePosition, sourceRect, sourceX, sourceY]);

  const targetResolved = useMemo<ResolvedBorderAnchor>(() => {
    if (liveAnchor?.role === 'target' && targetRect) {
      return {
        anchor: liveAnchor.anchor,
        point: liveAnchor.position,
        position: getPositionForBorderSide(liveAnchor.anchor.side),
      };
    }

    if (!targetRect) {
      const fallbackAnchor = { side: 'left', ratio: 0.5 } satisfies BorderAnchor;
      return {
        anchor: fallbackAnchor,
        point: { x: targetX, y: targetY },
        position: targetPosition,
      };
    }

    return resolveBorderAnchor(
      targetRect,
      isBorderAnchor(data?.targetBorderAnchor) ? data.targetBorderAnchor : null,
      { x: targetX, y: targetY },
    );
  }, [data?.targetBorderAnchor, liveAnchor, targetPosition, targetRect, targetX, targetY]);

  const pathType = data?.pathType === 'curve' ? 'curve' : 'elbow';
  const curvePoints = liveCurvePoints ?? data?.curvePoints ?? [];
  const elbowBendPoints = liveElbowBendPoints ?? data?.elbowBendPoints ?? [];
  const curvePathPoints = useMemo(
    () => [sourceResolved.point, ...curvePoints, targetResolved.point],
    [curvePoints, sourceResolved.point, targetResolved.point],
  );
  const elbowOffset = typeof pathOptions?.offset === 'number' ? pathOptions.offset : 24;
  const defaultElbowRoutePoints = useMemo(
    () => buildDefaultOrthogonalRoute({
      source: sourceResolved.point,
      sourcePosition: sourceResolved.position,
      target: targetResolved.point,
      targetPosition: targetResolved.position,
      offset: elbowOffset,
    }),
    [elbowOffset, sourceResolved.point, sourceResolved.position, targetResolved.point, targetResolved.position],
  );
  const persistedElbowRoutePoints = useMemo(
    () => [sourceResolved.point, ...elbowBendPoints, targetResolved.point],
    [elbowBendPoints, sourceResolved.point, targetResolved.point],
  );
  const adaptedPersistedElbowRoutePoints = useMemo(
    () => adaptOrthogonalRouteToEndpoints(persistedElbowRoutePoints),
    [persistedElbowRoutePoints],
  );
  const elbowRoutePoints = useMemo(
    () => enforceOrthogonalEndpointLocks({
      points: normalizeOrthogonalRoute(
        elbowBendPoints.length > 0
          ? adaptedPersistedElbowRoutePoints
          : defaultElbowRoutePoints,
      ),
      sourcePosition: sourceResolved.position,
      targetPosition: targetResolved.position,
      offset: elbowOffset,
    }),
    [adaptedPersistedElbowRoutePoints, defaultElbowRoutePoints, elbowBendPoints.length, elbowOffset, sourceResolved.position, targetResolved.position],
  );
  const elbowRenderRoutePoints = useMemo(
    () => buildRenderableOrthogonalRoute(elbowRoutePoints),
    [elbowRoutePoints],
  );
  const [edgePath, labelX, labelY] = pathType === 'curve'
    ? getCurvePath(curvePathPoints)
    : buildOrthogonalPath(elbowRenderRoutePoints, typeof pathOptions?.borderRadius === 'number' ? pathOptions.borderRadius : 14);
  const pathGeometry = useMemo(() => {
    if (typeof document === 'undefined') return null;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edgePath);

    try {
      const length = path.getTotalLength();
      return Number.isFinite(length) && length > 0 ? { path, length } : null;
    } catch {
      return null;
    }
  }, [edgePath]);

  const getPathPoint = useCallback((progress: number): FlowPositionOffset => {
    if (!pathGeometry) {
      return { x: labelX, y: labelY };
    }

    const point = pathGeometry.path.getPointAtLength(pathGeometry.length * clamp(progress, labelProgressMin, labelProgressMax));
    return { x: point.x, y: point.y };
  }, [labelProgressMax, labelProgressMin, labelX, labelY, pathGeometry]);

  const getClosestPathProgress = useCallback((position: FlowPositionOffset) => {
    if (!pathGeometry) return liveProgress;

    let bestProgress = liveProgress;
    let bestDistance = Number.POSITIVE_INFINITY;

    const sampleCount = 240;
    for (let index = 0; index <= sampleCount; index += 1) {
      const progress = labelProgressMin + (index / sampleCount) * (labelProgressMax - labelProgressMin);
      const point = pathGeometry.path.getPointAtLength(pathGeometry.length * progress);
      const distance = (point.x - position.x) ** 2 + (point.y - position.y) ** 2;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestProgress = progress;
      }
    }

    return Number(clamp(bestProgress, labelProgressMin, labelProgressMax).toFixed(3));
  }, [labelProgressMax, labelProgressMin, liveProgress, pathGeometry]);

  useEffect(() => {
    setLiveProgress(labelProgress);
  }, [labelProgress]);

  useEffect(() => {
    setLiveCurvePoints(null);
  }, [data?.curvePoints, pathType]);

  useEffect(() => {
    setLiveElbowBendPoints(null);
  }, [data?.elbowBendPoints, pathType]);

  const getProjectedAnchor = useCallback((
    clientPosition: FlowPositionOffset,
    role: 'source' | 'target',
  ) => {
    if (!data) return null;

    const nodeRect = role === 'source' ? sourceRect : targetRect;
    if (!nodeRect) return null;
    const projected = projectPointToBorder(nodeRect, screenToFlowPosition(clientPosition));

    if (role === 'target') {
      const adjustedAnchor = resolveBlockedBorderAnchor(projected.anchor, data?.targetBlockedRatiosBySide);
      return {
        anchor: adjustedAnchor,
        point: anchorToPoint(nodeRect, adjustedAnchor),
        position: getPositionForBorderSide(adjustedAnchor.side),
      };
    }

    return projected;
  }, [data?.targetBlockedRatiosBySide, screenToFlowPosition, sourceRect, targetRect]);

  const handleLabelPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    data?.onSelectLink(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    labelDragRef.current = {
      pointerId: event.pointerId,
    };
  };

  const handleLabelPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!labelDragRef.current || labelDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setLiveProgress(getClosestPathProgress(flowPosition));
  };

  const handleLabelPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!labelDragRef.current || labelDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const finalProgress = getClosestPathProgress(flowPosition);
    setLiveProgress(finalProgress);
    labelDragRef.current = null;
    data?.onLabelProgressChange(id, finalProgress);
  };

  const handleAnchorPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    role: 'source' | 'target',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    data?.onSelectLink(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    anchorDragRef.current = {
      pointerId: event.pointerId,
      role,
    };
    const projected = getProjectedAnchor({
      x: event.clientX,
      y: event.clientY,
    }, role);
    if (projected) {
      setLiveAnchor({
        role,
        anchor: projected.anchor,
        position: projected.point,
      });
    }
  };

  const handleAnchorPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!anchorDragRef.current || anchorDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const projected = getProjectedAnchor({
      x: event.clientX,
      y: event.clientY,
    }, anchorDragRef.current.role);
    if (!projected) return;
    setLiveAnchor({
      role: anchorDragRef.current.role,
      anchor: projected.anchor,
      position: projected.point,
    });
  };

  const handleAnchorPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!anchorDragRef.current || anchorDragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const role = anchorDragRef.current.role;
    const projected = getProjectedAnchor({
      x: event.clientX,
      y: event.clientY,
    }, role);
    anchorDragRef.current = null;
    setLiveAnchor(null);

    if (projected) {
      data?.onBorderAnchorChange(id, role, projected.anchor);
    }
  };

  const handleCurvePointPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    pointIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    data?.onSelectLink(id);

    if (data?.curvePointMode === 'delete') {
      data?.onDeleteCurvePoint(id, pointIndex);
      return;
    }

    if (data?.curvePointMode !== 'move') {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    curvePointDragRef.current = {
      pointerId: event.pointerId,
      pointIndex,
    };
    setLiveCurvePoints(curvePoints);
  };

  const handleCurvePointPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = curvePointDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setLiveCurvePoints((current) => {
      const next = [...(current ?? curvePoints)];
      next[dragState.pointIndex] = flowPosition;
      return next;
    });
  };

  const handleCurvePointPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = curvePointDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const nextCurvePoints = [...(liveCurvePoints ?? curvePoints)];
    nextCurvePoints[dragState.pointIndex] = flowPosition;
    curvePointDragRef.current = null;
    setLiveCurvePoints(nextCurvePoints);
    data?.onCurvePointsChange(id, normalizeFlowPointList(nextCurvePoints));
  };

  const handleElbowSegmentPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    segmentIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    data?.onSelectLink(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const routePoints = buildRenderableOrthogonalRoute(elbowRenderRoutePoints);
    elbowSegmentDragRef.current = {
      pointerId: event.pointerId,
      segmentIndex,
      routePoints,
    };
    setLiveElbowBendPoints(routePoints.slice(1, -1));
  };

  const projectElbowRouteFromSegment = useCallback((routePoints: FlowPositionOffset[], segmentIndex: number, clientPosition: FlowPositionOffset) => {
    const startPoint = routePoints[segmentIndex];
    const endPoint = routePoints[segmentIndex + 1];
    if (!startPoint || !endPoint) return elbowBendPoints;

    const flowPosition = screenToFlowPosition(clientPosition);
    const isHorizontal = Math.abs(startPoint.y - endPoint.y) <= Math.abs(startPoint.x - endPoint.x);
    const snappedCoordinate = snapOrthogonalSegmentCoordinate({
      routePoints,
      segmentIndex,
      horizontal: isHorizontal,
      coordinate: isHorizontal ? flowPosition.y : flowPosition.x,
    });
    const projectedStart = isHorizontal
      ? { x: startPoint.x, y: snappedCoordinate }
      : { x: snappedCoordinate, y: startPoint.y };
    const projectedEnd = isHorizontal
      ? { x: endPoint.x, y: snappedCoordinate }
      : { x: snappedCoordinate, y: endPoint.y };
    const selectedSegmentTouchesEndpoint = segmentIndex === 0 || segmentIndex === routePoints.length - 2;
    const nextRoute = selectedSegmentTouchesEndpoint
      ? [
        ...routePoints.slice(0, segmentIndex + 1),
        projectedStart,
        projectedEnd,
        ...routePoints.slice(segmentIndex + 1),
      ]
      : routePoints.map((point, index) => {
        if (index === segmentIndex) return projectedStart;
        if (index === segmentIndex + 1) return projectedEnd;
        return point;
      });

    return normalizeOrthogonalRoute(nextRoute).slice(1, -1);
  }, [elbowBendPoints, screenToFlowPosition]);

  const handleElbowSegmentPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = elbowSegmentDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    setLiveElbowBendPoints(projectElbowRouteFromSegment(dragState.routePoints, dragState.segmentIndex, {
      x: event.clientX,
      y: event.clientY,
    }));
  };

  const handleElbowSegmentPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = elbowSegmentDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);

    const nextElbowPoints = projectElbowRouteFromSegment(dragState.routePoints, dragState.segmentIndex, {
      x: event.clientX,
      y: event.clientY,
    });
    elbowSegmentDragRef.current = null;
    setLiveElbowBendPoints(nextElbowPoints);
    data?.onElbowBendPointsChange(id, normalizeFlowPointList(nextElbowPoints));
  };

  const handleInteractivePathClick = (event: React.MouseEvent<SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    data?.onSelectLink(id);

    if (!(selected && pathType === 'curve' && data?.curvePointMode === 'insert')) {
      return;
    }

    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const insertionPath = [sourceResolved.point, ...curvePoints, targetResolved.point];
    let insertionSegmentIndex = insertionPath.length - 2;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < insertionPath.length - 1; index += 1) {
      const distance = getPointToSegmentDistanceSquared(flowPosition, insertionPath[index], insertionPath[index + 1]);
      if (distance < bestDistance) {
        bestDistance = distance;
        insertionSegmentIndex = index;
      }
    }

    data?.onInsertCurvePoint(id, flowPosition, insertionSegmentIndex);
  };

  const elbowSegmentHandles = useMemo(() => {
    const normalizedRoute = buildRenderableOrthogonalRoute(elbowRenderRoutePoints);

    return normalizedRoute
      .slice(0, -1)
      .map((point, segmentIndex) => {
        const nextPoint = normalizedRoute[segmentIndex + 1];
        if (!nextPoint) return null;
        const isEndpointSegment = segmentIndex === 0 || segmentIndex === normalizedRoute.length - 2;
        if (isEndpointSegment) return null;
        return {
          segmentIndex,
          point: {
            x: (point.x + nextPoint.x) / 2,
            y: (point.y + nextPoint.y) / 2,
          },
          horizontal: Math.abs(point.y - nextPoint.y) <= Math.abs(point.x - nextPoint.x),
        };
      })
      .filter((handle): handle is { segmentIndex: number; point: FlowPositionOffset; horizontal: boolean } => Boolean(handle));
  }, [elbowRenderRoutePoints]);

  const labelPoint = getPathPoint(liveProgress);
  const targetAnchorPoint = targetResolved.point;

  return (
    <>
      <path d={edgePath} fill="none" stroke="none" pointerEvents="none" />
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={interactionWidth}
        className={cn('page-board-relation-edge', selected && 'page-board-relation-edge-selected')}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(interactionWidth ?? 24, 28)}
        pointerEvents="stroke"
        className={cn(
          'page-board-edge-hitbox',
          selected && pathType === 'curve' && data?.curvePointMode === 'insert' && 'page-board-edge-hitbox-insert',
        )}
        onPointerDown={(event) => {
          if (selected && pathType === 'curve' && data?.curvePointMode === 'insert') {
            event.stopPropagation();
          }
        }}
        onClick={handleInteractivePathClick}
      />
      <EdgeLabelRenderer>
        {selected ? (
          <>
            <button
              type="button"
              draggable={false}
              onPointerDown={(event) => handleAnchorPointerDown(event, 'target')}
              onPointerMove={handleAnchorPointerMove}
              onPointerUp={handleAnchorPointerUp}
              onPointerCancel={handleAnchorPointerUp}
              onDragStart={(event) => event.preventDefault()}
              className={cn(
                'page-board-edge-anchor nodrag nopan nowheel',
                'page-board-edge-anchor-target',
                liveAnchor?.role === 'target' && 'page-board-edge-anchor-dragging',
              )}
              style={{
                transform: `translate(-50%, -50%) translate(${targetAnchorPoint.x}px, ${targetAnchorPoint.y}px)`,
              }}
              aria-label={`Move target anchor for ${data?.markerLabel ?? id}`}
              title="Drag along the target shell border"
             />
            {pathType === 'curve'
              ? curvePoints.map((point, pointIndex) => (
                <button
                  key={`${id}-curve-point-${pointIndex}`}
                  type="button"
                  draggable={false}
                  onPointerDown={(event) => handleCurvePointPointerDown(event, pointIndex)}
                  onPointerMove={handleCurvePointPointerMove}
                  onPointerUp={handleCurvePointPointerUp}
                  onPointerCancel={handleCurvePointPointerUp}
                  onDragStart={(event) => event.preventDefault()}
                  className={cn(
                    'page-board-edge-curve-point nodrag nopan nowheel',
                    curvePointDragRef.current?.pointIndex === pointIndex && 'page-board-edge-curve-point-dragging',
                    data?.curvePointMode === 'delete' && 'page-board-edge-curve-point-delete',
                  )}
                  style={{
                    transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
                  }}
                  aria-label={`${data?.curvePointMode === 'delete' ? 'Delete' : 'Move'} curve control point ${pointIndex + 1} for ${data?.markerLabel ?? id}`}
                  title={`${data?.curvePointMode === 'delete' ? 'Delete' : 'Move'} curve control point ${pointIndex + 1}`}
                />
              ))
              : elbowSegmentHandles.map((handle) => (
                <button
                  key={`${id}-segment-${handle.segmentIndex}`}
                  type="button"
                  draggable={false}
                  onPointerDown={(event) => handleElbowSegmentPointerDown(event, handle.segmentIndex)}
                  onPointerMove={handleElbowSegmentPointerMove}
                  onPointerUp={handleElbowSegmentPointerUp}
                  onPointerCancel={handleElbowSegmentPointerUp}
                  onDragStart={(event) => event.preventDefault()}
                  className={cn(
                    'page-board-edge-segment-handle nodrag nopan nowheel',
                    handle.horizontal
                      ? 'page-board-edge-segment-handle-horizontal'
                      : 'page-board-edge-segment-handle-vertical',
                    elbowSegmentDragRef.current?.segmentIndex === handle.segmentIndex && 'page-board-edge-segment-handle-dragging',
                  )}
                  style={{
                    transform: `translate(-50%, -50%) translate(${handle.point.x}px, ${handle.point.y}px)`,
                  }}
                  aria-label={`Adjust elbow segment ${handle.segmentIndex + 1} for ${data?.markerLabel ?? id}`}
                  title="Drag perpendicular to create and extend bends"
                />
              ))}
          </>
        ) : null}
        <button
          type="button"
          draggable={false}
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
          onPointerCancel={handleLabelPointerUp}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            data?.onSelectLink(id);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDragStart={(event) => event.preventDefault()}
          className={cn(
            'page-board-edge-label nodrag nopan nowheel',
            selected && 'page-board-edge-label-selected',
            data?.kind && `page-board-edge-label-${data.kind}`,
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
            color: data?.strokeColor,
            borderColor: data?.strokeColor,
            fontSize: `${data?.labelFontSize ?? 10}px`,
          }}
          aria-label={`Move relation label ${data?.markerLabel ?? id}`}
          title="Drag along the system-generated line"
        >
          {data?.markerLabel ?? id}
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

const nodeTypes = {
  pageShell: PageBoardNode,
};

const edgeTypes = {
  pageRelation: PageRelationEdgeComponent,
};

export function PageBoard({
  pages,
  links,
  selectedPageId,
  fitRequestKey = 0,
  selectedLinkId: controlledSelectedLinkId,
  curvePointToolMode: controlledCurvePointToolMode,
  onSelectPage,
  onSelectLink,
  onCurvePointToolModeChange,
  onOpenPage,
  onCreatePage,
  onApplyStarter,
  canApplyStarter = false,
  onUpdatePageBoard,
  onUpdatePageLinkMeta,
  onDeletePage,
  surfaceMode = 'pages',
  onChangeSurfaceMode,
}: PageBoardProps) {
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [feedback, setFeedback] = useState<PageBoardFeedback | null>(null);
  const [uncontrolledSelectedLinkId, setUncontrolledSelectedLinkId] = useState<string | null>(null);
  const [uncontrolledCurvePointToolMode, setUncontrolledCurvePointToolMode] = useState<CurvePointToolMode>('move');
  const [liveSourceBookmarks, setLiveSourceBookmarks] = useState<Record<string, BorderAnchor>>({});
  const isNodeDraggingRef = useRef(false);
  const lastHandledFocusRequestRef = useRef(0);
  const selectedLinkId = controlledSelectedLinkId ?? uncontrolledSelectedLinkId;
  const curvePointToolMode = controlledCurvePointToolMode ?? uncontrolledCurvePointToolMode;
  const setSelectedLinkState = useCallback((linkId: string | null) => {
    if (selectedLinkId === linkId) return;
    if (controlledSelectedLinkId === undefined) {
      setUncontrolledSelectedLinkId(linkId);
    }
    onSelectLink?.(linkId);
  }, [controlledSelectedLinkId, onSelectLink, selectedLinkId]);
  const setCurvePointToolMode = useCallback((mode: CurvePointToolMode) => {
    if (curvePointToolMode === mode) return;
    if (controlledCurvePointToolMode === undefined) {
      setUncontrolledCurvePointToolMode(mode);
    }
    onCurvePointToolModeChange?.(mode);
  }, [controlledCurvePointToolMode, curvePointToolMode, onCurvePointToolModeChange]);
  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedLinkId) ?? null,
    [links, selectedLinkId],
  );
  const pagesById = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null;
  const pageCount = pages.filter((page) => page.kind === 'page').length;
  const overlayCount = pages.length - pageCount;

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const boardScale = useMemo(() => {
    const maxWidth = Math.max(...pages.filter((page) => page.kind === 'page').map((page) => page.board.width), 1440);
    return 292 / maxWidth;
  }, [pages]);

  const pageStats = useMemo(() => {
    const stats = new Map<string, { orbitCount: number; relationCount: number; ownerName: string | null }>();

    pages.forEach((page) => {
      const owner = getOwnerPage(pages, page);
      stats.set(page.id, {
        ownerName: owner?.name ?? null,
        orbitCount: page.kind === 'page' ? getOwnedOverlays(pages, page.id).length : 0,
        relationCount: links.filter((link) => link.sourcePageId === page.id || link.targetPageId === page.id).length,
      });
    });

    return stats;
  }, [links, pages]);

  const relationMarkers = useMemo(() => {
    const markersByLinkId = new Map<string, PageLinkMarker>();
    const sourceAnchorLabelsByPage = new Map<string, Record<string, string[]>>();
    const targetBadgesByPage = new Map<string, PageRelationBadge[]>();
    const outgoingCountersByPage = new Map<string, Record<string, number>>();
    const pageNameById = new Map(pages.map((page) => [page.id, page.name]));
    const reversePairs = new Set<string>();

    links.forEach((link) => {
      if (links.some((candidate) => (
        candidate.sourcePageId === link.targetPageId &&
        candidate.targetPageId === link.sourcePageId
      ))) {
        reversePairs.add(buildReverseLinkKey(link.sourcePageId, link.targetPageId));
      }
    });

    links.forEach((link) => {
      const prefix = getLinkCodePrefix(link.kind);
      const counters = outgoingCountersByPage.get(link.sourcePageId) ?? {};
      const nextIndex = (counters[prefix] ?? 0) + 1;
      counters[prefix] = nextIndex;
      outgoingCountersByPage.set(link.sourcePageId, counters);

      const code = `${prefix}${nextIndex}`;
      const actionLabel = getLinkActionLabel(link);
      const marker: PageLinkMarker = {
        code,
        actionLabel,
        label: `${code} · ${actionLabel}`,
        kind: link.kind,
      };
      markersByLinkId.set(link.id, marker);

      if (link.sourceNodeId) {
        const sourceLabels = sourceAnchorLabelsByPage.get(link.sourcePageId) ?? {};
        sourceLabels[link.sourceNodeId] = [
          ...(sourceLabels[link.sourceNodeId] ?? []),
          code,
        ];
        sourceAnchorLabelsByPage.set(link.sourcePageId, sourceLabels);
      }

      targetBadgesByPage.set(link.targetPageId, [
        ...(targetBadgesByPage.get(link.targetPageId) ?? []),
        {
          code,
          label: `${code} from ${pageNameById.get(link.sourcePageId) ?? 'Unknown'} · ${actionLabel}`,
          kind: link.kind,
        },
      ]);
    });

    return {
      markersByLinkId,
      sourceAnchorLabelsByPage,
      targetBadgesByPage,
      reversePairs,
    };
  }, [links, pages]);

  const previewNodesByPage = useMemo(() => {
    const nodesByPage = new Map<string, PagePreviewNode[]>();

    pages.forEach((page) => {
      nodesByPage.set(page.id, flattenPagePreviewNodes({
        nodes: page.nodes,
        containerWidth: page.board.width,
      }));
    });

    return nodesByPage;
  }, [pages]);

  const pageOptions = useMemo(() => ({
    pages: pages.filter((page) => page.kind === 'page'),
    overlays: pages.filter((page) => page.kind === 'overlay'),
  }), [pages]);

  const shellOccupancy = useMemo(() => {
    const resolvedSourceByLinkId = new Map<string, BorderAnchor>();
    const resolvedTargetByLinkId = new Map<string, BorderAnchor>();
    const sourceBookmarksByPage = new Map<string, PageShellBookmark[]>();
    const sourceBlockedRatiosByPage = new Map<string, Partial<Record<BorderSide, number[]>>>();
    const outgoingByPage = new Map<string, Array<{
      id: string;
      link: BuilderPageLink;
      marker: PageLinkMarker;
      preferredAnchor: BorderAnchor;
    }>>();
    const incomingByPage = new Map<string, Array<{
      id: string;
      preferredAnchor: BorderAnchor;
    }>>();

    links.forEach((link) => {
      const sourcePage = pagesById.get(link.sourcePageId) ?? null;
      const targetPage = pagesById.get(link.targetPageId) ?? null;
      if (!sourcePage || !targetPage) return;

      const marker = relationMarkers.markersByLinkId.get(link.id);
      if (!marker) return;

      const hasReversePair = relationMarkers.reversePairs.has(buildReverseLinkKey(link.sourcePageId, link.targetPageId));
      const sourceAnchor = liveSourceBookmarks[link.id]
        ?? (isBorderAnchor(link.meta?.sourceBorderAnchor)
          ? link.meta.sourceBorderAnchor
          : getDefaultBorderAnchorForLink({
              link,
              role: 'source',
              sourcePage,
              targetPage,
              hasReversePair,
            }));
      const targetAnchor = isBorderAnchor(link.meta?.targetBorderAnchor)
        ? link.meta.targetBorderAnchor
        : getDefaultBorderAnchorForLink({
            link,
            role: 'target',
            sourcePage,
            targetPage,
            hasReversePair,
          });

      outgoingByPage.set(link.sourcePageId, [
        ...(outgoingByPage.get(link.sourcePageId) ?? []),
        {
          id: link.id,
          link,
          marker,
          preferredAnchor: sourceAnchor,
        },
      ]);

      incomingByPage.set(link.targetPageId, [
        ...(incomingByPage.get(link.targetPageId) ?? []),
        {
          id: link.id,
          preferredAnchor: targetAnchor,
        },
      ]);
    });

    outgoingByPage.forEach((items, pageId) => {
      const pageBookmarks: PageShellBookmark[] = [];
      const blockedAnchors: BorderAnchor[] = [];

      BORDER_SIDES.forEach((side) => {
        const sideItems = items.filter((item) => item.preferredAnchor.side === side);
        if (sideItems.length === 0) return;

        const resolvedAnchors = distributeAnchorsOnSide(sideItems);
        sideItems.forEach((item) => {
          const anchor = resolvedAnchors.get(item.id) ?? item.preferredAnchor;
          resolvedSourceByLinkId.set(item.id, anchor);
          blockedAnchors.push(anchor);
          pageBookmarks.push({
            ...item.marker,
            linkId: item.id,
            title: item.marker.label,
            anchor,
            selected: item.id === selectedLinkId,
          });
        });
      });

      sourceBookmarksByPage.set(pageId, pageBookmarks);
      sourceBlockedRatiosByPage.set(pageId, buildBorderAnchorLookup(blockedAnchors));
    });

    incomingByPage.forEach((items, pageId) => {
      const blockedLookup = sourceBlockedRatiosByPage.get(pageId) ?? {};

      BORDER_SIDES.forEach((side) => {
        const sideItems = items.filter((item) => item.preferredAnchor.side === side);
        if (sideItems.length === 0) return;

        const resolvedAnchors = distributeAnchorsOnSide(sideItems, blockedLookup[side] ?? []);
        sideItems.forEach((item) => {
          resolvedTargetByLinkId.set(item.id, resolvedAnchors.get(item.id) ?? item.preferredAnchor);
        });
      });
    });

    return {
      resolvedSourceByLinkId,
      resolvedTargetByLinkId,
      sourceBookmarksByPage,
      sourceBlockedRatiosByPage,
    };
  }, [links, liveSourceBookmarks, pagesById, relationMarkers.markersByLinkId, relationMarkers.reversePairs, selectedLinkId]);

  const computedNodes = useMemo<Node<PageNodeData>[]>(() => (
    pages.map((page) => {
      const stats = pageStats.get(page.id);

      return {
        id: page.id,
        type: 'pageShell',
        position: {
          x: page.board.x,
          y: page.board.y,
        },
        draggable: true,
        selectable: true,
        data: {
          page,
          scale: boardScale,
          selected: page.id === selectedPageId,
          ownerName: stats?.ownerName ?? null,
          orbitCount: stats?.orbitCount ?? 0,
          relationCount: stats?.relationCount ?? 0,
          previewNodes: previewNodesByPage.get(page.id) ?? [],
          sourceAnchorLabels: relationMarkers.sourceAnchorLabelsByPage.get(page.id) ?? {},
          relationBadges: relationMarkers.targetBadgesByPage.get(page.id) ?? [],
          shellBookmarks: shellOccupancy.sourceBookmarksByPage.get(page.id) ?? [],
          onSelectPage,
          onSelectLink: (linkId) => setSelectedLinkState(linkId),
          onPreviewShellBookmark: (linkId, anchor) => {
            setLiveSourceBookmarks((current) => {
              if (anchor === null) {
                if (!(linkId in current)) return current;
                const { [linkId]: _removed, ...rest } = current;
                return rest;
              }

              return {
                ...current,
                [linkId]: anchor,
              };
            });
          },
          onCommitShellBookmark: (linkId, anchor) => {
            setLiveSourceBookmarks((current) => {
              if (!(linkId in current)) return current;
              const { [linkId]: _removed, ...rest } = current;
              return rest;
            });
            onUpdatePageLinkMeta(linkId, {
              sourceBorderAnchor: anchor,
            });
          },
          onOpenPage,
        },
      };
    })
  ), [boardScale, onOpenPage, onSelectPage, onUpdatePageLinkMeta, pageStats, pages, previewNodesByPage, relationMarkers.sourceAnchorLabelsByPage, relationMarkers.targetBadgesByPage, selectedPageId, setSelectedLinkState, shellOccupancy.sourceBookmarksByPage]);

  const [flowNodes, setFlowNodes] = useState<Node<PageNodeData>[]>(() => computedNodes);

  useEffect(() => {
    if (Object.keys(liveSourceBookmarks).length > 0) return;

    setFlowNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((node) => [node.id, node]));

      return computedNodes.map((node) => {
        const currentNode = currentById.get(node.id);
        return {
          ...node,
          position: isNodeDraggingRef.current && currentNode ? currentNode.position : node.position,
        };
      });
    });
  }, [computedNodes, liveSourceBookmarks]);

  const handleLabelProgressChange = useCallback((linkId: string, progress: number) => {
    onUpdatePageLinkMeta(linkId, {
      labelProgress: Number(clamp(progress, 0, 1).toFixed(3)),
      labelOffset: undefined,
    });
  }, [onUpdatePageLinkMeta]);

  const handleBorderAnchorChange = useCallback((linkId: string, role: 'source' | 'target', anchor: BorderAnchor) => {
    onUpdatePageLinkMeta(linkId, {
      [role === 'source' ? 'sourceBorderAnchor' : 'targetBorderAnchor']: anchor,
    });
  }, [onUpdatePageLinkMeta]);

  const handleCurvePointsChange = useCallback((linkId: string, points: FlowPositionOffset[]) => {
    onUpdatePageLinkMeta(linkId, {
      curvePoints: normalizeFlowPointList(points),
      pathCurveControlX: undefined,
      pathCurveControlY: undefined,
    });
  }, [onUpdatePageLinkMeta]);

  const handleDeleteCurvePoint = useCallback((linkId: string, pointIndex: number) => {
    const link = links.find((entry) => entry.id === linkId);
    if (!link) return;

    const nextPoints = getLinkCurvePoints(link).filter((_, index) => index !== pointIndex);
    onUpdatePageLinkMeta(linkId, {
      curvePoints: normalizeFlowPointList(nextPoints),
      pathCurveControlX: undefined,
      pathCurveControlY: undefined,
    });
  }, [links, onUpdatePageLinkMeta]);

  const handleElbowBendPointsChange = useCallback((linkId: string, points: FlowPositionOffset[]) => {
    onUpdatePageLinkMeta(linkId, {
      elbowBendPoints: normalizeFlowPointList(points),
      pathCenterX: undefined,
      pathCenterY: undefined,
    });
  }, [onUpdatePageLinkMeta]);

  const handleInsertCurvePoint = useCallback((linkId: string, point: FlowPositionOffset, insertAt: number) => {
    const link = links.find((entry) => entry.id === linkId);
    if (!link) return;

    const nextPoints = getLinkCurvePoints(link);
    nextPoints.splice(clamp(insertAt, 0, nextPoints.length), 0, normalizeFlowPoint(point));
    onUpdatePageLinkMeta(linkId, {
      curvePoints: nextPoints,
      pathCurveControlX: undefined,
      pathCurveControlY: undefined,
    });
    setCurvePointToolMode('move');
  }, [links, onUpdatePageLinkMeta, setCurvePointToolMode]);

  const edges = useMemo<PageRelationEdge[]>(() => (
    links
      .filter((link) => pages.some((page) => page.id === link.sourcePageId) && pages.some((page) => page.id === link.targetPageId))
      .map((link) => {
        const handles = resolveLinkHandles(link.kind);
        const hasReversePair = relationMarkers.reversePairs.has(buildReverseLinkKey(link.sourcePageId, link.targetPageId));
        const sourcePreviewNodes = previewNodesByPage.get(link.sourcePageId) ?? [];
        const anchoredSourceNode = typeof link.sourceNodeId === 'string'
          ? sourcePreviewNodes.find((node) => node.id === link.sourceNodeId) ?? null
          : null;
        const marker = relationMarkers.markersByLinkId.get(link.id);
        const style = LINK_STYLES[link.kind];
        const defaultStrokeColor = typeof style.style?.stroke === 'string' ? style.style.stroke : '#4f7cff';
        const defaultStrokeWidth = typeof style.style?.strokeWidth === 'number' ? style.style.strokeWidth : 2.2;
        const strokeColor = getLinkStrokeColor(link, defaultStrokeColor);
        const strokeWidth = getLinkStrokeWidth(link, defaultStrokeWidth);
        const strokePattern = getLinkStrokePattern(link);
        const strokeDasharray = getRelationDashArray(strokePattern, strokeWidth);
        const markerLabel = getLinkLabelText(link, marker?.label ?? LINK_LABELS[link.kind]);
        const labelFontSize = getLinkLabelFontSize(
          link,
          typeof style.labelStyle?.fontSize === 'number' ? style.labelStyle.fontSize : 10,
        );
        const sourceHandle = resolveSourceHandle({
          link,
          fallbackHandle: handles.sourceHandle,
          hasReversePair,
          hasComponentAnchor: Boolean(anchoredSourceNode),
        });
        const targetHandle = resolveTargetHandle(link, handles.targetHandle);
        const defaultLabelProgress = getDefaultLabelProgress(link.kind, hasReversePair);
        const labelProgressRange = getLabelProgressRange(link.kind, hasReversePair);

        return {
          id: link.id,
          source: link.sourcePageId,
          target: link.targetPageId,
          sourceHandle,
          targetHandle,
          type: 'pageRelation',
          selected: link.id === selectedLinkId,
          selectable: true,
          focusable: false,
          ...style,
          style: {
            ...(style.style ?? {}),
            stroke: strokeColor,
            strokeWidth,
            strokeDasharray,
          },
          label: undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 16,
            height: 16,
            strokeWidth: Math.max(1.6, strokeWidth * 0.85),
          },
          data: {
            kind: link.kind,
            markerLabel,
            labelFontSize,
            strokeColor,
            strokeWidth,
            strokePattern,
            sourcePageId: link.sourcePageId,
            targetPageId: link.targetPageId,
            sourceBorderAnchor: shellOccupancy.resolvedSourceByLinkId.get(link.id) ?? (isBorderAnchor(link.meta?.sourceBorderAnchor) ? link.meta.sourceBorderAnchor : undefined),
            targetBorderAnchor: shellOccupancy.resolvedTargetByLinkId.get(link.id) ?? (isBorderAnchor(link.meta?.targetBorderAnchor) ? link.meta.targetBorderAnchor : undefined),
            targetBlockedRatiosBySide: shellOccupancy.sourceBlockedRatiosByPage.get(link.targetPageId) ?? {},
            pathType: getLinkPathType(link),
            curvePoints: getLinkCurvePoints(link),
            elbowBendPoints: getLinkElbowBendPoints(link),
            curvePointMode: link.id === selectedLinkId ? curvePointToolMode : 'move',
            labelProgress: getLabelProgress(link, defaultLabelProgress, labelProgressRange),
            defaultLabelProgress,
            labelProgressRange,
            onLabelProgressChange: handleLabelProgressChange,
            onBorderAnchorChange: handleBorderAnchorChange,
            onCurvePointsChange: handleCurvePointsChange,
            onElbowBendPointsChange: handleElbowBendPointsChange,
            onInsertCurvePoint: handleInsertCurvePoint,
            onDeleteCurvePoint: handleDeleteCurvePoint,
            onSelectLink: setSelectedLinkState,
          },
          pathOptions: {
            borderRadius: 14,
            offset: hasReversePair && link.kind === 'return-page' ? 34 : 24,
            curvature: hasReversePair ? 0.22 : 0.28,
          },
        };
      })
  ), [curvePointToolMode, handleBorderAnchorChange, handleCurvePointsChange, handleDeleteCurvePoint, handleElbowBendPointsChange, handleInsertCurvePoint, handleLabelProgressChange, links, pages, previewNodesByPage, relationMarkers.markersByLinkId, relationMarkers.reversePairs, selectedLinkId, setSelectedLinkState, shellOccupancy.resolvedSourceByLinkId, shellOccupancy.resolvedTargetByLinkId, shellOccupancy.sourceBlockedRatiosByPage]);

  const toolbarNotice = useMemo((): PageBoardFeedback | null => {
    if (feedback) return feedback;
    return null;
  }, [feedback]);

  const boardCountsLabel = `${pageCount}P · ${overlayCount}O · ${links.length}L`;

  useEffect(() => {
    if (selectedLinkId && !links.some((link) => link.id === selectedLinkId)) {
      setSelectedLinkState(null);
      setCurvePointToolMode('move');
    }
  }, [links, selectedLinkId, setCurvePointToolMode, setSelectedLinkState]);

  useEffect(() => {
    if (!selectedLink || getLinkPathType(selectedLink) !== 'curve') {
      setCurvePointToolMode('move');
    }
  }, [selectedLink, setCurvePointToolMode]);

  const handleInit = (instance: ReactFlowInstance) => {
    setFlowInstance(instance);
    window.requestAnimationFrame(() => {
      instance.fitView({ duration: 0, padding: 0.22 });
      const viewport = instance.getViewport();
      instance.setViewport({
        ...viewport,
        y: viewport.y + BOARD_TOP_SAFE_SHIFT,
      }, { duration: 0 });
    });
  };

  const handleNodesChange = useCallback<OnNodesChange<Node<PageNodeData>>>((changes) => {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const handleNodeDragStart = useCallback<OnNodeDrag<Node<PageNodeData>>>(() => {
    isNodeDraggingRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback<OnNodeDrag<Node<PageNodeData>>>((_, node) => {
    isNodeDraggingRef.current = false;
    onUpdatePageBoard(node.id, {
      x: node.position.x,
      y: node.position.y,
    });
  }, [onUpdatePageBoard]);

  const handleNodeClick: NodeMouseHandler<Node<PageNodeData>> = (_, node) => {
    setCurvePointToolMode('move');
    setSelectedLinkState(null);
    const page = pages.find((entry) => entry.id === node.id);
    if (!page) return;

    onSelectPage(page.id);
  };

  const handleEdgeClick: EdgeMouseHandler<PageRelationEdge> = (event, edge) => {
    event.stopPropagation();
    setSelectedLinkState(edge.id);
  };

  const handlePaneClick = () => {
    setCurvePointToolMode('move');
    setSelectedLinkState(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!flowInstance) return;

    const starterId = event.dataTransfer.getData('application/x-project-starter-id') as ProjectStarterId | '';
    if (starterId) {
      if (!canApplyStarter || !onApplyStarter) {
        setFeedback({
          tone: 'warning',
          text: 'Blueprint starters can only be dropped onto an empty pages board.',
        });
        return;
      }

      void Promise.resolve(onApplyStarter(starterId));
      setFeedback({
        tone: 'success',
        text: 'Blueprint starter seeded onto the pages board.',
      });
      return;
    }

    const kind = event.dataTransfer.getData('application/x-page-kind') as BuilderPage['kind'] | '';
    if (!kind) return;

    const position = flowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const ownerPageId = kind === 'overlay' ? (selectedPage?.kind === 'overlay' ? selectedPage.ownerPageId : selectedPage?.id) : undefined;
    if (kind === 'overlay' && !ownerPageId) {
      setFeedback({ tone: 'warning', text: 'Create or select a page first, then drop overlays into its orbit.' });
      return;
    }

    onCreatePage({
      kind,
      ownerPageId,
      board: {
        x: position.x,
        y: position.y,
      },
    });
    setFeedback({ tone: 'success', text: kind === 'overlay' ? 'Overlay dropped into the current page orbit.' : 'Page dropped onto the board.' });
  };

  const handleDelete = () => {
    if (selectedPage) {
      const ownedOverlayCount = selectedPage.kind === 'page' ? getOwnedOverlays(pages, selectedPage.id).length : 0;
      onDeletePage(selectedPage.id);
      setFeedback({
        tone: 'warning',
        text: ownedOverlayCount > 0
          ? `Deleted ${selectedPage.name} and ${ownedOverlayCount} owned overlays.`
          : `Deleted ${selectedPage.name}.`,
      });
    }
  };

  const handleFocus = useCallback(() => {
    if (!flowInstance || !selectedPage) return;
    flowInstance.fitBounds({
      x: selectedPage.board.x - 120,
      y: selectedPage.board.y - 120,
      width: selectedPage.board.width + 240,
      height: selectedPage.board.height + 240,
    }, { duration: 240, padding: 0.18 });
  }, [flowInstance, selectedPage]);

  const handleFitAll = useCallback(() => {
    flowInstance?.fitView({ duration: 260, padding: 0.18 });
  }, [flowInstance]);

  useEffect(() => {
    if (!fitRequestKey || !flowInstance) return;
    if (fitRequestKey === lastHandledFocusRequestRef.current) return;
    lastHandledFocusRequestRef.current = fitRequestKey;

    window.requestAnimationFrame(() => {
      handleFitAll();
    });
  }, [fitRequestKey, flowInstance, handleFitAll]);

  return (
    <div
      className="page-board-shell h-full w-full relative overflow-hidden bg-hr-bg"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="page-board-toolbar">
        <div className="page-board-toolbar-main">
          <div className="page-board-toolbar-group page-board-toolbar-group-leading">
            <div className="page-board-toolbar-heading">
              <span className="page-board-toolbar-label">
                <Layers3 size={14} />
                Pages Board
              </span>
              <span className="page-board-toolbar-summary">{boardCountsLabel}</span>
            </div>
            {toolbarNotice ? (
              <div className={cn(
                'page-board-toolbar-status',
                toolbarNotice.tone === 'success' && 'page-board-toolbar-status-success',
                toolbarNotice.tone === 'warning' && 'page-board-toolbar-status-warning',
              )}>
                {toolbarNotice.text}
              </div>
            ) : null}
          </div>
          <div className="page-board-toolbar-group page-board-toolbar-group-center">
            {onChangeSurfaceMode ? (
              <div className="page-board-tool-toggle">
                <button
                  type="button"
                  onClick={() => onChangeSurfaceMode('pages')}
                  className={cn('page-board-tool-btn page-board-tool-btn-icon', surfaceMode === 'pages' && 'page-board-tool-btn-active')}
                  title="Pages board"
                  aria-label="Pages board"
                >
                  <Layers3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSurfaceMode('canvas')}
                  className={cn('page-board-tool-btn page-board-tool-btn-icon', surfaceMode === 'canvas' && 'page-board-tool-btn-active')}
                  title="Canvas editor"
                  aria-label="Canvas editor"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSurfaceMode('kits')}
                  className={cn('page-board-tool-btn page-board-tool-btn-icon', surfaceMode === 'kits' && 'page-board-tool-btn-active')}
                  title="Kit studio"
                  aria-label="Kit studio"
                >
                  <Package size={14} />
                </button>
              </div>
            ) : null}
          </div>
          <div className="page-board-toolbar-group page-board-toolbar-actions">
            <select
              name="pageBoardJumpTarget"
              value={selectedPageId ?? ''}
              onChange={(event) => {
                onSelectPage(event.target.value || null);
              }}
              disabled={pages.length === 0}
              className="page-board-jump-select"
              aria-label="Jump to page or overlay"
            >
              {pages.length === 0 ? (
                <option value="">No pages yet</option>
              ) : null}
              <optgroup label={`Pages (${pageOptions.pages.length})`}>
                {pageOptions.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    Page · {page.name}
                  </option>
                ))}
              </optgroup>
              {pageOptions.overlays.length > 0 ? (
                <optgroup label={`Overlays (${pageOptions.overlays.length})`}>
                  {pageOptions.overlays.map((page) => (
                    <option key={page.id} value={page.id}>
                      Overlay · {page.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <button
              type="button"
              onClick={handleFocus}
              disabled={!selectedPage}
              className="page-board-add-chip page-board-add-chip-icon"
              title="Focus selected node"
              aria-label="Focus selected node"
            >
              <Focus size={14} />
            </button>
            <button
              type="button"
              onClick={handleFitAll}
              className="page-board-add-chip page-board-add-chip-icon"
              title="Fit board"
              aria-label="Fit board"
            >
              <Scan size={14} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedPage}
              className="page-board-add-chip page-board-add-chip-icon page-board-add-chip-danger"
              title="Delete selected shell"
              aria-label="Delete selected shell"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      <ReactFlow
        className="page-board-flow"
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={handleInit}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.18}
        maxZoom={1.5}
        edgesFocusable={false}
        edgesReconnectable={false}
        nodesConnectable={false}
        connectOnClick={false}
        defaultEdgeOptions={{
          type: 'pageRelation',
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1} color="color-mix(in srgb, var(--shell-border) 68%, transparent 32%)" />
        {pages.length > 1 || links.length > 0 ? (
          <MiniMap
            className="page-board-minimap"
            pannable
            zoomable
            style={{
              background: 'color-mix(in srgb, var(--shell-panel) 92%, transparent 8%)',
            }}
            nodeColor={(node) => {
              const page = pages.find((entry) => entry.id === node.id);
              return page?.kind === 'overlay' ? '#d97706' : '#4f7cff';
            }}
            maskColor="rgba(15, 23, 42, 0.10)"
          />
        ) : null}
        <Controls className="page-board-controls" />
      </ReactFlow>
    </div>
  );
}
