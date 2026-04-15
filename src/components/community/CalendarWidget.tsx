import { DayPicker } from 'react-day-picker';
import { cn } from '../../utils/cn';

type CalendarWidgetProps = {
  title?: string;
  subtitle?: string;
  month?: string;
  selectedDate?: string;
  interactive?: boolean;
};

const parseIsoDate = (value?: string) => {
  if (!value) return null;
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
};

export function CalendarWidget({
  title,
  subtitle,
  month,
  selectedDate,
  interactive = false,
}: CalendarWidgetProps) {
  const activeDate = parseIsoDate(selectedDate) ?? new Date();
  const activeMonth = parseIsoDate(month) ?? activeDate;

  return (
    <div
      className={cn(
        'builder-community-calendar flex h-full w-full flex-col rounded-[22px] border border-hr-border/70 bg-hr-panel/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)]',
        !interactive && 'pointer-events-none',
      )}
    >
      {(title || subtitle) ? (
        <div className="mb-3 flex shrink-0 flex-col gap-1">
          {title ? (
            <div className="truncate text-sm font-semibold tracking-tight text-hr-text">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="truncate text-[11px] text-hr-muted">{subtitle}</div>
          ) : null}
        </div>
      ) : null}
      <DayPicker
        animate={false}
        mode="single"
        month={activeMonth}
        selected={activeDate}
        showOutsideDays
        fixedWeeks
        className="builder-day-picker"
      />
    </div>
  );
}
