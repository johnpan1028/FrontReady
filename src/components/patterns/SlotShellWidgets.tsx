import type { CSSProperties, MouseEvent } from 'react';
import { type ButtonProps, Button } from '../ui/Button';
import { IconGlyph, type IconName } from '../atoms/IconButton';
import { cn } from '../../utils/cn';
import {
  getSlotShellRowHeightUnits,
  normalizeSlotShellContract,
  type SlotShellObjectKind,
  type SlotShellRow,
  type SlotShellSlot,
} from '../../builder/slotShell';

type IconPrimitiveSize = 'sm' | 'md' | 'lg';
type IconPrimitiveTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
type InlineShellLayoutPreset =
  | 'label-only'
  | 'leading-label'
  | 'label-leading'
  | 'label-trailing'
  | 'leading-label-trailing'
  | 'icon-only';
type InlineShellSeparatorStyle = 'none' | 'pipe' | 'dot' | 'slash';
type InlineShellLeadingKind = 'none' | 'icon';
type InlineShellTrailingKind = 'none' | 'text' | 'badge' | 'icon';
type InlineShellTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
type SlotShellSize = 'sm' | 'md' | 'lg';

const ICON_SIZE_MAP: Record<IconPrimitiveSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

const ICON_TONE_CLASS_MAP: Record<IconPrimitiveTone, string> = {
  default: 'text-hr-text',
  muted: 'text-hr-muted',
  primary: 'text-hr-primary',
  success: 'text-emerald-500',
  warning: 'text-amber-400',
  danger: 'text-rose-400',
};

const INLINE_SHELL_TONE_CLASS_MAP: Record<InlineShellTone, string> = {
  neutral: 'bg-hr-border/60 text-hr-text border border-hr-border/80',
  primary: 'bg-hr-primary/15 text-hr-primary border border-hr-primary/20',
  success: 'bg-emerald-500/12 text-emerald-500 border border-emerald-500/20',
  warning: 'bg-amber-400/12 text-amber-400 border border-amber-400/20',
  danger: 'bg-rose-400/12 text-rose-400 border border-rose-400/20',
};

const SEPARATOR_TEXT_MAP: Record<Exclude<InlineShellSeparatorStyle, 'none'>, string> = {
  pipe: '|',
  dot: '•',
  slash: '/',
};

const SLOT_TEXT_SIZE_CLASS_MAP: Record<SlotShellSize, string> = {
  sm: 'text-[12px]',
  md: 'text-[14px]',
  lg: 'text-[15px]',
};

const SLOT_ICON_SIZE_MAP: Record<SlotShellSize, number> = {
  sm: 16,
  md: 18,
  lg: 22,
};

const SLOT_OBJECT_LABEL_MAP: Record<SlotShellObjectKind, string> = {
  chart: 'Chart Object',
  table: 'Table Object',
  calendar: 'Calendar Object',
  media: 'Media Object',
  custom: 'Custom Object',
};

const toTrimmedText = (value: unknown) => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
);

const resolveInlineShellLabel = (labelText: unknown, legacyText: unknown) => (
  toTrimmedText(labelText) || toTrimmedText(legacyText) || 'Action'
);

const renderInlineIcon = (icon: IconName | undefined, size: number, strokeWidth: number) => (
  <span className="inline-flex shrink-0 items-center justify-center">
    <IconGlyph icon={icon} size={size} strokeWidth={strokeWidth} />
  </span>
);

const renderSeparator = (separatorStyle: InlineShellSeparatorStyle) => (
  separatorStyle === 'none'
    ? null
    : (
        <span className="shrink-0 text-[0.92em] text-current/55">
          {SEPARATOR_TEXT_MAP[separatorStyle]}
        </span>
      )
);

export function IconPrimitiveWidget({
  icon = 'Star',
  size = 'md',
  tone = 'default',
  strokeWidth = 2,
  className,
  justifyContentClass = 'justify-center',
  style,
}: {
  icon?: IconName;
  size?: IconPrimitiveSize;
  tone?: IconPrimitiveTone;
  strokeWidth?: number;
  className?: string;
  justifyContentClass?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center overflow-hidden',
        justifyContentClass,
        ICON_TONE_CLASS_MAP[tone] ?? ICON_TONE_CLASS_MAP.default,
        className,
      )}
      style={style}
    >
      <IconGlyph icon={icon} size={ICON_SIZE_MAP[size] ?? ICON_SIZE_MAP.md} strokeWidth={strokeWidth} />
    </div>
  );
}

