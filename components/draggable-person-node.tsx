"use client";

import React from "react";
import type { Person } from "@prisma/client";
import PersonCard from "./person-card";
import { Handle, Position, NodeResizer } from "reactflow";
import type { DisplaySettings } from "@/lib/types";

interface DraggablePersonNodeProps {
  data: {
    person: Person;
    displaySettings: DisplaySettings;
    onSelectPerson: (person: Person) => void;
    onEditPerson: (person: Person) => void;
    onDeletePerson: (personId: string) => void;
    selectedPerson: Person | null;
    onResizeEnd: (personId: string, width: number, height: number) => void;
  };
}

export default function DraggablePersonNode({
  data,
}: DraggablePersonNodeProps) {
  const {
    person,
    displaySettings,
    onSelectPerson,
    onEditPerson,
    onDeletePerson,
    selectedPerson,
    onResizeEnd,
  } = data;

  return (
    <div>
      <NodeResizer
        minWidth={100}
        minHeight={50}
        onResizeEnd={(event, params) =>
          onResizeEnd(person.id, params.width, params.height)
        }
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: "-5px" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ left: "-5px" }}
      />
      <PersonCard
        person={person}
        displaySettings={displaySettings}
        isSelected={selectedPerson?.id === person.id}
        onClick={() => onSelectPerson(person)}
        onEdit={() => onEditPerson(person)}
        onDelete={() => onDeletePerson(person.id)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ bottom: "-5px" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ right: "-5px" }}
      />
    </div>
  );
}
