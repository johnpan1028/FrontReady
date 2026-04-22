import { nanoid } from 'nanoid';
import type { IconName } from '../components/atoms/IconButton';
import type { NodeAction } from '../schema/project';

export type SlotShellSlotType = 'empty' | 'text' | 'media' | 'spacer' | 'divider' | 'object';
export type SlotShellSlotSize = 'sm' | 'md' | 'lg';
export type SlotShellTextRole = 'title' | 'body' | 'meta';
export type SlotShellMediaKind = 'icon' | 'image' | 'video';
export type SlotShellObjectKind = 'chart' | 'table' | 'calendar' | 'media' | 'custom';
export type SlotShellSlotAlign = 'start' | 'center' | 'end';

export type SlotShellSlot = {
  id: string;
  type: SlotShellSlotType;
  span: number;
  size: SlotShellSlotSize;
  align: SlotShellSlotAlign;
  hoverText?: string;
  text?: string;
  textRole?: SlotShellTextRole;
  mediaKind?: SlotShellMediaKind;
  icon?: IconName;
  imageUrl?: string;
  videoUrl?: string;
  objectKind?: SlotShellObjectKind;
  objectLabel?: string;
  actions?: NodeAction[];
};

export type SlotShellRow = {
  id: string;
  slots: SlotShellSlot[];
};

export type NormalizedSlotShellContract = {
  rowCount: number;
  columnCount: number;
  rows: SlotShellRow[];
};

type SlotShellSlotOverrides = Partial<SlotShellSlot> & {
  graphicSource?: unknown;
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numericValue)));
};

const clampColumnCount = (value: unknown) => clampInteger(value, 1, 1, 12);
const clampRowCount = (value: unknown) => clampInteger(value, 1, 1, 12);
const clampSpan = (value: unknown, columnCount: number) => clampInteger(value, 1, 1, columnCount);

const normalizeSize = (value: unknown): SlotShellSlotSize => (
  value === 'md' || value === 'lg' ? value : 'sm'
);

const normalizeAlign = (value: unknown): SlotShellSlotAlign => (
  value === 'start' || value === 'end' ? value : 'center'
);

const normalizeType = (value: unknown): SlotShellSlotType => {
  if (
    value === 'text'
    || value === 'media'
    || value === 'spacer'
    || value === 'divider'
    || value === 'object'
    || value === 'empty'
  ) {
    return value;
  }

  if (value === 'graphic') return 'media';
  return 'empty';
};

const normalizeTextRole = (value: unknown): SlotShellTextRole => (
  value === 'title' || value === 'meta' ? value : 'body'
);

const normalizeMediaKind = (value: unknown): SlotShellMediaKind => (
  value === 'image' || value === 'video' ? value : 'icon'
);

const normalizeObjectKind = (value: unknown): SlotShellObjectKind => (
  value === 'table' || value === 'calendar' || value === 'media' || value === 'custom'
    ? value
    : 'chart'
);

export const getSlotShellRowSpanTotal = (row: SlotShellRow) => (
  row.slots.reduce((total, slot) => total + Math.max(1, Number(slot.span ?? 1)), 0)
);

export const createSlotShellSlot = (
  overrides: SlotShellSlotOverrides = {},
  columnCount = 1,
): SlotShellSlot => ({
  id: overrides.id ?? `slot_${nanoid(8)}`,
  type: normalizeType(overrides.type),
  span: clampSpan(overrides.span, columnCount),
  size: normalizeSize(overrides.size),
  align: normalizeAlign(overrides.align),
  hoverText: typeof overrides.hoverText === 'string' ? overrides.hoverText : '',
  text: typeof overrides.text === 'string' ? overrides.text : '',
  textRole: normalizeTextRole(overrides.textRole),
  mediaKind: normalizeMediaKind(overrides.mediaKind ?? overrides.graphicSource),
  icon: overrides.icon ?? 'Plus',
  imageUrl: typeof overrides.imageUrl === 'string' ? overrides.imageUrl : '',
  videoUrl: typeof overrides.videoUrl === 'string' ? overrides.videoUrl : '',
  objectKind: normalizeObjectKind(overrides.objectKind),
  objectLabel: typeof overrides.objectLabel === 'string' ? overrides.objectLabel : '',
  actions: Array.isArray(overrides.actions) ? overrides.actions : [],
});

