import { Focus, Scan, Trash2 } from 'lucide-react';
import type { BuilderPage as BuilderPageDocument } from '../../schema/project';
import { SurfaceModeToggle, type EditSurfaceMode } from './SurfaceModeToggle';

export function CanvasSurfaceHeader({
  mode,
  selectedPage,
  pageNodeCount,
  kitMasterCount,
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
  pageNodeCount: number;
  kitMasterCount: number;
  kitMasterOptions: Array<{ id: string; label: string }>;
  selectedKitStudioId: string | null;
  onChangeMode: (mode: EditSurfaceMode) => void;
  onSelectKitStudioMaster: (id: string | null) => void;
  onFocusKitStudioMaster: () => void;
  onFitKitStudioBoard: () => void;
  onRemoveSelectedWidget: () => void;
}) {
  return (
    <div className="shrink-0 flex min-h-[52px] items-center border-b border-hr-border bg-hr-panel/95 px-3 py-1.5 backdrop-blur-sm">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-hr-border bg-hr-bg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
            {mode === 'kits' ? 'Master' : 'Editor'}
          </span>
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
              <span className="inline-flex min-h-[26px] items-center rounded-full border border-hr-border bg-hr-bg px-2 text-[10px] text-hr-muted">
                Master board
              </span>
              <span className="inline-flex min-h-[26px] items-center rounded-full border border-hr-border bg-hr-bg px-2 text-[10px] text-hr-muted">
                {kitMasterCount} master{kitMasterCount === 1 ? '' : 's'}
              </span>
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
          ) : selectedPage ? (
            <>
              <span className="inline-flex min-h-[26px] items-center rounded-full border border-hr-border bg-hr-bg px-2 text-[10px] text-hr-muted">
                {selectedPage.board.width} × {selectedPage.board.height}
              </span>
              <span className="inline-flex min-h-[26px] items-center rounded-full border border-hr-border bg-hr-bg px-2 text-[10px] text-hr-muted">
                {pageNodeCount} nodes
              </span>
            </>
          ) : (
            <span className="inline-flex min-h-[26px] items-center rounded-full border border-hr-border bg-hr-bg px-2 text-[10px] text-hr-muted">
              No page selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
