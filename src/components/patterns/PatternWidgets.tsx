import type { CSSProperties } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import {
  getWidgetTypographyStyle,
  scaleTypographyStyle,
} from '../../utils/typography';

type PatternProps = Record<string, unknown> & {
  onAction?: () => void;
};

const toneClasses = {
  neutral: 'bg-hr-border/40 text-hr-text border-hr-border/70',
  primary: 'bg-hr-primary/10 text-hr-primary border-hr-primary/30',
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  danger: 'bg-red-500/10 text-red-600 border-red-200',
} as const;

const textValue = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim().length > 0 ? value : fallback
);

const boolValue = (value: unknown, fallback = false) => (
  typeof value === 'boolean' ? value : fallback
);

const toneValue = (value: unknown): keyof typeof toneClasses => (
  value === 'primary'
  || value === 'success'
  || value === 'warning'
  || value === 'danger'
    ? value
    : 'neutral'
);

const parseList = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    const next = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && 'label' in item) {
          return textValue((item as { label?: unknown }).label);
        }
        return '';
      })
      .filter(Boolean);
    return next.length > 0 ? next : fallback;
  }

  if (typeof value !== 'string') return fallback;

  const next = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return next.length > 0 ? next : fallback;
};

const initialsFromName = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

const Thumbnail = ({
  imageUrl,
  label,
  fit,
  className,
}: {
  imageUrl?: string;
  label: string;
  fit?: 'cover' | 'contain';
  className?: string;
}) => (
  <div
    className={cn(
      'relative flex shrink-0 items-center justify-center overflow-hidden rounded-[min(var(--theme-radius-md),12px)] border border-hr-border/60 bg-hr-bg text-xs font-semibold text-hr-muted',
      className,
    )}
  >
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={label}
        className="h-full w-full"
        style={{ objectFit: fit === 'contain' ? 'contain' : 'cover' }}
      />
    ) : (
      <span className="px-2 text-center">{label}</span>
    )}
  </div>
);

export function ImageWidget(props: PatternProps) {
  const imageUrl = textValue(props.imageUrl);
  const alt = textValue(props.alt, 'Image');
  const caption = textValue(props.caption);
  const fit = props.fit === 'contain' ? 'contain' : 'cover';
  const typographyStyle = getWidgetTypographyStyle('image', props);

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden">
      <Thumbnail
        imageUrl={imageUrl}
        label={textValue(props.placeholder, 'Image')}
        fit={fit}
        className="min-h-0 flex-1 rounded-[min(var(--theme-radius-md),12px)]"
      />
      {caption ? (
        <div className="truncate text-hr-muted" style={scaleTypographyStyle(typographyStyle, { fontSizeMultiplier: 0.86 })}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

export function BadgeWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('badge', props);
  const tone = toneValue(props.tone);
  const variant = props.variant === 'soft' ? 'soft' : 'solid';

  return (
    <div className="flex h-full w-full items-center">
      <span
        className={cn(
          'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium',
          toneClasses[tone],
          variant === 'solid' && tone === 'primary' && 'bg-hr-primary text-white',
          variant === 'solid' && tone === 'neutral' && 'bg-hr-text text-white',
          variant === 'solid' && tone === 'success' && 'bg-emerald-500 text-white',
          variant === 'solid' && tone === 'warning' && 'bg-amber-500 text-white',
          variant === 'solid' && tone === 'danger' && 'bg-red-500 text-white',
        )}
        style={typographyStyle}
      >
        <span className="truncate">{textValue(props.text, 'Badge')}</span>
      </span>
    </div>
  );
}

export function CheckboxItemWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('checkbox_item', props);
  const checked = boolValue(props.checked);

  return (
    <label className="flex h-full w-full items-center gap-2 text-hr-text">
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked
            ? 'border-hr-primary bg-hr-primary text-white'
            : 'border-hr-border bg-hr-bg text-transparent',
        )}
        aria-hidden="true"
      >
        <span className="text-[10px] leading-none">✓</span>
      </span>
      <span className="min-w-0 truncate" style={typographyStyle}>
        {textValue(props.label, 'Checkbox item')}
      </span>
    </label>
  );
}

export function MediaSummaryCardWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('media_summary_card', props);
  const titleStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 1.04,
    fontWeight: 600,
    lineHeight: '1.25em',
  });
  const bodyStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.9,
    lineHeight: '1.45em',
  });
  const metaStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.78,
    fontWeight: 600,
    lineHeight: '1.1em',
  });
  const isHorizontal = props.mediaPosition === 'left';

  return (
    <Card
      elevation="none"
      className={cn(
        'flex h-full w-full gap-3 border border-hr-border/60 bg-hr-panel p-3',
        isHorizontal ? 'flex-row items-stretch' : 'flex-col',
      )}
    >
      <Thumbnail
        imageUrl={textValue(props.thumbnailUrl)}
        label={textValue(props.thumbnailLabel, 'Media')}
        fit={props.thumbnailFit === 'contain' ? 'contain' : 'cover'}
        className={isHorizontal ? 'h-full w-24' : 'h-24 w-full'}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 text-hr-text" style={titleStyle}>{textValue(props.title, 'Media summary')}</div>
          <div className="mt-1 line-clamp-2 text-hr-muted" style={bodyStyle}>{textValue(props.description, 'Short supporting description for this media item.')}</div>
        </div>
        <div className="truncate uppercase tracking-wider text-hr-muted" style={metaStyle}>
          {textValue(props.meta, 'Source · 2 min')}
        </div>
      </div>
    </Card>
  );
}

