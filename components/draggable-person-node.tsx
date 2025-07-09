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
    onResizeEnd: (personId: string, width: number, height: number) => void;
  };
  selected?: boolean;
}

export default function DraggablePersonNode({
  data,
  selected,
}: DraggablePersonNodeProps) {
  const {
    person,
    displaySettings,
    onSelectPerson,
    onEditPerson,
    onDeletePerson,
    onResizeEnd,
  } = data;

  return (
    <div className="w-full h-full">
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
        isSelected={selected}
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
