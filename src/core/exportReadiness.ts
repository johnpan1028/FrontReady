import type { ProjectDocument } from '../schema/project';

export type ExportReadinessIssue = {
  code: string;
  level: 'error' | 'warning';
  message: string;
};

export const validateProjectExportReadiness = (document: ProjectDocument): ExportReadinessIssue[] => {
  const issues: ExportReadinessIssue[] = [];
  const pages = document.project.pages ?? [];
  const pageIds = new Set(pages.map((page) => page.id));
  const pageShells = pages.filter((page) => page.kind === 'page');

  if (pageShells.length === 0) {
    issues.push({
      code: 'missing-page-shell',
      level: 'error',
      message: 'At least one page shell is required before the project can export a valid frontend entry.',
    });
  }

  if (!document.project.settings.homePageId || !pageIds.has(document.project.settings.homePageId)) {
    issues.push({
      code: 'missing-home-page',
      level: 'error',
      message: 'The project needs a valid home page before a stable runtime entry can be created.',
    });
  }

  pages.forEach((page) => {
    if (page.kind === 'overlay' && (!page.ownerPageId || !pageIds.has(page.ownerPageId))) {
      issues.push({
        code: `overlay-owner-${page.id}`,
        level: 'error',
        message: `Overlay "${page.name}" is missing a valid owner page.`,
      });
    }
  });

  document.project.links.forEach((link) => {
    if (!pageIds.has(link.sourcePageId) || !pageIds.has(link.targetPageId)) {
      issues.push({
        code: `broken-link-${link.id}`,
        level: 'error',
        message: `Broken relation ${link.id} detected. Fix the source or target page first.`,
      });
    }
  });

  if (pages.length > 0 && pages.every((page) => page.nodes.length === 0)) {
    issues.push({
      code: 'empty-page-content',
      level: 'warning',
      message: 'All page and overlay shells are still empty. Export will only contain structural scaffolding.',
    });
  }

  return issues;
};

export const canExportProject = (issues: ExportReadinessIssue[]) => (
  !issues.some((issue) => issue.level === 'error')
);
