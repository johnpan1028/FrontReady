import { createDefaultSlotShellRows } from './slotShell';

export const WIDGET_TYPES = [
  'heading',
  'text',
  'stat',
  'chart',
  'calendar',
  'shadcn_login_card',
  'slot_shell',
  'icon',
  'image',
  'badge',
  'checkbox_item',
  'media_summary_card',
  'media_list_item',
  'setting_row',
  'choice_chip_group',
  'empty_state_card',
  'button',
  'icon_button',
  'divider',
  'text_input',
  'number_input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'panel',
  'canvas',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export type WidgetSize = {
  w: number;
  h: number;
};

export type WidgetMinSize = {
  minW: number;
  minH: number;
};

const DEFAULT_CONTROL_LAYOUT_PROPS = {
  followParentWidth: false,
  fontFamily: 'parent',
};

const DEFAULT_CONTROL_FRAME_PROPS = {
  ...DEFAULT_CONTROL_LAYOUT_PROPS,
  borderStyle: 'parent',
  linkCornerPresets: false,
};

export const DEFAULT_WIDGET_PROPS: Record<WidgetType, Record<string, unknown>> = {
  heading: { ...DEFAULT_CONTROL_FRAME_PROPS, text: 'New Heading', size: 'md' },
  text: { ...DEFAULT_CONTROL_FRAME_PROPS, text: 'Enter your text here...' },
  stat: { ...DEFAULT_CONTROL_LAYOUT_PROPS, title: 'Monthly recurring', value: '$48.2k', trend: '+12.4%', tone: 'positive' },
  chart: {
    ...DEFAULT_CONTROL_LAYOUT_PROPS,
    title: 'Weekly trend',
    value: '38.2k',
    trend: '+12.4%',
    variant: 'line',
    data: [
      { label: 'Mon', value: 18 },
      { label: 'Tue', value: 24 },
      { label: 'Wed', value: 21 },
      { label: 'Thu', value: 29 },
      { label: 'Fri', value: 34 },
      { label: 'Sat', value: 31 },
      { label: 'Sun', value: 38 },
    ],
  },
  calendar: {
    ...DEFAULT_CONTROL_LAYOUT_PROPS,
    title: 'Editorial calendar',
    subtitle: 'Date navigation for archives and schedules',
    month: '2026-04-01',
    selectedDate: '2026-04-14',
  },
  shadcn_login_card: {
    ...DEFAULT_CONTROL_LAYOUT_PROPS,
    title: 'Login to your account',
    description: 'Enter your email below to login to your account',
    actionLabel: 'Login',
    secondaryActionLabel: 'Login with Google',
    alternateActionLabel: 'Sign Up',
    sourceUrl: 'https://ui.shadcn.com/docs/components/card',
    sourceName: 'shadcn/ui Card login example',
  },
  slot_shell: {
    followParentWidth: false,
    fontFamily: 'parent',
    borderStyle: 'transparent',
    linkCornerPresets: false,
    rowCount: 1,
    columnCount: 1,
    shellPaddingX: 0,
    shellPaddingY: 0,
    rowGap: 4,
    slotGap: 4,
    shellHoverText: '',
    rows: createDefaultSlotShellRows(1, 1),
  },
  icon: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    icon: 'Star',
    size: 'md',
    tone: 'default',
    strokeWidth: 2,
  },
  image: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    imageUrl: '',
    alt: 'Image',
    placeholder: 'Image',
    caption: '',
    fit: 'cover',
  },
  badge: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    text: 'Active',
    tone: 'primary',
    variant: 'soft',
  },
  checkbox_item: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    label: 'Accept terms',
    checked: true,
  },
  media_summary_card: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    title: 'New product launch',
    description: 'A compact media summary with thumbnail, copy, and source metadata.',
    meta: 'Product · 4 min',
    thumbnailUrl: '',
    thumbnailLabel: 'Media',
    thumbnailFit: 'cover',
    mediaPosition: 'top',
  },
  media_list_item: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    title: 'Design systems in practice',
    secondaryText: '12 min · Updated today',
    trailingText: 'Open',
    thumbnailUrl: '',
    thumbnailLabel: 'Item',
    thumbnailFit: 'cover',
  },
  setting_row: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    title: 'Email notifications',
    description: 'Send product and account updates.',
    controlKind: 'switch',
    enabled: true,
    value: 'On',
    actionLabel: 'Edit',
    tone: 'primary',
  },
  choice_chip_group: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    label: 'Plan',
    optionsText: 'Starter, Pro, Enterprise',
    activeValue: 'Pro',
  },
  empty_state_card: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    title: 'No results found',
    description: 'Try adjusting filters or create a new item.',
    actionLabel: 'Create item',
    iconLabel: '∅',
  },
  button: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    text: 'Click Me',
    labelText: 'Click Me',
    variant: 'primary',
    leadingKind: 'none',
    leadingIcon: 'Plus',
    trailingKind: 'none',
    trailingText: 'NEW',
    trailingIcon: 'ChevronRight',
    trailingTone: 'primary',
    layoutPreset: 'label-only',
    separatorStyle: 'none',
    slotGap: 8,
  },
  icon_button: { ...DEFAULT_CONTROL_FRAME_PROPS, icon: 'X', size: 'md', variant: 'ghost', tooltip: 'Close' },
  divider: { ...DEFAULT_CONTROL_FRAME_PROPS, direction: 'horizontal', color: 'default' },
  text_input: { ...DEFAULT_CONTROL_FRAME_PROPS, label: 'Label', placeholder: 'Enter text...', chrome: 'ghost' },
  number_input: { ...DEFAULT_CONTROL_FRAME_PROPS, label: 'Number', placeholder: '0', chrome: 'ghost' },
  textarea: { ...DEFAULT_CONTROL_FRAME_PROPS, label: 'Description', placeholder: 'Enter description...' },
  select: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    label: 'Select',
    placeholder: 'Choose...',
    options: [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ],
  },
  checkbox: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    label: 'Choose options',
    options: [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ],
  },
  radio: {
    ...DEFAULT_CONTROL_FRAME_PROPS,
    label: 'Select one',
    options: [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ],
  },
  panel: {
    title: 'Header',
    layoutMode: 'grid',
    showHeader: false,
    showFooter: false,
    fontFamily: 'theme',
    childrenFollowFont: true,
    controlBorderStyle: 'solid',
    childrenFollowBorder: true,
    footerText: 'Footer',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    linkHorizontalPadding: true,
    linkVerticalPadding: true,
    gap: 16,
    scrollable: true,
    linkCornerPresets: false,
  },
  canvas: {},
};

