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
import { cn } from '../utils/cn';
import type { BuilderNodeDocument } from '../schema/project';
import type { WidgetType } from '../builder/widgetConfig';

type RuntimeNestedCanvasProps = {
  nodes: BuilderNodeDocument[];
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
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
  heading: ({ text, size, weight = 'bold', align = 'left', runActions: _runActions }) => {
    const cls = size === 'xl'
      ? 'text-2xl'
      : size === 'lg'
        ? 'text-3xl'
        : size === 'sm'
          ? 'text-base'
          : 'text-xl';
    const weightCls = weight === 'semibold' ? 'font-semibold' : weight === 'medium' ? 'font-medium' : 'font-bold';
    const alignCls = align === 'center' ? 'justify-center text-center' : align === 'right' ? 'justify-end text-right' : 'justify-start text-left';
    return <h2 className={cn('h-full w-full overflow-hidden tracking-tight text-hr-text flex items-center', cls, weightCls, alignCls)}>{text}</h2>;
  },
  text: ({ text, tone = 'muted', size = 'sm', align = 'left', emphasisText, emphasisWeight = 'medium', runActions: _runActions }) => {
    const textSizeCls = size === 'xs' ? 'text-xs leading-5' : size === 'md' ? 'text-base leading-6' : 'text-sm leading-6';
    const textToneCls = tone === 'default' ? 'text-hr-text' : 'text-hr-muted';
    const alignCls = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    const emphasisCls = emphasisWeight === 'semibold' ? 'font-semibold text-hr-text' : 'font-medium text-hr-text';

    if (typeof emphasisText === 'string' && emphasisText.length > 0 && typeof text === 'string' && text.includes(emphasisText)) {
      const [prefix, ...suffixParts] = text.split(emphasisText);
      const suffix = suffixParts.join(emphasisText);
      return (
        <p className={cn('h-full w-full overflow-auto whitespace-pre-wrap', textSizeCls, textToneCls, alignCls)}>
          {prefix}
          <span className={emphasisCls}>{emphasisText}</span>
          {suffix}
        </p>
      );
    }

    return (
      <p className={cn('h-full w-full overflow-auto whitespace-pre-wrap', textSizeCls, textToneCls, alignCls)}>{text}</p>
    );
  },
  stat: ({ title, value, trend, runActions: _runActions }) => (
    <Card elevation="none" className="flex h-full w-full flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-hr-muted">{title}</div>
        {trend ? (
          <div
            className={cn(
              'rounded-full px-2 py-1 text-[10px] font-semibold',
              trend.startsWith('+')
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-400',
            )}
          >
            {trend}
          </div>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="truncate text-3xl font-semibold tracking-tight text-hr-text">{value}</div>
      </div>
    </Card>
  ),
  chart: ({ title, value, trend, variant, data, runActions: _runActions }) => (
    <TrendChartWidget title={title} value={value} trend={trend} variant={variant} data={data} />
  ),
  calendar: ({ title, subtitle, month, selectedDate, runActions: _runActions }) => (
    <CalendarWidget title={title} subtitle={subtitle} month={month} selectedDate={selectedDate} interactive />
  ),
  shadcn_login_card: ({ node: _node, runActions: _runActions, ...props }) => (
    <ShadcnLoginCardWidget {...props} />
  ),
  button: ({ text, variant, runActions }) => (
    <Button variant={variant} className="w-full h-full" onClick={runActions}>
      {text}
    </Button>
  ),
  icon_button: ({ node: _node, runActions, ...props }) => (
    <div className="w-full h-full flex items-center justify-center" onClick={runActions}>
      <IconButton {...props} />
    </div>
  ),
  divider: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center justify-center p-1">
      <Divider {...props} />
    </div>
  ),
  text_input: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <TextInput {...props} />
    </div>
  ),
  number_input: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <TextInput type="number" {...props} />
    </div>
  ),
  textarea: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <TextareaInput {...props} />
    </div>
  ),
  select: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <SelectInput {...props} />
    </div>
  ),
  checkbox: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <CheckboxGroup mode="checkbox" {...props} />
    </div>
  ),
  radio: ({ node: _node, runActions: _runActions, ...props }) => (
    <div className="w-full h-full flex items-center">
      <CheckboxGroup mode="radio" {...props} />
    </div>
  ),
  panel: ({ node, title, showHeader = true, layoutMode = 'grid', chrome, runActions: _runActions }) => (
    <Card
      surface={chrome === 'transparent' ? 'transparent' : 'default'}
      elevation={chrome === 'transparent' ? 'none' : 'default'}
      className="w-full h-full overflow-hidden"
    >
      {showHeader && (
        <div className="h-10 px-4 border-b border-hr-border bg-hr-panel flex items-center">
          <div className="text-sm font-medium text-hr-text">{title || 'Card'}</div>
        </div>
      )}
      <div className={cn('w-full h-full p-2 min-h-0', chrome === 'shadcn-card' && 'p-6')}>
        {RuntimeNestedCanvasComponent && (
          <RuntimeNestedCanvasComponent
            nodes={node.children}
            compact
            layoutMode={layoutMode}
          />
        )}
      </div>
    </Card>
  ),
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
