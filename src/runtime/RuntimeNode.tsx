import type { CSSProperties } from 'react';
import { RuntimeWidgetRegistry } from './RuntimeRegistry';
import { getWidgetFrameStyle } from './frameStyle';
import type { BuilderNodeDocument } from '../schema/project';
import { useRuntime } from './RuntimeContext';

type RuntimeNodeProps = {
  node: BuilderNodeDocument;
  preview?: boolean;
  parentFontFamily?: string;
  childrenFollowFont?: boolean;
  parentControlBorderStyle?: 'solid' | 'transparent';
  childrenFollowBorder?: boolean;
};

export function RuntimeNode({
  node,
  preview = false,
  parentFontFamily,
  childrenFollowFont = false,
  parentControlBorderStyle = 'solid',
  childrenFollowBorder = false,
}: RuntimeNodeProps) {
  const { resolveNodeProps, runActions } = useRuntime();
  const Component = RuntimeWidgetRegistry[node.type];
  if (!Component) return null;

  const resolvedProps = resolveNodeProps(node);
  const effectiveProps = { ...resolvedProps };

  if (
    effectiveProps.fontFamily === 'parent'
    && childrenFollowFont
    && typeof parentFontFamily === 'string'
    && parentFontFamily.trim().length > 0
  ) {
    effectiveProps.fontFamily = parentFontFamily;
  }

  if (effectiveProps.borderStyle === 'parent' && childrenFollowBorder === true) {
    effectiveProps.borderStyle = parentControlBorderStyle;
  }

  const widgetStyle = getWidgetFrameStyle(effectiveProps);
  const outerStyle: CSSProperties | undefined = preview
    ? undefined
    : {
        gridColumn: `${node.layout.x + 1} / span ${node.layout.w}`,
        gridRow: `${node.layout.y + 1} / span ${node.layout.h}`,
      };

  return (
    <div
      style={outerStyle}
      className="min-w-0 min-h-0"
      data-runtime-node-id={node.id}
      data-runtime-node-type={node.type}
    >
      <div className="w-full h-full" style={widgetStyle}>
        <Component
          node={node}
          {...effectiveProps}
          runActions={node.actions.length > 0 ? () => void runActions(node.actions) : undefined}
        />
      </div>
    </div>
  );
}
