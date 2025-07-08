"use client";

import { useState, useEffect } from "react";
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
import type { Tree, Person, Relationship, Gender } from "@prisma/client";

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
};

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  onUpdateTree: () => void;
  editingPerson?: EditablePerson | null;
}

export default function PersonForm({
  isOpen,
  onClose,
  tree,
  onUpdateTree,
  editingPerson,
}: PersonFormProps) {
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
  });

  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [selectedSpouses, setSelectedSpouses] = useState<string[]>([]);
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
      });
      setDocuments(editingPerson.documents || []);
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
      });
      setDocuments([]);
    }
    if (editingPerson && isOpen) {
      fetch(`/api/person/${editingPerson.id}/parents`)
        .then((res) => res.json())
        .then((parents) =>
          setSelectedParents(parents.map((p: Person) => p.id))
        );
      fetch(`/api/person/${editingPerson.id}/spouses`)
        .then((res) => res.json())
        .then((spouses) =>
          setSelectedSpouses(spouses.map((s: Person) => s.id))
        );
    } else {
      setSelectedParents([]);
      setSelectedSpouses([]);
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
      console.error("Photo upload failed");
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingPerson) return;

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (uploadResponse.ok) {
      const { url } = await uploadResponse.json();
      const docData = {
        personId: editingPerson.id,
        name: file.name,
        url,
      };
      const docResponse = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docData),
      });
      if (docResponse.ok) {
        const newDocument = await docResponse.json();
        setDocuments((prev) => [...prev, newDocument]);
      }
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

      if (editingPerson) {
        await fetch(`/api/person/${editingPerson.id}/relationships`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parents: selectedParents,
            spouses: selectedSpouses,
          }),
        });
      } else {
        // For new people, create relationships after the person is created
        const parentPromises = selectedParents.map((parentId) =>
          fetch("/api/relationship", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              treeId: tree.id,
              fromPersonId: parentId,
              toPersonId: savedPerson.id,
              type: "parent_child",
            }),
          })
        );

        const spousePromises = selectedSpouses.map((spouseId) =>
          fetch("/api/relationship", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              treeId: tree.id,
              fromPersonId: savedPerson.id,
              toPersonId: spouseId,
              type: "spouse",
            }),
          })
        );
        await Promise.all([...parentPromises, ...spousePromises]);
      }

      await onUpdateTree();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingPerson ? "Edit Person" : "Add New Person"}
          </DialogTitle>
          <DialogDescription>
            {editingPerson
              ? "Update the person's information below."
              : "Enter the details for the new family member."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nickname: e.target.value }))
              }
              placeholder="e.g. Johnny"
            />
          </div>

          <div>
            <Label htmlFor="photo">Photo</Label>
            <Input id="photo" type="file" onChange={handlePhotoUpload} />
            {formData.photo && (
              <img
                src={formData.photo}
                alt="Preview"
                className="mt-2 w-24 h-24 rounded-full object-cover"
              />
            )}
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
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
              <Label htmlFor="deathDate">Death Date</Label>
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

          <div>
            <Label htmlFor="birthPlace">Birth Place</Label>
            <Input
              id="birthPlace"
              value={formData.birthPlace}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, birthPlace: e.target.value }))
              }
              placeholder="City, State, Country"
            />
          </div>

          <div>
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, occupation: e.target.value }))
              }
              placeholder="Job title or profession"
            />
          </div>

          <div>
            <Label htmlFor="facebookUrl">Facebook Profile URL</Label>
            <Input
              id="facebookUrl"
              value={formData.facebookUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  facebookUrl: e.target.value,
                }))
              }
              placeholder="https://facebook.com/..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional information..."
              className="min-h-[80px]"
            />
          </div>

          {editingPerson && (
            <div>
              <Label htmlFor="documents">Related Documents</Label>
              <Input
                id="documents"
                type="file"
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
          )}

          <div>
            <Label>Parents</Label>
            <div className="space-y-2">
              {tree.people
                .filter((p) => p.id !== editingPerson?.id)
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`parent-${p.id}`}
                      checked={selectedParents.includes(p.id)}
                      onCheckedChange={(checked: boolean) => {
                        setSelectedParents((prev) =>
                          checked
                            ? [...prev, p.id]
                            : prev.filter((id) => id !== p.id)
                        );
                      }}
                    />
                    <Label htmlFor={`parent-${p.id}`}>
                      {p.firstName} {p.lastName}
                    </Label>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <Label>Spouses</Label>
            <div className="space-y-2">
              {tree.people
                .filter((p) => p.id !== editingPerson?.id)
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`spouse-${p.id}`}
                      checked={selectedSpouses.includes(p.id)}
                      onCheckedChange={(checked: boolean) => {
                        setSelectedSpouses((prev) =>
                          checked
                            ? [...prev, p.id]
                            : prev.filter((id) => id !== p.id)
                        );
                      }}
                    />
                    <Label htmlFor={`spouse-${p.id}`}>
                      {p.firstName} {p.lastName}
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.firstName.trim() || !formData.lastName.trim()}
          >
            {editingPerson ? "Update Person" : "Add Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
