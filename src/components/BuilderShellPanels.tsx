import { ArrowRightLeft, CornerDownRight, Download, Flag, Package, PencilLine, Plus, Spline, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from 'react';
import type { BuilderPage, BuilderPageLink, ProjectArchetype, TargetPlatform } from '../schema/project';
import type { ProjectIndexRecord, ProjectSnapshotRecord } from '../lib/db';
import { cn } from '../utils/cn';
import type { CurvePointToolMode, RelationPathType, RelationStrokePattern } from './PageBoard';

type SectionProps = {
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

type ReadinessIssue = {
  code: string;
  level: 'error' | 'warning';
  message: string;
};

const inputClassName = 'w-full rounded-md border border-hr-border bg-hr-panel px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary';
const versionTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function Section({ title, description, headerActions, children, className }: SectionProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-hr-border bg-hr-bg/60 p-3 transition-colors', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-hr-text">{title}</h3>
          {description ? <p className="text-[11px] text-hr-muted">{description}</p> : null}
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-1">{headerActions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-hr-text">{label}</span>
      {children}
    </label>
  );
}

const segmentedButtonClassName = (active: boolean) => cn(
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
  active
    ? 'border-hr-primary bg-hr-primary/12 text-hr-primary shadow-sm'
    : 'border-hr-border bg-hr-panel text-hr-muted hover:border-hr-primary hover:text-hr-primary',
);

const relationKindLabels: Record<BuilderPageLink['kind'], string> = {
  'navigate-page': 'Page Flow',
  'open-overlay': 'Open Overlay',
  'switch-overlay': 'Overlay Switch',
  'return-page': 'Return',
};

function RelationCurvePointToolIcon({ mode }: { mode: 'add' | 'remove' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke={mode === 'add' ? 'rgba(79, 124, 255, 0.26)' : 'rgba(239, 68, 68, 0.28)'}
        strokeWidth="1.5"
      />
      <circle
        cx="8"
        cy="8"
        r="4.8"
        fill={mode === 'add' ? '#4f7cff' : '#ef4444'}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="1.4"
      />
      <path
        d={mode === 'add' ? 'M8 5.6v4.8M5.6 8h4.8' : 'M5.6 8h4.8'}
        stroke="rgba(255,255,255,0.96)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const platformLabels: Record<TargetPlatform, string> = {
  'desktop-web': 'Desktop Web',
  'tablet-web': 'Tablet Web',
  'mobile-web': 'Mobile Web',
};

const archetypeLabels: Record<ProjectArchetype, string> = {
  'website-blog': 'Website / Blog',
  'dashboard-workspace': 'Dashboard / Workspace',
};

export function ProjectContractPanel({
  projectId,
  projectName,
  targetPlatform,
  projectArchetype,
  cloudActionsLocked,
  onProjectNameChange,
  onImportJson,
  onExportJson,
  onExportDeliverable,
}: {
  projectId: string;
  projectName: string;
  targetPlatform: TargetPlatform;
  projectArchetype: ProjectArchetype;
  cloudActionsLocked: boolean;
  onProjectNameChange: (value: string) => void;
  onImportJson: () => void;
  onExportJson: () => void;
  onExportDeliverable: () => void;
}) {
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditingProjectName) return;
    projectNameInputRef.current?.focus();
    projectNameInputRef.current?.select();
  }, [isEditingProjectName]);

  return (
    <Section
      title="Project Contract"
      headerActions={(
        <>
          <button
            type="button"
            onClick={onImportJson}
            disabled={cloudActionsLocked}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40"
            title="Import project bundle"
            aria-label="Import project bundle"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary"
            title="Export project bundle"
            aria-label="Export project bundle"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={onExportDeliverable}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary"
            title="Export frontend deliverable"
            aria-label="Export frontend deliverable"
          >
            <Package size={14} />
          </button>
        </>
      )}
    >
      <Field label="Project ID">
        <input
          type="text"
          name="projectId"
          aria-label="Project ID"
          className={cn(inputClassName, 'cursor-default border-hr-border/70 font-mono text-hr-muted focus:border-hr-border/70')}
          value={projectId}
          readOnly
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-hr-text">Project Name</span>
        <div className="flex items-center gap-2">
          <input
            ref={projectNameInputRef}
            type="text"
            name="projectName"
            aria-label="Project name"
            className={cn(
              inputClassName,
              'flex-1 transition-colors',
              !isEditingProjectName && 'cursor-default border-hr-border/70 text-hr-muted focus:border-hr-border/70',
            )}
            value={projectName}
            readOnly={!isEditingProjectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            onBlur={() => setIsEditingProjectName(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                setIsEditingProjectName(false);
                event.currentTarget.blur();
              }
            }}
          />
          <button
            type="button"
            onClick={() => setIsEditingProjectName(true)}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary',
              isEditingProjectName && 'border-hr-primary bg-hr-primary/10 text-hr-primary',
            )}
            title={isEditingProjectName ? 'Editing project name' : 'Edit project name'}
            aria-label={isEditingProjectName ? 'Editing project name' : 'Edit project name'}
          >
            <PencilLine size={15} />
          </button>
        </div>
      </div>

      <Field label="Project Archetype">
        <input
          type="text"
          name="projectArchetype"
          className={cn(inputClassName, 'cursor-default border-hr-border/70 text-hr-muted focus:border-hr-border/70')}
          value={archetypeLabels[projectArchetype]}
          readOnly
        />
      </Field>

      <Field label="Target Platform">
        <input
          type="text"
          name="targetPlatform"
          className={cn(inputClassName, 'cursor-default border-hr-border/70 text-hr-muted focus:border-hr-border/70')}
          value={platformLabels[targetPlatform]}
          readOnly
        />
      </Field>
    </Section>
  );
}

