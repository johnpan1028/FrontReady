import type { DragEvent as ReactDragEvent } from 'react';
import type { BuilderAssetEntry } from '../../builder/assetLibrary';
import { cn } from '../../utils/cn';

export function AssetRailItem({
  asset,
  disabled = false,
  count,
  onDragStart,
}: {
  asset: BuilderAssetEntry;
  disabled?: boolean;
  count?: number;
  onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
}) {
  const Icon = asset.icon;

  return (
    <div
      className={cn(
        'droppableElement flex items-center gap-2.5 rounded-lg border bg-hr-bg px-3 py-2 transition-colors',
        disabled
          ? 'cursor-not-allowed border-hr-border/70 opacity-50'
          : 'cursor-grab border-hr-border hover:border-hr-primary hover:text-hr-primary',
      )}
      draggable={!disabled}
      unselectable="on"
      onDragStart={onDragStart}
      title={asset.description}
    >
      <Icon size={15} className="shrink-0" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-xs font-medium">{asset.label}</span>
        {asset.badge ? (
          <span className="shrink-0 rounded-full border border-hr-border bg-hr-panel px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
            {asset.badge}
          </span>
        ) : null}
      </div>
      {typeof count === 'number' ? (
        <span className="shrink-0 rounded-full border border-hr-border bg-hr-panel px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
          {count}
        </span>
      ) : null}
    </div>
  );
}
