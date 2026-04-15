import { useEffect, useId, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendPoint = {
  label: string;
  value: number;
};

type TrendChartWidgetProps = {
  title?: string;
  value?: string;
  trend?: string;
  variant?: 'line' | 'area';
  data?: TrendPoint[];
};

const DEFAULT_TREND_DATA: TrendPoint[] = [
  { label: 'Mon', value: 18 },
  { label: 'Tue', value: 24 },
  { label: 'Wed', value: 21 },
  { label: 'Thu', value: 29 },
  { label: 'Fri', value: 34 },
  { label: 'Sat', value: 31 },
  { label: 'Sun', value: 38 },
];

const MIN_CHART_WIDTH = 120;
const MIN_CHART_HEIGHT = 120;

export function TrendChartWidget({
  title,
  value = '38.2k',
  trend = '+12.4%',
  variant = 'line',
  data = DEFAULT_TREND_DATA,
}: TrendChartWidgetProps) {
  const safeData = Array.isArray(data) && data.length > 0 ? data : DEFAULT_TREND_DATA;
  const chartId = useId().replace(/:/g, '');
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const color = 'var(--theme-primary)';
  const hasChartSurface = chartSize.width >= MIN_CHART_WIDTH && chartSize.height >= MIN_CHART_HEIGHT;

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;

    const updateSize = () => {
      const nextWidth = Math.max(0, Math.floor(host.clientWidth));
      const nextHeight = Math.max(0, Math.floor(host.clientHeight));
      setChartSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  const commonChartProps = {
    width: chartSize.width,
    height: chartSize.height,
    data: safeData,
    margin: { top: 6, right: 6, left: -20, bottom: 0 },
  } as const;

  return (
    <div className="flex h-full w-full flex-col rounded-[24px] border border-hr-border/72 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-panel)_98%,white_2%)_0%,var(--theme-panel)_100%)] p-4 shadow-[var(--theme-shadow-panel)]">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? (
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
              {title}
            </div>
          ) : null}
          <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-hr-text">{value}</div>
        </div>
        {trend ? (
          <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
            {trend}
          </div>
        ) : null}
      </div>
      <div ref={chartHostRef} className="min-h-0 flex-1">
        {hasChartSurface ? (
          variant === 'area' ? (
            <AreaChart {...commonChartProps}>
              <defs>
                <linearGradient id={`builderTrendFill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="color-mix(in srgb, var(--theme-border) 68%, transparent)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-muted)', fontSize: 10 }}
              />
              <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip
                cursor={{ stroke: 'color-mix(in srgb, var(--theme-primary) 40%, transparent)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid color-mix(in srgb, var(--theme-border) 84%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-panel) 96%, white 4%)',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#builderTrendFill-${chartId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <LineChart {...commonChartProps}>
              <CartesianGrid stroke="color-mix(in srgb, var(--theme-border) 68%, transparent)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-muted)', fontSize: 10 }}
              />
              <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip
                cursor={{ stroke: 'color-mix(in srgb, var(--theme-primary) 40%, transparent)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid color-mix(in srgb, var(--theme-border) 84%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-panel) 96%, white 4%)',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          )
        ) : (
          <div className="flex h-full items-end">
            <div className="h-16 w-full rounded-[18px] border border-dashed border-hr-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_10%,transparent),transparent)]" />
          </div>
        )}
      </div>
    </div>
  );
}