export function ExportReadinessPanel({
  issues,
}: {
  issues: ReadinessIssue[];
}) {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return (
    <Section
      title="Export Guard"
      description="AI handoff and export unlock only after the shell contract passes."
    >
      {issues.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Export requirements are satisfied. AI handoff is ready.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {errors.map((issue) => (
            <div key={issue.code} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {issue.message}
            </div>
          ))}
          {warnings.map((issue) => (
            <div key={issue.code} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function ProjectWorkspacePanel({
  activeProjectId,
  projects,
  cloudActionsLocked,
  highlightCreateProject = false,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
}: {
  activeProjectId: string;
  projects: ProjectIndexRecord[];
  cloudActionsLocked: boolean;
  highlightCreateProject?: boolean;
  onSwitchProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId ?? projects[0]?.id ?? null);
  const [isProjectOverlayOpen, setIsProjectOverlayOpen] = useState(false);
  const projectTriggerRef = useRef<HTMLDivElement | null>(null);
  const projectOverlayRef = useRef<HTMLDivElement | null>(null);
  const projectScrollHostRef = useRef<HTMLDivElement | null>(null);

  const projectItems = useMemo(() => (
    projects.map((project) => ({
      id: project.id,
      label: project.name,
      isCurrent: project.id === activeProjectId,
    }))
  ), [projects, activeProjectId]);

  useEffect(() => {
    setSelectedProjectId(activeProjectId ?? projectItems[0]?.id ?? null);
  }, [activeProjectId, projectItems]);

  const selectedProjectIndex = Math.max(0, projectItems.findIndex((project) => project.id === selectedProjectId));
  const selectedProject = projectItems[selectedProjectIndex] ?? null;
  const projectRowHeight = 24;
  const projectOverlayHeight = projectRowHeight * 3;
  const projectOffset = projectRowHeight - selectedProjectIndex * projectRowHeight;

  const shiftProjectSelectionBy = (direction: 1 | -1) => {
    setSelectedProjectId((current) => {
      const currentIndex = Math.max(0, projectItems.findIndex((project) => project.id === current));
      const nextIndex = Math.min(projectItems.length - 1, Math.max(0, currentIndex + direction));
      return projectItems[nextIndex]?.id ?? current ?? null;
    });
  };

  const stopProjectWheelEvent = (event: WheelEvent | ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if ('nativeEvent' in event) {
      event.nativeEvent.stopImmediatePropagation?.();
      return event.nativeEvent.deltaY;
    }
    event.stopImmediatePropagation?.();
    return event.deltaY;
  };

  const handleProjectWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (cloudActionsLocked) return;
    const deltaY = stopProjectWheelEvent(event);
    if (projectItems.length <= 1 || deltaY === 0) return;
    shiftProjectSelectionBy(deltaY > 0 ? 1 : -1);
  };

  useEffect(() => {
    if (!isProjectOverlayOpen) return;

    projectScrollHostRef.current = projectTriggerRef.current?.closest('.overflow-y-auto') as HTMLDivElement | null;
    const previousOverflowY = projectScrollHostRef.current?.style.overflowY ?? '';
    const previousOverscrollBehavior = projectScrollHostRef.current?.style.overscrollBehavior ?? '';
    if (projectScrollHostRef.current) {
      projectScrollHostRef.current.style.overflowY = 'hidden';
      projectScrollHostRef.current.style.overscrollBehavior = 'none';
    }

    const eventBelongsToProjectWheel = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        projectTriggerRef.current?.contains(target) ||
        projectOverlayRef.current?.contains(target),
      );
    };

    const handleNativeProjectWheel = (event: WheelEvent) => {
      if (cloudActionsLocked) return;
      if (!eventBelongsToProjectWheel(event.target)) return;
      const deltaY = stopProjectWheelEvent(event);
      if (projectItems.length <= 1 || deltaY === 0) return;
      shiftProjectSelectionBy(deltaY > 0 ? 1 : -1);
    };

    const targets = [projectTriggerRef.current, projectOverlayRef.current].filter(Boolean) as HTMLDivElement[];
    targets.forEach((target) => target.addEventListener('wheel', handleNativeProjectWheel, { passive: false, capture: true }));
    projectScrollHostRef.current?.addEventListener('wheel', handleNativeProjectWheel, { passive: false, capture: true });

    return () => {
      targets.forEach((target) => target.removeEventListener('wheel', handleNativeProjectWheel, { capture: true }));
      projectScrollHostRef.current?.removeEventListener('wheel', handleNativeProjectWheel, { capture: true });
      if (projectScrollHostRef.current) {
        projectScrollHostRef.current.style.overflowY = previousOverflowY;
        projectScrollHostRef.current.style.overscrollBehavior = previousOverscrollBehavior;
      }
      projectScrollHostRef.current = null;
    };
  }, [isProjectOverlayOpen, projectItems]);

  return (
    <Section title="Projects">
      <div className="flex items-center gap-1.5">
        <div
          ref={projectTriggerRef}
          className="relative min-w-0 flex-1"
          onMouseEnter={() => {
            if (cloudActionsLocked || projectItems.length <= 1) return;
            setIsProjectOverlayOpen(true);
          }}
          onMouseLeave={() => setIsProjectOverlayOpen(false)}
        >
          {projectItems.length === 0 ? (
            <div className="flex min-h-9 items-center rounded-xl border border-dashed border-hr-primary/40 bg-hr-primary/5 px-3 text-[11px] text-hr-muted">
              Create your first project
            </div>
          ) : (
            <>
              <div className="relative flex h-6 items-center justify-center px-6 text-center">
                <span
                  className={cn(
                    'absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-colors',
                    selectedProject?.isCurrent ? 'bg-hr-primary' : 'bg-hr-border/60',
                  )}
                />
                <span className="min-w-0 truncate text-[11px] font-medium text-hr-text">
                  {selectedProject?.label}
                </span>
              </div>

              {isProjectOverlayOpen ? (
                <div
                  ref={projectOverlayRef}
                  onWheel={handleProjectWheel}
                  onWheelCapture={handleProjectWheel}
                  className="absolute left-1/2 top-1/2 z-20 w-max min-w-full max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/12 bg-hr-panel/46 px-3 py-2.5 shadow-[0_18px_38px_rgba(15,23,42,0.10),0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-[24px] overscroll-contain"
                  style={{ touchAction: 'none' }}
                >
                  <div className="relative overflow-hidden" style={{ height: projectOverlayHeight }}>
                    <div className="pointer-events-none absolute inset-x-2 top-1/2 h-8 -translate-y-1/2 rounded-xl bg-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-hr-panel/70 via-hr-panel/32 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-hr-panel/70 via-hr-panel/32 to-transparent" />
                    <div
                      className="relative transition-transform duration-200 ease-out"
                      style={{ transform: `translateY(${projectOffset}px)` }}
                    >
                      {projectItems.map((project) => {
                        const isSelected = project.id === selectedProjectId;

                        return (
                          <div
                            key={project.id}
                            className={cn(
                              'relative flex h-6 items-center justify-center px-6 text-center tabular-nums transition-all duration-200',
                              isSelected ? 'text-[11px] font-semibold text-hr-text opacity-100' : 'text-[10px] text-hr-muted opacity-45',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-colors',
                                project.isCurrent ? 'bg-hr-primary' : 'bg-hr-border/60',
                              )}
                            />
                            <span className="max-w-full truncate">{project.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => selectedProject && onSwitchProject(selectedProject.id)}
          disabled={cloudActionsLocked || !selectedProject || selectedProject.isCurrent}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40"
          title={
            selectedProject
              ? (selectedProject.isCurrent ? `${selectedProject.label} is already active` : `Switch to ${selectedProject.label}`)
              : 'No project selected'
          }
          aria-label={
            selectedProject
              ? (selectedProject.isCurrent ? `${selectedProject.label} is already active` : `Switch to ${selectedProject.label}`)
              : 'No project selected'
          }
        >
          <ArrowRightLeft size={14} />
        </button>

        <button
          type="button"
          onClick={onCreateProject}
          disabled={cloudActionsLocked}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            highlightCreateProject
              ? 'border-hr-primary bg-hr-primary text-white shadow-[0_0_0_3px_rgba(79,124,255,0.14)] hover:bg-hr-primary/90'
              : 'border-hr-border bg-hr-panel text-hr-muted hover:border-hr-primary hover:text-hr-primary',
          )}
          title="Create a new project"
          aria-label="Create a new project"
        >
          <Plus size={14} />
        </button>

        <button
          type="button"
          onClick={() => selectedProject && onDeleteProject(selectedProject.id)}
          disabled={cloudActionsLocked || !selectedProject}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            !selectedProject
              ? 'No project selected'
              : selectedProject.isCurrent
                ? `Delete ${selectedProject.label}`
                : `Delete ${selectedProject.label}`
          }
          aria-label={
            !selectedProject
              ? 'No project selected'
              : selectedProject.isCurrent
                ? `Delete ${selectedProject.label}`
                : `Delete ${selectedProject.label}`
          }
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Section>
  );
}

export function VersionManagerPanel({
  versions,
  currentVersionId,
  releaseVersionId,
  cloudActionsLocked,
  onSwitchVersion,
  onSetReleaseVersion,
  onDeleteVersion,
}: {
  versions: ProjectSnapshotRecord[];
  currentVersionId: string | null;
  releaseVersionId: string | null;
  cloudActionsLocked: boolean;
  onSwitchVersion: (versionId: string) => void;
  onSetReleaseVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(currentVersionId ?? versions[0]?.id ?? null);
  const [isWheelOverlayOpen, setIsWheelOverlayOpen] = useState(false);
  const wheelTriggerRef = useRef<HTMLDivElement | null>(null);
  const wheelOverlayRef = useRef<HTMLDivElement | null>(null);
  const scrollHostRef = useRef<HTMLDivElement | null>(null);

  const versionItems = useMemo(() => (
    versions.map((version, index) => {
      const versionLabel = `v${version.versionNumber ?? versions.length - index}`;
      return {
        id: version.id,
        versionLabel,
        detailLabel: `${versionLabel} · ${versionTimestampFormatter.format(new Date(version.createdAt))}`,
        isCurrent: version.id === currentVersionId,
        isRelease: version.id === releaseVersionId,
      };
    })
  ), [versions, currentVersionId, releaseVersionId]);

  useEffect(() => {
    setSelectedVersionId(currentVersionId ?? versionItems[0]?.id ?? null);
  }, [currentVersionId, versionItems]);

  const selectedIndex = Math.max(0, versionItems.findIndex((version) => version.id === selectedVersionId));
  const selectedVersion = versionItems[selectedIndex] ?? null;
  const wheelRowHeight = 24;
  const overlayHeight = wheelRowHeight * 3;
  const wheelOffset = wheelRowHeight - selectedIndex * wheelRowHeight;

  const shiftSelectionBy = (direction: 1 | -1) => {
    setSelectedVersionId((current) => {
      const currentIndex = Math.max(0, versionItems.findIndex((version) => version.id === current));
      const nextIndex = Math.min(versionItems.length - 1, Math.max(0, currentIndex + direction));
      return versionItems[nextIndex]?.id ?? current ?? null;
    });
  };

  const stopWheelEvent = (event: WheelEvent | ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if ('nativeEvent' in event) {
      event.nativeEvent.stopImmediatePropagation?.();
      return event.nativeEvent.deltaY;
    }
    event.stopImmediatePropagation?.();
    return event.deltaY;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (cloudActionsLocked) return;
    const deltaY = stopWheelEvent(event);
    if (versionItems.length <= 1 || deltaY === 0) return;
    shiftSelectionBy(deltaY > 0 ? 1 : -1);
  };

  useEffect(() => {
    if (!isWheelOverlayOpen) return;

    scrollHostRef.current = wheelTriggerRef.current?.closest('.overflow-y-auto') as HTMLDivElement | null;
    const previousOverflowY = scrollHostRef.current?.style.overflowY ?? '';
    const previousOverscrollBehavior = scrollHostRef.current?.style.overscrollBehavior ?? '';
    if (scrollHostRef.current) {
      scrollHostRef.current.style.overflowY = 'hidden';
      scrollHostRef.current.style.overscrollBehavior = 'none';
    }

    const eventBelongsToWheel = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        wheelTriggerRef.current?.contains(target) ||
        wheelOverlayRef.current?.contains(target),
      );
    };

    const handleNativeWheel = (event: WheelEvent) => {
      if (cloudActionsLocked) return;
      if (!eventBelongsToWheel(event.target)) return;
      const deltaY = stopWheelEvent(event);
      if (versionItems.length <= 1 || deltaY === 0) return;
      shiftSelectionBy(deltaY > 0 ? 1 : -1);
    };

    const targets = [wheelTriggerRef.current, wheelOverlayRef.current].filter(Boolean) as HTMLDivElement[];
    targets.forEach((target) => target.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true }));
    scrollHostRef.current?.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });

    return () => {
      targets.forEach((target) => target.removeEventListener('wheel', handleNativeWheel, { capture: true }));
      scrollHostRef.current?.removeEventListener('wheel', handleNativeWheel, { capture: true });
      if (scrollHostRef.current) {
        scrollHostRef.current.style.overflowY = previousOverflowY;
        scrollHostRef.current.style.overscrollBehavior = previousOverscrollBehavior;
      }
      scrollHostRef.current = null;
    };
  }, [isWheelOverlayOpen, versionItems]);

  return (
    <Section title="Versions">
      <div className="flex items-center gap-2">
        <div
          ref={wheelTriggerRef}
          className="relative min-w-0 flex-1"
          onMouseEnter={() => {
            if (cloudActionsLocked || versionItems.length <= 1) return;
            setIsWheelOverlayOpen(true);
          }}
          onMouseLeave={() => setIsWheelOverlayOpen(false)}
        >
          {versionItems.length === 0 ? (
            <div className="flex h-6 items-center text-[11px] text-hr-muted">
              No saved versions yet.
            </div>
          ) : (
            <>
              <div className="flex h-6 items-center gap-2 px-1">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                    selectedVersion?.isCurrent ? 'bg-hr-primary' : 'bg-hr-border/60',
                  )}
                />
                <span
                  className="min-w-0 truncate text-[11px] font-medium text-hr-text"
                  title={selectedVersion?.detailLabel}
                >
                  {selectedVersion?.versionLabel}
                </span>
                {selectedVersion?.isRelease ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                    Release
                  </span>
                ) : null}
              </div>

              {isWheelOverlayOpen ? (
                <div
                  ref={wheelOverlayRef}
                  onWheel={handleWheel}
                  onWheelCapture={handleWheel}
                  className="absolute left-[-18px] right-[-8px] top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-white/12 bg-hr-panel/46 px-3 py-2.5 shadow-[0_18px_38px_rgba(15,23,42,0.10),0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-[24px] overscroll-contain"
                  style={{ touchAction: 'none' }}
                >
                  <div className="relative overflow-hidden" style={{ height: overlayHeight }}>
                    <div className="pointer-events-none absolute inset-x-2 top-1/2 h-8 -translate-y-1/2 rounded-xl bg-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-hr-panel/70 via-hr-panel/32 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-hr-panel/70 via-hr-panel/32 to-transparent" />
                    <div
                      className="relative transition-transform duration-200 ease-out"
                      style={{ transform: `translateY(${wheelOffset}px)` }}
                    >
                      {versionItems.map((version) => {
                        const isSelected = version.id === selectedVersionId;

                        return (
                          <div
                            key={version.id}
                            className={cn(
                              'flex h-6 items-center justify-center gap-2 px-2 text-center tabular-nums transition-all duration-200',
                              isSelected ? 'text-[12px] font-semibold text-hr-text opacity-100' : 'text-[10px] text-hr-muted opacity-45',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                                version.isCurrent ? 'bg-hr-primary' : 'bg-hr-border/60',
                              )}
                            />
                            <span className="min-w-0 truncate">{version.detailLabel}</span>
                            {version.isRelease ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                Release
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => selectedVersion && onSwitchVersion(selectedVersion.id)}
          disabled={cloudActionsLocked || !selectedVersion || selectedVersion.isCurrent}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40"
          title={
            selectedVersion
              ? (selectedVersion.isCurrent ? `${selectedVersion.versionLabel} is already active` : `Switch to ${selectedVersion.versionLabel}`)
              : 'No version selected'
          }
          aria-label={
            selectedVersion
              ? (selectedVersion.isCurrent ? `${selectedVersion.versionLabel} is already active` : `Switch to ${selectedVersion.versionLabel}`)
              : 'No version selected'
          }
        >
          <ArrowRightLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => selectedVersion && onSetReleaseVersion(selectedVersion.id)}
          disabled={cloudActionsLocked || !selectedVersion || selectedVersion.isRelease}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            selectedVersion
              ? (selectedVersion.isRelease ? `${selectedVersion.versionLabel} is already the release version` : `Mark ${selectedVersion.versionLabel} as release`)
              : 'No version selected'
          }
          aria-label={
            selectedVersion
              ? (selectedVersion.isRelease ? `${selectedVersion.versionLabel} is already the release version` : `Mark ${selectedVersion.versionLabel} as release`)
              : 'No version selected'
          }
        >
          <Flag size={14} />
        </button>

        <button
          type="button"
          onClick={() => selectedVersion && onDeleteVersion(selectedVersion.id)}
          disabled={cloudActionsLocked || !selectedVersion || selectedVersion.isCurrent}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hr-border bg-hr-panel text-hr-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            selectedVersion
              ? (selectedVersion.isCurrent ? 'Current version cannot be deleted' : `Delete ${selectedVersion.versionLabel}`)
              : 'No version selected'
          }
          aria-label={
            selectedVersion
              ? (selectedVersion.isCurrent ? 'Current version cannot be deleted' : `Delete ${selectedVersion.versionLabel}`)
              : 'No version selected'
          }
        >
          <Trash2 size={14} />
        </button>
      </div>

    </Section>
  );
}

export function PageShellInspectorPanel({
  page,
  onChangeName,
  onChangeRoute,
}: {
  page: BuilderPage;
  onChangeName: (value: string) => void;
  onChangeRoute: (value: string) => void;
}) {
  return (
    <Section
      title={page.kind === 'overlay' ? 'Overlay Shell' : 'Page Shell'}
      description="Edit the topology shell itself. Inner content cannot push the desktop shell wider."
    >
      <Field label="Shell ID">
        <input type="text" name="pageShellId" className={inputClassName} value={page.id} readOnly />
      </Field>

      <Field label="Name">
        <input
          type="text"
          name="pageShellName"
          className={inputClassName}
          value={page.name}
          onChange={(event) => onChangeName(event.target.value)}
        />
      </Field>

      <Field label="Route">
        <input
          type="text"
          name="pageShellRoute"
          className={inputClassName}
          value={page.route}
          onChange={(event) => onChangeRoute(event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Shell Size</div>
          <div className="mt-1 font-semibold text-hr-text">{page.board.width} × {page.board.height}</div>
        </div>
        <div className="rounded-lg border border-hr-border bg-hr-panel px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-hr-muted">Board Position</div>
          <div className="mt-1 font-semibold text-hr-text">{page.board.x}, {page.board.y}</div>
        </div>
      </div>
    </Section>
  );
}

export function RelationInspectorPanel({
  relation,
  sourcePageName,
  targetPageName,
  effectiveLabelText,
  defaultLabelText,
  labelFontSize,
  strokeColor,
  strokeWidth,
  strokePattern,
  pathType,
  curvePointCount,
  curvePointToolMode,
  onChangeLabelText,
  onChangeLabelFontSize,
  onChangeStrokeColor,
  onChangeStrokeWidth,
  onChangeStrokePattern,
  onChangePathType,
  onChangeCurvePointToolMode,
}: {
  relation: BuilderPageLink;
  sourcePageName: string;
  targetPageName: string;
  effectiveLabelText: string;
  defaultLabelText: string;
  labelFontSize: number;
  strokeColor: string;
  strokeWidth: number;
  strokePattern: RelationStrokePattern;
  pathType: RelationPathType;
  curvePointCount: number;
  curvePointToolMode: CurvePointToolMode;
  onChangeLabelText: (value: string) => void;
  onChangeLabelFontSize: (value: number) => void;
  onChangeStrokeColor: (value: string) => void;
  onChangeStrokeWidth: (value: number) => void;
  onChangeStrokePattern: (value: RelationStrokePattern) => void;
  onChangePathType: (value: RelationPathType) => void;
  onChangeCurvePointToolMode: (value: CurvePointToolMode) => void;
}) {
  const colorInputValue = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(strokeColor) ? strokeColor : '#4f7cff';
  const labelLineCount = Math.max(1, effectiveLabelText.split('\n').length);
  const labelTextareaRows = Math.min(8, Math.max(3, labelLineCount));

  return (
    <Section
      title="Relation Contract"
      description="System-generated links stay anchored. You tune presentation and curve point editing here."
    >
      <Field label="Relation ID">
        <input type="text" name="relationId" className={cn(inputClassName, 'font-mono text-xs text-hr-muted')} value={relation.id} readOnly />
      </Field>

      <Field label="Relation Type">
        <input type="text" name="relationKind" className={cn(inputClassName, 'text-hr-muted')} value={relationKindLabels[relation.kind]} readOnly />
      </Field>

      <Field label="Flow">
        <input type="text" name="relationFlow" className={cn(inputClassName, 'text-hr-muted')} value={`${sourcePageName} → ${targetPageName}`} readOnly />
      </Field>

      <Field label="Label Text">
        <textarea
          name="relationLabelText"
          rows={labelTextareaRows}
          wrap="off"
          spellCheck={false}
          className={cn(
            inputClassName,
            'min-h-[84px] resize-y overflow-x-auto whitespace-pre leading-[1.25]',
          )}
          style={{
            fontSize: `${labelFontSize}px`,
          }}
          value={effectiveLabelText}
          placeholder={defaultLabelText}
          onChange={(event) => onChangeLabelText(event.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-hr-text">Label Size</span>
          <span className="text-[11px] text-hr-muted">{labelFontSize.toFixed(0)} px</span>
        </div>
        <input
          type="range"
          min="9"
          max="18"
          step="1"
          value={labelFontSize}
          onChange={(event) => onChangeLabelFontSize(Number(event.target.value))}
          className="accent-hr-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-hr-text">Path Style</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangePathType('elbow')}
            className={segmentedButtonClassName(pathType === 'elbow')}
          >
            <CornerDownRight size={14} />
            Elbow
          </button>
          <button
            type="button"
            onClick={() => onChangePathType('curve')}
            className={segmentedButtonClassName(pathType === 'curve')}
          >
            <Spline size={14} />
            Curve
          </button>
        </div>
      </div>

      {pathType === 'curve' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-hr-text">Curve Points</span>
            <span className="text-[11px] text-hr-muted">{curvePointCount} point{curvePointCount === 1 ? '' : 's'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeCurvePointToolMode(curvePointToolMode === 'insert' ? 'move' : 'insert')}
              className={segmentedButtonClassName(curvePointToolMode === 'insert')}
            >
              <RelationCurvePointToolIcon mode="add" />
              Add Point
            </button>
            <button
              type="button"
              onClick={() => onChangeCurvePointToolMode(curvePointToolMode === 'delete' ? 'move' : 'delete')}
              disabled={curvePointCount === 0}
              className={segmentedButtonClassName(curvePointToolMode === 'delete')}
            >
              <RelationCurvePointToolIcon mode="remove" />
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-hr-text">Stroke Pattern</span>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['solid', 'Solid'],
            ['dashed', 'Dash'],
            ['dotted', 'Dot'],
          ] as const).map(([pattern, label]) => (
            <button
              key={pattern}
              type="button"
              onClick={() => onChangeStrokePattern(pattern)}
              className={segmentedButtonClassName(strokePattern === pattern)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
        <Field label="Stroke">
          <input
            type="color"
            name="relationStrokeColor"
            className="h-10 w-full cursor-pointer rounded-lg border border-hr-border bg-hr-panel p-1"
            value={colorInputValue}
            onChange={(event) => onChangeStrokeColor(event.target.value)}
          />
        </Field>
        <Field label="Hex">
          <input
            type="text"
            name="relationStrokeHex"
            className={inputClassName}
            value={strokeColor}
            onChange={(event) => onChangeStrokeColor(event.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-hr-text">Stroke Width</span>
          <span className="text-[11px] text-hr-muted">{strokeWidth.toFixed(2)} px</span>
        </div>
        <input
          type="range"
          min="1.25"
          max="5"
          step="0.25"
          value={strokeWidth}
          onChange={(event) => onChangeStrokeWidth(Number(event.target.value))}
          className="accent-hr-primary"
        />
      </div>
    </Section>
  );
}
