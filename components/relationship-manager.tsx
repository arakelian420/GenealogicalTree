"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  isLocked: boolean;
}

export default function RelationshipManager({
  isOpen,
  onClose,
  tree,
  selectedPerson,
  onUpdateTree,
  isLocked,
}: RelationshipManagerProps) {
  const t = useTranslations("relationship");
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
    return person
      ? `${person.firstName} ${person.lastName}`
      : t("common.unknown");
  };

  const getRelationshipDisplay = (relationship: Relationship) => {
    const relatedPersonName = getPersonName(
      relationship.fromPersonId === selectedPerson.id
        ? relationship.toPersonId
        : relationship.fromPersonId
    );

    const relKey = {
      parent_child:
        relationship.fromPersonId === selectedPerson.id
          ? "isChildOf"
          : "isParentOf",
      spouse: "isSpouseOf",
    };

    const relationshipText = t(relKey[relationship.type], {
      name: selectedPerson.firstName,
    });

    return `${relatedPersonName} (${relationshipText})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("manage")}</DialogTitle>
          <DialogDescription>
            {t("manageDescription", {
              name: `${selectedPerson.firstName} ${selectedPerson.lastName}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">{t("addNew")}</h4>
            <div className="space-y-3">
              <div>
                <Label>{t("type")}</Label>
                <Select
                  value={newRelationType}
                  onValueChange={(value) =>
                    setNewRelationType(value as RelationshipType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent_child">
                      {t("parentChild")}
                    </SelectItem>
                    <SelectItem value="spouse">{t("spouse")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("person")}</Label>
                <Select
                  value={newRelatedPersonId}
                  onValueChange={setNewRelatedPersonId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectPerson")} />
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
                disabled={!newRelatedPersonId || isLocked}
                className="w-full"
              >
                {t("add")}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">{t("current")}</h4>
            {currentRelationships.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noneDefined")}</p>
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
                      disabled={isLocked}
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
