import type { ReactNode } from 'react';
import { FolderKanban, SwatchBook } from 'lucide-react';
import { cn } from '../../utils/cn';

export function InspectorPanelShell({
  title,
  badge,
  quickMode,
  onOpenProject,
  onOpenTheme,
  children,
}: {
  title: string;
  badge: string;
  quickMode: 'project' | 'theme' | null;
  onOpenProject: () => void;
  onOpenTheme: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-80 bg-hr-panel border-l border-hr-border flex flex-col shrink-0 z-10">
      <div className="flex min-h-[52px] items-center border-b border-hr-border px-3 py-1.5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-semibold text-hr-text">{title}</h2>
            <span className="inline-flex shrink-0 items-center rounded-full border border-hr-border bg-hr-bg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
              {badge}
            </span>
          </div>
          <div className="inline-flex shrink-0 items-center rounded-lg border border-hr-border bg-hr-bg p-0.5">
            <button
              type="button"
              onClick={onOpenProject}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                quickMode === 'project'
                  ? 'bg-hr-primary text-white shadow-sm'
                  : 'text-hr-muted hover:text-hr-text',
              )}
              title="Open project inspector"
            >
              <FolderKanban size={13} />
              Project
            </button>
            <button
              type="button"
              onClick={onOpenTheme}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                quickMode === 'theme'
                  ? 'bg-hr-primary text-white shadow-sm'
                  : 'text-hr-muted hover:text-hr-text',
              )}
              title="Open theme inspector"
            >
              <SwatchBook size={13} />
              Theme
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
