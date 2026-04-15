import type { ReactNode } from 'react';
import type { LegacyLayoutItem } from '../../core/projectDocument';
import type { BuilderPage as BuilderPageDocument, DataBinding, NodeAction } from '../../schema/project';
import type { WidgetData } from '../../store/builderStore';
import { ActionsPanel, BindingsPanel } from '../ProtocolPanels';

export function WidgetInspectorPanel({
  selectedWidget,
  selectedLayoutItem,
  selectedPage,
  pages,
  sourceOptions,
  selectedBindings,
  selectedActions,
  isMinimalWidgetInspector,
  selectedWidgetLayerLabel,
  selectedWidgetInspectorLabel,
  selectedWidgetSourceBadge,
  selectedWidgetSourceName,
  showCardLayoutControls,
  selectedCardControlMaxCols,
  selectedWidgetAutoOccupyRow,
  isShadcnLoginComposite,
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
  isMinimalWidgetInspector: boolean;
  selectedWidgetLayerLabel: string;
  selectedWidgetInspectorLabel: string;
  selectedWidgetSourceBadge: string;
  selectedWidgetSourceName: string;
  showCardLayoutControls: boolean;
  selectedCardControlMaxCols: number;
  selectedWidgetAutoOccupyRow: boolean;
  isShadcnLoginComposite: boolean;
  widgetInspectorFooter: ReactNode;
  updateSelectedWidgetProps: (props: Record<string, unknown>) => void;
  updateSelectedLayoutItem: (updates: Partial<Pick<LegacyLayoutItem, 'x' | 'y' | 'w' | 'h' | 'minW' | 'minH'>>) => void;
  updateSelectedWidgetAutoOccupyRow: (checked: boolean) => void;
  handleCreateActionTargetPage: (kind: BuilderPageDocument['kind']) => BuilderPageDocument | null;
}) {
  return (
    <>
      {!selectedWidget ? (
              <div className="text-sm text-hr-muted text-center py-4">
                Select an element on the canvas to edit its properties.
              </div>
            ) : isMinimalWidgetInspector ? (
              <>
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">{selectedWidgetLayerLabel}</div>
                          <div className="mt-1 text-sm font-medium text-hr-text">
                            {selectedWidgetInspectorLabel}
                          </div>
                        </div>
                        {selectedWidgetSourceBadge ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-hr-border bg-hr-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-hr-muted">
                            {selectedWidgetSourceBadge}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-hr-text">Component ID</label>
                        <div className="rounded-lg border border-hr-border bg-hr-bg px-3 py-2 text-[11px] font-mono text-hr-muted">
                          {selectedWidget.id}
                        </div>
                      </div>

                      {selectedWidgetSourceName ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Source</label>
                          <div className="rounded-lg border border-hr-border bg-hr-bg px-3 py-2 text-xs text-hr-muted">
                            {selectedWidgetSourceName}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {selectedLayoutItem ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Size</div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Cols</label>
                          <input
                            type="number"
                            min="1"
                            max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedLayoutItem.w || 1}
                            disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                            onChange={(e) => updateSelectedLayoutItem({ w: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Rows</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedLayoutItem.h || 1}
                            onChange={(e) => updateSelectedLayoutItem({ h: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Min Cols</label>
                          <input
                            type="number"
                            min="1"
                            max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedLayoutItem.minW || 1}
                            disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                            onChange={(e) => updateSelectedLayoutItem({ minW: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Min Rows</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedLayoutItem.minH || 1}
                            onChange={(e) => updateSelectedLayoutItem({ minH: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showCardLayoutControls && selectedLayoutItem ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Card Layout</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <label className="flex items-center gap-2 text-sm text-hr-text">
                          <input
                            type="checkbox"
                            className="rounded border-hr-border text-hr-primary focus:ring-hr-primary"
                            checked={selectedWidgetAutoOccupyRow}
                            onChange={(e) => updateSelectedWidgetAutoOccupyRow(e.target.checked)}
                          />
                          Auto occupy row
                        </label>
                        <div className="rounded-lg border border-hr-border bg-hr-bg px-3 py-2 text-[11px] leading-5 text-hr-muted">
                          Fill-row items lock to a single row and track the card width. Free items keep their own width and only drop when the row still fits.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'panel' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">{isShadcnLoginComposite ? 'Card Composition' : 'Card Shell'}</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Title</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.title || ''}
                            onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Layout</label>
                          <select
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                            value={selectedWidget.props.layoutMode || 'grid'}
                            onChange={(e) => updateSelectedWidgetProps({ layoutMode: e.target.value })}
                          >
                            <option value="grid">Grid</option>
                            <option value="flex-row">Flex Row</option>
                            <option value="flex-col">Flex Column</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-hr-text">
                          <input
                            type="checkbox"
                            className="rounded border-hr-border text-hr-primary focus:ring-hr-primary"
                            checked={selectedWidget.props.showHeader !== false}
                            onChange={(e) => updateSelectedWidgetProps({ showHeader: e.target.checked })}
                          />
                          Show Header
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'heading' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Text</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Heading</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.text || ''}
                            onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Size</label>
                          <select
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                            value={selectedWidget.props.size || 'md'}
                            onChange={(e) => updateSelectedWidgetProps({ size: e.target.value })}
                          >
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'text' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Text</div>
                      <div className="mt-3 flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-hr-text">Content</label>
                        <textarea
                          className="min-h-[104px] w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm leading-5 text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                          value={selectedWidget.props.text || ''}
                          onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'text_input' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Input</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Label</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.label || ''}
                            onChange={(e) => updateSelectedWidgetProps({ label: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Placeholder</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.placeholder || ''}
                            onChange={(e) => updateSelectedWidgetProps({ placeholder: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-hr-text">Chrome</label>
                            <select
                              className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                              value={selectedWidget.props.chrome || 'ghost'}
                              onChange={(e) => updateSelectedWidgetProps({ chrome: e.target.value })}
                            >
                              <option value="ghost">Ghost</option>
                              <option value="field">Field</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-hr-text">Type</label>
                            <select
                              className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                              value={selectedWidget.props.type || 'text'}
                              onChange={(e) => updateSelectedWidgetProps({ type: e.target.value })}
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="password">Password</option>
                              <option value="search">Search</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-hr-text">State Key</label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                              value={selectedWidget.props.stateKey || ''}
                              onChange={(e) => updateSelectedWidgetProps({ stateKey: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'button' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Action</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Label</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.text || ''}
                            onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Variant</label>
                          <select
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary"
                            value={selectedWidget.props.variant || 'primary'}
                            onChange={(e) => updateSelectedWidgetProps({ variant: e.target.value })}
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="outline">Outline</option>
                            <option value="ghost">Ghost</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedWidget.type === 'shadcn_login_card' ? (
                    <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">Content</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Title</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.title || ''}
                            onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Description</label>
                          <textarea
                            className="min-h-[84px] w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm leading-5 text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.description || ''}
                            onChange={(e) => updateSelectedWidgetProps({ description: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Primary Action</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.actionLabel || ''}
                            onChange={(e) => updateSelectedWidgetProps({ actionLabel: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Secondary Action</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.secondaryActionLabel || ''}
                            onChange={(e) => updateSelectedWidgetProps({ secondaryActionLabel: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-hr-text">Alternate Action</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                            value={selectedWidget.props.alternateActionLabel || ''}
                            onChange={(e) => updateSelectedWidgetProps({ alternateActionLabel: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-hr-border bg-hr-panel p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hr-muted">AI Handoff</div>
                    <div className="mt-3">
                      <textarea
                        className="min-h-[104px] w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-sm leading-5 text-hr-text focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                        placeholder="Describe what AI coding should mount or connect here."
                        value={typeof selectedWidget.props.aiHandover === 'string' ? selectedWidget.props.aiHandover : ''}
                        onChange={(e) => updateSelectedWidgetProps({ aiHandover: e.target.value })}
                      />
                    </div>
                  </div>

                  {widgetInspectorFooter}
                </div>
              </>
            ) : (
              <>
              <div className="flex flex-col gap-3 pb-4 border-b border-hr-border">
                <h3 className="text-xs font-semibold text-hr-text uppercase tracking-wider">Component Contract</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">Component ID</label>
                  <input
                    type="text"
                    name="selectedComponentId"
                    className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-xs font-mono text-hr-muted focus:outline-none"
                    value={selectedWidget.id}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">Component Type</label>
                  <input
                    type="text"
                    name="selectedComponentType"
                    className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm text-hr-muted focus:outline-none"
                    value={selectedWidget.type}
                    readOnly
                  />
                </div>
                <p className="text-[11px] leading-5 text-hr-muted">
                  This immutable ID is the component contract used by topology links, project bundles, deliverables, and future AI/backend handoff.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">AI Handover</label>
                  <textarea
                    className="min-h-[92px] w-full rounded-md border border-hr-border bg-hr-bg px-3 py-2 text-xs leading-5 text-hr-text focus:outline-none focus:border-hr-primary"
                    placeholder="Tell AI coding what this component should eventually mount, fetch, or connect."
                    value={typeof selectedWidget.props.aiHandover === 'string' ? selectedWidget.props.aiHandover : ''}
                    onChange={(e) => updateSelectedWidgetProps({ aiHandover: e.target.value })}
                  />
                </div>
              </div>

              {selectedLayoutItem && (
                <div className="flex flex-col gap-3 pb-4 border-b border-hr-border">
                  <h3 className="text-xs font-semibold text-hr-text uppercase tracking-wider">Grid Layout (Cols/Rows)</h3>
                  <p className="text-[11px] text-hr-muted">
                    Cols/Rows are responsive units. Pixel size can change with canvas width.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-hr-text">Width</label>
                      <input 
                        type="number" 
                        min="1"
                        max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                        className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                        value={selectedLayoutItem.w || 1}
                        disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                        onChange={(e) => updateSelectedLayoutItem({ w: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-hr-text">Height</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                        value={selectedLayoutItem.h || 1}
                        onChange={(e) => updateSelectedLayoutItem({ h: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-hr-text">Min Width (cols)</label>
                      <input 
                        type="number" 
                        min="1"
                        max={showCardLayoutControls ? selectedCardControlMaxCols : 48}
                        className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                        value={selectedLayoutItem.minW || 1}
                        disabled={showCardLayoutControls && selectedWidgetAutoOccupyRow}
                        onChange={(e) => updateSelectedLayoutItem({ minW: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-hr-text">Min Height (rows)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                        value={selectedLayoutItem.minH || 1}
                        onChange={(e) => updateSelectedLayoutItem({ minH: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showCardLayoutControls && selectedLayoutItem && (
                <div className="flex flex-col gap-3 pb-4 border-b border-hr-border">
                  <h3 className="text-xs font-semibold text-hr-text uppercase tracking-wider">Card Layout</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoOccupyRow"
                      className="rounded border-hr-border text-hr-primary focus:ring-hr-primary"
                      checked={selectedWidgetAutoOccupyRow}
                      onChange={(e) => updateSelectedWidgetAutoOccupyRow(e.target.checked)}
                    />
                    <label htmlFor="autoOccupyRow" className="text-sm text-hr-text cursor-pointer">Auto occupy row</label>
                  </div>
                  <p className="text-[11px] leading-5 text-hr-muted">
                    Fill-row items stay on their own line and follow the card width. Free items keep their own width and only land when the row has enough space.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pb-4 border-b border-hr-border">
                <h3 className="text-xs font-semibold text-hr-text uppercase tracking-wider">Pixel Constraints</h3>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="scaleWithParent"
                    className="rounded border-hr-border text-hr-primary focus:ring-hr-primary"
                    checked={selectedWidget.props.scaleWithParent !== false}
                    onChange={(e) => updateSelectedWidgetProps({ scaleWithParent: e.target.checked })}
                  />
                  <label htmlFor="scaleWithParent" className="text-sm text-hr-text cursor-pointer">Scale with parent</label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Min Width (px)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 200"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.minWidth || ''}
                      onChange={(e) => updateSelectedWidgetProps({ minWidth: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Min Height (px)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.minHeight || ''}
                      onChange={(e) => updateSelectedWidgetProps({ minHeight: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Property Editors based on type */}
              {selectedWidget.type === 'panel' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Card Title</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.title || ''}
                      onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="showHeader"
                      className="rounded border-hr-border text-hr-primary focus:ring-hr-primary"
                      checked={selectedWidget.props.showHeader !== false}
                      onChange={(e) => updateSelectedWidgetProps({ showHeader: e.target.checked })}
                    />
                    <label htmlFor="showHeader" className="text-sm text-hr-text cursor-pointer">Show Card Header</label>
                  </div>
                </>
              )}

              {selectedWidget.type === 'heading' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">Heading Text</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                    value={selectedWidget.props.text || ''}
                    onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                  />
                </div>
              )}

              {selectedWidget.type === 'text' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">Paragraph Content</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary min-h-[100px]"
                    value={selectedWidget.props.text || ''}
                    onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                  />
                </div>
              )}

              {selectedWidget.type === 'button' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Button Label</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.text || ''}
                      onChange={(e) => updateSelectedWidgetProps({ text: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Variant</label>
                    <select 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.variant || 'primary'}
                      onChange={(e) => updateSelectedWidgetProps({ variant: e.target.value })}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                      <option value="ghost">Ghost</option>
                    </select>
                  </div>
                </>
              )}

              {selectedWidget.type === 'stat' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Title</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.title || ''}
                      onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Value</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.value || ''}
                      onChange={(e) => updateSelectedWidgetProps({ value: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Trend</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.trend || ''}
                      onChange={(e) => updateSelectedWidgetProps({ trend: e.target.value })}
                    />
                  </div>
                </>
              )}
              
              {selectedWidget.type === 'chart' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Chart Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.title || ''}
                      onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Value</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.value || ''}
                      onChange={(e) => updateSelectedWidgetProps({ value: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Trend</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.trend || ''}
                      onChange={(e) => updateSelectedWidgetProps({ trend: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Chart Style</label>
                    <select
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary"
                      value={selectedWidget.props.variant || 'line'}
                      onChange={(e) => updateSelectedWidgetProps({ variant: e.target.value })}
                    >
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </div>
                </>
              )}

              {selectedWidget.type === 'calendar' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.title || ''}
                      onChange={(e) => updateSelectedWidgetProps({ title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Subtitle</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.subtitle || ''}
                      onChange={(e) => updateSelectedWidgetProps({ subtitle: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Month</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.month || ''}
                      onChange={(e) => updateSelectedWidgetProps({ month: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Selected Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary focus:ring-1 focus:ring-hr-primary"
                      value={selectedWidget.props.selectedDate || ''}
                      onChange={(e) => updateSelectedWidgetProps({ selectedDate: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* ── IconButton props ── */}
              {selectedWidget.type === 'icon_button' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Icon</label>
                    <select
                      className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary"
                      value={selectedWidget.props.icon || 'X'}
                      onChange={(e) => updateSelectedWidgetProps({ icon: e.target.value })}
                    >
                      {['X','Minimize2','Maximize2','ChevronDown','ChevronUp','ChevronRight','ChevronLeft','Settings','Trash2','Plus','Minus','RefreshCw','Edit','Save','Search','Bell','Info','AlertTriangle','Check','Menu','MoreHorizontal','MoreVertical','Eye','EyeOff','Lock','Unlock','Star','Heart','Home','User','Users','Mail','ArrowLeft','ArrowRight','Filter'].map(ic => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Size</label>
                    <select className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.size || 'md'} onChange={(e) => updateSelectedWidgetProps({ size: e.target.value })}>
                      <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Variant</label>
                    <select className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.variant || 'ghost'} onChange={(e) => updateSelectedWidgetProps({ variant: e.target.value })}>
                      <option value="ghost">Ghost</option><option value="outline">Outline</option><option value="solid">Solid</option><option value="danger">Danger</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Tooltip</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.tooltip || ''} onChange={(e) => updateSelectedWidgetProps({ tooltip: e.target.value })} />
                  </div>
                </>
              )}

              {/* ── Divider props ── */}
              {selectedWidget.type === 'divider' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Direction</label>
                    <select className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.direction || 'horizontal'} onChange={(e) => updateSelectedWidgetProps({ direction: e.target.value })}>
                      <option value="horizontal">Horizontal</option><option value="vertical">Vertical</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Label (optional)</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.label || ''} onChange={(e) => updateSelectedWidgetProps({ label: e.target.value })} />
                  </div>
                </>
              )}

              {/* ── Form primitives common props ── */}
              {['text_input','number_input','textarea','select'].includes(selectedWidget.type) && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Label</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.label || ''} onChange={(e) => updateSelectedWidgetProps({ label: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Placeholder</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.placeholder || ''} onChange={(e) => updateSelectedWidgetProps({ placeholder: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">State Key</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.stateKey || ''} onChange={(e) => updateSelectedWidgetProps({ stateKey: e.target.value })} placeholder="form.contact.name" />
                  </div>
                </>
              )}

              {/* ── Checkbox / Radio props ── */}
              {['checkbox','radio'].includes(selectedWidget.type) && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">Group Label</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.label || ''} onChange={(e) => updateSelectedWidgetProps({ label: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-hr-text">State Key</label>
                    <input type="text" className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.stateKey || ''} onChange={(e) => updateSelectedWidgetProps({ stateKey: e.target.value })} placeholder="form.preferences.tags" />
                  </div>
                </>
              )}

              {/* ── Canvas layout mode ── */}
              {(selectedWidget.type === 'canvas' || selectedWidget.type === 'panel') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-hr-text">Layout Mode</label>
                  <select className="w-full px-3 py-2 bg-hr-bg border border-hr-border rounded-md text-sm focus:outline-none focus:border-hr-primary" value={selectedWidget.props.layoutMode || 'grid'} onChange={(e) => updateSelectedWidgetProps({ layoutMode: e.target.value })}>
                    <option value="grid">Grid (Free)</option>
                    <option value="flex-row">Flex Row (Horizontal)</option>
                    <option value="flex-col">Flex Column (Vertical)</option>
                  </select>
                </div>
              )}

              <BindingsPanel
                bindings={selectedBindings}
                sourceOptions={sourceOptions}
                onChange={(bindings) => updateSelectedWidgetProps({ bindings })}
              />

              <ActionsPanel
                actions={selectedActions}
                sourceOptions={sourceOptions}
                pages={pages}
                currentPageId={selectedPage?.id ?? null}
                onCreateTargetPage={handleCreateActionTargetPage}
                onChange={(actions) => updateSelectedWidgetProps({ actions })}
              />

              {widgetInspectorFooter}
              </>
            )}
    </>
  );
}
