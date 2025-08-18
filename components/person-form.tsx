"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Tree,
  Person as PrismaPerson,
  Relationship,
  Gender,
} from "@prisma/client";

type Person = PrismaPerson & {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
};

interface Document {
  id: string;
  name: string;
  url: string;
}

type EditablePerson = Person & {
  nickname?: string | null;
  currentPlace?: string | null;
  documents?: Document[];
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  fatherName?: string | null;
  color?: string | null;
};

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  onUpdateTree: (person: Person) => void;
  editingPerson?: EditablePerson | null;
}

export default function PersonForm({
  isOpen,
  onClose,
  tree,
  onUpdateTree,
  editingPerson,
}: PersonFormProps) {
  const t = useTranslations("personForm");
  const tCommon = useTranslations("common");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    deathDate: "",
    birthPlace: "",
    occupation: "",
    notes: "",
    gender: "" as Gender | "",
    photo: "",
    nickname: "",
    currentPlace: "",
    facebookUrl: "",
    instagramUrl: "",
    fatherName: "",
    color: "",
  });

  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (editingPerson) {
      setFormData({
        firstName: editingPerson.firstName || "",
        lastName: editingPerson.lastName || "",
        birthDate: editingPerson.birthDate || "",
        deathDate: editingPerson.deathDate || "",
        birthPlace: editingPerson.birthPlace || "",
        occupation: editingPerson.occupation || "",
        notes: editingPerson.notes || "",
        gender: editingPerson.gender || "",
        photo: editingPerson.photo || "",
        nickname: editingPerson.nickname || "",
        currentPlace: editingPerson.currentPlace || "",
        facebookUrl: editingPerson.facebookUrl || "",
        instagramUrl: (editingPerson as any).instagramUrl || "",
        fatherName: editingPerson.fatherName || "",
        color: editingPerson.color || "",
      });
      if (editingPerson.id) {
        fetch(`/api/person/${editingPerson.id}/documents`)
          .then((res) => res.json())
          .then(setDocuments);
      }
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        birthDate: "",
        deathDate: "",
        birthPlace: "",
        occupation: "",
        notes: "",
        gender: "",
        photo: "",
        nickname: "",
        currentPlace: "",
        facebookUrl: "",
        instagramUrl: "",
        fatherName: "",
        color: "",
      });
      setDocuments([]);
    }
  }, [editingPerson, isOpen, tree]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, photo: url }));
    } else {
      // Handle upload error
      console.error(t("errors.photoUploadFailed"));
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (uploadResponse.ok) {
      const { url } = await uploadResponse.json();
      const newDocument = {
        id: `new-${Date.now()}`,
        name: file.name,
        url,
      };
      setDocuments((prev) => [...prev, newDocument]);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    // Note: This only removes from state. A DELETE endpoint would be needed for the db.
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    const personData = {
      ...formData,
      photo: formData.photo,
      treeId: tree.id,
      documents,
    };

    const response = editingPerson
      ? await fetch(`/api/person/${editingPerson.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personData),
        })
      : await fetch("/api/person", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personData),
        });

    if (response.ok) {
      const savedPerson = await response.json();

      onUpdateTree(savedPerson);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingPerson ? t("edit") : t("addNew")}</DialogTitle>
          <DialogDescription>
            {editingPerson ? t("updateDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                placeholder={t("firstNamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder={t("lastNamePlaceholder")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fatherName">{t("fatherName")}</Label>
              <Input
                id="fatherName"
                value={formData.fatherName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fatherName: e.target.value,
                  }))
                }
                placeholder={t("fatherNamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="nickname">{t("nickname")}</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                }
                placeholder={t("nicknamePlaceholder")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="photo">{t("photo")}</Label>
            <Input id="photo" type="file" onChange={handlePhotoUpload} />
            {formData.photo && (
              <Image
                src={formData.photo}
                alt={t("photoPreview")}
                width={96}
                height={96}
                className="mt-2 w-24 h-24 rounded-full object-cover"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">{t("gender")}</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: value as Gender }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("male")}</SelectItem>
                  <SelectItem value="female">{t("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">{t("nodeColor")}</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-10 h-10 p-1"
                />
                <div className="flex flex-wrap gap-2">
                  {["#74b9ff", "#a29bfe", "#ffdd59", "#ff7675"].map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                        formData.color === color
                          ? "border-blue-500"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color: color }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthDate">{t("birthDate")}</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthDate: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deathDate">{t("deathDate")}</Label>
              <Input
                id="deathDate"
                type="date"
                value={formData.deathDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deathDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthPlace">{t("birthPlace")}</Label>
              <Input
                id="birthPlace"
                value={formData.birthPlace}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthPlace: e.target.value,
                  }))
                }
                placeholder={t("birthPlacePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="currentPlace">{t("livingPlace")}</Label>
              <Input
                id="currentPlace"
                value={formData.currentPlace}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    currentPlace: e.target.value,
                  }))
                }
                placeholder={t("birthPlacePlaceholder")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="occupation">{t("occupation")}</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, occupation: e.target.value }))
              }
              placeholder={t("occupationPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facebookUrl">{t("facebookUrl")}</Label>
              <Input
                id="facebookUrl"
                value={formData.facebookUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    facebookUrl: e.target.value,
                  }))
                }
                placeholder={t("facebookUrlPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="instagramUrl">{t("instagramUrl")}</Label>
              <Input
                id="instagramUrl"
                value={(formData as any).instagramUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instagramUrl: e.target.value,
                  }))
                }
                placeholder={t("instagramUrlPlaceholder")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={t("notesPlaceholder")}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="documents">{t("relatedDocuments")}</Label>
            <Input
              id="documents"
              type="file"
              multiple
              onChange={handleDocumentUpload}
            />
            <ul className="mt-2 space-y-1">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between text-sm"
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {doc.name}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    &times;
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.firstName.trim() || !formData.lastName.trim()}
          >
            {editingPerson ? t("update") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
