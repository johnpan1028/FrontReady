import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { IconButton } from '../components/atoms/IconButton';
import { Divider } from '../components/atoms/Divider';
import { TextInput } from '../components/atoms/TextInput';
import { TextareaInput } from '../components/atoms/TextareaInput';
import { SelectInput } from '../components/atoms/SelectInput';
import { CheckboxGroup } from '../components/atoms/CheckboxGroup';
import { CalendarWidget } from '../components/community/CalendarWidget';
import { TrendChartWidget } from '../components/community/TrendChartWidget';
import { ShadcnLoginCardWidget } from '../components/community/ShadcnLoginCardWidget';
import {
  BadgeWidget,
  CheckboxItemWidget,
  ChoiceChipGroupWidget,
  EmptyStateCardWidget,
  ImageWidget,
  MediaListItemWidget,
  MediaSummaryCardWidget,
  SettingRowWidget,
} from '../components/patterns/PatternWidgets';
import { IconPrimitiveWidget, InlineShellWidget, SlotShellWidget } from '../components/patterns/SlotShellWidgets';
import {
  getTypographyJustifyClass,
  getWidgetTypographyStyle,
  scaleTypographyStyle,
} from '../utils/typography';

const resolveFontWeight = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === 'bold') return 700;
  if (value === 'semibold') return 600;
  if (value === 'medium') return 500;
  if (value === 'regular') return 400;
  return fallback;
};

const getTypographySizeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;

  const match = value.trim().match(/^(-?\d*\.?\d+)/);
  if (!match) return fallback;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getButtonJustifyClass = (textAlign?: string) => (
  textAlign === 'right'
    ? 'justify-end'
    : textAlign === 'left'
      ? 'justify-start'
      : 'justify-center'
);

// We use a getter function to avoid circular dependencies
type NestedCanvasComponentProps = {
  id: string;
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  scrollable?: boolean;
};

let NestedCanvasComponent: React.FC<NestedCanvasComponentProps> | null = null;

export const setNestedCanvasComponent = (Component: React.FC<NestedCanvasComponentProps>) => {
  NestedCanvasComponent = Component;
};

