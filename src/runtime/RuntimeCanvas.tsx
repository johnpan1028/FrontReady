import { useMemo } from 'react';
import { resolveRuntimeGridSpec } from '../builder/responsive';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { cn } from '../utils/cn';
import type { BuilderNodeDocument } from '../schema/project';
import { RuntimeNode } from './RuntimeNode';

type RuntimeCanvasProps = {
  nodes: BuilderNodeDocument[];
  className?: string;
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  paddingY?: number;
  parentFontFamily?: string;
  childrenFollowFont?: boolean;
  parentControlBorderStyle?: 'solid' | 'transparent';
  childrenFollowBorder?: boolean;
};

export function RuntimeCanvas({
  nodes,
  className,
  compact = false,
  layoutMode = 'grid',
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  paddingX,
  paddingY,
  parentFontFamily,
  childrenFollowFont = false,
  parentControlBorderStyle = 'solid',
  childrenFollowBorder = false,
}: RuntimeCanvasProps) {
  const { width, containerRef } = useContainerWidth();
  const { cols, rowHeight } = resolveRuntimeGridSpec(width, compact);
  const safePaddingLeft = Math.max(0, Math.round(Number(paddingLeft ?? paddingX ?? 8)));
  const safePaddingRight = Math.max(0, Math.round(Number(paddingRight ?? paddingX ?? 8)));
  const safePaddingTop = Math.max(0, Math.round(Number(paddingTop ?? paddingY ?? 8)));
  const safePaddingBottom = Math.max(0, Math.round(Number(paddingBottom ?? paddingY ?? 8)));

  const sortedNodes = useMemo(
    () => [...nodes].sort((left, right) => (left.layout.y - right.layout.y) || (left.layout.x - right.layout.x)),
    [nodes],
  );

  if (layoutMode === 'flex-row' || layoutMode === 'flex-col') {
    return (
      <div
        className={cn(
          'w-full h-full min-h-24 flex gap-2',
          layoutMode === 'flex-row' ? 'flex-row' : 'flex-col',
          className,
        )}
        style={{
          padding: `${safePaddingTop}px ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px`,
        }}
      >
        {sortedNodes.length === 0 ? (
          <div className="w-full h-full rounded-lg border border-dashed border-hr-border/60 bg-hr-panel/40 flex items-center justify-center text-xs text-hr-muted">
            Empty container
          </div>
        ) : (
          sortedNodes.map((node) => (
            <div
              key={node.id}
              className="min-w-0 min-h-0"
              style={{
                flexGrow: Math.max(1, node.layout.w),
                flexBasis: `${Math.max(12, node.layout.w * 8)}%`,
              }}
            >
              <RuntimeNode
                node={node}
                preview
                parentFontFamily={parentFontFamily}
                childrenFollowFont={childrenFollowFont}
                parentControlBorderStyle={parentControlBorderStyle}
                childrenFollowBorder={childrenFollowBorder}
              />
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('grid w-full min-h-[320px] auto-rows-fr gap-2', className)}
      style={{
        padding: `${safePaddingTop}px ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px`,
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `${rowHeight}px`,
      }}
    >
      {sortedNodes.length === 0 ? (
        <div className="col-span-full rounded-lg border border-dashed border-hr-border/60 bg-hr-panel/40 flex items-center justify-center text-xs text-hr-muted min-h-24">
          Empty canvas
        </div>
      ) : (
        sortedNodes.map((node) => (
          <RuntimeNode
            key={node.id}
            node={node}
            parentFontFamily={parentFontFamily}
            childrenFollowFont={childrenFollowFont}
            parentControlBorderStyle={parentControlBorderStyle}
            childrenFollowBorder={childrenFollowBorder}
          />
        ))
      )}
    </div>
  );
}
