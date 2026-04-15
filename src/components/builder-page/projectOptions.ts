import type { ProjectArchetype, TargetPlatform } from '../../schema/project';

export const PROJECT_PLATFORM_OPTIONS: Array<{
  id: TargetPlatform;
  label: string;
  description: string;
}> = [
  {
    id: 'desktop-web',
    label: 'Desktop Web',
    description: 'Current v1 boundary.',
  },
];

export const PROJECT_ARCHETYPE_OPTIONS: Array<{
  id: ProjectArchetype;
  label: string;
  description: string;
}> = [
  {
    id: 'website-blog',
    label: 'Website / Blog',
    description: 'Editorial sites, portfolios, blogs.',
  },
  {
    id: 'dashboard-workspace',
    label: 'Dashboard / Workspace',
    description: 'Data-heavy products and work surfaces.',
  },
];