export function InlineShellWidget({
  labelText,
  text,
  variant = 'primary',
  leadingKind = 'none',
  leadingIcon = 'Plus',
  trailingKind = 'none',
  trailingText = 'NEW',
  trailingIcon = 'ChevronRight',
  trailingTone = 'primary',
  layoutPreset = 'label-only',
  separatorStyle = 'none',
  slotGap = 8,
  className,
  justifyContentClass = 'justify-center',
  textStyle,
  onClick,
}: {
  labelText?: unknown;
  text?: unknown;
  variant?: ButtonProps['variant'];
  leadingKind?: InlineShellLeadingKind;
  leadingIcon?: IconName;
  trailingKind?: InlineShellTrailingKind;
  trailingText?: unknown;
  trailingIcon?: IconName;
  trailingTone?: InlineShellTone;
  layoutPreset?: InlineShellLayoutPreset;
  separatorStyle?: InlineShellSeparatorStyle;
  slotGap?: number;
  className?: string;
  justifyContentClass?: string;
  textStyle?: CSSProperties;
  onClick?: () => void;
}) {
  const label = resolveInlineShellLabel(labelText, text);
  const iconSize = 16;
  const iconStrokeWidth = 2;

  const leadingNode = leadingKind === 'icon'
    ? renderInlineIcon(leadingIcon, iconSize, iconStrokeWidth)
    : null;

  const labelNode = layoutPreset === 'icon-only'
    ? null
    : <span className="truncate">{label}</span>;

  const trailingValue = toTrimmedText(trailingText);
  const trailingNode = trailingKind === 'text'
    ? <span className="truncate text-current/78">{trailingValue || 'Meta'}</span>
    : trailingKind === 'badge'
      ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.78em] font-semibold uppercase tracking-[0.08em]',
              INLINE_SHELL_TONE_CLASS_MAP[trailingTone] ?? INLINE_SHELL_TONE_CLASS_MAP.primary,
            )}
          >
            {trailingValue || 'Badge'}
          </span>
        )
      : trailingKind === 'icon'
        ? renderInlineIcon(trailingIcon, iconSize, iconStrokeWidth)
        : null;

  const separatorNode = trailingNode && labelNode ? renderSeparator(separatorStyle) : null;

  const orderedNodes = (() => {
    switch (layoutPreset) {
      case 'leading-label':
        return [leadingNode, labelNode];
      case 'label-leading':
        return [labelNode, leadingNode];
      case 'label-trailing':
        return [labelNode, separatorNode, trailingNode];
      case 'leading-label-trailing':
        return [leadingNode, labelNode, separatorNode, trailingNode];
      case 'icon-only':
        return [leadingNode ?? renderInlineIcon(leadingIcon, iconSize, iconStrokeWidth)];
      case 'label-only':
      default:
        return [labelNode];
    }
  })().filter(Boolean);

  return (
    <Button
      variant={variant}
      className={cn('h-full w-full overflow-hidden', justifyContentClass, className)}
      style={{
        ...textStyle,
        gap: `${Math.max(0, Number(slotGap) || 0)}px`,
      }}
      onClick={onClick}
    >
      {orderedNodes}
    </Button>
  );
}

const getSlotAlignClass = (align?: string) => (
  align === 'start'
    ? 'items-start justify-start text-left'
    : align === 'end'
      ? 'items-end justify-end text-right'
      : 'items-center justify-center text-center'
);

const getSlotTextRoleClass = (slot: SlotShellSlot) => (
  slot.textRole === 'title'
    ? 'font-semibold tracking-[-0.01em] text-hr-text'
    : slot.textRole === 'meta'
      ? 'font-medium uppercase tracking-[0.08em] text-hr-muted'
      : 'text-hr-text'
);

const SLOT_ROW_HEIGHT_MAP: Record<SlotShellSize, number> = {
  sm: 36,
  md: 52,
  lg: 72,
};