export const WidgetRegistry: Record<string, React.FC<any>> = {
  // ── DISPLAY ─────────────────────────────────────────────────────────
  heading: (props) => {
    const typographyStyle = getWidgetTypographyStyle('heading', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'left';
    return (
      <h2
        className={cn(
          'flex h-full w-full items-center overflow-hidden text-hr-text',
          getTypographyJustifyClass(textAlign),
        )}
        style={typographyStyle}
      >
        <span className="truncate">
          {props.text}
        </span>
      </h2>
    );
  },
  text: ({ text, tone = 'muted', emphasisText, emphasisWeight = 'medium', ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('text', props);
    const textToneCls = tone === 'default' ? 'text-hr-text' : 'text-hr-muted';
    const emphasisStyle = scaleTypographyStyle(typographyStyle, {
      fontWeight: resolveFontWeight(emphasisWeight, 500),
    });

    if (typeof emphasisText === 'string' && emphasisText.length > 0 && typeof text === 'string' && text.includes(emphasisText)) {
      const [prefix, ...suffixParts] = text.split(emphasisText);
      const suffix = suffixParts.join(emphasisText);
      return (
        <p className={cn('h-full w-full overflow-auto whitespace-pre-wrap', textToneCls)} style={typographyStyle}>
          {prefix}
          <span className="text-hr-text" style={emphasisStyle}>{emphasisText}</span>
          {suffix}
        </p>
      );
    }

    return (
      <p className={cn('h-full w-full overflow-auto whitespace-pre-wrap', textToneCls)} style={typographyStyle}>{text}</p>
    );
  },
  stat: (props) => {
    const typographyStyle = getWidgetTypographyStyle('stat', props);
    const titleStyle = scaleTypographyStyle(typographyStyle, {
      fontSizeMultiplier: 0.82,
      fontWeight: 600,
      lineHeight: '1.2em',
    });
    const valueStyle = scaleTypographyStyle(typographyStyle, {
      fontSizeMultiplier: 2.2,
      fontWeight: 600,
      lineHeight: '1.05em',
      letterSpacing: '-0.02em',
    });
    const trendStyle = scaleTypographyStyle(typographyStyle, {
      fontSizeMultiplier: 0.8,
      fontWeight: 600,
      lineHeight: '1.1em',
    });

    return (
      <Card elevation="none" className="flex h-full w-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="truncate text-hr-muted" style={titleStyle}>{props.title}</div>
          {props.trend ? (
            <div
              className={cn(
                'rounded-full px-2 py-1',
                String(props.trend).startsWith('+')
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-400',
              )}
              style={trendStyle}
            >
              {props.trend}
            </div>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="truncate text-hr-text" style={valueStyle}>{props.value}</div>
        </div>
      </Card>
    );
  },
  chart: (props) => {
    const typographyStyle = getWidgetTypographyStyle('chart', props);
    const axisStyle = scaleTypographyStyle(typographyStyle, { fontSizeMultiplier: 0.78 });

    return (
      <TrendChartWidget
        title={props.title}
        value={props.value}
        trend={props.trend}
        variant={props.variant}
        data={props.data}
        surfaceTextStyle={{
          fontFamily: typographyStyle.fontFamily,
          fontStyle: typographyStyle.fontStyle,
          fontWeight: typographyStyle.fontWeight,
          letterSpacing: typographyStyle.letterSpacing,
          textTransform: typographyStyle.textTransform,
          textDecoration: typographyStyle.textDecoration,
        }}
        titleTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 0.82,
          fontWeight: 600,
          lineHeight: '1.2em',
        })}
        valueTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 1.85,
          fontWeight: 600,
          lineHeight: '1.1em',
          letterSpacing: '-0.02em',
        })}
        trendTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 0.82,
          fontWeight: 600,
          lineHeight: '1.1em',
        })}
        axisFontFamily={typeof typographyStyle.fontFamily === 'string' ? typographyStyle.fontFamily : undefined}
        axisFontSize={getTypographySizeNumber(axisStyle.fontSize, 10)}
      />
    );
  },
  calendar: (props) => {
    const typographyStyle = getWidgetTypographyStyle('calendar', props);
    return (
      <CalendarWidget
        title={props.title}
        subtitle={props.subtitle}
        month={props.month}
        selectedDate={props.selectedDate}
        interactive={false}
        surfaceTextStyle={{
          fontFamily: typographyStyle.fontFamily,
          fontSize: typographyStyle.fontSize,
          fontWeight: typographyStyle.fontWeight,
          fontStyle: typographyStyle.fontStyle,
          lineHeight: typographyStyle.lineHeight,
          letterSpacing: typographyStyle.letterSpacing,
          textTransform: typographyStyle.textTransform,
          textDecoration: typographyStyle.textDecoration,
        }}
        titleTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 1.05,
          fontWeight: 600,
          lineHeight: '1.2em',
        })}
        subtitleTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 0.82,
          lineHeight: '1.35em',
        })}
      />
    );
  },
  shadcn_login_card: (props) => {
    const typographyStyle = getWidgetTypographyStyle('shadcn_login_card', props);
    return (
      <ShadcnLoginCardWidget
        {...props}
        titleTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 1.72,
          fontWeight: 600,
          lineHeight: '1.15em',
          letterSpacing: '-0.02em',
        })}
        descriptionTextStyle={scaleTypographyStyle(typographyStyle, {
          lineHeight: '1.5em',
        })}
        fieldLabelTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 0.95,
          fontWeight: 500,
        })}
        fieldTextStyle={typographyStyle}
        buttonTextStyle={scaleTypographyStyle(typographyStyle, {
          fontWeight: 600,
          lineHeight: '1.2em',
        })}
        footerTextStyle={scaleTypographyStyle(typographyStyle, {
          fontSizeMultiplier: 0.92,
        })}
      />
    );
  },
  slot_shell: (props) => {
    const typographyStyle = getWidgetTypographyStyle('slot_shell', props);
    return <SlotShellWidget {...props} style={typographyStyle} />;
  },
  icon: (props) => {
    const typographyStyle = getWidgetTypographyStyle('icon', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'center';
    return (
      <IconPrimitiveWidget
        {...props}
        style={typographyStyle}
        justifyContentClass={getButtonJustifyClass(textAlign)}
      />
    );
  },
  image: (props) => <ImageWidget {...props} />,
  badge: (props) => <BadgeWidget {...props} />,
  checkbox_item: (props) => <CheckboxItemWidget {...props} />,
  media_summary_card: (props) => <MediaSummaryCardWidget {...props} />,
  media_list_item: (props) => <MediaListItemWidget {...props} />,
  setting_row: (props) => <SettingRowWidget {...props} />,
  choice_chip_group: (props) => <ChoiceChipGroupWidget {...props} />,
  empty_state_card: (props) => <EmptyStateCardWidget {...props} />,

  // ── ACTIONS ─────────────────────────────────────────────────────────
  button: (props) => {
    const typographyStyle = getWidgetTypographyStyle('button', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'center';
    return (
      <InlineShellWidget
        {...props}
        textStyle={typographyStyle}
        justifyContentClass={getButtonJustifyClass(textAlign)}
      />
    );
  },
  icon_button: (props) => (
    <div className="w-full h-full flex items-center justify-center">
      <IconButton {...props} />
    </div>
  ),

  // ── STRUCTURE ────────────────────────────────────────────────────────
  divider: (props) => {
    const typographyStyle = getWidgetTypographyStyle('divider', props);
    return (
      <div className="w-full h-full flex items-center justify-center p-1">
        <Divider {...props} labelTextStyle={typographyStyle} />
      </div>
    );
  },

  // ── FORM PRIMITIVES ─────────────────────────────────────────────────
  text_input: (props) => {
    const typographyStyle = getWidgetTypographyStyle('text_input', props);
    return (
      <div className="w-full h-full flex items-center">
        <TextInput
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          inputTextStyle={typographyStyle}
          hintTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.82,
            lineHeight: '1.3em',
          })}
        />
      </div>
    );
  },
  number_input: (props) => {
    const typographyStyle = getWidgetTypographyStyle('number_input', props);
    return (
      <div className="w-full h-full flex items-center">
        <TextInput
          type="number"
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          inputTextStyle={typographyStyle}
          hintTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.82,
            lineHeight: '1.3em',
          })}
        />
      </div>
    );
  },
  textarea: (props) => {
    const typographyStyle = getWidgetTypographyStyle('textarea', props);
    return (
      <div className="w-full h-full flex items-center">
        <TextareaInput
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          inputTextStyle={typographyStyle}
          hintTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.82,
            lineHeight: '1.3em',
          })}
        />
      </div>
    );
  },
  select: (props) => {
    const typographyStyle = getWidgetTypographyStyle('select', props);
    return (
      <div className="w-full h-full flex items-center">
        <SelectInput
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          inputTextStyle={typographyStyle}
          hintTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.82,
            lineHeight: '1.3em',
          })}
        />
      </div>
    );
  },
  checkbox: (props) => {
    const typographyStyle = getWidgetTypographyStyle('checkbox', props);
    return (
      <div className="w-full h-full flex items-center">
        <CheckboxGroup
          mode="checkbox"
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          optionTextStyle={typographyStyle}
        />
      </div>
    );
  },
  radio: (props) => {
    const typographyStyle = getWidgetTypographyStyle('radio', props);
    return (
      <div className="w-full h-full flex items-center">
        <CheckboxGroup
          mode="radio"
          {...props}
          labelTextStyle={scaleTypographyStyle(typographyStyle, {
            fontSizeMultiplier: 0.86,
            fontWeight: 500,
            lineHeight: '1.2em',
          })}
          optionTextStyle={typographyStyle}
        />
      </div>
    );
  },

  // ── CONTAINERS ───────────────────────────────────────────────────────
  panel: (props) => {
    const typographyStyle = getWidgetTypographyStyle('panel', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'left';
    return (
      <Card
        surface={props.chrome === 'transparent' ? 'transparent' : 'default'}
        elevation={props.chrome === 'transparent' ? 'none' : 'default'}
        className="nowheel flex h-full w-full flex-col overflow-hidden"
      >
        {props.showHeader !== false && props.title ? (
          <div
            className={cn(
              'flex h-8 shrink-0 items-center border-b border-hr-border/70 px-3 text-hr-muted',
              getTypographyJustifyClass(textAlign),
            )}
          >
            <span className="truncate" style={typographyStyle}>{props.title}</span>
          </div>
        ) : null}
        <div
          className={cn(
            'nowheel min-h-0 w-full flex-1 overflow-x-hidden',
            props.scrollable === false ? 'overflow-y-hidden' : 'overflow-y-auto',
          )}
          style={{
            overscrollBehavior: 'contain',
          }}
        >
          {NestedCanvasComponent && (
            <NestedCanvasComponent
              id={props.id}
              compact
              layoutMode={props.layoutMode ?? 'grid'}
              paddingLeft={props.paddingLeft}
              paddingRight={props.paddingRight}
              paddingTop={props.paddingTop}
              paddingBottom={props.paddingBottom}
              gap={props.gap}
              scrollable={props.scrollable}
            />
          )}
        </div>
        {props.showFooter === true ? (
          <div
            className={cn(
              'flex h-8 shrink-0 items-center border-t border-hr-border/70 px-3 text-hr-muted',
              getTypographyJustifyClass(textAlign),
            )}
          >
            <span className="truncate" style={typographyStyle}>{props.footerText || 'Footer'}</span>
          </div>
        ) : null}
      </Card>
    );
  },
  canvas: ({ id, layoutMode }) => (
    <div className="w-full h-full border border-dashed border-hr-border/50 rounded-lg bg-hr-panel/30 overflow-hidden relative group/canvas-widget">
      <div className="pointer-events-none absolute top-1 left-1/2 z-10 h-1.5 w-8 -translate-x-1/2 rounded-full bg-hr-border opacity-0 transition-opacity group-hover/canvas-widget:opacity-100" />
      <div className="w-full h-full pt-3">
        {NestedCanvasComponent && <NestedCanvasComponent id={id} layoutMode={layoutMode} />}
      </div>
    </div>
  ),
};
