import React from 'react';
import { useBuilderWorkspaceScope } from './workspaceScope';
import { useBuilderStore } from '../store/builderStore';
import { WidgetRegistry } from './registry';
import { Move, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { getWidgetFrameStyle } from '../runtime/frameStyle';

interface WidgetWrapperProps {
  id: string;
}

export function WidgetWrapper({ id }: WidgetWrapperProps) {
  const scope = useBuilderWorkspaceScope();
  const widget = useBuilderStore((state) => (scope === 'kit' ? state.kitStudioWidgets[id] : state.widgets[id]));
  const isSelected = useBuilderStore((state) => (
    scope === 'kit' ? state.selectedKitStudioId === id : state.selectedId === id
  ));
  const selectWidget = useBuilderStore((state) => state.selectWidget);
  const removeWidget = useBuilderStore((state) => state.removeWidget);
  
  if (!widget) return null;
  const Component = WidgetRegistry[widget.type];
  if (!Component) return null;

  const shouldHideMoveHandle = false;
  const showControlsOnHover = true;
  const isRootKitWidget = scope === 'kit' && widget.parentId === 'root';

  const widgetStyle = getWidgetFrameStyle(widget.props);

  return (
    <div 
      data-builder-node-id={widget.id}
      data-builder-node-type={widget.type}
      data-builder-parent-id={widget.parentId}
      data-widget-selected={isSelected ? 'true' : 'false'}
      className={cn(
        'widget-wrapper relative group w-full h-full overflow-visible'
      )}
      onClick={(e) => {
        e.stopPropagation();
        selectWidget(id, scope);
      }}
    >
      <div className="w-full h-full" style={widgetStyle}>
        <div
          className={cn(
            "external-move-handle absolute top-1 left-1 z-20 p-1 rounded bg-hr-panel/80 border border-hr-border text-hr-muted cursor-grab",
            isRootKitWidget && 'kit-root-move-handle',
            shouldHideMoveHandle
              ? 'pointer-events-none opacity-0'
              : (isSelected ? "opacity-100" : showControlsOnHover ? "opacity-0 group-hover:opacity-100" : "opacity-0")
          )}
          draggable={!isRootKitWidget}
          onDragStart={(e) => {
            if (isRootKitWidget) {
              e.preventDefault();
              return;
            }
            e.stopPropagation();
            e.dataTransfer.setData('application/x-widget-id', id);
            e.dataTransfer.setData('application/x-builder-scope', scope);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onMouseDown={(e) => {
            if (!isRootKitWidget) {
              e.stopPropagation();
            }
          }}
          title="Drag to move"
        >
          <Move size={12} />
        </div>
        <Component id={widget.id} {...widget.props} />
      </div>
      
      {/* Delete Button */}
      <button
        className={cn(
          "absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-sm opacity-0 transition-opacity z-10 hover:bg-red-600",
          isSelected ? "opacity-100" : showControlsOnHover ? "group-hover:opacity-100" : ""
        )}
        onClick={(e) => {
          e.stopPropagation();
          removeWidget(id, scope);
        }}
        title="Delete Component"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
