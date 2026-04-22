import { CopyPlus, Minus, Plus, Split } from 'lucide-react';
import type { BuilderPage, NodeAction } from '../../schema/project';
import type { IconName } from '../atoms/IconButton';
import { ICON_LIST } from '../atoms/IconButton';
import {
  createEmptySlotShellSlot,
  createSlotShellRow,
  duplicateSlotShellRow,
  mergeSlotShellSlotRight,
  normalizeSlotShellContract,
  splitSlotShellSlot,
  type SlotShellRow,
  type SlotShellSlot,
} from '../../builder/slotShell';
import { ActionsPanel } from '../ProtocolPanels';
import {
  InspectorField,
  InspectorNumberInput,
  InspectorSection,
  inspectorInputClassName,
  inspectorTextareaClassName,
} from './InspectorPrimitives';

const SLOT_TYPE_OPTIONS = [
  { label: 'Empty', value: 'empty' },
  { label: 'Text', value: 'text' },
  { label: 'Media', value: 'media' },
  { label: 'Spacer', value: 'spacer' },
  { label: 'Divider', value: 'divider' },
  { label: 'Object', value: 'object' },
] as const;

const SLOT_SIZE_OPTIONS = [
  { label: 'S', value: 'sm' },
  { label: 'M', value: 'md' },
  { label: 'L', value: 'lg' },
] as const;

const SLOT_ALIGN_OPTIONS = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
] as const;

const TEXT_ROLE_OPTIONS = [
  { label: 'Title', value: 'title' },
  { label: 'Body', value: 'body' },
  { label: 'Meta', value: 'meta' },
] as const;

