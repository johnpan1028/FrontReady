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
    <div className="builder-inspector-shell flex w-[336px] shrink-0 flex-col border-l border-hr-border z-10">
      <div className="builder-inspector-toolbar flex items-center border-b border-hr-border">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-hr-text">{title}</h2>
            <span className="builder-inspector-chip">
              {badge}
            </span>
          </div>
          <div className="builder-inspector-segmented inline-flex shrink-0 items-center p-0.5">
            <button
              type="button"
              onClick={onOpenProject}
              className={cn(
                'builder-inspector-quick-mode-button inline-flex items-center gap-1 font-medium transition-colors',
                quickMode === 'project'
                  ? 'bg-hr-text text-white shadow-sm'
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
                'builder-inspector-quick-mode-button inline-flex items-center gap-1 font-medium transition-colors',
                quickMode === 'theme'
                  ? 'bg-hr-text text-white shadow-sm'
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

      <div className="builder-inspector-scroll overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="builder-inspector-scroll-body flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
