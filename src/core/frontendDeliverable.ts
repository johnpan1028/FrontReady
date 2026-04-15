import type { ProjectArchetype, ProjectDocument, TargetPlatform } from '../schema/project';
import type { AiHandoffPackage } from './aiHandoff';
import type { ExportReadinessIssue } from './exportReadiness';

export type FrontendDeliverable = {
  kind: 'frontend-deliverable';
  version: 1;
  generatedAt: string;
  release: {
    projectId: string;
    projectName: string;
    targetPlatform: TargetPlatform;
    archetype: ProjectArchetype;
    homePageId: string | null;
    currentVersionId: string | null;
    releaseVersionId: string | null;
    lastSavedAt: string | null;
  };
  summary: {
    pageCount: number;
    overlayCount: number;
    linkCount: number;
    templateCount: number;
    dataSourceCount: number;
  };
  readiness: {
    warnings: ExportReadinessIssue[];
  };
  document: ProjectDocument;
  aiHandoff: AiHandoffPackage;
};

export const buildFrontendDeliverable = ({
  document,
  aiHandoff,
  readinessIssues,
}: {
  document: ProjectDocument;
  aiHandoff: AiHandoffPackage;
  readinessIssues: ExportReadinessIssue[];
}): FrontendDeliverable => {
  const pages = document.project.pages ?? [];

  return {
    kind: 'frontend-deliverable',
    version: 1,
    generatedAt: new Date().toISOString(),
    release: {
      projectId: document.project.id,
      projectName: document.project.name,
      targetPlatform: document.project.settings.targetPlatform,
      archetype: document.project.settings.archetype,
      homePageId: document.project.settings.homePageId,
      currentVersionId: document.editor.currentVersionId,
      releaseVersionId: document.editor.releaseVersionId,
      lastSavedAt: document.editor.lastSavedAt,
    },
    summary: {
      pageCount: pages.filter((page) => page.kind === 'page').length,
      overlayCount: pages.filter((page) => page.kind === 'overlay').length,
      linkCount: document.project.links.length,
      templateCount: document.project.templates.length,
      dataSourceCount: document.project.dataSources.length,
    },
    readiness: {
      warnings: readinessIssues.filter((issue) => issue.level === 'warning'),
    },
    document,
    aiHandoff,
  };
};

export const stringifyFrontendDeliverable = (payload: FrontendDeliverable) => {
  return JSON.stringify(payload, null, 2);
};
