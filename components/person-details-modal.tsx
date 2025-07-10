"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Person } from "@prisma/client";
import Image from "next/image";
import { User, Mars, Venus, Facebook } from "lucide-react";

interface Document {
  id: string;
  name: string;
  url: string;
}

type DisplayablePerson = Person & {
  nickname?: string | null;
  currentPlace?: string | null;
  documents?: Document[];
  facebookUrl?: string | null;
  fatherName?: string | null;
  notes?: string | null;
};

interface PersonDetailsModalProps {
  person: DisplayablePerson | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PersonDetailsModal({
  person,
  isOpen,
  onClose,
}: PersonDetailsModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (person?.id) {
      fetch(`/api/person/${person.id}/documents`)
        .then((res) => res.json())
        .then(setDocuments);
    }
  }, [person]);

  if (!person) return null;

  const getGenderStyling = (gender?: Person["gender"]) => {
    switch (gender) {
      case "male":
        return {
          icon: <Mars className="w-4 h-4 text-blue-500" />,
        };
      case "female":
        return {
          icon: <Venus className="w-4 h-4 text-pink-500" />,
        };
      default:
        return {
          icon: null,
        };
    }
  };

  const { icon } = getGenderStyling(person.gender);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {person.firstName} {person.nickname && `(${person.nickname})`}{" "}
            {person.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-center mb-4">
            {person.photo ? (
              <Image
                src={person.photo}
                alt={`${person.firstName} ${person.lastName}`}
                width={128}
                height={128}
                className="w-32 h-32 object-cover rounded-full"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            {person.gender && (
              <div>
                <strong>Gender:</strong> {person.gender}
              </div>
            )}
            {person.fatherName && (
              <div>
                <strong>Father's Name:</strong> {person.fatherName}
              </div>
            )}
            {person.birthDate && (
              <div>
                <strong>Born:</strong> {person.birthDate}
              </div>
            )}
            {person.deathDate && (
              <div>
                <strong>Died:</strong> {person.deathDate}
              </div>
            )}
            {person.birthPlace && (
              <div>
                <strong>Birth Place:</strong> {person.birthPlace}
              </div>
            )}
            {person.currentPlace && (
              <div>
                <strong>Place of Living:</strong> {person.currentPlace}
              </div>
            )}
            {person.occupation && (
              <div>
                <strong>Occupation:</strong> {person.occupation}
              </div>
            )}
            {person.notes && (
              <div>
                <strong>Notes:</strong> {person.notes}
              </div>
            )}
            {person.facebookUrl && (
              <div className="flex items-center gap-2">
                <strong>Facebook:</strong>
                <a
                  href={person.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            )}
            {documents.length > 0 && (
              <div>
                <strong>Documents:</strong>
                <ul className="list-disc list-inside">
                  {documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
