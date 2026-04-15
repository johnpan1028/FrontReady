import type { ReactNode } from 'react';
import { WEB_STAGE_CHROME_HEIGHT, WEB_STAGE_BODY_PADDING_X, WEB_STAGE_BODY_PADDING_Y, resolveWebStageFrameSize } from '../builder/responsive';
import { cn } from '../utils/cn';

type WebStageFrameProps = {
  canvasWidth: number;
  canvasHeight: number;
  surfaceLabel: string;
  modeLabel: string;
  bodyInsetX?: number;
  bodyInsetY?: number;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function WebStageFrame({
  canvasWidth,
  canvasHeight,
  surfaceLabel,
  modeLabel,
  bodyInsetX = WEB_STAGE_BODY_PADDING_X,
  bodyInsetY = WEB_STAGE_BODY_PADDING_Y,
  className,
  bodyClassName,
  children,
}: WebStageFrameProps) {
  const frameSize = resolveWebStageFrameSize(canvasWidth, canvasHeight, bodyInsetX, bodyInsetY);

  return (
    <div
      data-web-stage-frame
      className={cn('web-stage-frame mx-auto w-full transition-[width] duration-200 ease-out', className)}
      style={{ width: `${frameSize.width}px`, height: `${frameSize.height}px`, maxWidth: '100%' }}
    >
      <div className="web-stage-chrome">
        <div className="web-stage-dots" aria-hidden="true">
          <span className="web-stage-dot bg-red-400/90" />
          <span className="web-stage-dot bg-amber-400/90" />
          <span className="web-stage-dot bg-emerald-400/90" />
        </div>
        <div className="web-stage-address" aria-label={`${surfaceLabel} ${canvasWidth}px × ${canvasHeight}px`}>
          <span>{surfaceLabel}</span>
          <span className="web-stage-address-separator" aria-hidden="true" />
          <span>{canvasWidth} × {canvasHeight}</span>
        </div>
        <div className="web-stage-mode">{modeLabel}</div>
      </div>
      <div
        className={cn('web-stage-body', bodyClassName)}
        style={{
          height: `${frameSize.height - WEB_STAGE_CHROME_HEIGHT}px`,
          padding: `${bodyInsetY}px ${bodyInsetX}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
