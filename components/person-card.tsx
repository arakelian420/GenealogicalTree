"use client";

import { useState, useEffect } from "react";
import type { Person } from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Edit, Trash2, User, Mars, Venus, Facebook } from "lucide-react";

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
};

interface PersonCardProps {
  person: DisplayablePerson;
  displaySettings: DisplaySettings;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLocked?: boolean;
}

export default function PersonCard({
  person,
  displaySettings,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  isLocked = false,
}: PersonCardProps) {
  const [siblings, setSiblings] = useState<Person[]>([]);

  useEffect(() => {
    fetch(`/api/person/${person.id}/siblings`)
      .then((res) => res.json())
      .then(setSiblings);
  }, [person.id]);

  const getGenderStyling = (gender?: Person["gender"]) => {
    switch (gender) {
      case "male":
        return {
          color: "border-blue-200 bg-blue-50",
          icon: <Mars className="w-3 h-3 text-blue-500" />,
        };
      case "female":
        return {
          color: "border-pink-200 bg-pink-50",
          icon: <Venus className="w-3 h-3 text-pink-500" />,
        };
      default:
        return {
          color: "border-gray-200 bg-gray-50",
          icon: null,
        };
    }
  };

  const { color, icon } = getGenderStyling(person.gender);

  return (
    <Card
      className={`w-full h-full cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${color}`}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        <div className="relative flex-grow">
          {displaySettings.showPhotos && person.photo ? (
            <Image
              src={person.photo}
              alt={`${person.firstName} ${person.lastName}`}
              width={200}
              height={128}
              className="w-full h-32 object-cover rounded-t-md"
            />
          ) : (
            <div className="w-full h-32 bg-gray-200 rounded-t-md flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {!isLocked && (
            <div className="absolute top-1 right-1 flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="h-6 w-6 p-0 bg-white/80 hover:bg-white text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="pt-2 text-center">
          <div className="flex items-center justify-center gap-1">
            {icon}
            <h4 className="font-semibold text-sm">
              {person.firstName} {person.nickname && `(${person.nickname})`}{" "}
              {person.lastName}
            </h4>
            {person.facebookUrl && (
              <a
                href={person.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Facebook className="h-4 w-4 text-blue-600 hover:text-blue-800" />
              </a>
            )}
          </div>

          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {displaySettings.showBirthDate && person.birthDate && (
              <div>Born: {person.birthDate}</div>
            )}
            {displaySettings.showDeathDate && person.deathDate && (
              <div>Died: {person.deathDate}</div>
            )}
            {person.currentPlace && <div>Living: {person.currentPlace}</div>}
            {displaySettings.showBirthPlace && person.birthPlace && (
              <div>{person.birthPlace}</div>
            )}
            {displaySettings.showOccupation && person.occupation && (
              <div>{person.occupation}</div>
            )}
            {person.documents && person.documents.length > 0 && (
              <div className="pt-2">
                <h5 className="font-semibold text-xs">Documents:</h5>
                <ul className="text-left">
                  {person.documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs"
                      >
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {siblings.length > 0 && (
              <div className="pt-2">
                <h5 className="font-semibold text-xs">Siblings:</h5>
                <ul className="text-left">
                  {siblings.map((sibling) => (
                    <li
                      key={sibling.id}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {sibling.firstName} {sibling.lastName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
