"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("relationship");
  const [newRelationType, setNewRelationType] =
    useState<RelationshipType>("parent_child");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>
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
                <SelectItem value="parent_child">{t("parentChild")}</SelectItem>
                <SelectItem value="spouse">{t("spouse")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => onSave(newRelationType)} className="w-full">
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