export function MediaListItemWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('media_list_item', props);
  const titleStyle = scaleTypographyStyle(typographyStyle, {
    fontWeight: 600,
    lineHeight: '1.25em',
  });
  const secondaryStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.85,
    lineHeight: '1.35em',
  });

  return (
    <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-[min(var(--theme-radius-md),12px)] border border-hr-border/60 bg-hr-panel px-3 py-2">
      <Thumbnail
        imageUrl={textValue(props.thumbnailUrl)}
        label={textValue(props.thumbnailLabel, 'Item')}
        fit={props.thumbnailFit === 'contain' ? 'contain' : 'cover'}
        className="h-full min-h-10 w-16"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-hr-text" style={titleStyle}>{textValue(props.title, 'Media list item')}</div>
        <div className="truncate text-hr-muted" style={secondaryStyle}>{textValue(props.secondaryText, 'Secondary information')}</div>
      </div>
      {textValue(props.trailingText) ? (
        <div className="shrink-0 text-xs font-medium text-hr-muted" style={secondaryStyle}>
          {textValue(props.trailingText)}
        </div>
      ) : null}
    </div>
  );
}

export function SettingRowWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('setting_row', props);
  const titleStyle = scaleTypographyStyle(typographyStyle, {
    fontWeight: 600,
    lineHeight: '1.25em',
  });
  const bodyStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.85,
    lineHeight: '1.35em',
  });
  const controlKind = props.controlKind === 'button' || props.controlKind === 'badge' ? props.controlKind : 'switch';
  const enabled = boolValue(props.enabled, true);
  const tone = toneValue(props.tone);

  return (
    <div className="flex h-full w-full items-center justify-between gap-3 overflow-hidden rounded-[min(var(--theme-radius-md),12px)] border border-hr-border/60 bg-hr-panel px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-hr-text" style={titleStyle}>{textValue(props.title, 'Setting row')}</div>
        <div className="line-clamp-2 text-hr-muted" style={bodyStyle}>{textValue(props.description, 'Describe what this setting controls.')}</div>
      </div>
      {controlKind === 'switch' ? (
        <span
          className={cn(
            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
            enabled ? 'bg-hr-primary' : 'bg-hr-border',
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </span>
      ) : controlKind === 'button' ? (
        <Button variant="outline" className="h-8 shrink-0 px-3 text-xs" onClick={props.onAction}>
          {textValue(props.actionLabel, 'Edit')}
        </Button>
      ) : (
        <span className={cn('shrink-0 rounded-full border px-2 py-1 text-xs font-medium', toneClasses[tone])}>
          {textValue(props.value, 'On')}
        </span>
      )}
    </div>
  );
}

export function ChoiceChipGroupWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('choice_chip_group', props);
  const labelStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.82,
    fontWeight: 600,
    lineHeight: '1.2em',
  });
  const options = parseList(props.optionsText ?? props.options, ['Starter', 'Pro', 'Enterprise']);
  const active = textValue(props.activeValue, options[0]);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 overflow-hidden">
      {textValue(props.label) ? (
        <div className="truncate text-hr-muted" style={labelStyle}>{textValue(props.label)}</div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option === active;
          return (
            <span
              key={option}
              className={cn(
                'inline-flex min-w-0 max-w-full items-center rounded-full border px-3 py-1 text-sm font-medium',
                isActive
                  ? 'border-hr-primary bg-hr-primary text-white'
                  : 'border-hr-border bg-hr-panel text-hr-text',
              )}
              style={typographyStyle}
            >
              <span className="truncate">{option}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyStateCardWidget(props: PatternProps) {
  const typographyStyle = getWidgetTypographyStyle('empty_state_card', props);
  const titleStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 1.1,
    fontWeight: 600,
    lineHeight: '1.25em',
  });
  const bodyStyle = scaleTypographyStyle(typographyStyle, {
    fontSizeMultiplier: 0.9,
    lineHeight: '1.45em',
  });
  const iconLabel = textValue(props.iconLabel, initialsFromName(textValue(props.title, 'Empty')));

  return (
    <Card elevation="none" className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-hr-border/70 bg-hr-panel p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hr-border bg-hr-bg text-sm font-semibold text-hr-muted">
        {iconLabel.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <div className="text-hr-text" style={titleStyle}>{textValue(props.title, 'Nothing here yet')}</div>
        <div className="mt-1 text-hr-muted" style={bodyStyle}>{textValue(props.description, 'Add content or connect data to fill this state.')}</div>
      </div>
      {textValue(props.actionLabel) ? (
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={props.onAction}>
          {textValue(props.actionLabel)}
        </Button>
      ) : null}
    </Card>
  );
}
