import type { FC } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CheckboxGroup } from '../components/atoms/CheckboxGroup';
import { Divider } from '../components/atoms/Divider';
import { IconButton } from '../components/atoms/IconButton';
import { SelectInput } from '../components/atoms/SelectInput';
import { TextareaInput } from '../components/atoms/TextareaInput';
import { TextInput } from '../components/atoms/TextInput';
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
import { cn } from '../utils/cn';
import {
  getTypographyJustifyClass,
  getWidgetTypographyStyle,
  scaleTypographyStyle,
} from '../utils/typography';
import type { BuilderNodeDocument } from '../schema/project';
import type { WidgetType } from '../builder/widgetConfig';

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

const normalizeBorderStyleValue = (value: unknown): 'solid' | 'transparent' => (
  value === 'transparent' ? 'transparent' : 'solid'
);

type RuntimeNestedCanvasProps = {
  nodes: BuilderNodeDocument[];
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  paddingY?: number;
  parentFontFamily?: string;
  childrenFollowFont?: boolean;
  parentControlBorderStyle?: 'solid' | 'transparent';
  childrenFollowBorder?: boolean;
};

let RuntimeNestedCanvasComponent: FC<RuntimeNestedCanvasProps> | null = null;

export const setRuntimeNestedCanvasComponent = (Component: FC<RuntimeNestedCanvasProps>) => {
  RuntimeNestedCanvasComponent = Component;
};

type RuntimeComponentProps = Record<string, any> & {
  node: BuilderNodeDocument;
  runActions?: () => void;
};

export const RuntimeWidgetRegistry: Record<WidgetType, FC<RuntimeComponentProps>> = {
  heading: ({ runActions: _runActions, ...props }) => {
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
  text: ({ tone = 'muted', emphasisText, emphasisWeight = 'medium', runActions: _runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('text', props);
    const textToneCls = tone === 'default' ? 'text-hr-text' : 'text-hr-muted';
    const emphasisStyle = scaleTypographyStyle(typographyStyle, {
      fontWeight: resolveFontWeight(emphasisWeight, 500),
    });

    if (typeof emphasisText === 'string' && emphasisText.length > 0 && typeof props.text === 'string' && props.text.includes(emphasisText)) {
      const [prefix, ...suffixParts] = props.text.split(emphasisText);
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
      <p className={cn('h-full w-full overflow-auto whitespace-pre-wrap', textToneCls)} style={typographyStyle}>{props.text}</p>
    );
  },
  stat: ({ runActions: _runActions, ...props }) => {
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
  chart: ({ runActions: _runActions, ...props }) => {
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
  calendar: ({ runActions: _runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('calendar', props);
    return (
      <CalendarWidget
        title={props.title}
        subtitle={props.subtitle}
        month={props.month}
        selectedDate={props.selectedDate}
        interactive
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
  shadcn_login_card: ({ node: _node, runActions: _runActions, ...props }) => {
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
  slot_shell: ({ node: _node, runActions: _runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('slot_shell', props);
    return <SlotShellWidget {...props} style={typographyStyle} />;
  },
  icon: ({ node: _node, runActions: _runActions, ...props }) => {
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
  image: ({ node: _node, runActions: _runActions, ...props }) => <ImageWidget {...props} />,
  badge: ({ node: _node, runActions: _runActions, ...props }) => <BadgeWidget {...props} />,
  checkbox_item: ({ node: _node, runActions: _runActions, ...props }) => <CheckboxItemWidget {...props} />,
  media_summary_card: ({ node: _node, runActions: _runActions, ...props }) => <MediaSummaryCardWidget {...props} />,
  media_list_item: ({ node: _node, runActions: _runActions, ...props }) => <MediaListItemWidget {...props} />,
  setting_row: ({ node: _node, runActions, ...props }) => <SettingRowWidget {...props} onAction={runActions} />,
  choice_chip_group: ({ node: _node, runActions: _runActions, ...props }) => <ChoiceChipGroupWidget {...props} />,
  empty_state_card: ({ node: _node, runActions, ...props }) => <EmptyStateCardWidget {...props} onAction={runActions} />,
  button: ({ runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('button', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'center';
    return (
      <InlineShellWidget
        {...props}
        textStyle={typographyStyle}
        justifyContentClass={getButtonJustifyClass(textAlign)}
        onClick={runActions}
      />
    );
  },
  icon_button: ({ node: _node, runActions, ...props }) => (
    <div className="w-full h-full flex items-center justify-center" onClick={runActions}>
      <IconButton {...props} />
    </div>
  ),
  divider: ({ node: _node, runActions: _runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('divider', props);
    return (
      <div className="w-full h-full flex items-center justify-center p-1">
        <Divider {...props} labelTextStyle={typographyStyle} />
      </div>
    );
  },
  text_input: ({ node: _node, runActions: _runActions, ...props }) => {
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
  number_input: ({ node: _node, runActions: _runActions, ...props }) => {
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
  textarea: ({ node: _node, runActions: _runActions, ...props }) => {
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
  select: ({ node: _node, runActions: _runActions, ...props }) => {
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
  checkbox: ({ node: _node, runActions: _runActions, ...props }) => {
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
  radio: ({ node: _node, runActions: _runActions, ...props }) => {
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
  panel: ({ node, runActions: _runActions, ...props }) => {
    const typographyStyle = getWidgetTypographyStyle('panel', props);
    const textAlign = typeof typographyStyle.textAlign === 'string' ? typographyStyle.textAlign : 'left';
    return (
      <Card
        surface={props.chrome === 'transparent' ? 'transparent' : 'default'}
        elevation={props.chrome === 'transparent' ? 'none' : 'default'}
        className="w-full h-full overflow-hidden"
      >
        {props.showHeader !== false && (
          <div
            className={cn(
              'flex h-10 items-center border-b border-hr-border bg-hr-panel px-4 text-hr-text',
              getTypographyJustifyClass(textAlign),
            )}
          >
            <div className="truncate" style={typographyStyle}>{props.title || 'Card'}</div>
          </div>
        )}
        <div className={cn('w-full h-full min-h-0', props.chrome === 'shadcn-card' && 'p-6')}>
          {RuntimeNestedCanvasComponent && (
            <RuntimeNestedCanvasComponent
              nodes={node.children}
              compact
              layoutMode={props.layoutMode ?? 'grid'}
              paddingLeft={props.paddingLeft}
              paddingRight={props.paddingRight}
              paddingTop={props.paddingTop}
              paddingBottom={props.paddingBottom}
              parentFontFamily={typeof props.fontFamily === 'string' ? props.fontFamily : undefined}
              childrenFollowFont={props.childrenFollowFont === true}
              parentControlBorderStyle={normalizeBorderStyleValue(props.controlBorderStyle ?? props.borderStyle)}
              childrenFollowBorder={props.childrenFollowBorder === true}
            />
          )}
        </div>
      </Card>
    );
  },
  canvas: ({ node, layoutMode = 'grid', runActions: _runActions }) => (
    <div className="w-full h-full border border-dashed border-hr-border/50 rounded-lg bg-hr-panel/30 overflow-hidden">
      <div className="w-full h-full p-2">
        {RuntimeNestedCanvasComponent && (
          <RuntimeNestedCanvasComponent
            nodes={node.children}
            layoutMode={layoutMode}
          />
        )}
      </div>
    </div>
  ),
};
