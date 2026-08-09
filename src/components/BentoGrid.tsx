import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Panel } from '../types';
import PanelCard from './PanelCard';

interface BentoGridProps {
  panels: Panel[];
  latestValues: Record<string, { val: any; time: string; sentTime?: string }>;
  historyValues: Record<string, { value: number; time: string }[]>;
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onClone?: (panel: Panel) => void;
  onQuickResize?: (panelId: string, colSpan: number, rowSpan: number) => void;
  onPublish?: (topic: string, payload: string | number) => void;
  onReorderPanels: (reorderedActivePanels: Panel[]) => void;
  isLayoutMode?: boolean;
  isLocked?: boolean;
  selectedPanelId?: string;
}

interface SortablePanelCardProps {
  panel: Panel;
  latestValues: Record<string, { val: any; time: string; sentTime?: string }>;
  historyValues: Record<string, { value: number; time: string }[]>;
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onClone?: (panel: Panel) => void;
  onQuickResize?: (panelId: string, colSpan: number, rowSpan: number) => void;
  onPublish?: (topic: string, payload: string | number) => void;
  isLayoutMode?: boolean;
  isLocked?: boolean;
  selectedPanelId?: string;
}

const getColSpanClass = (span?: number) => {
  switch (span) {
    case 2: return 'col-span-1 sm:col-span-2';
    case 3: return 'col-span-1 sm:col-span-2 lg:col-span-3';
    case 4: return 'col-span-1 sm:col-span-2 lg:col-span-4';
    default: return 'col-span-1';
  }
};

const getRowSpanClass = (span?: number) => {
  switch (span) {
    case 0: return 'h-28'; // Slim / Sleek (112px)
    case 2: return 'h-72'; // Tall
    case 3: return 'h-96'; // Large
    default: return 'h-44'; // Standard (176px)
  }
};

const SortablePanelItem: React.FC<SortablePanelCardProps> = ({
  panel,
  latestValues,
  historyValues,
  onEdit,
  onDelete,
  onClone,
  onQuickResize,
  onPublish,
  isLayoutMode,
  isLocked = false,
  selectedPanelId,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: panel.panelId,
    disabled: isLocked || !isLayoutMode 
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  const colClass = getColSpanClass(panel.colSpan);
  const rowClass = getRowSpanClass(panel.rowSpan);

  return (
    <div ref={setNodeRef} style={style} className={`${colClass} ${rowClass} touch-none transition-all duration-200`}>
      <PanelCard
        panel={panel}
        lastValue={latestValues[panel.panelId]?.val}
        lastTimestamp={latestValues[panel.panelId]?.time || ''}
        lastSentTimestamp={latestValues[panel.panelId]?.sentTime || ''}
        latestValues={latestValues}
        history={historyValues[panel.panelId] || []}
        onEdit={onEdit}
        onDelete={onDelete}
        onClone={onClone}
        onQuickResize={onQuickResize}
        onPublish={onPublish}
        isLayoutMode={isLayoutMode}
        isLocked={isLocked}
        isSelected={selectedPanelId === panel.panelId}
        dragHandleProps={!isLocked && isLayoutMode ? { listeners, attributes } : undefined}
        isDragging={isDragging}
      />
    </div>
  );
};

export const BentoGrid: React.FC<BentoGridProps> = ({
  panels,
  latestValues,
  historyValues,
  onEdit,
  onDelete,
  onClone,
  onQuickResize,
  onPublish,
  onReorderPanels,
  isLayoutMode,
  isLocked = false,
  selectedPanelId,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px move to prevent accidental drags on button clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = panels.findIndex((p) => p.panelId === active.id);
      const newIndex = panels.findIndex((p) => p.panelId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(panels, oldIndex, newIndex);
        onReorderPanels(newOrder);
      }
    }
  };

  const activePanel = panels.find((p) => p.panelId === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={panels.map((p) => p.panelId)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-max grid-flow-row-dense">
          {panels.map((panel) => (
            <SortablePanelItem
              key={panel.panelId}
              panel={panel}
              latestValues={latestValues}
              historyValues={historyValues}
              onEdit={onEdit}
              onDelete={onDelete}
              onClone={onClone}
              onQuickResize={onQuickResize}
              onPublish={onPublish}
              isLayoutMode={isLayoutMode}
              isLocked={isLocked}
              selectedPanelId={selectedPanelId}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activePanel ? (
          <div className="h-44 w-full shadow-2xl scale-105 rotate-1 cursor-grabbing">
            <PanelCard
              panel={activePanel}
              lastValue={latestValues[activePanel.panelId]?.val}
              lastTimestamp={latestValues[activePanel.panelId]?.time || ''}
              latestValues={latestValues}
              history={historyValues[activePanel.panelId] || []}
              onEdit={() => {}}
              onDelete={() => {}}
              onPublish={() => {}}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BentoGrid;