export const DEFAULT_WIDGET_SIZES: Record<WidgetType, WidgetSize> = {
  heading: { w: 16, h: 3 },
  text: { w: 16, h: 5 },
  stat: { w: 12, h: 6 },
  chart: { w: 24, h: 12 },
  calendar: { w: 16, h: 14 },
  shadcn_login_card: { w: 18, h: 17 },
  slot_shell: { w: 4, h: 3 },
  icon: { w: 4, h: 3 },
  image: { w: 12, h: 8 },
  badge: { w: 5, h: 2 },
  checkbox_item: { w: 10, h: 3 },
  media_summary_card: { w: 16, h: 10 },
  media_list_item: { w: 18, h: 5 },
  setting_row: { w: 18, h: 5 },
  choice_chip_group: { w: 16, h: 5 },
  empty_state_card: { w: 16, h: 10 },
  button: { w: 8, h: 3 },
  icon_button: { w: 4, h: 3 },
  divider: { w: 12, h: 2 },
  text_input: { w: 12, h: 4 },
  number_input: { w: 12, h: 4 },
  textarea: { w: 16, h: 6 },
  select: { w: 12, h: 4 },
  checkbox: { w: 12, h: 6 },
  radio: { w: 12, h: 6 },
  panel: { w: 12, h: 8 },
  canvas: { w: 12, h: 8 },
};

export const DEFAULT_WIDGET_MIN_SIZES: Record<WidgetType, WidgetMinSize> = {
  heading: { minW: 2, minH: 1 },
  text: { minW: 2, minH: 1 },
  stat: { minW: 2, minH: 1 },
  chart: { minW: 2, minH: 1 },
  calendar: { minW: 2, minH: 1 },
  shadcn_login_card: { minW: 2, minH: 1 },
  slot_shell: { minW: 2, minH: 2 },
  icon: { minW: 2, minH: 1 },
  image: { minW: 2, minH: 1 },
  badge: { minW: 2, minH: 1 },
  checkbox_item: { minW: 2, minH: 1 },
  media_summary_card: { minW: 2, minH: 1 },
  media_list_item: { minW: 2, minH: 1 },
  setting_row: { minW: 2, minH: 1 },
  choice_chip_group: { minW: 2, minH: 1 },
  empty_state_card: { minW: 2, minH: 1 },
  button: { minW: 2, minH: 1 },
  icon_button: { minW: 2, minH: 1 },
  divider: { minW: 2, minH: 1 },
  text_input: { minW: 2, minH: 1 },
  number_input: { minW: 2, minH: 1 },
  textarea: { minW: 2, minH: 1 },
  select: { minW: 2, minH: 1 },
  checkbox: { minW: 2, minH: 1 },
  radio: { minW: 2, minH: 1 },
  panel: { minW: 4, minH: 2 },
  canvas: { minW: 4, minH: 2 },
};

const CONTAINER_WIDGETS = new Set<WidgetType>(['panel', 'canvas']);

export const isWidgetType = (value: unknown): value is WidgetType => {
  return typeof value === 'string' && (WIDGET_TYPES as readonly string[]).includes(value);
};

export const isContainerWidget = (type: WidgetType) => {
  return CONTAINER_WIDGETS.has(type);
};

export const cloneDefaultWidgetProps = (type: WidgetType) => {
  return JSON.parse(JSON.stringify(DEFAULT_WIDGET_PROPS[type] ?? {})) as Record<string, unknown>;
};

export const doesWidgetFollowParentWidth = (props?: Record<string, unknown>) => (
  props?.followParentWidth === true || props?.autoOccupyRow === true
);

export const getDefaultWidgetMinSize = (type: WidgetType): WidgetMinSize => (
  DEFAULT_WIDGET_MIN_SIZES[type] ?? { minW: 2, minH: 1 }
);

export const getDefaultWidgetSize = (type: WidgetType, maxCols?: number) => {
  const size = DEFAULT_WIDGET_SIZES[type] ?? { w: 4, h: 4 };
  const minSize = getDefaultWidgetMinSize(type);
  if (!maxCols) return { ...size };
  return {
    w: Math.max(Math.min(size.w, maxCols), Math.min(minSize.minW, maxCols)),
    h: size.h,
  };
};