export const createEmptySlotShellSlot = (
  overrides: Partial<SlotShellSlot> = {},
  columnCount = 1,
): SlotShellSlot => createSlotShellSlot({
  type: 'empty',
  size: 'sm',
  span: 1,
  ...overrides,
}, columnCount);

export const createSlotShellRow = (
  overrides: Partial<SlotShellRow> = {},
  columnCount = 1,
): SlotShellRow => ({
  id: overrides.id ?? `row_${nanoid(8)}`,
  slots: Array.isArray(overrides.slots) && overrides.slots.length > 0
    ? overrides.slots.map((slot) => createSlotShellSlot(slot, columnCount))
    : [createEmptySlotShellSlot({}, columnCount)],
});

export const createDefaultSlotShellRows = (
  rowCount = 1,
  columnCount = 1,
): SlotShellRow[] => (
  Array.from({ length: Math.max(1, rowCount) }, () => createSlotShellRow({}, columnCount))
);

const fitRowToColumnCount = (
  row: SlotShellRow,
  columnCount: number,
): SlotShellRow => {
  let slots = row.slots.map((slot) => createSlotShellSlot(slot, columnCount));
  if (slots.length === 0) {
    slots = [createEmptySlotShellSlot({ span: columnCount }, columnCount)];
  }

  let total = slots.reduce((sum, slot) => sum + slot.span, 0);

  while (total > columnCount && slots.length > 0) {
    const lastIndex = slots.length - 1;
    const last = slots[lastIndex];
    const overflow = total - columnCount;

    if (last.span > overflow) {
      slots[lastIndex] = { ...last, span: last.span - overflow };
      total -= overflow;
    } else if (slots.length > 1) {
      total -= last.span;
      slots = slots.slice(0, -1);
    } else {
      slots[lastIndex] = { ...last, span: columnCount };
      total = columnCount;
    }
  }

  while (total < columnCount) {
    slots = [...slots, createEmptySlotShellSlot({}, columnCount)];
    total += 1;
  }

  return {
    ...row,
    slots,
  };
};

export const normalizeSlotShellRows = (
  rows: unknown,
  rowCount: unknown = 1,
  columnCount: unknown = 1,
): SlotShellRow[] => {
  const normalizedRowCount = clampRowCount(rowCount);
  const normalizedColumnCount = clampColumnCount(columnCount);
  const baseRows = Array.isArray(rows) && rows.length > 0
    ? rows.map((row) => {
        const rowRecord = row as Partial<SlotShellRow>;
        return createSlotShellRow({
          id: typeof rowRecord.id === 'string' && rowRecord.id.trim()
            ? rowRecord.id
            : undefined,
          slots: Array.isArray(rowRecord.slots) ? rowRecord.slots : undefined,
        }, normalizedColumnCount);
      })
    : createDefaultSlotShellRows(normalizedRowCount, normalizedColumnCount);

  const nextRows = [...baseRows];
  while (nextRows.length < normalizedRowCount) {
    nextRows.push(createSlotShellRow({}, normalizedColumnCount));
  }

  return nextRows
    .slice(0, normalizedRowCount)
    .map((row) => fitRowToColumnCount(row, normalizedColumnCount));
};

export const normalizeSlotShellContract = ({
  rowCount,
  columnCount,
  rows,
}: {
  rowCount?: unknown;
  columnCount?: unknown;
  rows?: unknown;
}): NormalizedSlotShellContract => {
  const normalizedColumnCount = clampColumnCount(columnCount);
  const normalizedRowCount = clampRowCount(rowCount ?? (Array.isArray(rows) ? rows.length : 1));
  const normalizedRows = normalizeSlotShellRows(rows, normalizedRowCount, normalizedColumnCount);

  return {
    rowCount: normalizedRowCount,
    columnCount: normalizedColumnCount,
    rows: normalizedRows,
  };
};

