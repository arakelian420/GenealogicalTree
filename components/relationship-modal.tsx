"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import type { RelationshipType } from "@prisma/client";

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: RelationshipType) => void;
}

export default function RelationshipModal({
  isOpen,
  onClose,
  onSave,
}: RelationshipModalProps) {
  const [newRelationType, setNewRelationType] =
    useState<RelationshipType>("parent_child");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Relationship Type</Label>
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
                <SelectItem value="parent_child">Parent/Child</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => onSave(newRelationType)} className="w-full">
            Save Relationship
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
