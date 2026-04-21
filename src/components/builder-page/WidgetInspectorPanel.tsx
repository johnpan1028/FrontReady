import type { ReactNode } from 'react';
import type { LegacyLayoutItem } from '../../core/projectDocument';
import type { BuilderPage as BuilderPageDocument, DataBinding, NodeAction } from '../../schema/project';
import type { WidgetData } from '../../store/builderStore';
import { getStudioWidgetDefinition } from '../../kit/definitions/widgetDefinitions';
import { StudioDefinitionInspector } from '../../kit/inspector/StudioDefinitionInspector';
import {
  InspectorField,
  InspectorNumberInput,
  InspectorSection,
  InspectorToggleField,
  inspectorInputClassName,
  inspectorTextareaClassName,
} from './InspectorPrimitives';
import { ActionsPanel, BindingsPanel } from '../ProtocolPanels';

export function WidgetInspectorPanel({
  selectedWidget,
  selectedLayoutItem,
  selectedPage,
  pages,
  sourceOptions,
  selectedBindings,
  selectedActions,
  selectedWidgetLayerLabel,
  selectedWidgetInspectorLabel,
  selectedWidgetSourceBadge,
  selectedWidgetSourceName,
  showCardLayoutControls,
  selectedCardControlMaxCols,
  selectedWidgetAutoOccupyRow,
  widgetInspectorFooter,
  updateSelectedWidgetProps,
  updateSelectedLayoutItem,
  updateSelectedWidgetAutoOccupyRow,
  handleCreateActionTargetPage,
}: {
  selectedWidget: WidgetData | null;
  selectedLayoutItem: LegacyLayoutItem | null;
  selectedPage: BuilderPageDocument | null;
  pages: BuilderPageDocument[];
  sourceOptions: Array<{ value: string; label: string }>;
  selectedBindings: DataBinding[];
  selectedActions: NodeAction[];
  selectedWidgetLayerLabel: string;
  selectedWidgetInspectorLabel: string;
  selectedWidgetSourceBadge: string;
  selectedWidgetSourceName: string;
  showCardLayoutControls: boolean;
  selectedCardControlMaxCols: number;
  selectedWidgetAutoOccupyRow: boolean;
  widgetInspectorFooter: ReactNode;
  updateSelectedWidgetProps: (props: Record<string, unknown>) => void;
  updateSelectedLayoutItem: (updates: Partial<Pick<LegacyLayoutItem, 'x' | 'y' | 'w' | 'h' | 'minW' | 'minH'>>) => void;
  updateSelectedWidgetAutoOccupyRow: (checked: boolean) => void;
  handleCreateActionTargetPage: (kind: BuilderPageDocument['kind']) => BuilderPageDocument | null;
}) {
  const selectedWidgetDefinition = selectedWidget
    ? getStudioWidgetDefinition(selectedWidget.type)
    : null;

  if (!selectedWidget) {
    return (
      <div className="builder-inspector-empty">
        Select an element on the canvas to edit its properties.
      </div>
    );
  }
  const showDefinitionInspector = Boolean(selectedWidgetDefinition);
  const shouldInsertSizingBeforeBorder = Boolean(
    selectedWidget.type !== 'panel' &&
    selectedWidgetDefinition?.inspector.some((section) => section.id === 'frame' || section.title === 'Border'),
  );
  const sizingInspectorSections = (
    <>
      {selectedLayoutItem ? (
        <InspectorSection title="Size">
          <div className="grid grid-cols-2 gap-3">
            <InspectorField label="Cols">
              <InspectorNumberInput
                min={1}
                max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                value={selectedLayoutItem.w || 1}
                disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                onChange={(value) => updateSelectedLayoutItem({ w: value })}
              />
            </InspectorField>

            <InspectorField label="Rows">
              <InspectorNumberInput
                min={1}
                value={selectedLayoutItem.h || 1}
                onChange={(value) => updateSelectedLayoutItem({ h: value })}
              />
            </InspectorField>

            <InspectorField label="Min Cols">
              <InspectorNumberInput
                min={1}
                max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                value={selectedLayoutItem.minW || 1}
                disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                onChange={(value) => updateSelectedLayoutItem({ minW: value })}
              />
            </InspectorField>

            <InspectorField label="Min Rows">
              <InspectorNumberInput
                min={1}
                value={selectedLayoutItem.minH || 1}
                onChange={(value) => updateSelectedLayoutItem({ minH: value })}
              />
            </InspectorField>
          </div>
        </InspectorSection>
      ) : null}

      <InspectorSection title="Pixel Constraints" defaultOpen={false}>
        <InspectorToggleField
          label="Scale with parent"
          checked={selectedWidget.props.scaleWithParent !== false}
          onChange={(checked) => updateSelectedWidgetProps({ scaleWithParent: checked })}
        />

        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Min Width (px)">
            <InspectorNumberInput
              min={0}
              placeholder="200"
              value={selectedWidget.props.minWidth || ''}
              onChange={(value) => updateSelectedWidgetProps({ minWidth: value })}
            />
          </InspectorField>

          <InspectorField label="Min Height (px)">
            <InspectorNumberInput
              min={0}
              placeholder="100"
              value={selectedWidget.props.minHeight || ''}
              onChange={(value) => updateSelectedWidgetProps({ minHeight: value })}
            />
          </InspectorField>
        </div>
      </InspectorSection>
    </>
  );

  return (
    <div className="builder-inspector-body">
      <InspectorSection
        title={selectedWidgetLayerLabel}
        collapsible={false}
        sideSlot={selectedWidgetSourceBadge ? (
          <span className="builder-inspector-chip">{selectedWidgetSourceBadge}</span>
        ) : null}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-hr-text">{selectedWidgetInspectorLabel}</div>
            {selectedWidgetSourceName ? (
              <div className="text-xs text-hr-muted">{selectedWidgetSourceName}</div>
            ) : null}
          </div>
        </div>
      </InspectorSection>

      {!shouldInsertSizingBeforeBorder ? sizingInspectorSections : null}

      {showDefinitionInspector ? (
        <StudioDefinitionInspector
          definition={selectedWidgetDefinition}
          value={selectedWidget}
          layoutItem={selectedLayoutItem}
          maxCols={showCardLayoutControls ? selectedCardControlMaxCols : 48}
          autoOccupyRow={selectedWidgetAutoOccupyRow}
          onUpdateProps={updateSelectedWidgetProps}
          onUpdateLayout={updateSelectedLayoutItem}
          onUpdateAutoOccupyRow={updateSelectedWidgetAutoOccupyRow}
          renderBeforeSection={(section) => (
            shouldInsertSizingBeforeBorder && (section.id === 'frame' || section.title === 'Border')
              ? sizingInspectorSections
              : null
          )}
        />
      ) : null}

      {!selectedWidgetDefinition && selectedWidget.type === 'panel' ? (
        <InspectorSection title="Card Shell">
          <InspectorField label="Title">
            <input
              type="text"
              className={inspectorInputClassName}
              value={selectedWidget.props.title || ''}
              onChange={(event) => updateSelectedWidgetProps({ title: event.target.value })}
            />
          </InspectorField>

          <InspectorField label="Layout">
            <select
              className={inspectorInputClassName}
              value={selectedWidget.props.layoutMode || 'grid'}
              onChange={(event) => updateSelectedWidgetProps({ layoutMode: event.target.value })}
            >
              <option value="grid">Grid</option>
              <option value="flex-row">Flex Row</option>
              <option value="flex-col">Flex Column</option>
            </select>
          </InspectorField>
        </InspectorSection>
      ) : null}

      {!selectedWidgetDefinition ? (
        <InspectorSection title="Handoff" defaultOpen={false}>
          <InspectorField label="Notes">
            <textarea
              className={inspectorTextareaClassName}
              placeholder="Describe what AI coding should mount or connect here."
              value={typeof selectedWidget.props.aiHandover === 'string' ? selectedWidget.props.aiHandover : ''}
              onChange={(event) => updateSelectedWidgetProps({ aiHandover: event.target.value })}
            />
          </InspectorField>
        </InspectorSection>
      ) : null}

      <BindingsPanel
        compact
        bindings={selectedBindings}
        sourceOptions={sourceOptions}
        onChange={(bindings) => updateSelectedWidgetProps({ bindings })}
      />

      <ActionsPanel
        compact
        actions={selectedActions}
        sourceOptions={sourceOptions}
        pages={pages}
        currentPageId={selectedPage?.id ?? null}
        onCreateTargetPage={handleCreateActionTargetPage}
        onChange={(actions) => updateSelectedWidgetProps({ actions })}
      />

      {widgetInspectorFooter ? <div className="pt-2">{widgetInspectorFooter}</div> : null}
    </div>
  );
}
