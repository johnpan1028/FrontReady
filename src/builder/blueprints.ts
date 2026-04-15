import type { LegacyLayoutItem, LegacyWidgetData } from '../core/projectDocument';
import type { BuilderDataSource, DataBinding, NodeAction } from '../schema/project';
import type { BuilderThemeId } from '../theme/presets';

export type BuilderBlueprintId = 'launch-page' | 'ops-dashboard' | 'client-intake';

export type BuilderBlueprint = {
  id: BuilderBlueprintId;
  name: string;
  category: string;
  description: string;
  bestFor: string;
  projectName: string;
  themeId: BuilderThemeId;
  runtimeEnv: Record<string, string>;
  dataSources: BuilderDataSource[];
  widgets: Record<string, LegacyWidgetData>;
  layouts: Record<string, LegacyLayoutItem[]>;
};

const binding = (
  id: string,
  sourceKey: string,
  path: string,
  prop: string,
  fallback: unknown,
): DataBinding => ({
  id,
  sourceKey,
  path,
  fallback,
  meta: { prop },
});

const action = (
  id: string,
  type: NodeAction['type'],
  label: string,
  config: Record<string, unknown>,
): NodeAction => ({
  id,
  type,
  label,
  config,
});

const widget = (
  id: string,
  type: LegacyWidgetData['type'],
  props: Record<string, unknown>,
  parentId = 'root',
): LegacyWidgetData => ({
  id,
  type,
  parentId,
  props,
});

const mockSource = (id: string, name: string, payload: unknown): BuilderDataSource => ({
  id,
  name,
  kind: 'mock',
  config: {
    payload,
  },
});