const getSlotPreviewLabel = (slot: SlotShellSlot) => (
  slot.type === 'text'
    ? (slot.text?.trim() || 'Text')
    : slot.type === 'media'
      ? (slot.mediaKind === 'image'
        ? (slot.imageUrl?.trim() ? 'Image' : 'Image')
        : slot.mediaKind === 'video'
          ? 'Video'
          : 'Icon')
      : slot.type === 'spacer'
        ? 'Spacer'
        : slot.type === 'divider'
          ? 'Divider'
          : slot.type === 'object'
            ? (slot.objectLabel?.trim() || SLOT_OBJECT_LABEL_MAP[slot.objectKind ?? 'chart'])
            : ''
);

const renderSlotShellSlot = ({
  slot,
  row,
  selectedSlotId,
  onSelectSlot,
  interactive = false,
}: {
  slot: SlotShellSlot;
  row: SlotShellRow;
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string, rowId: string) => void;
  interactive?: boolean;
}) => {
  const sizeClassName = SLOT_TEXT_SIZE_CLASS_MAP[slot.size] ?? SLOT_TEXT_SIZE_CLASS_MAP.md;
  const slotAlignClassName = getSlotAlignClass(slot.align);
  const rowHeight = SLOT_ROW_HEIGHT_MAP[slot.size] ?? SLOT_ROW_HEIGHT_MAP.sm;
  const isSelected = selectedSlotId === slot.id;
  const previewLabel = getSlotPreviewLabel(slot);
  const cellClassName = cn(
    'relative flex h-full min-w-0 overflow-hidden rounded-lg transition-colors',
    interactive
      ? (
        isSelected
          ? 'border border-dashed border-hr-primary bg-hr-primary/8'
          : slot.type === 'empty'
            ? 'border border-dashed border-hr-border/80 bg-transparent'
            : 'border border-dashed border-hr-border/70 bg-white/80'
      )
      : 'border border-transparent bg-transparent',
    interactive && 'cursor-pointer',
  );
  const baseCellStyle: CSSProperties = {
    gridColumn: `span ${Math.max(1, slot.span)}`,
    minHeight: `${rowHeight}px`,
  };
  const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (!interactive || !onSelectSlot) return;
    event.stopPropagation();
    onSelectSlot(slot.id, row.id);
  };

  if (slot.type === 'empty') {
    const content = (
      <div
        className={cn(cellClassName, 'items-center justify-center')}
        style={baseCellStyle}
        title={slot.hoverText || 'Add slot atom'}
      >
        {interactive ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-hr-border/90 text-hr-muted">
            <IconGlyph icon="Plus" size={14} />
          </span>
        ) : null}
      </div>
    );

    return interactive ? (
      <button key={slot.id} type="button" className="contents" onClick={handleClick}>
        {content}
      </button>
    ) : (
      <div key={slot.id}>{content}</div>
    );
  }

  const mediaImageUrl = typeof slot.imageUrl === 'string' ? slot.imageUrl.trim() : '';
  const mediaVideoUrl = typeof slot.videoUrl === 'string' ? slot.videoUrl.trim() : '';
  const iconSize = SLOT_ICON_SIZE_MAP[slot.size] ?? SLOT_ICON_SIZE_MAP.md;
  const content = (() => {
    if (slot.type === 'media') {
      if (slot.mediaKind === 'image' && mediaImageUrl) {
        return (
          <img
            src={mediaImageUrl}
            alt=""
            className="h-full w-full rounded-md object-cover"
          />
        );
      }

      if (slot.mediaKind === 'video' && mediaVideoUrl) {
        return (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-hr-panel/70 text-hr-muted">
            <div className="flex items-center gap-2">
              <IconGlyph icon="Play" size={iconSize} />
              <span className={sizeClassName}>Video</span>
            </div>
          </div>
        );
      }

      return (
        <span className="inline-flex items-center justify-center text-hr-text">
          <IconGlyph icon={slot.icon} size={iconSize} />
        </span>
      );
    }

    if (slot.type === 'spacer') {
      return (
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-hr-muted/75">
          Spacer
        </span>
      );
    }

    if (slot.type === 'divider') {
      return (
        <div className="flex h-full w-full items-center">
          <div className="h-px w-full bg-hr-border/90" />
        </div>
      );
    }

    if (slot.type === 'object') {
      const objectLabel = typeof slot.objectLabel === 'string' && slot.objectLabel.trim()
        ? slot.objectLabel.trim()
        : SLOT_OBJECT_LABEL_MAP[slot.objectKind ?? 'chart'];

      return (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-hr-panel/55 px-3 py-3 text-center text-hr-muted">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-hr-muted/80">
              {slot.objectKind ?? 'chart'}
            </span>
            <span className={cn('font-medium text-hr-text', sizeClassName)}>
              {objectLabel}
            </span>
          </div>
        </div>
      );
    }

    return (
      <span className={cn('w-full whitespace-pre-wrap break-words', sizeClassName, getSlotTextRoleClass(slot))}>
        {slot.text || 'Text'}
      </span>
    );
  })();

  const cell = (
    <div
      className={cn(cellClassName, 'px-3 py-2', slotAlignClassName)}
      style={baseCellStyle}
      title={slot.hoverText || previewLabel}
    >
      {content}
    </div>
  );

  return interactive ? (
    <button key={slot.id} type="button" className="contents" onClick={handleClick}>
      {cell}
    </button>
  ) : (
    <div key={slot.id}>{cell}</div>
  );
};