export const getSlotShellSlotHeightUnits = (slot: SlotShellSlot) => (
  slot.size === 'lg' ? 3 : slot.size === 'md' ? 2 : 1
);

export const getSlotShellRowHeightUnits = (row: SlotShellRow) => (
  row.slots.reduce((maxHeight, slot) => Math.max(maxHeight, getSlotShellSlotHeightUnits(slot)), 1)
);

export const getSlotShellLayoutSpan = (contract: {
  rowCount?: unknown;
  columnCount?: unknown;
  rows?: unknown;
}) => {
  const normalizedContract = normalizeSlotShellContract(contract);
  return {
    w: normalizedContract.columnCount,
    h: normalizedContract.rows.reduce((total, row) => total + getSlotShellRowHeightUnits(row), 0),
    minW: 1,
    minH: 1,
  };
};

const getSlotShellTextSeed = (slot: SlotShellSlot) => {
  if (slot.type === 'text') {
    const text = typeof slot.text === 'string' ? slot.text.trim() : '';
    if (text.length > 0) return text.length;
    return slot.textRole === 'title' ? 18 : slot.textRole === 'meta' ? 10 : 24;
  }

  if (slot.type === 'object') {
    const label = typeof slot.objectLabel === 'string' ? slot.objectLabel.trim() : '';
    return label.length > 0 ? label.length : 18;
  }

  return 0;
};

const getSlotShellAuthoringSlotWidthUnits = (slot: SlotShellSlot) => {
  const baseByType = (() => {
    switch (slot.type) {
      case 'empty':
        return 8;
      case 'text': {
        const sizeBoost = slot.size === 'lg' ? 3 : slot.size === 'md' ? 2 : 1;
        return Math.max(6, Math.ceil(getSlotShellTextSeed(slot) / 4) + sizeBoost + 3);
      }
      case 'media':
        return slot.mediaKind === 'image' || slot.mediaKind === 'video' ? 12 : 5;
      case 'divider':
        return 12;
      case 'spacer':
        return 4;
      case 'object':
        return Math.max(10, Math.ceil(getSlotShellTextSeed(slot) / 4) + 6);
      default:
        return 8;
    }
  })();

  return Math.min(24, Math.max(4, baseByType + Math.max(0, slot.span - 1) * 2));
};

const getSlotShellAuthoringRowWidthUnits = (row: SlotShellRow) => (
  row.slots.reduce((total, slot, index) => (
    total + getSlotShellAuthoringSlotWidthUnits(slot) + (index > 0 ? 1 : 0)
  ), 0)
);

const getSlotShellAuthoringSlotHeightUnits = (slot: SlotShellSlot) => {
  switch (slot.type) {
    case 'empty':
      return 4;
    case 'divider':
      return 2;
    case 'object':
      return slot.size === 'lg' ? 8 : slot.size === 'md' ? 7 : 6;
    case 'media':
      return slot.mediaKind === 'image' || slot.mediaKind === 'video'
        ? (slot.size === 'lg' ? 8 : slot.size === 'md' ? 7 : 6)
        : (slot.size === 'lg' ? 5 : 4);
    case 'text':
      return slot.size === 'lg' ? 5 : slot.size === 'md' ? 4 : 3;
    case 'spacer':
      return 3;
    default:
      return 4;
  }
};

const getSlotShellAuthoringRowHeightUnits = (row: SlotShellRow) => (
  row.slots.reduce((maxHeight, slot) => Math.max(maxHeight, getSlotShellAuthoringSlotHeightUnits(slot)), 3)
);

