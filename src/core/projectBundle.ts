import { z } from 'zod';
import { ProjectArchetypeSchema, ProjectDocumentSchema, TargetPlatformSchema } from '../schema/project';

export const PROJECT_BUNDLE_SCHEMA_VERSION = 1 as const;
export const PROJECT_BUNDLE_KIND = 'project-bundle' as const;
export const PROJECT_BUNDLE_PLATFORM = 'frontend-experience-orchestrator' as const;

export const ProjectBundleVersionSchema = z.object({
  snapshotId: z.string().min(1),
  versionNumber: z.number().int().positive(),
  name: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.string().datetime(),
  document: ProjectDocumentSchema,
});

export const ProjectBundleSchema = z.object({
  bundleKind: z.literal(PROJECT_BUNDLE_KIND),
  bundleSchemaVersion: z.literal(PROJECT_BUNDLE_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  source: z.object({
    platform: z.literal(PROJECT_BUNDLE_PLATFORM),
    ownerId: z.string().min(1),
    ownerName: z.string().min(1).optional(),
    workspaceId: z.string().min(1),
  }),
  project: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    targetPlatform: TargetPlatformSchema,
    archetype: ProjectArchetypeSchema.default('dashboard-workspace'),
  }),
  currentVersionId: z.string().min(1).nullable().default(null),
  releaseVersionId: z.string().min(1).nullable().default(null),
  draft: ProjectDocumentSchema,
  versions: z.array(ProjectBundleVersionSchema).default([]),
});

export type ProjectBundleVersion = z.infer<typeof ProjectBundleVersionSchema>;
export type ProjectBundle = z.infer<typeof ProjectBundleSchema>;

export type ProjectBundleImportAnalysis = {
  sameOwner: boolean;
  hasExistingProjectId: boolean;
  requiresOverwriteConfirmation: boolean;
  willForkProject: boolean;
};

export const parseProjectBundleJson = (value: string) => {
  return ProjectBundleSchema.parse(JSON.parse(value));
};

export const stringifyProjectBundle = (bundle: ProjectBundle) => {
  const parsed = ProjectBundleSchema.parse(bundle);
  return JSON.stringify(parsed, null, 2);
};

export const analyzeProjectBundleImport = ({
  bundle,
  currentOwnerId,
  existingProjectIds,
}: {
  bundle: ProjectBundle;
  currentOwnerId: string;
  existingProjectIds: Iterable<string>;
}): ProjectBundleImportAnalysis => {
  const knownProjectIds = new Set(existingProjectIds);
  const sameOwner = bundle.source.ownerId === currentOwnerId;
  const hasExistingProjectId = knownProjectIds.has(bundle.project.id);

  return {
    sameOwner,
    hasExistingProjectId,
    requiresOverwriteConfirmation: sameOwner && hasExistingProjectId,
    willForkProject: !sameOwner,
  };
};