export const BUILDER_BLUEPRINTS: BuilderBlueprint[] = [
  {
    id: 'launch-page',
    name: 'Launch Page',
    category: 'Website',
    description: 'Single-screen product homepage with value proposition, proof metrics, CTAs, and contact entry.',
    bestFor: 'Marketing homepage, campaign page, product intro page',
    projectName: 'Launch Page Starter',
    themeId: 'paper-editorial',
    runtimeEnv: {
      PUBLIC_SITE_URL: 'https://example.com',
    },
    dataSources: [
      mockSource('source_launch', 'Launch Content', {
        hero: {
          kicker: 'No-code frontend orchestration',
          title: 'Turn the idea into a testable frontend first, then let AI wire the backend.',
          summary: 'Arrange pages, bindings, and actions on a modular canvas, then export a stable protocol for AI coding.',
          primaryCta: 'Book a demo',
          secondaryCta: 'View handoff package',
        },
        proof: {
          buildTime: '18 min',
          handoffReady: '92%',
          modules: '24+',
        },
      }),
    ],
    widgets: {
      launch_kicker: widget('launch_kicker', 'text', {
        text: 'No-code frontend orchestration',
        bindings: [binding('launch_kicker.text', 'source_launch', 'hero.kicker', 'text', 'No-code frontend orchestration')],
      }),
      launch_title: widget('launch_title', 'heading', {
        text: 'Turn the idea into a testable frontend first, then let AI wire the backend.',
        size: 'lg',
        bindings: [binding('launch_title.text', 'source_launch', 'hero.title', 'text', 'Turn the idea into a testable frontend first, then let AI wire the backend.')],
      }),
      launch_summary: widget('launch_summary', 'text', {
        text: 'Arrange pages, bindings, and actions on a modular canvas, then export a stable protocol for AI coding.',
        bindings: [binding('launch_summary.text', 'source_launch', 'hero.summary', 'text', 'Arrange pages, bindings, and actions on a modular canvas, then export a stable protocol for AI coding.')],
      }),
      launch_primary_cta: widget('launch_primary_cta', 'button', {
        text: 'Book a demo',
        variant: 'primary',
        bindings: [binding('launch_primary_cta.text', 'source_launch', 'hero.primaryCta', 'text', 'Book a demo')],
        actions: [
          action('launch_primary_cta.modal', 'open-modal', 'Open contact modal', {
            title: 'Demo booking',
            description: 'This can later connect to a form, calendar, or CRM API. The starter currently locks the frontend flow and action contract.',
          }),
        ],
      }),
      launch_secondary_cta: widget('launch_secondary_cta', 'button', {
        text: 'View handoff package',
        variant: 'secondary',
        bindings: [binding('launch_secondary_cta.text', 'source_launch', 'hero.secondaryCta', 'text', 'View handoff package')],
        actions: [
          action('launch_secondary_cta.modal', 'open-modal', 'Explain handoff', {
            title: 'AI Handoff',
            description: 'The AI Handoff panel exports page structure, data sources, bindings, actions, and backend integration tasks.',
          }),
        ],
      }),
      launch_metric_time: widget('launch_metric_time', 'stat', {
        title: 'Prototype time',
        value: '18 min',
        trend: '-64%',
        bindings: [binding('launch_metric_time.value', 'source_launch', 'proof.buildTime', 'value', '18 min')],
      }),
      launch_metric_ready: widget('launch_metric_ready', 'stat', {
        title: 'Handoff ready',
        value: '92%',
        trend: '+31%',
        bindings: [binding('launch_metric_ready.value', 'source_launch', 'proof.handoffReady', 'value', '92%')],
      }),
      launch_metric_modules: widget('launch_metric_modules', 'stat', {
        title: 'Reusable modules',
        value: '24+',
        trend: '+8',
        bindings: [binding('launch_metric_modules.value', 'source_launch', 'proof.modules', 'value', '24+')],
      }),
      launch_note: widget('launch_note', 'text', {
        text: 'Polish order: confirm the first-screen message, CTA, bindings, and action feedback before swapping in real business APIs.',
      }),
    },
    layouts: {
      root: [
        { i: 'launch_kicker', x: 4, y: 2, w: 16, h: 2 },
        { i: 'launch_title', x: 4, y: 4, w: 28, h: 6 },
        { i: 'launch_summary', x: 4, y: 10, w: 24, h: 5 },
        { i: 'launch_primary_cta', x: 4, y: 16, w: 8, h: 3 },
        { i: 'launch_secondary_cta', x: 13, y: 16, w: 9, h: 3 },
        { i: 'launch_metric_time', x: 32, y: 4, w: 10, h: 6 },
        { i: 'launch_metric_ready', x: 32, y: 11, w: 10, h: 6 },
        { i: 'launch_metric_modules', x: 32, y: 18, w: 10, h: 6 },
        { i: 'launch_note', x: 4, y: 23, w: 32, h: 4 },
      ],
    },
  },
  {
    id: 'ops-dashboard',
    name: 'Ops Dashboard',
    category: 'Dashboard',
    description: 'Single-screen operations dashboard with core metrics, chart space, alert summary, and refresh actions.',
    bestFor: 'Operations monitoring, business middle office, data cockpit',
    projectName: 'Ops Dashboard Starter',
    themeId: 'graphite-dashboard',
    runtimeEnv: {
      API_BASE_URL: 'https://api.example.com',
      REFRESH_INTERVAL: 'manual',
    },
    dataSources: [
      mockSource('source_ops', 'Ops Metrics', {
        metrics: {
          revenue: '$128.4K',
          conversion: '7.8%',
          incidents: '3',
          latency: '184ms',
        },
        status: {
          title: 'North America conversion dipped 4.1% in the last hour.',
          action: 'Refresh metrics',
        },
      }),
    ],
    widgets: {
      ops_title: widget('ops_title', 'heading', {
        text: 'Operations Dashboard',
        size: 'lg',
      }),
      ops_subtitle: widget('ops_subtitle', 'text', {
        text: 'Use this to tune dashboard density, metric bindings, refresh actions, and AI backend integration notes.',
      }),
      ops_revenue: widget('ops_revenue', 'stat', {
        title: 'Revenue',
        value: '$128.4K',
        trend: '+12.6%',
        bindings: [binding('ops_revenue.value', 'source_ops', 'metrics.revenue', 'value', '$128.4K')],
      }),
      ops_conversion: widget('ops_conversion', 'stat', {
        title: 'Conversion',
        value: '7.8%',
        trend: '+2.1%',
        bindings: [binding('ops_conversion.value', 'source_ops', 'metrics.conversion', 'value', '7.8%')],
      }),
      ops_incidents: widget('ops_incidents', 'stat', {
        title: 'Open incidents',
        value: '3',
        trend: '-1',
        bindings: [binding('ops_incidents.value', 'source_ops', 'metrics.incidents', 'value', '3')],
      }),
      ops_latency: widget('ops_latency', 'stat', {
        title: 'P95 latency',
        value: '184ms',
        trend: '-22ms',
        bindings: [binding('ops_latency.value', 'source_ops', 'metrics.latency', 'value', '184ms')],
      }),
      ops_chart: widget('ops_chart', 'chart', {}),
      ops_alert: widget('ops_alert', 'text', {
        text: 'North America conversion dipped 4.1% in the last hour.',
        bindings: [binding('ops_alert.text', 'source_ops', 'status.title', 'text', 'North America conversion dipped 4.1% in the last hour.')],
      }),
      ops_refresh: widget('ops_refresh', 'button', {
        text: 'Refresh metrics',
        variant: 'primary',
        bindings: [binding('ops_refresh.text', 'source_ops', 'status.action', 'text', 'Refresh metrics')],
        actions: [
          action('ops_refresh.source', 'refresh', 'Refresh ops metrics', {
            sourceKeys: ['source_ops'],
          }),
          action('ops_refresh.toast', 'open-modal', 'Explain refresh', {
            title: 'Refresh action triggered',
            description: 'The starter currently uses a mock data source. In production, this button can refresh source_ops or call an API and write runtime state.',
          }),
        ],
      }),
    },
    layouts: {
      root: [
        { i: 'ops_title', x: 3, y: 2, w: 20, h: 4 },
        { i: 'ops_subtitle', x: 3, y: 6, w: 27, h: 4 },
        { i: 'ops_revenue', x: 3, y: 11, w: 10, h: 6 },
        { i: 'ops_conversion', x: 14, y: 11, w: 10, h: 6 },
        { i: 'ops_incidents', x: 25, y: 11, w: 10, h: 6 },
        { i: 'ops_latency', x: 36, y: 11, w: 9, h: 6 },
        { i: 'ops_chart', x: 3, y: 18, w: 30, h: 14 },
        { i: 'ops_alert', x: 34, y: 18, w: 11, h: 8 },
        { i: 'ops_refresh', x: 34, y: 27, w: 10, h: 3 },
      ],
    },
  },
  {
    id: 'client-intake',
    name: 'Client Intake',
    category: 'Portal',
    description: 'Client intake page with form fields, state keys, submit action, and integration guidance.',
    bestFor: 'Lead capture, booking forms, internal approval entry',
    projectName: 'Client Intake Starter',
    themeId: 'warm-neutral',
    runtimeEnv: {
      SUBMIT_ENDPOINT: 'https://api.example.com/intake',
    },
    dataSources: [
      mockSource('source_intake', 'Intake Copy', {
        page: {
          title: 'New client intake',
          summary: 'Collect the required information first, then let AI coding connect CRM, email, or approval flows.',
          cta: 'Submit intake',
        },
      }),
    ],
    widgets: {
      intake_title: widget('intake_title', 'heading', {
        text: 'New client intake',
        size: 'lg',
        bindings: [binding('intake_title.text', 'source_intake', 'page.title', 'text', 'New client intake')],
      }),
      intake_summary: widget('intake_summary', 'text', {
        text: 'Collect the required information first, then let AI coding connect CRM, email, or approval flows.',
        bindings: [binding('intake_summary.text', 'source_intake', 'page.summary', 'text', 'Collect the required information first, then let AI coding connect CRM, email, or approval flows.')],
      }),
      intake_name: widget('intake_name', 'text_input', {
        label: 'Client name',
        placeholder: 'Acme Inc.',
        stateKey: 'form.clientName',
      }),
      intake_email: widget('intake_email', 'text_input', {
        label: 'Contact email',
        placeholder: 'hello@example.com',
        stateKey: 'form.email',
      }),
      intake_budget: widget('intake_budget', 'select', {
        label: 'Budget range',
        placeholder: 'Choose range',
        stateKey: 'form.budget',
        options: [
          { label: 'Under $10K', value: 'under-10k' },
          { label: '$10K - $50K', value: '10k-50k' },
          { label: '$50K+', value: '50k-plus' },
        ],
      }),
      intake_needs: widget('intake_needs', 'textarea', {
        label: 'Project needs',
        placeholder: 'Describe the page, dashboard, or workflow to build...',
        stateKey: 'form.needs',
      }),
      intake_submit: widget('intake_submit', 'button', {
        text: 'Submit intake',
        variant: 'primary',
        bindings: [binding('intake_submit.text', 'source_intake', 'page.cta', 'text', 'Submit intake')],
        actions: [
          action('intake_submit.preview', 'open-modal', 'Show submission plan', {
            title: 'Submit action contract is ready',
            description: 'The starter currently writes runtime state and opens a modal. Replace it with POST {{env.SUBMIT_ENDPOINT}} when wiring the backend.',
          }),
        ],
      }),
      intake_note: widget('intake_note', 'text', {
        text: 'Polish order: verify field coverage, state naming, and whether AI can wire CRM or API calls cleanly after submit.',
      }),
    },
    layouts: {
      root: [
        { i: 'intake_title', x: 5, y: 3, w: 20, h: 4 },
        { i: 'intake_summary', x: 5, y: 7, w: 24, h: 4 },
        { i: 'intake_name', x: 5, y: 13, w: 14, h: 4 },
        { i: 'intake_email', x: 20, y: 13, w: 14, h: 4 },
        { i: 'intake_budget', x: 5, y: 18, w: 14, h: 4 },
        { i: 'intake_needs', x: 5, y: 23, w: 29, h: 8 },
        { i: 'intake_submit', x: 5, y: 32, w: 10, h: 3 },
        { i: 'intake_note', x: 36, y: 13, w: 9, h: 12 },
      ],
    },
  },
];

export const getBuilderBlueprint = (blueprintId: string) => (
  BUILDER_BLUEPRINTS.find((blueprint) => blueprint.id === blueprintId) ?? null
);
