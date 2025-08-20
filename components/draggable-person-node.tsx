"use client";

import React from "react";
import type { Person } from "@/lib/types";
import PersonCard from "./person-card";
import { Handle, Position, NodeResizer } from "reactflow";
import type { DisplaySettings } from "@/lib/types";

import type { Relationship } from "@prisma/client";

interface DraggablePersonNodeProps {
  data: {
    person: Person;
    persons: Person[];
    relationships: Relationship[];
    displaySettings: DisplaySettings;
    onSelectPerson: (person: Person) => void;
    onEditPerson: (person: Person) => void;
    onDeletePerson: (person: Person) => void;
    onResizeEnd: (personId: string, width: number, height: number) => void;
    isLocked: boolean;
  };
  selected?: boolean;
}

export default function DraggablePersonNode({
  data,
  selected = false,
}: DraggablePersonNodeProps) {
  const {
    person,
    persons,
    relationships,
    displaySettings,
    onSelectPerson,
    onEditPerson,
    onDeletePerson,
    onResizeEnd,
    isLocked,
  } = data;

  return (
    <div className="w-full h-full">
      <NodeResizer
        minWidth={100}
        minHeight={50}
        onResizeEnd={(event, params) =>
          onResizeEnd(person.id, params.width, params.height)
        }
        isVisible={!isLocked}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: "-5px", visibility: isLocked ? "hidden" : "visible" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ left: "-5px", visibility: isLocked ? "hidden" : "visible" }}
      />
      <PersonCard
        person={person}
        persons={persons}
        relationships={relationships}
        displaySettings={displaySettings}
        isSelected={selected}
        onClick={() => onSelectPerson(person)}
        onEdit={() => onEditPerson(person)}
        onDelete={() => onDeletePerson(person)}
        isLocked={isLocked}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ bottom: "-5px", visibility: isLocked ? "hidden" : "visible" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ right: "-5px", visibility: isLocked ? "hidden" : "visible" }}
      />
    </div>
  );
}
