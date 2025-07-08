"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type {
  Tree,
  Person,
  Relationship,
  RelationshipType,
} from "@prisma/client";

interface RelationshipManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  selectedPerson: Person | null;
  onUpdateTree: () => void;
}

export default function RelationshipManager({
  isOpen,
  onClose,
  tree,
  selectedPerson,
  onUpdateTree,
}: RelationshipManagerProps) {
  const [newRelationType, setNewRelationType] =
    useState<RelationshipType>("parent_child");
  const [newRelatedPersonId, setNewRelatedPersonId] = useState("");

  const [currentRelationships, setCurrentRelationships] = useState<
    Relationship[]
  >([]);

  useState(() => {
    if (selectedPerson) {
      fetch(`/api/person/${selectedPerson.id}/relationships`)
        .then((res) => res.json())
        .then(setCurrentRelationships);
    }
  });

  if (!selectedPerson) return null;

  const availablePeople = tree.people.filter((p) => p.id !== selectedPerson.id);

  const addRelationship = async () => {
    if (!newRelatedPersonId) return;

    await fetch("/api/relationship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treeId: tree.id,
        fromPersonId: selectedPerson.id,
        toPersonId: newRelatedPersonId,
        type: newRelationType,
      }),
    });

    onUpdateTree();
    setNewRelatedPersonId("");
  };

  const removeRelationship = async (relationshipId: string) => {
    await fetch(`/api/relationship/${relationshipId}`, {
      method: "DELETE",
    });
    onUpdateTree();
  };

  const getPersonName = (personId: string) => {
    const person = tree.people.find((p) => p.id === personId);
    return person ? `${person.firstName} ${person.lastName}` : "Unknown";
  };

  const getRelationshipDisplay = (relationship: Relationship) => {
    const relatedPersonName = getPersonName(
      relationship.fromPersonId === selectedPerson.id
        ? relationship.toPersonId
        : relationship.fromPersonId
    );

    let relationshipText = "";
    if (relationship.type === "parent_child") {
      if (relationship.fromPersonId === selectedPerson.id) {
        relationshipText = `${selectedPerson.firstName}'s child`;
      } else {
        relationshipText = `${selectedPerson.firstName}'s parent`;
      }
    } else {
      relationshipText = `${selectedPerson.firstName}'s spouse`;
    }

    return `${relatedPersonName} (${relationshipText})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Relationships</DialogTitle>
          <DialogDescription>
            Manage family relationships for {selectedPerson.firstName}{" "}
            {selectedPerson.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Add New Relationship</h4>
            <div className="space-y-3">
              <div>
                <Label>Relationship Type</Label>
                <Select
                  value={newRelationType}
                  onValueChange={(value: any) => setNewRelationType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent_child">Parent/Child</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Person</Label>
                <Select
                  value={newRelatedPersonId}
                  onValueChange={setNewRelatedPersonId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={addRelationship}
                disabled={!newRelatedPersonId}
                className="w-full"
              >
                Add Relationship
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Current Relationships</h4>
            {currentRelationships.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No relationships defined yet.
              </p>
            ) : (
              <div className="space-y-2">
                {currentRelationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">
                      {getRelationshipDisplay(relationship)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRelationship(relationship.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