export function SlotShellWidget({
  rowCount = 1,
  columnCount = 1,
  shellPaddingX = 4,
  shellPaddingY = 4,
  rowGap = 4,
  slotGap = 4,
  shellHoverText,
  rows,
  selectedSlotId,
  interactive = false,
  onSelectSlot,
  style,
}: {
  rowCount?: unknown;
  columnCount?: unknown;
  shellPaddingX?: unknown;
  shellPaddingY?: unknown;
  rowGap?: unknown;
  slotGap?: unknown;
  shellHoverText?: unknown;
  rows?: unknown;
  selectedSlotId?: string | null;
  interactive?: boolean;
  onSelectSlot?: (slotId: string, rowId: string) => void;
  style?: CSSProperties;
}) {
  const normalizedContract = normalizeSlotShellContract({
    rowCount,
    columnCount,
    rows,
  });
  const normalizedColumnCount = normalizedContract.columnCount;
  const normalizedRows = normalizedContract.rows;
  const normalizedPaddingX = Math.max(0, Number(shellPaddingX) || 0);
  const normalizedPaddingY = Math.max(0, Number(shellPaddingY) || 0);
  const normalizedRowGap = Math.max(0, Number(rowGap) || 0);
  const normalizedSlotGap = Math.max(0, Number(slotGap) || 0);
  const totalMinHeight = normalizedRows.reduce((height, row, rowIndex) => (
    height + (rowIndex > 0 ? normalizedRowGap : 0) + (getSlotShellRowHeightUnits(row) * 36)
  ), 0);

  return (
    <div
      className="flex h-full w-full min-w-0 overflow-visible text-hr-text"
      title={typeof shellHoverText === 'string' && shellHoverText.trim() ? shellHoverText : undefined}
      style={{
        ...style,
        paddingLeft: `${normalizedPaddingX}px`,
        paddingRight: `${normalizedPaddingX}px`,
        paddingTop: `${normalizedPaddingY}px`,
        paddingBottom: `${normalizedPaddingY}px`,
        minHeight: `${Math.max(36, totalMinHeight + normalizedPaddingY * 2)}px`,
      }}
    >
      <div
        className="grid h-full w-full min-w-0 content-start"
        style={{
          rowGap: `${normalizedRowGap}px`,
        }}
      >
        {normalizedRows.map((row) => (
          <div
            key={row.id}
            className="grid min-w-0 items-stretch"
            style={{
              gridTemplateColumns: `repeat(${normalizedColumnCount}, minmax(0, 1fr))`,
              columnGap: `${normalizedSlotGap}px`,
              rowGap: `${normalizedSlotGap}px`,
            }}
          >
            {row.slots.map((slot) => renderSlotShellSlot({
              slot,
              row,
              selectedSlotId,
              onSelectSlot,
              interactive,
            }))}
          </div>
        ))}
      </div>
    </div>
  );
}