export const getSlotShellAuthoringLayoutSpan = (contract: {
  rowCount?: unknown;
  columnCount?: unknown;
  rows?: unknown;
}) => {
  const normalizedContract = normalizeSlotShellContract(contract);
  const structuralLayout = getSlotShellLayoutSpan(contract);
  const previewWidth = normalizedContract.rows.reduce((maxWidth, row) => (
    Math.max(maxWidth, getSlotShellAuthoringRowWidthUnits(row))
  ), 8);
  const previewHeight = normalizedContract.rows.reduce((total, row, rowIndex) => (
    total + getSlotShellAuthoringRowHeightUnits(row) + (rowIndex > 0 ? 1 : 0)
  ), 0);

  return {
    w: Math.max(structuralLayout.w, Math.min(24, previewWidth)),
    h: Math.max(structuralLayout.h, Math.min(18, previewHeight)),
    minW: 4,
    minH: 3,
  };
};

export const duplicateSlotShellRow = (
  rows: SlotShellRow[],
  rowId: string,
  columnCount: number,
) => {
  const rowIndex = rows.findIndex((row) => row.id === rowId);
  if (rowIndex === -1) return rows;

  const duplicate = createSlotShellRow({
    slots: rows[rowIndex].slots.map((slot) => ({
      ...slot,
      id: undefined,
      actions: Array.isArray(slot.actions) ? [...slot.actions] : [],
    })),
  }, columnCount);

  return [
    ...rows.slice(0, rowIndex + 1),
    duplicate,
    ...rows.slice(rowIndex + 1),
  ];
};

export const mergeSlotShellSlotRight = (
  rows: SlotShellRow[],
  rowId: string,
  slotId: string,
  columnCount: number,
) => rows.map((row) => {
  if (row.id !== rowId) return row;

  const slotIndex = row.slots.findIndex((slot) => slot.id === slotId);
  if (slotIndex === -1 || slotIndex >= row.slots.length - 1) return row;

  const currentSlot = row.slots[slotIndex];
  const nextSlot = row.slots[slotIndex + 1];

  return fitRowToColumnCount({
    ...row,
    slots: [
      ...row.slots.slice(0, slotIndex),
      {
        ...currentSlot,
        span: clampSpan(currentSlot.span + nextSlot.span, columnCount),
      },
      ...row.slots.slice(slotIndex + 2),
    ],
  }, columnCount);
});

export const splitSlotShellSlot = (
  rows: SlotShellRow[],
  rowId: string,
  slotId: string,
  columnCount: number,
) => rows.map((row) => {
  if (row.id !== rowId) return row;

  const slotIndex = row.slots.findIndex((slot) => slot.id === slotId);
  if (slotIndex === -1) return row;

  const slot = row.slots[slotIndex];
  if (slot.span <= 1) {
    return fitRowToColumnCount({
      ...row,
      slots: [
        ...row.slots.slice(0, slotIndex + 1),
        createEmptySlotShellSlot({}, columnCount),
        ...row.slots.slice(slotIndex + 1),
      ],
    }, columnCount);
  }

  return fitRowToColumnCount({
    ...row,
    slots: [
      ...row.slots.slice(0, slotIndex),
      { ...slot, span: slot.span - 1 },
      createEmptySlotShellSlot({}, columnCount),
      ...row.slots.slice(slotIndex + 1),
    ],
  }, columnCount);
});

export const extractSlotShellLabel = (rows: unknown): string | undefined => {
  const normalizedRows = normalizeSlotShellRows(
    rows,
    Array.isArray(rows) && rows.length > 0 ? rows.length : 1,
    Array.isArray(rows) && rows.length > 0
      ? rows.reduce((maxColumns, row) => {
          const rowRecord = row as Partial<SlotShellRow>;
          const spanTotal = Array.isArray(rowRecord.slots)
            ? rowRecord.slots.reduce((total, slot) => total + clampSpan((slot as Partial<SlotShellSlot>)?.span, 12), 0)
            : 1;
          return Math.max(maxColumns, spanTotal);
        }, 1)
      : 1,
  );

  for (const row of normalizedRows) {
    for (const slot of row.slots) {
      if (slot.type === 'text' && typeof slot.text === 'string' && slot.text.trim()) {
        return slot.text.trim();
      }
      if (slot.type === 'object' && typeof slot.objectLabel === 'string' && slot.objectLabel.trim()) {
        return slot.objectLabel.trim();
      }
    }
  }

  return undefined;
};
