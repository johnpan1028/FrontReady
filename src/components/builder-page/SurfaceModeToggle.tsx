import { Layers3, Monitor, Package } from 'lucide-react';
import { cn } from '../../utils/cn';

export type EditSurfaceMode = 'pages' | 'canvas' | 'kits';

export function SurfaceModeToggle({
  mode,
  onChange,
}: {
  mode: EditSurfaceMode;
  onChange: (mode: EditSurfaceMode) => void;
}) {
  return (
    <div className="page-board-tool-toggle">
      <button
        type="button"
        onClick={() => onChange('pages')}
        className={cn('page-board-tool-btn page-board-tool-btn-icon', mode === 'pages' && 'page-board-tool-btn-active')}
        title="Pages board"
        aria-label="Pages board"
      >
        <Layers3 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange('canvas')}
        className={cn('page-board-tool-btn page-board-tool-btn-icon', mode === 'canvas' && 'page-board-tool-btn-active')}
        title="Edit canvas"
        aria-label="Edit canvas"
      >
        <Monitor size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange('kits')}
        className={cn('page-board-tool-btn page-board-tool-btn-icon', mode === 'kits' && 'page-board-tool-btn-active')}
        title="Kit studio"
        aria-label="Kit studio"
      >
        <Package size={14} />
      </button>
    </div>
  );
}
