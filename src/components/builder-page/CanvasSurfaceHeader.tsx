import { Focus, Scan, Trash2 } from 'lucide-react';
import type { BuilderPage as BuilderPageDocument } from '../../schema/project';
import { SurfaceModeToggle, type EditSurfaceMode } from './SurfaceModeToggle';

export function CanvasSurfaceHeader({
  mode,
  selectedPage,
  kitMasterOptions,
  selectedKitStudioId,
  onChangeMode,
  onSelectKitStudioMaster,
  onFocusKitStudioMaster,
  onFitKitStudioBoard,
  onRemoveSelectedWidget,
}: {
  mode: Exclude<EditSurfaceMode, 'pages'>;
  selectedPage: BuilderPageDocument | null;
  kitMasterOptions: Array<{ id: string; label: string }>;
  selectedKitStudioId: string | null;
  onChangeMode: (mode: EditSurfaceMode) => void;
  onSelectKitStudioMaster: (id: string | null) => void;
  onFocusKitStudioMaster: () => void;
  onFitKitStudioBoard: () => void;
  onRemoveSelectedWidget: () => void;
}) {
  return (
    <div className="shrink-0 flex min-h-[42px] items-center border-b border-hr-border bg-hr-panel/95 px-3 py-[5px] backdrop-blur-sm">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-hr-text">
            {mode === 'kits'
              ? 'Kit Studio · Reusable Masters'
              : (selectedPage ? `Shell Canvas · ${selectedPage.name}` : 'Shell Canvas')}
          </h3>
        </div>
        <div className="justify-self-center">
          <SurfaceModeToggle mode={mode} onChange={onChangeMode} />
        </div>
        <div className="flex min-w-0 items-center justify-self-end gap-2">
          {mode === 'kits' ? (
            <>
              <select
                name="kitStudioJumpTarget"
                value={selectedKitStudioId ?? ''}
                onChange={(event) => onSelectKitStudioMaster(event.target.value || null)}
                disabled={kitMasterOptions.length === 0}
                className="page-board-jump-select"
                aria-label="Jump to reusable master"
              >
                {kitMasterOptions.length === 0 ? (
                  <option value="">No masters yet</option>
                ) : null}
                {kitMasterOptions.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onFocusKitStudioMaster}
                disabled={!selectedKitStudioId}
                className="page-board-add-chip page-board-add-chip-icon"
                title="Focus selected master"
                aria-label="Focus selected master"
              >
                <Focus size={14} />
              </button>
              <button
                type="button"
                onClick={onFitKitStudioBoard}
                className="page-board-add-chip page-board-add-chip-icon"
                title="Fit board"
                aria-label="Fit board"
              >
                <Scan size={14} />
              </button>
              <button
                type="button"
                onClick={onRemoveSelectedWidget}
                disabled={!selectedKitStudioId}
                className="page-board-add-chip page-board-add-chip-icon page-board-add-chip-danger"
                title="Delete selected master"
                aria-label="Delete selected master"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
