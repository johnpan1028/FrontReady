import {
  AlignLeft,
  BarChart2,
  Bot,
  CheckSquare,
  ChevronDown,
  Circle,
  Columns3,
  Heading,
  LayoutPanelTop,
  Mail,
  Monitor,
  MousePointerClick,
  Newspaper,
  PanelTop,
  PenLine,
  Rows3,
  Settings2,
  Slash,
  Square,
  TextCursor,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { LegacyTemplateRecord } from '../core/projectDocument';
import type { ProjectStarterId } from './projectStarters';
import { cloneDefaultWidgetProps, type WidgetType } from './widgetConfig';

export type BuilderAssetLayer = 'shell' | 'blueprint' | 'layout' | 'kit' | 'card' | 'control';
export type BuilderAssetSurface = 'pages' | 'canvas' | 'kits';
export type BuilderAssetSource = 'native' | 'shadcn' | 'react-day-picker' | 'recharts';
export type BuilderAssetCategory =
  | 'topology'
  | 'starter'
  | 'layout'
  | 'editorial'
  | 'data'
  | 'content'
  | 'form'
  | 'foundation'
  | 'published-kit';

export type BuilderAssetEntry = {
  id: string;
  layer: BuilderAssetLayer;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  source: BuilderAssetSource;
  category: BuilderAssetCategory;
  surfaces: BuilderAssetSurface[];
} & (
  | {
      kind: 'shell';
      shellKind: 'page' | 'overlay';
    }
  | {
      kind: 'template';
      templateId: string;
      templateSource: 'built-in' | 'custom';
    }
  | {
      kind: 'starter';
      starterId: ProjectStarterId;
    }
  | {
      kind: 'widget';
      widgetType: WidgetType;
      w: number;
      h: number;
    }
);

export type BuiltInAssetTemplateId =
  | 'card_shell_base'
  | 'card_kpi_stat'
  | 'card_trend_chart'
  | 'card_calendar'
  | 'layout_blog_home_stack'
  | 'layout_blog_article_with_sidebar'
  | 'kit_blog_editorial_hero'
  | 'kit_blog_featured_feed_split'
  | 'kit_blog_sidebar_stack'
  | 'kit_blog_article_header'
  | 'kit_blog_related_posts'
  | 'kit_blog_footer_signup'
  | 'card_feature_story'
  | 'card_article_list'
  | 'card_shadcn_login'
  | 'card_author_bio'
  | 'card_ai_mount';

export type BuiltInAssetTemplate = LegacyTemplateRecord & {
  id: BuiltInAssetTemplateId;
  layer: Extract<BuilderAssetLayer, 'layout' | 'kit' | 'card'>;
  description: string;
  source: BuilderAssetSource;
  category: BuilderAssetCategory;
};

export type BuilderAssetSection = {
  id: BuilderAssetLayer | 'custom';
  title: string;
  description: string;
  assets: BuilderAssetEntry[];
};

const node = (
  id: string,
  type: WidgetType,
  layout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number },
  props: Record<string, unknown> = {},
  children: unknown[] = [],
  meta: Record<string, unknown> = {},
  extras: Record<string, unknown> = {},
) => ({
  id,
  type,
  layout,
  props: {
    ...cloneDefaultWidgetProps(type),
    ...props,
  },
  children,
  meta,
  ...extras,
});

