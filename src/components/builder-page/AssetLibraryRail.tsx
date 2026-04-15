import type { BuilderAssetEntry, BuilderAssetSection } from '../../builder/assetLibrary';
import type { DragEvent as ReactDragEvent } from 'react';
import { Package } from 'lucide-react';
import { AssetRailItem } from './AssetRailItem';

export function AssetLibraryRail({
  sections,
  canCreateOverlay,
  canApplyProjectBlueprint,
  onAssetDragStart,
}: {
  sections: BuilderAssetSection[];
  canCreateOverlay: boolean;
  canApplyProjectBlueprint: boolean;
  onAssetDragStart: (asset: BuilderAssetEntry, event: ReactDragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="w-72 bg-hr-panel border-r border-hr-border flex flex-col shrink-0 z-10">
      <div className="flex min-h-[52px] items-center border-b border-hr-border px-3 py-1.5">
        <h2 className="font-semibold text-hr-text flex items-center gap-2">
          <Package size={18} />
          Asset Library
        </h2>
      </div>
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="pt-1">
            <h3 className="mb-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-hr-muted">{section.title}</h3>
            <div className="flex flex-col gap-1.5">
              {section.assets.map((asset) => {
                const disabled = (
                  (asset.kind === 'shell' && asset.shellKind === 'overlay' && !canCreateOverlay)
                  || (asset.kind === 'starter' && !canApplyProjectBlueprint)
                );

                return (
                  <AssetRailItem
                    key={asset.id}
                    asset={asset}
                    disabled={disabled}
                    onDragStart={(event) => onAssetDragStart(asset, event)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
