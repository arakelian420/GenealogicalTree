"use client";

import React from "react";
import type { Person } from "@prisma/client";
import PersonCard from "./person-card";
import { Handle, Position } from "reactflow";
import type { DisplaySettings } from "@/lib/types";

interface DraggablePersonNodeProps {
  data: {
    person: Person;
    displaySettings: DisplaySettings;
    onSelectPerson: (person: Person) => void;
    onEditPerson: (person: Person) => void;
    onDeletePerson: (personId: string) => void;
    selectedPerson: Person | null;
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
  } = data;

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <PersonCard
        person={person}
        displaySettings={displaySettings}
        isSelected={selectedPerson?.id === person.id}
        onClick={() => onSelectPerson(person)}
        onEdit={() => onEditPerson(person)}
        onDelete={() => onDeletePerson(person.id)}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