export const BUILT_IN_ASSET_TEMPLATES: BuiltInAssetTemplate[] = [
  {
    id: 'card_shell_base',
    layer: 'card',
    source: 'native',
    category: 'foundation',
    name: 'Card Shell',
    description: 'Clean base card shell for building reusable content contracts from scratch.',
    data: node(
      'tpl_card_shell_base',
      'panel',
      { x: 2, y: 2, w: 18, h: 12, minW: 4, minH: 2 },
      {
        title: 'Header',
        showHeader: false,
        contractRole: 'card.shell',
        contractKey: 'card.shell.base',
        aiHandover: 'Use this as the empty card boundary. Add content elements inside it, then define the AI handoff on the finished card instance.',
      },
      [],
    ),
  },
  {
    id: 'card_kpi_stat',
    layer: 'card',
    source: 'native',
    category: 'data',
    name: 'KPI Stat Card',
    description: 'Single metric card for dashboards, summaries, and quick status checks.',
    data: node(
      'tpl_card_kpi_stat',
      'stat',
      { x: 2, y: 2, w: 12, h: 9, minW: 10, minH: 7 },
      {
        title: 'Conversion rate',
        value: '18.4%',
        trend: '+2.1%',
        kitTemplateName: 'KPI Stat Card',
        aiHandover: 'Bind this KPI card to one metric source. Required fields: title, value, trend, and refresh policy.',
      },
    ),
  },
  {
    id: 'card_trend_chart',
    layer: 'card',
    source: 'recharts',
    category: 'data',
    name: 'Trend Chart Card',
    description: 'Compact trend card for weekly or monthly movement.',
    data: node(
      'tpl_card_trend_chart',
      'chart',
      { x: 2, y: 2, w: 24, h: 14, minW: 18, minH: 12 },
      {
        title: 'Sessions',
        value: '38.2k',
        trend: '+12.4%',
        variant: 'area',
        kitTemplateName: 'Trend Chart Card',
        data: [
          { label: 'Mon', value: 18 },
          { label: 'Tue', value: 24 },
          { label: 'Wed', value: 21 },
          { label: 'Thu', value: 29 },
          { label: 'Fri', value: 34 },
          { label: 'Sat', value: 31 },
          { label: 'Sun', value: 38 },
        ],
        aiHandover: 'Connect this trend card to one time-series query. Required output: x label, numeric value, comparison range, and empty state.',
      },
    ),
  },
  {
    id: 'card_calendar',
    layer: 'card',
    source: 'react-day-picker',
    category: 'content',
    name: 'Calendar Card',
    description: 'Calendar surface for archive views, schedules, and date-driven workflows.',
    data: node(
      'tpl_card_calendar',
      'calendar',
      { x: 2, y: 2, w: 18, h: 16, minW: 14, minH: 14 },
      {
        title: 'Editorial calendar',
        subtitle: 'Date navigation for archives and schedules',
        month: '2026-04-01',
        selectedDate: '2026-04-14',
        kitTemplateName: 'Calendar Card',
        aiHandover: 'Use this card for archive dates, scheduling, or event navigation. Bind selected date, highlighted dates, and downstream actions.',
      },
    ),
  },
  {
    id: 'layout_blog_home_stack',
    layer: 'layout',
    source: 'native',
    category: 'layout',
    name: 'Blog Home Stack',
    description: 'Desktop blog homepage skeleton with hero, article feed, and right-side conversion rail.',
    data: node(
      'tpl_blog_home_stack',
      'canvas',
      { x: 2, y: 2, w: 44, h: 34, minW: 30, minH: 24 },
      {
        layoutMode: 'grid',
        title: 'Blog Home Skeleton',
        aiHandover: 'Use this skeleton as the blog homepage contract: hero area, article feed, and sidebar conversion rail.',
      },
      [
        node(
          'tpl_blog_home_hero_zone',
          'panel',
          { x: 0, y: 0, w: 29, h: 13, minW: 18, minH: 9 },
          {
            title: 'Hero / Featured Story',
            showHeader: true,
            aiHandover: 'Replace this with the main editorial hero. Connect title, deck, category, and CTA to CMS or markdown content.',
          },
          [
            node('tpl_blog_home_hero_kicker', 'text', { x: 1, y: 1, w: 10, h: 2 }, { text: 'EDITORIAL BLUEPRINT' }),
            node('tpl_blog_home_hero_title', 'heading', { x: 1, y: 3, w: 22, h: 5 }, { text: 'A calm homepage for essays, notes, and product thinking.', size: 'lg' }),
            node('tpl_blog_home_hero_deck', 'text', { x: 1, y: 8, w: 22, h: 4 }, { text: 'Use the card contract to define what AI coding should connect later: CMS source, markdown files, author profile, and newsletter provider.' }),
          ],
        ),
        node(
          'tpl_blog_home_feed_zone',
          'canvas',
          { x: 0, y: 14, w: 29, h: 18, minW: 18, minH: 12 },
          {
            layoutMode: 'grid',
            title: 'Article Feed Zone',
            aiHandover: 'Drop article-list cards here. Each card should map to a post collection or filtered feed.',
          },
          [
            node('tpl_blog_home_feed_hint', 'text', { x: 1, y: 1, w: 24, h: 4 }, { text: 'Drop Article List, Featured Story, or custom post cards here.' }),
          ],
        ),
        node(
          'tpl_blog_home_sidebar_zone',
          'canvas',
          { x: 30, y: 0, w: 13, h: 32, minW: 10, minH: 18 },
          {
            layoutMode: 'grid',
            title: 'Sidebar Rail',
            responsivePolicy: 'collapse-below-1100',
            aiHandover: 'This rail is secondary. If desktop width is tight, collapse it below the main feed.',
          },
          [
            node('tpl_blog_home_sidebar_hint', 'text', { x: 1, y: 1, w: 10, h: 4 }, { text: 'Drop Newsletter or Author cards here.' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'layout_blog_article_with_sidebar',
    layer: 'layout',
    source: 'native',
    category: 'layout',
    name: 'Article + Sidebar',
    description: 'Article detail skeleton with main reading column and a secondary rail.',
    data: node(
      'tpl_blog_article_with_sidebar',
      'canvas',
      { x: 2, y: 2, w: 44, h: 36, minW: 30, minH: 28 },
      {
        layoutMode: 'grid',
        title: 'Article Detail Skeleton',
        aiHandover: 'Use this for a post detail page. Main column maps to markdown/MDX content; sidebar maps to author and related posts.',
      },
      [
        node(
          'tpl_blog_article_main_column',
          'canvas',
          { x: 0, y: 0, w: 30, h: 34, minW: 22, minH: 24 },
          { layoutMode: 'grid', title: 'Reading Column' },
          [
            node('tpl_blog_article_title', 'heading', { x: 1, y: 1, w: 24, h: 5 }, { text: 'Article title goes here', size: 'lg' }),
            node('tpl_blog_article_body', 'text', { x: 1, y: 7, w: 25, h: 20 }, { text: 'Long-form article body placeholder. AI coding should replace this with markdown/MDX rendering or CMS content.' }),
          ],
        ),
        node(
          'tpl_blog_article_side_column',
          'canvas',
          { x: 31, y: 0, w: 12, h: 34, minW: 10, minH: 18 },
          { layoutMode: 'grid', title: 'Article Rail', responsivePolicy: 'stack-below-1100' },
          [
            node('tpl_blog_article_side_hint', 'text', { x: 1, y: 1, w: 9, h: 5 }, { text: 'Drop Author Bio, Newsletter, or Related Posts cards here.' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'card_feature_story',
    layer: 'card',
    source: 'native',
    category: 'content',
    name: 'Featured Story Card',
    description: 'Core editorial card with category, title, summary, and primary action.',
    data: node(
      'tpl_card_feature_story',
      'panel',
      { x: 2, y: 2, w: 22, h: 13, minW: 14, minH: 10 },
      {
        title: 'Featured Story',
        showHeader: true,
        aiHandover: 'Connect this card to one featured post: category, title, excerpt, slug, and CTA route.',
      },
      [
        node('tpl_feature_story_kicker', 'text', { x: 1, y: 1, w: 8, h: 2 }, { text: 'FEATURED' }),
        node('tpl_feature_story_title', 'heading', { x: 1, y: 3, w: 17, h: 4 }, { text: 'The post title that should anchor the page.', size: 'md' }),
        node('tpl_feature_story_summary', 'text', { x: 1, y: 7, w: 17, h: 4 }, { text: 'A short excerpt explains why this post matters and what readers will learn.' }),
        node('tpl_feature_story_cta', 'button', { x: 1, y: 11, w: 7, h: 3 }, { text: 'Read post', variant: 'secondary' }),
      ],
    ),
  },
  {
    id: 'card_article_list',
    layer: 'card',
    source: 'native',
    category: 'content',
    name: 'Article List Card',
    description: 'A repeatable feed card for latest posts, featured posts, or filtered collections.',
    data: node(
      'tpl_card_article_list',
      'panel',
      { x: 2, y: 2, w: 22, h: 16, minW: 16, minH: 12 },
      {
        title: 'Article List',
        showHeader: true,
        aiHandover: 'Replace these rows with a mapped post collection. Preserve row IDs so AI can wire title, date, excerpt, and route.',
      },
      [
        node('tpl_article_list_title', 'heading', { x: 1, y: 1, w: 16, h: 3 }, { text: 'Latest writing', size: 'sm' }),
        node('tpl_article_list_item_1', 'text', { x: 1, y: 4, w: 18, h: 3 }, { text: '01 · How to design with AI handoff in mind' }),
        node('tpl_article_list_item_2', 'text', { x: 1, y: 7, w: 18, h: 3 }, { text: '02 · Building a front-end contract before backend code' }),
        node('tpl_article_list_item_3', 'text', { x: 1, y: 10, w: 18, h: 3 }, { text: '03 · Notes on responsive editorial systems' }),
        node('tpl_article_list_cta', 'button', { x: 1, y: 13, w: 8, h: 3 }, { text: 'View archive', variant: 'ghost' }),
      ],
    ),
  },
  {
    id: 'card_shadcn_login',
    layer: 'card',
    source: 'shadcn',
    category: 'form',
    name: 'Shadcn Login Card',
    description: 'Official shadcn/ui Card login example decomposed into editable shell + controls.',
    data: node(
      'tpl_card_shadcn_login',
      'panel',
      { x: 2, y: 2, w: 18, h: 21, minW: 16, minH: 19 },
      {
        title: '',
        showHeader: false,
        layoutMode: 'grid',
        chrome: 'shadcn-card',
        sourceName: 'shadcn/ui Card login example',
        sourceUrl: 'https://ui.shadcn.com/docs/components/card',
        contractRole: 'card.auth.login',
        contractKey: 'shadcn.card.login.v1',
        stateKeys: ['auth.email', 'auth.password'],
        validation: {
          email: 'z.string().email()',
          password: 'z.string().min(1)',
        },
        aiHandover: 'This card is sourced from the official shadcn/ui Card login example. Preserve the card instance ID, implement auth.email/auth.password with Zod validation, route submit through the adapter layer, and keep the shadcn Card composition in the exported React component.',
      },
      [
        node(
          'tpl_shadcn_login_title',
          'heading',
          { x: 2, y: 2, w: 14, h: 2, minW: 10, minH: 2 },
          {
            text: 'Login to your account',
            size: 'xl',
            weight: 'semibold',
            contractRole: 'card.header.title',
            contractKey: 'shadcn.card.login.title',
          },
        ),
        node(
          'tpl_shadcn_login_description',
          'text',
          { x: 2, y: 4, w: 14, h: 2, minW: 10, minH: 2 },
          {
            text: 'Enter your email below to login to your account',
            size: 'sm',
            tone: 'muted',
            contractRole: 'card.header.description',
            contractKey: 'shadcn.card.login.description',
          },
        ),
        node(
          'tpl_shadcn_login_email',
          'text_input',
          { x: 2, y: 7, w: 14, h: 3, minW: 10, minH: 3 },
          {
            label: 'Email',
            placeholder: 'm@example.com',
            type: 'email',
            chrome: 'field',
            labelSize: 'sm',
            stateKey: 'auth.email',
            contractRole: 'form.input.email',
            contractKey: 'shadcn.card.login.email',
          },
        ),
        node(
          'tpl_shadcn_login_password',
          'text_input',
          { x: 2, y: 10, w: 14, h: 3, minW: 10, minH: 3 },
          {
            label: 'Password',
            labelAside: 'Forgot your password?',
            type: 'password',
            chrome: 'field',
            defaultValue: 'password',
            labelSize: 'sm',
            stateKey: 'auth.password',
            contractRole: 'form.input.password',
            contractKey: 'shadcn.card.login.password',
          },
        ),
        node(
          'tpl_shadcn_login_submit',
          'button',
          { x: 2, y: 14, w: 14, h: 2, minW: 10, minH: 2 },
          {
            text: 'Login',
            variant: 'primary',
            contractRole: 'form.action.submit',
            contractKey: 'shadcn.card.login.submit',
          },
          [],
          {},
          {
            actions: [
              {
                id: 'action_submit_shadcn_login',
                type: 'request',
                label: 'Submit login',
                config: {
                  method: 'POST',
                  url: '/api/auth/login',
                  body: {
                    email: '{{state.auth.email}}',
                    password: '{{state.auth.password}}',
                  },
                  pick: 'data',
                  timeoutMs: 15000,
                },
              },
            ],
          },
        ),
        node(
          'tpl_shadcn_login_google',
          'button',
          { x: 2, y: 16, w: 14, h: 2, minW: 10, minH: 2 },
          {
            text: 'Login with Google',
            variant: 'outline',
            contractRole: 'form.action.oauth',
            contractKey: 'shadcn.card.login.google',
          },
        ),
        node(
          'tpl_shadcn_login_signup',
          'text',
          { x: 2, y: 19, w: 14, h: 2, minW: 10, minH: 2 },
          {
            text: "Don't have an account? Sign Up",
            size: 'sm',
            tone: 'muted',
            align: 'center',
            emphasisText: 'Sign Up',
            emphasisWeight: 'medium',
            contractRole: 'form.action.alternate',
            contractKey: 'shadcn.card.login.signup',
          },
        ),
      ],
      {},
    ),
  },
  {
    id: 'card_author_bio',
    layer: 'card',
    source: 'native',
    category: 'content',
    name: 'Author Bio Card',
    description: 'Author identity, short bio, and profile link.',
    data: node(
      'tpl_card_author_bio',
      'panel',
      { x: 2, y: 2, w: 16, h: 11, minW: 12, minH: 9 },
      {
        title: 'Author Bio',
        showHeader: true,
        aiHandover: 'Connect this to the author profile source: name, role, bio, avatar, social/profile route.',
      },
      [
        node('tpl_author_name', 'heading', { x: 1, y: 1, w: 11, h: 3 }, { text: 'Author Name', size: 'sm' }),
        node('tpl_author_bio', 'text', { x: 1, y: 4, w: 11, h: 4 }, { text: 'A short bio explains credibility, topics, and why readers should follow along.' }),
        node('tpl_author_cta', 'button', { x: 1, y: 9, w: 8, h: 3 }, { text: 'About author', variant: 'ghost' }),
      ],
    ),
  },
  {
    id: 'card_ai_mount',
    layer: 'card',
    source: 'native',
    category: 'foundation',
    name: 'AI Mount Card',
    description: 'Empty business surface for content users cannot install themselves.',
    data: node(
      'tpl_card_ai_mount',
      'panel',
      { x: 2, y: 2, w: 22, h: 13, minW: 14, minH: 10 },
      {
        title: 'AI Mount',
        showHeader: true,
        aiHandover: 'Describe the external module AI coding should install here, e.g. TradingView chart, comment system, media player, or CMS-rendered block.',
      },
      [
        node('tpl_ai_mount_title', 'heading', { x: 1, y: 1, w: 16, h: 3 }, { text: 'External module mount', size: 'sm' }),
        node('tpl_ai_mount_note', 'text', { x: 1, y: 4, w: 17, h: 7 }, { text: 'AI Handover: replace this card content with the required integration. Keep this card ID as the target anchor.' }),
      ],
    ),
  },
  {
    id: 'kit_blog_editorial_hero',
    layer: 'kit',
    source: 'native',
    category: 'editorial',
    name: 'Editorial Hero',
    description: 'Hero section with narrative copy, dual actions, and proof stats.',
    data: node(
      'tpl_kit_blog_editorial_hero',
      'canvas',
      { x: 2, y: 2, w: 34, h: 18, minW: 24, minH: 14 },
      {
        layoutMode: 'grid',
        title: 'Editorial Hero Kit',
        aiHandover: 'Use this section for a blog or personal site hero. Map headline, subcopy, CTA routes, and proof stats to CMS or project settings.',
      },
      [
        node('tpl_kit_hero_kicker', 'text', { x: 0, y: 0, w: 10, h: 2 }, { text: 'EDITORIAL SYSTEM' }),
        node('tpl_kit_hero_title', 'heading', { x: 0, y: 2, w: 20, h: 5 }, { text: 'Design the frontend contract first, then let AI wire the backend.', size: 'lg' }),
        node('tpl_kit_hero_summary', 'text', { x: 0, y: 7, w: 20, h: 4 }, { text: 'This hero kit establishes the opening promise, supporting copy, and the two most important user actions.' }),
        node('tpl_kit_hero_primary', 'button', { x: 0, y: 12, w: 7, h: 3 }, { text: 'Read essays', variant: 'primary' }),
        node('tpl_kit_hero_secondary', 'button', { x: 8, y: 12, w: 9, h: 3 }, { text: 'View archive', variant: 'ghost' }),
        node(
          'tpl_kit_hero_proof_panel',
          'panel',
          { x: 22, y: 0, w: 12, h: 16, minW: 10, minH: 12 },
          {
            title: 'Proof Stack',
            showHeader: true,
            aiHandover: 'Replace these with real proof metrics, audience numbers, or product trust statements.',
          },
          [
            node('tpl_kit_hero_proof_stat_1', 'stat', { x: 1, y: 1, w: 10, h: 4 }, { title: 'Essays', value: '48', trend: '+6' }),
            node('tpl_kit_hero_proof_stat_2', 'stat', { x: 1, y: 5, w: 10, h: 4 }, { title: 'Subscribers', value: '3.2k', trend: '+14%' }),
            node('tpl_kit_hero_proof_stat_3', 'stat', { x: 1, y: 9, w: 10, h: 4 }, { title: 'Draft time', value: '18m', trend: '-62%' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'kit_blog_featured_feed_split',
    layer: 'kit',
    source: 'native',
    category: 'editorial',
    name: 'Featured + Feed Split',
    description: 'Two-column content module with a featured story and a compact latest feed.',
    data: node(
      'tpl_kit_blog_featured_feed_split',
      'canvas',
      { x: 2, y: 2, w: 38, h: 20, minW: 28, minH: 16 },
      {
        layoutMode: 'grid',
        title: 'Featured + Feed Split',
        aiHandover: 'Use this kit for the homepage mid-section. The left side takes one highlighted story; the right side takes a list or collection query.',
      },
      [
        node(
          'tpl_kit_split_featured',
          'panel',
          { x: 0, y: 0, w: 18, h: 18, minW: 14, minH: 12 },
          {
            title: 'Featured Story',
            showHeader: true,
            aiHandover: 'Bind this card to the current featured article or editorial pick.',
          },
          [
            node('tpl_kit_split_featured_kicker', 'text', { x: 1, y: 1, w: 7, h: 2 }, { text: 'FEATURED' }),
            node('tpl_kit_split_featured_title', 'heading', { x: 1, y: 3, w: 14, h: 4 }, { text: 'A focused story card with room for a strong editorial headline.', size: 'md' }),
            node('tpl_kit_split_featured_copy', 'text', { x: 1, y: 7, w: 14, h: 5 }, { text: 'Keep the copy short and directional. This block is meant to move the user into one highlighted article.' }),
            node('tpl_kit_split_featured_cta', 'button', { x: 1, y: 13, w: 8, h: 3 }, { text: 'Read feature', variant: 'secondary' }),
          ],
        ),
        node(
          'tpl_kit_split_feed',
          'panel',
          { x: 19, y: 0, w: 19, h: 18, minW: 14, minH: 12 },
          {
            title: 'Latest Feed',
            showHeader: true,
            aiHandover: 'Replace the rows with the latest article collection. Keep row IDs stable so AI can wire title, date, and destination.',
          },
          [
            node('tpl_kit_split_feed_heading', 'heading', { x: 1, y: 1, w: 12, h: 3 }, { text: 'Latest writing', size: 'sm' }),
            node('tpl_kit_split_feed_row_1', 'text', { x: 1, y: 4, w: 15, h: 3 }, { text: '01 · Building with reusable frontend contracts' }),
            node('tpl_kit_split_feed_row_2', 'text', { x: 1, y: 7, w: 15, h: 3 }, { text: '02 · Why page topology matters for AI handoff' }),
            node('tpl_kit_split_feed_row_3', 'text', { x: 1, y: 10, w: 15, h: 3 }, { text: '03 · Designing kits before blueprints' }),
            node('tpl_kit_split_feed_cta', 'button', { x: 1, y: 14, w: 9, h: 3 }, { text: 'Browse archive', variant: 'ghost' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'kit_blog_sidebar_stack',
    layer: 'kit',
    source: 'native',
    category: 'editorial',
    name: 'Sidebar Stack',
    description: 'Stacked newsletter and author modules for the blog side rail.',
    data: node(
      'tpl_kit_blog_sidebar_stack',
      'canvas',
      { x: 2, y: 2, w: 16, h: 25, minW: 12, minH: 18 },
      {
        layoutMode: 'grid',
        title: 'Sidebar Stack',
        aiHandover: 'Use this in the sidebar rail. It combines newsletter conversion with author identity in one reusable section.',
      },
      [
        node(
          'tpl_kit_sidebar_newsletter',
          'panel',
          { x: 0, y: 0, w: 16, h: 13, minW: 12, minH: 10 },
          {
            title: 'Newsletter',
            showHeader: true,
            aiHandover: 'Wire the email capture action and success state to the newsletter provider.',
          },
          [
            node('tpl_kit_sidebar_newsletter_title', 'heading', { x: 1, y: 1, w: 12, h: 3 }, { text: 'Get the next essay', size: 'sm' }),
            node('tpl_kit_sidebar_newsletter_copy', 'text', { x: 1, y: 4, w: 12, h: 3 }, { text: 'One useful note whenever a new piece ships.' }),
            node('tpl_kit_sidebar_newsletter_input', 'text_input', { x: 1, y: 8, w: 12, h: 4 }, { label: 'Email', placeholder: 'you@example.com', stateKey: 'newsletter.email' }),
            node('tpl_kit_sidebar_newsletter_button', 'button', { x: 1, y: 12, w: 7, h: 3 }, { text: 'Subscribe', variant: 'primary' }),
          ],
        ),
        node(
          'tpl_kit_sidebar_author',
          'panel',
          { x: 0, y: 14, w: 16, h: 10, minW: 12, minH: 8 },
          {
            title: 'Author',
            showHeader: true,
            aiHandover: 'Bind this block to the site author profile and About route.',
          },
          [
            node('tpl_kit_sidebar_author_name', 'heading', { x: 1, y: 1, w: 11, h: 3 }, { text: 'Author Name', size: 'sm' }),
            node('tpl_kit_sidebar_author_bio', 'text', { x: 1, y: 4, w: 12, h: 3 }, { text: 'A short note about perspective, topics, and writing focus.' }),
            node('tpl_kit_sidebar_author_cta', 'button', { x: 1, y: 7, w: 8, h: 3 }, { text: 'About author', variant: 'ghost' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'kit_blog_article_header',
    layer: 'kit',
    source: 'native',
    category: 'editorial',
    name: 'Article Header',
    description: 'Article intro block with kicker, title, summary, and meta row.',
    data: node(
      'tpl_kit_blog_article_header',
      'canvas',
      { x: 2, y: 2, w: 30, h: 15, minW: 22, minH: 12 },
      {
        layoutMode: 'grid',
        title: 'Article Header Kit',
        aiHandover: 'Use this at the top of article pages. AI should map category, title, excerpt, publish date, and author metadata.',
      },
      [
        node('tpl_kit_article_header_kicker', 'text', { x: 0, y: 0, w: 8, h: 2 }, { text: 'ARTICLE' }),
        node('tpl_kit_article_header_title', 'heading', { x: 0, y: 2, w: 24, h: 5 }, { text: 'This is where the article title becomes the page anchor.', size: 'lg' }),
        node('tpl_kit_article_header_summary', 'text', { x: 0, y: 7, w: 24, h: 4 }, { text: 'Use the summary as the handoff target for excerpt or dek content. It should describe why the article matters before the body begins.' }),
        node('tpl_kit_article_header_meta', 'text', { x: 0, y: 11, w: 18, h: 2 }, { text: 'Author Name · April 2026 · 8 min read' }),
        node('tpl_kit_article_header_divider', 'divider', { x: 0, y: 13, w: 24, h: 1 }, { direction: 'horizontal' }),
      ],
    ),
  },
  {
    id: 'kit_blog_related_posts',
    layer: 'kit',
    source: 'native',
    category: 'editorial',
    name: 'Related Posts Grid',
    description: 'Three-up related posts block for article endings and archive sections.',
    data: node(
      'tpl_kit_blog_related_posts',
      'canvas',
      { x: 2, y: 2, w: 36, h: 17, minW: 26, minH: 14 },
      {
        layoutMode: 'grid',
        title: 'Related Posts Grid',
        aiHandover: 'Use this module to render related posts or hand-curated recommendations. Keep three article teaser cards in sync with CMS routes.',
      },
      [
        node('tpl_kit_related_heading', 'heading', { x: 0, y: 0, w: 18, h: 3 }, { text: 'Related posts', size: 'sm' }),
        node('tpl_kit_related_copy', 'text', { x: 0, y: 3, w: 22, h: 2 }, { text: 'Three recommendation tiles help the user keep exploring.' }),
        node(
          'tpl_kit_related_card_1',
          'panel',
          { x: 0, y: 6, w: 11, h: 9, minW: 8, minH: 7 },
          { title: 'Related 01', showHeader: true },
          [
            node('tpl_kit_related_card_1_title', 'heading', { x: 1, y: 1, w: 8, h: 3 }, { text: 'First follow-up idea', size: 'sm' }),
            node('tpl_kit_related_card_1_copy', 'text', { x: 1, y: 4, w: 8, h: 2 }, { text: 'A short teaser for the next article.' }),
            node('tpl_kit_related_card_1_cta', 'button', { x: 1, y: 6, w: 5, h: 2 }, { text: 'Open', variant: 'ghost' }),
          ],
        ),
        node(
          'tpl_kit_related_card_2',
          'panel',
          { x: 12, y: 6, w: 11, h: 9, minW: 8, minH: 7 },
          { title: 'Related 02', showHeader: true },
          [
            node('tpl_kit_related_card_2_title', 'heading', { x: 1, y: 1, w: 8, h: 3 }, { text: 'Second follow-up idea', size: 'sm' }),
            node('tpl_kit_related_card_2_copy', 'text', { x: 1, y: 4, w: 8, h: 2 }, { text: 'Another related route for the reader.' }),
            node('tpl_kit_related_card_2_cta', 'button', { x: 1, y: 6, w: 5, h: 2 }, { text: 'Open', variant: 'ghost' }),
          ],
        ),
        node(
          'tpl_kit_related_card_3',
          'panel',
          { x: 24, y: 6, w: 11, h: 9, minW: 8, minH: 7 },
          { title: 'Related 03', showHeader: true },
          [
            node('tpl_kit_related_card_3_title', 'heading', { x: 1, y: 1, w: 8, h: 3 }, { text: 'Third follow-up idea', size: 'sm' }),
            node('tpl_kit_related_card_3_copy', 'text', { x: 1, y: 4, w: 8, h: 2 }, { text: 'A final teaser for the recommendation set.' }),
            node('tpl_kit_related_card_3_cta', 'button', { x: 1, y: 6, w: 5, h: 2 }, { text: 'Open', variant: 'ghost' }),
          ],
        ),
      ],
    ),
  },
  {
    id: 'kit_blog_footer_signup',
    layer: 'kit',
    source: 'shadcn',
    category: 'editorial',
    name: 'Footer Signup',
    description: 'Footer CTA with navigation cues and newsletter capture.',
    data: node(
      'tpl_kit_blog_footer_signup',
      'canvas',
      { x: 2, y: 2, w: 36, h: 12, minW: 26, minH: 10 },
      {
        layoutMode: 'grid',
        title: 'Footer Signup Kit',
        aiHandover: 'Use this at the bottom of the blog. Connect newsletter submission, footer links, and copyright/project metadata.',
      },
      [
        node('tpl_kit_footer_title', 'heading', { x: 0, y: 1, w: 14, h: 3 }, { text: 'Stay in the loop', size: 'md' }),
        node('tpl_kit_footer_copy', 'text', { x: 0, y: 4, w: 14, h: 3 }, { text: 'A compact footer CTA closes the page with one clear subscription action.' }),
        node('tpl_kit_footer_links', 'text', { x: 0, y: 8, w: 16, h: 2 }, { text: 'Archive · About · Uses · Contact' }),
        node(
          'tpl_kit_footer_signup_panel',
          'panel',
          { x: 19, y: 0, w: 17, h: 11, minW: 12, minH: 8 },
          {
            title: 'Subscribe',
            showHeader: true,
            aiHandover: 'Attach the form state and submit action to the chosen newsletter provider.',
          },
          [
            node('tpl_kit_footer_signup_input', 'text_input', { x: 1, y: 2, w: 13, h: 4 }, { label: 'Email', placeholder: 'you@example.com', stateKey: 'footer.newsletter.email' }),
            node('tpl_kit_footer_signup_button', 'button', { x: 1, y: 7, w: 7, h: 3 }, { text: 'Join', variant: 'primary' }),
          ],
        ),
      ],
    ),
  },
];

export const getBuiltInAssetTemplate = (templateId: string | null | undefined) => (
  BUILT_IN_ASSET_TEMPLATES.find((template) => template.id === templateId) ?? null
);

export const BUILDER_ASSET_SECTIONS: BuilderAssetSection[] = [
  {
    id: 'shell',
    title: 'Shells',
    description: 'Project topology shells.',
    assets: [
      {
        id: 'page-shell',
        kind: 'shell',
        layer: 'shell',
        shellKind: 'page',
        label: 'Page Shell',
        description: 'Main route-level page boundary.',
        icon: Monitor,
        source: 'native',
        category: 'topology',
        surfaces: ['pages'],
      },
      {
        id: 'overlay-shell',
        kind: 'shell',
        layer: 'shell',
        shellKind: 'overlay',
        label: 'Overlay Shell',
        description: 'Owner-page popup or modal boundary.',
        icon: PanelTop,
        source: 'native',
        category: 'topology',
        surfaces: ['pages'],
      },
    ],
  },
  {
    id: 'layout',
    title: 'Layouts',
    description: 'Responsive skeleton zones.',
    assets: [
      {
        id: 'asset-layout-blog-home-stack',
        kind: 'template',
        layer: 'layout',
        templateId: 'layout_blog_home_stack',
        templateSource: 'built-in',
        label: 'Blog Home Stack',
        description: 'Hero, feed, and sidebar rail.',
        icon: Columns3,
        badge: 'Blog',
        source: 'native',
        category: 'layout',
        surfaces: ['canvas'],
      },
      {
        id: 'asset-layout-blog-article-sidebar',
        kind: 'template',
        layer: 'layout',
        templateId: 'layout_blog_article_with_sidebar',
        templateSource: 'built-in',
        label: 'Article + Sidebar',
        description: 'Reading column with secondary rail.',
        icon: Rows3,
        badge: 'Blog',
        source: 'native',
        category: 'layout',
        surfaces: ['canvas'],
      },
    ],
  },
  {
    id: 'blueprint',
    title: 'Blueprints',
    description: 'Whole project topology starters.',
    assets: [
      {
        id: 'asset-blueprint-standard-sample',
        kind: 'starter',
        layer: 'blueprint',
        starterId: 'standard-sample',
        label: 'Guided Starter',
        description: '2 pages, 1 overlay, seeded relations, and a governed desktop starter flow.',
        icon: LayoutPanelTop,
        badge: 'Starter',
        source: 'native',
        category: 'starter',
        surfaces: ['pages'],
      },
    ],
  },
  {
    id: 'kit',
    title: 'Kits',
    description: 'Reusable section-level modules.',
    assets: [
      {
        id: 'asset-kit-blog-editorial-hero',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_editorial_hero',
        templateSource: 'built-in',
        label: 'Editorial Hero',
        description: 'Hero copy, CTA pair, and proof stats.',
        icon: Newspaper,
        badge: 'Blog',
        source: 'native',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-kit-blog-featured-feed-split',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_featured_feed_split',
        templateSource: 'built-in',
        label: 'Featured + Feed Split',
        description: 'Highlight story plus compact latest feed.',
        icon: Columns3,
        badge: 'Blog',
        source: 'native',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-kit-blog-sidebar-stack',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_sidebar_stack',
        templateSource: 'built-in',
        label: 'Sidebar Stack',
        description: 'Newsletter and author modules in one rail.',
        icon: Rows3,
        badge: 'Blog',
        source: 'native',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-kit-blog-article-header',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_article_header',
        templateSource: 'built-in',
        label: 'Article Header',
        description: 'Kicker, title, summary, and meta row.',
        icon: LayoutPanelTop,
        badge: 'Blog',
        source: 'native',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-kit-blog-related-posts',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_related_posts',
        templateSource: 'built-in',
        label: 'Related Posts Grid',
        description: 'Three-up recommendation section.',
        icon: Columns3,
        badge: 'Blog',
        source: 'native',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-kit-blog-footer-signup',
        kind: 'template',
        layer: 'kit',
        templateId: 'kit_blog_footer_signup',
        templateSource: 'built-in',
        label: 'Footer Signup',
        description: 'Footer CTA with compact newsletter capture.',
        icon: Mail,
        badge: 'Blog',
        source: 'shadcn',
        category: 'editorial',
        surfaces: ['canvas', 'kits'],
      },
    ],
  },
  {
    id: 'card',
    title: 'Cards',
    description: 'Start from a clean shell, then use a few community-backed card mothers.',
    assets: [
      {
        id: 'asset-card-shell-base',
        kind: 'template',
        layer: 'card',
        templateId: 'card_shell_base',
        templateSource: 'built-in',
        label: 'Card Shell',
        description: 'Empty reusable card boundary.',
        icon: PenLine,
        source: 'native',
        category: 'foundation',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-card-kpi-stat',
        kind: 'template',
        layer: 'card',
        templateId: 'card_kpi_stat',
        templateSource: 'built-in',
        label: 'KPI Stat',
        description: 'Single-metric card for summaries and dashboards.',
        icon: Square,
        badge: 'v1',
        source: 'native',
        category: 'data',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-card-trend-chart',
        kind: 'template',
        layer: 'card',
        templateId: 'card_trend_chart',
        templateSource: 'built-in',
        label: 'Trend Chart',
        description: 'Weekly or monthly trend card backed by a chart primitive.',
        icon: BarChart2,
        badge: 'v1',
        source: 'recharts',
        category: 'data',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-card-calendar',
        kind: 'template',
        layer: 'card',
        templateId: 'card_calendar',
        templateSource: 'built-in',
        label: 'Calendar',
        description: 'Calendar card for schedules, archives, and date navigation.',
        icon: LayoutPanelTop,
        badge: 'v1',
        source: 'react-day-picker',
        category: 'content',
        surfaces: ['canvas', 'kits'],
      },
      {
        id: 'asset-card-shadcn-login',
        kind: 'template',
        layer: 'card',
        templateId: 'card_shadcn_login',
        templateSource: 'built-in',
        label: 'Shadcn Login',
        description: 'Official shadcn/ui login card decomposed into editable card shell and controls.',
        icon: Mail,
        badge: 'v1',
        source: 'shadcn',
        category: 'form',
        surfaces: ['canvas', 'kits'],
      },
    ],
  },
  {
    id: 'control',
    title: 'Controls',
    description: 'Atoms that live inside cards.',
    assets: [
      { id: 'asset-control-heading', kind: 'widget', layer: 'control', widgetType: 'heading', label: 'Heading', description: 'Section or card title.', icon: Heading, w: 16, h: 3, source: 'native', category: 'content', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-text', kind: 'widget', layer: 'control', widgetType: 'text', label: 'Paragraph', description: 'Text block or handoff note.', icon: Type, w: 16, h: 5, source: 'native', category: 'content', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-stat', kind: 'widget', layer: 'control', widgetType: 'stat', label: 'Stat', description: 'Metric display atom.', icon: Square, w: 12, h: 6, source: 'native', category: 'data', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-chart', kind: 'widget', layer: 'control', widgetType: 'chart', label: 'Chart Mount', description: 'Chart placeholder surface.', icon: BarChart2, w: 24, h: 12, source: 'recharts', category: 'data', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-button', kind: 'widget', layer: 'control', widgetType: 'button', label: 'Button', description: 'Action trigger.', icon: MousePointerClick, w: 8, h: 3, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-icon-button', kind: 'widget', layer: 'control', widgetType: 'icon_button', label: 'Icon Button', description: 'Compact icon action.', icon: Settings2, w: 4, h: 3, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-divider', kind: 'widget', layer: 'control', widgetType: 'divider', label: 'Divider', description: 'Visual separator.', icon: Slash, w: 12, h: 2, source: 'shadcn', category: 'foundation', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-text-input', kind: 'widget', layer: 'control', widgetType: 'text_input', label: 'Text Input', description: 'Single-line input.', icon: TextCursor, w: 12, h: 4, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-number-input', kind: 'widget', layer: 'control', widgetType: 'number_input', label: 'Number Input', description: 'Numeric input.', icon: Circle, w: 12, h: 4, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-textarea', kind: 'widget', layer: 'control', widgetType: 'textarea', label: 'Textarea', description: 'Multi-line input.', icon: AlignLeft, w: 16, h: 6, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-select', kind: 'widget', layer: 'control', widgetType: 'select', label: 'Select', description: 'Dropdown input.', icon: ChevronDown, w: 12, h: 4, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-checkbox', kind: 'widget', layer: 'control', widgetType: 'checkbox', label: 'Checkbox Group', description: 'Multi-choice input.', icon: CheckSquare, w: 12, h: 6, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-radio', kind: 'widget', layer: 'control', widgetType: 'radio', label: 'Radio Group', description: 'Single-choice input.', icon: Circle, w: 12, h: 6, source: 'shadcn', category: 'form', surfaces: ['canvas', 'kits'] },
      { id: 'asset-control-panel', kind: 'widget', layer: 'control', widgetType: 'panel', label: 'Blank Card Shell', description: 'Empty card shell container.', icon: PenLine, w: 16, h: 10, source: 'native', category: 'foundation', surfaces: ['canvas', 'kits'] },
    ],
  },
];

export const BUILDER_ASSET_WIDGET_MAP = Object.fromEntries(
  BUILDER_ASSET_SECTIONS
    .flatMap((section) => section.assets)
    .filter((asset): asset is Extract<BuilderAssetEntry, { kind: 'widget' }> => asset.kind === 'widget')
    .map((asset) => [asset.widgetType, asset]),
) as Record<WidgetType, Extract<BuilderAssetEntry, { kind: 'widget' }>>;

const SURFACE_SECTION_ORDER: Record<BuilderAssetSurface, BuilderAssetSection['id'][]> = {
  pages: ['shell', 'blueprint'],
  canvas: ['card', 'control'],
  kits: ['card', 'control'],
};

const MINIMAL_SYSTEM_ASSET_IDS_BY_SURFACE: Partial<Record<BuilderAssetSurface, Set<string>>> = {
  canvas: new Set([
    'asset-card-shell-base',
    'asset-card-shadcn-login',
    'asset-control-heading',
    'asset-control-text',
    'asset-control-text-input',
    'asset-control-button',
  ]),
  kits: new Set([
    'asset-card-shell-base',
    'asset-card-shadcn-login',
    'asset-control-heading',
    'asset-control-text',
    'asset-control-text-input',
    'asset-control-button',
  ]),
};

const buildCustomKitAssets = (templates: LegacyTemplateRecord[]): BuilderAssetEntry[] => (
  templates
    .map((template, index) => ({
      id: `asset-custom-${template.id}`,
      kind: 'template' as const,
      layer: 'kit' as const,
      templateId: template.id,
      templateSource: 'custom' as const,
      label: template.name,
      description: 'Published reusable master from this project.',
      icon: PenLine,
      badge: index < 9 ? `K${index + 1}` : 'Kit',
      source: 'native' as const,
      category: 'published-kit' as const,
      surfaces: ['canvas', 'kits'] as BuilderAssetSurface[],
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
);

export const getBuilderAssetSectionsForSurface = (
  surface: BuilderAssetSurface,
  customTemplates: LegacyTemplateRecord[] = [],
): BuilderAssetSection[] => {
  const customKitAssets = surface === 'pages' ? [] : buildCustomKitAssets(customTemplates);
  const minimalAssetIds = MINIMAL_SYSTEM_ASSET_IDS_BY_SURFACE[surface];

  const visibleSections = SURFACE_SECTION_ORDER[surface]
    .map((sectionId) => BUILDER_ASSET_SECTIONS.find((section) => section.id === sectionId) ?? null)
    .filter((section): section is BuilderAssetSection => Boolean(section))
    .map((section) => ({
      ...section,
      assets: section.assets.filter((asset) => (
        asset.surfaces.includes(surface)
        && (!minimalAssetIds || minimalAssetIds.has(asset.id))
      )),
    }))
    .filter((section) => section.assets.length > 0);

  if (surface !== 'pages' && customKitAssets.length > 0) {
    return [
      {
        id: 'custom',
        title: 'My Kits',
        description: 'Published masters from this project.',
        assets: customKitAssets,
      },
      ...visibleSections,
    ];
  }

  return visibleSections;
};
