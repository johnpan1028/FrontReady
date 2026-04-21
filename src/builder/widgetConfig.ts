export const WIDGET_TYPES = [
  'heading',
  'text',
  'stat',
  'chart',
  'calendar',
  'shadcn_login_card',
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
  button: { ...DEFAULT_CONTROL_FRAME_PROPS, text: 'Click Me', variant: 'primary' },
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
