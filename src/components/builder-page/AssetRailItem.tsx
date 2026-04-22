import type { DragEvent as ReactDragEvent } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { BuilderAssetEntry } from '../../builder/assetLibrary';
import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';

export function AssetRailItem({
  asset,
  disabled = false,
  count,
  isFavorited = false,
  onDragStart,
  onToggleFavorite,
}: {
  asset: BuilderAssetEntry;
  disabled?: boolean;
  count?: number;
  isFavorited?: boolean;
  onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
  onToggleFavorite?: () => void;
}) {
  const Icon = asset.icon;
  const stopFavoriteEvent = (
    event: ReactMouseEvent<HTMLButtonElement> | ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={cn(
        'builder-asset-item droppableElement flex items-center gap-2 rounded-lg border pl-2 pr-1.5 transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-grab',
      )}
      draggable={!disabled}
      unselectable="on"
      onDragStart={onDragStart}
      title={asset.description}
    >
      <Icon size={12} className="shrink-0" />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[10px] font-medium leading-none">{asset.label}</span>
        {asset.badge ? (
          <span className="shrink-0 rounded-full border border-hr-border bg-hr-panel px-1.5 py-0 text-[8px] font-semibold uppercase tracking-[0.12em] leading-[14px] text-hr-muted">
            {asset.badge}
          </span>
        ) : null}
      </div>
      <div className="builder-asset-item-actions">
        {typeof count === 'number' ? (
          <span className="shrink-0 rounded-full border border-hr-border bg-hr-panel px-1.5 py-0 text-[8px] font-semibold uppercase tracking-[0.12em] leading-[14px] text-hr-muted">
            {count}
          </span>
        ) : null}
        {onToggleFavorite ? (
          <button
            type="button"
            className={cn(
              'builder-asset-favorite-button',
              isFavorited && 'is-active',
            )}
            aria-label={isFavorited ? `Remove ${asset.label} from favorites` : `Add ${asset.label} to favorites`}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            draggable={false}
            onPointerDown={stopFavoriteEvent}
            onMouseDown={stopFavoriteEvent}
            onClick={(event) => {
              stopFavoriteEvent(event);
              onToggleFavorite();
            }}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <Star size={13} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
