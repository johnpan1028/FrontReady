import type { ChangeEvent } from 'react';
import { PROJECT_STARTERS, type ProjectStarterDefinition, type ProjectStarterId } from '../../builder/projectStarters';
import type { ProjectArchetype, TargetPlatform } from '../../schema/project';
import { cn } from '../../utils/cn';
import { PROJECT_ARCHETYPE_OPTIONS, PROJECT_PLATFORM_OPTIONS } from './projectOptions';

export function CreateProjectDialog({
  projectDraftName,
  projectDraftArchetype,
  projectDraftPlatform,
  projectDraftStarterId,
  selectedProjectStarter,
  onClose,
  onSubmit,
  onProjectDraftNameChange,
  onProjectDraftArchetypeChange,
  onProjectDraftPlatformChange,
  onProjectDraftStarterIdChange,
}: {
  projectDraftName: string;
  projectDraftArchetype: ProjectArchetype;
  projectDraftPlatform: TargetPlatform;
  projectDraftStarterId: ProjectStarterId;
  selectedProjectStarter: ProjectStarterDefinition;
  onClose: () => void;
  onSubmit: () => void;
  onProjectDraftNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProjectDraftArchetypeChange: (value: ProjectArchetype) => void;
  onProjectDraftPlatformChange: (value: TargetPlatform) => void;
  onProjectDraftStarterIdChange: (value: ProjectStarterId) => void;
}) {
  const selectedArchetypeLabel = PROJECT_ARCHETYPE_OPTIONS.find((option) => option.id === projectDraftArchetype)?.label;
  const selectedPlatformLabel = PROJECT_PLATFORM_OPTIONS.find((option) => option.id === projectDraftPlatform)?.label;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-hr-border bg-hr-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-hr-border px-5 py-3">
          <div>
            <div className="text-lg font-semibold text-hr-text">Create Project</div>
            <div className="mt-1 text-xs text-hr-muted">Choose boundary and starter.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hr-border px-3 py-1.5 text-sm text-hr-muted hover:text-hr-text"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-hr-border bg-hr-bg/80 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-hr-muted">Boundary</div>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-hr-muted">Project Archetype</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {PROJECT_ARCHETYPE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onProjectDraftArchetypeChange(option.id)}
                        className={cn(
                          'rounded-lg border px-3 py-3 text-left transition-colors',
                          projectDraftArchetype === option.id
                            ? 'border-hr-primary bg-hr-primary/10'
                            : 'border-hr-border bg-hr-bg hover:border-hr-primary',
                        )}
                      >
                        <div className="text-sm font-semibold text-hr-text">{option.label}</div>
                        <div className="mt-1 text-xs text-hr-muted">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-hr-muted">Target Platform</div>
                  <div className="grid grid-cols-1 gap-3">
                    {PROJECT_PLATFORM_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onProjectDraftPlatformChange(option.id)}
                        className={cn(
                          'rounded-lg border px-3 py-3 text-left transition-colors',
                          projectDraftPlatform === option.id
                            ? 'border-hr-primary bg-hr-primary/10'
                            : 'border-hr-border bg-hr-bg hover:border-hr-primary',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-hr-text">{option.label}</div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500">
                            v1
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-hr-muted">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-hr-border bg-hr-bg/80 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-hr-muted">Bootstrap</div>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-hr-muted">Project Name</span>
                  <input
                    type="text"
                    name="createProjectName"
                    className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                    placeholder={selectedProjectStarter.defaultProjectName}
                    value={projectDraftName}
                    onChange={onProjectDraftNameChange}
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-hr-muted">Starter Mode</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {PROJECT_STARTERS.map((starter) => (
                      <button
                        key={starter.id}
                        type="button"
                        onClick={() => onProjectDraftStarterIdChange(starter.id)}
                        className={cn(
                          'rounded-lg border px-3 py-3 text-left transition-colors',
                          projectDraftStarterId === starter.id
                            ? 'border-hr-primary bg-hr-primary/10'
                            : 'border-hr-border bg-hr-bg hover:border-hr-primary',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-hr-text">{starter.name}</div>
                          {starter.badge ? (
                            <span className="rounded-full bg-hr-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-hr-primary">
                              {starter.badge}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-hr-muted">{starter.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-hr-border bg-hr-bg/70 px-3 py-2.5">
              <div className="text-sm font-medium text-hr-text">
                {projectDraftName.trim() || selectedProjectStarter.defaultProjectName}
              </div>
              <div className="mt-1 text-xs text-hr-muted">
                {selectedArchetypeLabel} · {selectedPlatformLabel} · {selectedProjectStarter.name}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hr-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hr-border px-4 py-2 text-sm text-hr-muted hover:text-hr-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-md bg-hr-primary px-4 py-2 text-sm font-medium text-white hover:bg-hr-primary/90"
          >
            {projectDraftStarterId === 'standard-sample' ? 'Create Guided Desktop Project' : 'Create Blank Desktop Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