const MEDIA_KIND_OPTIONS = [
  { label: 'Icon', value: 'icon' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
] as const;

const OBJECT_KIND_OPTIONS = [
  { label: 'Chart', value: 'chart' },
  { label: 'Table', value: 'table' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Media', value: 'media' },
  { label: 'Custom', value: 'custom' },
] as const;

const actionButtonClassName = 'page-board-add-chip h-7 min-h-7 px-2 text-[11px]';

const findRowBySlotId = (rows: SlotShellRow[], slotId: string | null | undefined) => (
  rows.find((row) => row.slots.some((slot) => slot.id === slotId)) ?? null
);

const findSlotById = (rows: SlotShellRow[], slotId: string | null | undefined) => {
  for (const row of rows) {
    const slot = row.slots.find((entry) => entry.id === slotId);
    if (slot) return { row, slot };
  }

  return null;
};

const updateRows = (
  rows: SlotShellRow[],
  rowId: string,
  updater: (row: SlotShellRow) => SlotShellRow,
) => rows.map((row) => (row.id === rowId ? updater(row) : row));

const updateSlot = (
  rows: SlotShellRow[],
  rowId: string,
  slotId: string,
  updater: (slot: SlotShellSlot) => SlotShellSlot,
) => updateRows(rows, rowId, (row) => ({
  ...row,
  slots: row.slots.map((slot) => (slot.id === slotId ? updater(slot) : slot)),
}));

export function SlotShellStructureSection({
  props,
  selectedSlotId,
  onUpdateProps,
}: {
  props: Record<string, unknown>;
  selectedSlotId?: string | null;
  onUpdateProps: (props: Record<string, unknown>) => void;
}) {
  const contract = normalizeSlotShellContract(props);
  const activeRow = findRowBySlotId(contract.rows, selectedSlotId) ?? contract.rows[contract.rows.length - 1] ?? null;

  const applyContract = (nextRows: SlotShellRow[], nextOverrides: Record<string, unknown> = {}) => {
    const nextContract = normalizeSlotShellContract({
      rowCount: nextOverrides.rowCount ?? contract.rowCount,
      columnCount: nextOverrides.columnCount ?? contract.columnCount,
      rows: nextRows,
    });

    onUpdateProps({
      rowCount: nextContract.rowCount,
      columnCount: nextContract.columnCount,
      rows: nextContract.rows,
      ...nextOverrides,
    });
  };

  const handleRowCountChange = (value: number) => {
    const nextContract = normalizeSlotShellContract({
      rowCount: value,
      columnCount: contract.columnCount,
      rows: contract.rows,
    });

    onUpdateProps({
      rowCount: nextContract.rowCount,
      columnCount: nextContract.columnCount,
      rows: nextContract.rows,
    });
  };

  const handleColumnCountChange = (value: number) => {
    const nextContract = normalizeSlotShellContract({
      rowCount: contract.rowCount,
      columnCount: value,
      rows: contract.rows,
    });

    onUpdateProps({
      rowCount: nextContract.rowCount,
      columnCount: nextContract.columnCount,
      rows: nextContract.rows,
    });
  };

  const duplicateActiveRow = () => {
    if (!activeRow) return;
    applyContract(
      duplicateSlotShellRow(contract.rows, activeRow.id, contract.columnCount),
      { rowCount: Math.min(12, contract.rowCount + 1) },
    );
  };

  const addRow = () => {
    applyContract(
      [...contract.rows, createSlotShellRow({}, contract.columnCount)],
      { rowCount: Math.min(12, contract.rowCount + 1) },
    );
  };

  const removeActiveRow = () => {
    if (contract.rows.length <= 1 || !activeRow) return;
    applyContract(
      contract.rows.filter((row) => row.id !== activeRow.id),
      { rowCount: Math.max(1, contract.rowCount - 1) },
    );
  };

  return (
    <>
      <InspectorSection title="Shell">
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Rows">
            <InspectorNumberInput
              min={1}
              max={12}
              value={contract.rowCount}
              onChange={handleRowCountChange}
            />
          </InspectorField>

          <InspectorField label="Columns">
            <InspectorNumberInput
              min={1}
              max={12}
              value={contract.columnCount}
              onChange={handleColumnCountChange}
            />
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection
        title="Rows"
        sideSlot={(
          <button type="button" className={actionButtonClassName} onClick={addRow}>
            <Plus size={12} />
            Add
          </button>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={actionButtonClassName} onClick={duplicateActiveRow}>
            <CopyPlus size={12} />
            Duplicate
          </button>

          <button
            type="button"
            className={`${actionButtonClassName} page-board-add-chip-danger`}
            disabled={contract.rows.length <= 1}
            onClick={removeActiveRow}
          >
            <Minus size={12} />
            Remove
          </button>
        </div>
      </InspectorSection>
    </>
  );
}

export function SlotShellSlotSection({
  props,
  selectedSlotId,
  sourceOptions,
  pages,
  currentPageId,
  onUpdateProps,
  onCreateTargetPage,
}: {
  props: Record<string, unknown>;
  selectedSlotId: string;
  sourceOptions: Array<{ value: string; label: string }>;
  pages: BuilderPage[];
  currentPageId: string | null;
  onUpdateProps: (props: Record<string, unknown>) => void;
  onCreateTargetPage: (kind: BuilderPage['kind']) => BuilderPage | null;
}) {
  const contract = normalizeSlotShellContract(props);
  const selectedSlotEntry = findSlotById(contract.rows, selectedSlotId);

  if (!selectedSlotEntry) {
    return (
      <InspectorSection title="Slot">
        <div className="text-xs text-hr-muted">Select a slot.</div>
      </InspectorSection>
    );
  }

  const { row, slot } = selectedSlotEntry;
  const applyRows = (nextRows: SlotShellRow[]) => {
    const nextContract = normalizeSlotShellContract({
      rowCount: contract.rowCount,
      columnCount: contract.columnCount,
      rows: nextRows,
    });

    onUpdateProps({
      rowCount: nextContract.rowCount,
      columnCount: nextContract.columnCount,
      rows: nextContract.rows,
    });
  };

  const applySlot = (updater: (current: SlotShellSlot) => SlotShellSlot) => {
    applyRows(updateSlot(contract.rows, row.id, slot.id, updater));
  };

  const convertType = (value: SlotShellSlot['type']) => {
    applySlot((current) => ({
      ...current,
      type: value,
      text: value === 'text' ? (current.text || 'Text') : '',
      mediaKind: value === 'media' ? (current.mediaKind ?? 'icon') : current.mediaKind,
      objectLabel: value === 'object' ? (current.objectLabel || 'Object') : current.objectLabel,
    }));
  };

  const joinRight = () => {
    applyRows(mergeSlotShellSlotRight(contract.rows, row.id, slot.id, contract.columnCount));
  };

  const splitCurrent = () => {
    applyRows(splitSlotShellSlot(contract.rows, row.id, slot.id, contract.columnCount));
  };

  return (
    <>
      <InspectorSection
        title="Slot"
        sideSlot={(
          <button type="button" className={actionButtonClassName} onClick={joinRight}>
            <Plus size={12} />
            Join
          </button>
        )}
        rightSlot={(
          <button type="button" className={actionButtonClassName} onClick={splitCurrent}>
            <Split size={12} />
          </button>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Type">
            <select
              className={inspectorInputClassName}
              value={slot.type}
              onChange={(event) => convertType(event.target.value as SlotShellSlot['type'])}
            >
              {SLOT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>

          <InspectorField label="Size">
            <select
              className={inspectorInputClassName}
              value={slot.size}
              onChange={(event) => applySlot((current) => ({
                ...current,
                size: event.target.value as SlotShellSlot['size'],
              }))}
            >
              {SLOT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>

          <InspectorField label="Span">
            <InspectorNumberInput
              min={1}
              max={contract.columnCount}
              value={slot.span}
              onChange={(value) => applySlot((current) => ({
                ...current,
                span: value,
              }))}
            />
          </InspectorField>

          <InspectorField label="Align">
            <select
              className={inspectorInputClassName}
              value={slot.align}
              onChange={(event) => applySlot((current) => ({
                ...current,
                align: event.target.value as SlotShellSlot['align'],
              }))}
            >
              {SLOT_ALIGN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>
        </div>
      </InspectorSection>

      {slot.type === 'text' ? (
        <InspectorSection title="Text">
          <InspectorField label="Content">
            <textarea
              className={inspectorTextareaClassName}
              value={slot.text ?? ''}
              onChange={(event) => applySlot((current) => ({
                ...current,
                text: event.target.value,
              }))}
            />
          </InspectorField>

          <InspectorField label="Role">
            <select
              className={inspectorInputClassName}
              value={slot.textRole ?? 'body'}
              onChange={(event) => applySlot((current) => ({
                ...current,
                textRole: event.target.value as SlotShellSlot['textRole'],
              }))}
            >
              {TEXT_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>
        </InspectorSection>
      ) : null}

      {slot.type === 'media' ? (
        <InspectorSection title="Media">
          <InspectorField label="Kind">
            <select
              className={inspectorInputClassName}
              value={slot.mediaKind ?? 'icon'}
              onChange={(event) => applySlot((current) => ({
                ...current,
                mediaKind: event.target.value as SlotShellSlot['mediaKind'],
              }))}
            >
              {MEDIA_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>

          {(slot.mediaKind ?? 'icon') === 'icon' ? (
            <InspectorField label="Icon">
              <select
                className={inspectorInputClassName}
                value={slot.icon ?? 'Plus'}
                onChange={(event) => applySlot((current) => ({
                  ...current,
                  icon: event.target.value as IconName,
                }))}
              >
                {ICON_LIST.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </InspectorField>
          ) : (
            <InspectorField label={(slot.mediaKind ?? 'icon') === 'video' ? 'Video URL' : 'Image URL'}>
              <input
                type="text"
                className={inspectorInputClassName}
                value={(slot.mediaKind ?? 'icon') === 'video' ? (slot.videoUrl ?? '') : (slot.imageUrl ?? '')}
                onChange={(event) => applySlot((current) => ({
                  ...current,
                  videoUrl: (current.mediaKind ?? 'icon') === 'video' ? event.target.value : current.videoUrl,
                  imageUrl: (current.mediaKind ?? 'icon') === 'image' ? event.target.value : current.imageUrl,
                }))}
              />
            </InspectorField>
          )}
        </InspectorSection>
      ) : null}

      {slot.type === 'object' ? (
        <InspectorSection title="Object">
          <InspectorField label="Kind">
            <select
              className={inspectorInputClassName}
              value={slot.objectKind ?? 'chart'}
              onChange={(event) => applySlot((current) => ({
                ...current,
                objectKind: event.target.value as SlotShellSlot['objectKind'],
              }))}
            >
              {OBJECT_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </InspectorField>

          <InspectorField label="Label">
            <input
              type="text"
              className={inspectorInputClassName}
              value={slot.objectLabel ?? ''}
              onChange={(event) => applySlot((current) => ({
                ...current,
                objectLabel: event.target.value,
              }))}
            />
          </InspectorField>
        </InspectorSection>
      ) : null}

      <InspectorSection title="Logic" defaultOpen={false}>
        <ActionsPanel
          compact
          actions={Array.isArray(slot.actions) ? slot.actions as NodeAction[] : []}
          sourceOptions={sourceOptions}
          pages={pages}
          currentPageId={currentPageId}
          onCreateTargetPage={onCreateTargetPage}
          onChange={(actions) => applySlot((current) => ({
            ...current,
            actions,
          }))}
        />
      </InspectorSection>
    </>
  );
}
