import type { CSSProperties } from 'react';

export const getWidgetFrameStyle = (props: Record<string, any> | undefined): CSSProperties => {
  if (!props) return {};

  const style: CSSProperties = {};
  if (props.minWidth) style.minWidth = `${props.minWidth}px`;
  if (props.minHeight) style.minHeight = `${props.minHeight}px`;

  if (props.scaleWithParent === false) {
    if (props.minWidth) style.width = `${props.minWidth}px`;
    if (props.minHeight) style.height = `${props.minHeight}px`;
  }

  return style;
};
