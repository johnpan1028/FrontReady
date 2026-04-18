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

// We use a getter function to avoid circular dependencies
type NestedCanvasComponentProps = {
  id: string;
  compact?: boolean;
  layoutMode?: 'grid' | 'flex-row' | 'flex-col';
};

let NestedCanvasComponent: React.FC<NestedCanvasComponentProps> | null = null;

export const setNestedCanvasComponent = (Component: React.FC<NestedCanvasComponentProps>) => {
  NestedCanvasComponent = Component;
};

export const WidgetRegistry: Record<string, React.FC<any>> = {
  // ── DISPLAY ─────────────────────────────────────────────────────────
  heading: ({ text, size, weight = 'bold', align = 'left' }) => {
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
  text: ({ text, tone = 'muted', size = 'sm', align = 'left', emphasisText, emphasisWeight = 'medium' }) => {
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
  stat: ({ title, value, trend }) => (
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
  chart: ({ title, value, trend, variant, data }) => (
    <TrendChartWidget title={title} value={value} trend={trend} variant={variant} data={data} />
  ),
  calendar: ({ title, subtitle, month, selectedDate }) => (
    <CalendarWidget title={title} subtitle={subtitle} month={month} selectedDate={selectedDate} interactive={false} />
  ),
  shadcn_login_card: (props) => (
    <ShadcnLoginCardWidget {...props} />
  ),

  // ── ACTIONS ─────────────────────────────────────────────────────────
  button: ({ text, variant }) => (
    <Button variant={variant} className="w-full h-full">{text}</Button>
  ),
  icon_button: (props) => (
    <div className="w-full h-full flex items-center justify-center">
      <IconButton {...props} />
    </div>
  ),

  // ── STRUCTURE ────────────────────────────────────────────────────────
  divider: (props) => (
    <div className="w-full h-full flex items-center justify-center p-1">
      <Divider {...props} />
    </div>
  ),

  // ── FORM PRIMITIVES ─────────────────────────────────────────────────
  text_input: (props) => (
    <div className="w-full h-full flex items-center">
      <TextInput {...props} />
    </div>
  ),
  number_input: (props) => (
    <div className="w-full h-full flex items-center">
      <TextInput type="number" {...props} />
    </div>
  ),
  textarea: (props) => (
    <div className="w-full h-full flex items-center">
      <TextareaInput {...props} />
    </div>
  ),
  select: (props) => (
    <div className="w-full h-full flex items-center">
      <SelectInput {...props} />
    </div>
  ),
  checkbox: (props) => (
    <div className="w-full h-full flex items-center">
      <CheckboxGroup mode="checkbox" {...props} />
    </div>
  ),
  radio: (props) => (
    <div className="w-full h-full flex items-center">
      <CheckboxGroup mode="radio" {...props} />
    </div>
  ),

  // ── CONTAINERS ───────────────────────────────────────────────────────
  panel: ({ id, title, showHeader = true, chrome }) => (
    <Card
      surface={chrome === 'transparent' ? 'transparent' : 'default'}
      elevation={chrome === 'transparent' ? 'none' : 'default'}
      className="flex h-full w-full flex-col overflow-hidden"
    >
      {showHeader !== false && title ? (
        <div className="flex h-8 shrink-0 items-center border-b border-hr-border/70 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-hr-muted">
          <span className="truncate">{title}</span>
        </div>
      ) : null}
      <div
        className={cn('min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto p-1', chrome === 'shadcn-card' && 'p-6')}
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        {NestedCanvasComponent && <NestedCanvasComponent id={id} compact />}
      </div>
    </Card>
  ),
  canvas: ({ id, layoutMode }) => (
    <div className="w-full h-full border border-dashed border-hr-border/50 rounded-lg bg-hr-panel/30 overflow-hidden relative group/canvas-widget">
      <div className="pointer-events-none absolute top-1 left-1/2 z-10 h-1.5 w-8 -translate-x-1/2 rounded-full bg-hr-border opacity-0 transition-opacity group-hover/canvas-widget:opacity-100" />
      <div className="w-full h-full pt-3">
        {NestedCanvasComponent && <NestedCanvasComponent id={id} layoutMode={layoutMode} />}
      </div>
    </div>
  ),
};
