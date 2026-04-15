import { useEffect, useMemo, useState } from 'react';
import { SquarePen, X } from 'lucide-react';
import { setRuntimeNestedCanvasComponent } from './RuntimeRegistry';
import { RuntimeCanvas } from './RuntimeCanvas';
import { RuntimeProvider } from './RuntimeContext';
import type { BuilderPage, BuilderProject } from '../schema/project';
import { fitStageCanvasToShell, WEB_STAGE_SURFACE_LABEL } from '../builder/responsive';
import { WebStageFrame } from '../components/WebStageFrame';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { ProjectThemeScope } from '../theme/ProjectThemeScope';

setRuntimeNestedCanvasComponent(RuntimeCanvas);

type RuntimePageProps = {
  project: BuilderProject;
  page: BuilderPage;
};

function RuntimePageContent({
  page,
  overlayPage,
  onCloseOverlay,
}: {
  page: BuilderPage;
  overlayPage: BuilderPage | null;
  onCloseOverlay: () => void;
}) {
  const { width, height, containerRef } = useContainerWidth();
  const canvasSize = fitStageCanvasToShell(width, height, page.board.width, page.board.height, 64, 64, 0, 0);
  const overlaySize = overlayPage
    ? {
        width: Math.max(320, Math.min(canvasSize.width - 48, overlayPage.board.width * (canvasSize.width / page.board.width))),
        height: Math.max(240, Math.min(canvasSize.height - 48, overlayPage.board.height * (canvasSize.height / page.board.height))),
      }
    : null;

  return (
    <div ref={containerRef} className="runtime-preview-shell h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto px-6 py-6 md:px-8">
        <WebStageFrame
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          surfaceLabel={WEB_STAGE_SURFACE_LABEL}
          modeLabel="Web Preview"
          bodyInsetX={0}
          bodyInsetY={0}
          className="shrink-0"
          bodyClassName="web-stage-preview-body"
        >
          <div
            data-runtime-stage-frame
            data-stage-width={canvasSize.width}
            data-stage-height={canvasSize.height}
            className="web-stage-preview-scope relative min-h-full w-full overflow-hidden"
            style={{ minHeight: `${canvasSize.height}px` }}
          >
            {page.nodes.length === 0 ? (
              <div className="flex min-h-full items-center justify-center p-10 text-center">
                <div>
                  <SquarePen size={40} className="mx-auto mb-4 text-hr-muted/70" />
                  <h2 className="text-lg font-semibold text-hr-text mb-2">Preview is empty</h2>
                  <p className="text-sm text-hr-muted">Go back to edit mode and assemble the page structure first.</p>
                </div>
              </div>
            ) : (
              <RuntimeCanvas nodes={page.nodes} />
            )}
            {overlayPage && overlaySize ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm">
                <div
                  className="relative overflow-hidden border border-hr-border bg-hr-panel shadow-2xl"
                  data-runtime-overlay-page-id={overlayPage.id}
                  style={{
                    width: `${overlaySize.width}px`,
                    height: `${overlaySize.height}px`,
                  }}
                >
                  <button
                    type="button"
                    onClick={onCloseOverlay}
                    className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center border border-hr-border bg-hr-panel/90 text-hr-muted shadow-sm transition-colors hover:border-hr-primary hover:text-hr-primary"
                    aria-label="Close project overlay"
                    title="Close overlay"
                  >
                    <X size={14} />
                  </button>
                  <div className="h-full w-full overflow-y-auto overflow-x-hidden p-5">
                    {overlayPage.nodes.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-hr-muted">
                        Empty overlay
                      </div>
                    ) : (
                      <RuntimeCanvas nodes={overlayPage.nodes} />
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </WebStageFrame>
      </div>
    </div>
  );
}

export function RuntimePage({ project, page }: RuntimePageProps) {
  const initialView = useMemo(() => {
    if (page.kind === 'overlay') {
      const ownerPage = page.ownerPageId
        ? project.pages.find((entry) => entry.id === page.ownerPageId) ?? null
        : null;

      return {
        pageId: ownerPage?.id ?? project.pages.find((entry) => entry.kind === 'page')?.id ?? page.id,
        overlayPageId: page.id,
      };
    }

    return {
      pageId: page.id,
      overlayPageId: null as string | null,
    };
  }, [page.id, page.kind, page.ownerPageId, project.pages]);
  const [activePageId, setActivePageId] = useState(initialView.pageId);
  const [activeOverlayPageId, setActiveOverlayPageId] = useState<string | null>(initialView.overlayPageId);
  const activePage = project.pages.find((entry) => entry.id === activePageId) ?? page;
  const activeOverlayPage = activeOverlayPageId
    ? project.pages.find((entry) => entry.id === activeOverlayPageId && entry.kind === 'overlay') ?? null
    : null;

  useEffect(() => {
    setActivePageId(initialView.pageId);
    setActiveOverlayPageId(initialView.overlayPageId);
  }, [initialView.pageId, initialView.overlayPageId]);

  const handleNavigateProjectPage = (pageId: string) => {
    const targetPage = project.pages.find((entry) => entry.id === pageId);
    if (!targetPage) return;

    if (targetPage.kind === 'overlay') {
      const ownerPageId = targetPage.ownerPageId ?? activePageId;
      if (ownerPageId) {
        setActivePageId(ownerPageId);
      }
      setActiveOverlayPageId(targetPage.id);
      return;
    }

    setActivePageId(targetPage.id);
    setActiveOverlayPageId(null);
  };

  const handleOpenProjectOverlay = (pageId: string) => {
    const targetPage = project.pages.find((entry) => entry.id === pageId);
    if (!targetPage || targetPage.kind !== 'overlay') return;

    if (targetPage.ownerPageId) {
      setActivePageId(targetPage.ownerPageId);
    }
    setActiveOverlayPageId(targetPage.id);
  };

  return (
    <ProjectThemeScope
      themeId={project.settings.themeId}
      projectThemes={project.settings.themeLibrary}
      className="web-stage-preview-root"
    >
      <RuntimeProvider
        project={project}
        onNavigateProjectPage={handleNavigateProjectPage}
        onOpenProjectOverlay={handleOpenProjectOverlay}
      >
        <RuntimePageContent
          page={activePage}
          overlayPage={activeOverlayPage}
          onCloseOverlay={() => setActiveOverlayPageId(null)}
        />
      </RuntimeProvider>
    </ProjectThemeScope>
  );
}
