"use client";

import { useState, useEffect } from "react";
import type { Person } from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import type { HierarchyNode } from "@/lib/tree-builder";
import PersonCard from "./person-card";

interface PersonNodeProps {
  node: HierarchyNode;
  displaySettings: DisplaySettings;
  selectedPerson: Person | null;
  onSelectPerson: (person: Person) => void;
  onEditPerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
  hasParentConnector?: boolean;
}

export default function PersonNode({
  node,
  displaySettings,
  selectedPerson,
  onSelectPerson,
  onEditPerson,
  onDeletePerson,
  hasParentConnector = false,
}: PersonNodeProps) {
  const { person, spouse, children } = node;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {hasParentConnector && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-400" />
        )}
        <PersonCard
          person={person}
          displaySettings={displaySettings}
          isSelected={selectedPerson?.id === person.id}
          onClick={() => onSelectPerson(person)}
          onEdit={() => onEditPerson(person)}
          onDelete={() => onDeletePerson(person.id)}
        />
        {spouse && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center ml-4">
            <div className="w-8 h-0.5 bg-gray-400" />
            <div className="ml-4">
              <PersonCard
                person={spouse.person}
                displaySettings={displaySettings}
                isSelected={selectedPerson?.id === spouse.person.id}
                onClick={() => onSelectPerson(spouse.person)}
                onEdit={() => onEditPerson(spouse.person)}
                onDelete={() => onDeletePerson(spouse.person.id)}
              />
            </div>
          </div>
        )}
      </div>
      {children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-8 bg-gray-400" />
          <div className="flex items-start gap-8">
            {children.map((childNode) => (
              <PersonNode
                key={childNode.person.id}
                node={childNode}
                displaySettings={displaySettings}
                selectedPerson={selectedPerson}
                onSelectPerson={onSelectPerson}
                onEditPerson={onEditPerson}
                onDeletePerson={onDeletePerson}
                hasParentConnector={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
