import type { BuilderAssetEntry, BuilderAssetSection } from '../../builder/assetLibrary';
import type { DragEvent as ReactDragEvent } from 'react';
import { Package, Star } from 'lucide-react';
import { AssetRailItem } from './AssetRailItem';
import { InspectorSection } from './InspectorPrimitives';

const ASSET_CATEGORY_LABELS: Partial<Record<BuilderAssetEntry['category'], string>> = {
  primitive: 'P0 Primitives',
  shell: 'Core Shells',
  composer: 'P2 Composers',
  foundation: 'Foundation',
  content: 'Content',
  media: 'Media',
  form: 'Form',
  setting: 'Settings',
  selection: 'Selection',
  state: 'State',
  data: 'Data',
  editorial: 'Editorial',
  layout: 'Layout',
  starter: 'Starters',
  topology: 'Topology',
  'published-kit': 'Published',
};

const ASSET_SECTION_CATEGORY_ORDER: Partial<Record<BuilderAssetSection['id'], BuilderAssetEntry['category'][]>> = {
  card: ['foundation', 'content', 'form', 'data', 'editorial'],
  control: ['primitive', 'shell', 'composer'],
  custom: ['published-kit'],
  layout: ['layout', 'editorial', 'content'],
  shell: ['topology', 'layout'],
  blueprint: ['starter'],
  kit: ['editorial', 'content', 'form', 'data', 'foundation'],
};

const getCategoryGroups = (section: BuilderAssetSection) => {
  const order = ASSET_SECTION_CATEGORY_ORDER[section.id] ?? [];
  const visibleCategories = Array.from(new Set(section.assets.map((asset) => asset.category)));

  const sortedCategories = visibleCategories.sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });

  return sortedCategories.map((category) => ({
    id: category,
    title: ASSET_CATEGORY_LABELS[category] ?? category,
    assets: section.assets.filter((asset) => asset.category === category),
  }));
};

export function AssetLibraryRail({
  sections,
  canCreateOverlay,
  canApplyProjectBlueprint,
  favoriteControlAssetIdSet,
  showFavoriteControlsOnly,
  onAssetDragStart,
  onToggleFavoriteControlAsset,
  onToggleFavoriteControlsOnly,
}: {
  sections: BuilderAssetSection[];
  canCreateOverlay: boolean;
  canApplyProjectBlueprint: boolean;
  favoriteControlAssetIdSet: ReadonlySet<string>;
  showFavoriteControlsOnly: boolean;
  onAssetDragStart: (asset: BuilderAssetEntry, event: ReactDragEvent<HTMLDivElement>) => void;
  onToggleFavoriteControlAsset: (assetId: string) => void;
  onToggleFavoriteControlsOnly: () => void;
}) {
  return (
    <div className="builder-inspector-shell builder-asset-library-shell flex w-[336px] shrink-0 flex-col border-r border-hr-border z-10">
      <div className="builder-inspector-toolbar builder-asset-library-toolbar flex items-center border-b border-hr-border">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-hr-text">
          <Package size={18} />
          Asset Library
        </h2>
      </div>
      <div className="builder-inspector-scroll builder-asset-library-scroll overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="builder-inspector-scroll-body builder-asset-library-scroll-body flex flex-col">
        {sections.map((section) => (
          <section key={section.id} className="builder-inspector-group builder-asset-group">
            <div className="builder-inspector-group-header">
              <span className="builder-inspector-group-marker" aria-hidden="true" />
              <span className="builder-inspector-group-title">{section.title}</span>
              <span className="builder-inspector-group-rule" aria-hidden="true" />
              {section.id === 'control' ? (
                <button
                  type="button"
                  className={`builder-inspector-group-action${showFavoriteControlsOnly ? ' is-active' : ''}`}
                  aria-label={showFavoriteControlsOnly ? 'Show all controls' : 'Show favorite controls only'}
                  title={showFavoriteControlsOnly ? 'Show all controls' : 'Show favorite controls only'}
                  onClick={onToggleFavoriteControlsOnly}
                >
                  <Star
                    size={13}
                    fill={showFavoriteControlsOnly ? 'currentColor' : 'none'}
                  />
                </button>
              ) : null}
            </div>
            <div className="builder-inspector-group-body">
              {getCategoryGroups(section).length > 0 ? (
                getCategoryGroups(section).map((categoryGroup) => (
                  <InspectorSection
                    key={`${section.id}-${categoryGroup.id}`}
                    title={categoryGroup.title}
                    badge={String(categoryGroup.assets.length)}
                    collapsible
                    defaultOpen
                    bodyClassName="builder-asset-section-body"
                  >
                    {categoryGroup.assets.map((asset) => {
                      const disabled = (
                        (asset.kind === 'shell' && asset.shellKind === 'overlay' && !canCreateOverlay)
                        || (asset.kind === 'starter' && !canApplyProjectBlueprint)
                      );

                      return (
                        <AssetRailItem
                          key={asset.id}
                          asset={asset}
                          disabled={disabled}
                          isFavorited={section.id === 'control' && favoriteControlAssetIdSet.has(asset.id)}
                          onDragStart={(event) => onAssetDragStart(asset, event)}
                          onToggleFavorite={section.id === 'control'
                            ? () => onToggleFavoriteControlAsset(asset.id)
                            : undefined}
                        />
                      );
                    })}
                  </InspectorSection>
                ))
              ) : section.id === 'control' && showFavoriteControlsOnly ? (
                <div className="builder-inspector-empty">No favorite controls yet.</div>
              ) : null}
            </div>
          </section>
        ))}
        </div>
      </div>
    </div>
  );
}
