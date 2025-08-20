"use client";

import { useMemo, useRef } from "react";
import type { Person, Relationship } from "@prisma/client";
import { useTranslations } from "next-intl";
import type { DisplaySettings } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Edit,
  Trash2,
  User,
  Mars,
  Venus,
  Facebook,
  Instagram,
} from "lucide-react";

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
  instagramUrl?: string | null;
  color?: string | null;
  fatherName?: string | null;
};

interface PersonCardProps {
  person: DisplayablePerson;
  persons: DisplayablePerson[];
  relationships: Relationship[];
  displaySettings: DisplaySettings;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLocked?: boolean;
}

export default function PersonCard({
  person,
  persons,
  relationships,
  displaySettings,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  isLocked = false,
}: PersonCardProps) {
  const t = useTranslations("person");
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const siblings = useMemo(() => {
    const parentRelationships = (relationships || []).filter(
      (r) => r.toPersonId === person.id && r.type === "parent_child"
    );
    const parentIds = parentRelationships.map((r) => r.fromPersonId);

    if (parentIds.length === 0) {
      return [];
    }

    const siblingRelationships = (relationships || []).filter(
      (r) =>
        parentIds.includes(r.fromPersonId) &&
        r.type === "parent_child" &&
        r.toPersonId !== person.id
    );
    const siblingIds = siblingRelationships.map((r) => r.toPersonId);

    return persons.filter((p) => siblingIds.includes(p.id));
  }, [person.id, persons, relationships]);

  const getGenderStyling = (
    gender?: Person["gender"],
    customColor?: string | null
  ) => {
    if (customColor) {
      return {
        colorStyle: { backgroundColor: customColor },
        icon:
          gender === "male" ? (
            <Mars className="w-3 h-3 text-white" />
          ) : gender === "female" ? (
            <Venus className="w-3 h-3 text-white" />
          ) : null,
      };
    }
    switch (gender) {
      case "male":
        return {
          colorClassName: "border-blue-200 bg-blue-50",
          icon: <Mars className="w-3 h-3 text-blue-500" />,
        };
      case "female":
        return {
          colorClassName: "border-pink-200 bg-pink-50",
          icon: <Venus className="w-3 h-3 text-pink-500" />,
        };
      default:
        return {
          colorClassName: "border-gray-200 bg-gray-50",
          icon: null,
        };
    }
  };

  const { colorClassName, colorStyle, icon } = getGenderStyling(
    person.gender,
    person.color
  );

  const handleClick = () => {
    if (isLocked) {
      onClick?.();
      return;
    }
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      onEdit?.();
    } else {
      clickTimeout.current = setTimeout(() => {
        onClick?.();
        clickTimeout.current = null;
      }, 200);
    }
  };

  return (
    <Card
      className={`w-full h-full cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${colorClassName || ""}`}
      style={colorStyle}
      onClick={handleClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        <div className="relative flex-grow">
          {displaySettings.showPhotos && person.photo ? (
            <Image
              src={person.photo}
              alt={t("photoAlt", {
                name: `${person.firstName} ${person.lastName}`,
              })}
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
            <h4 className={`font-semibold text-sm`}>
              {person.firstName} {person.nickname && `(${person.nickname})`}
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
            {person.instagramUrl && (
              <a
                href={person.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="h-4 w-4 text-pink-600 hover:text-pink-800" />
              </a>
            )}
          </div>

          <div className={`text-xs mt-1 space-y-0.5 text-gray-600`}>
            {displaySettings.showBirthDate && person.birthDate && (
              <div>
                {t("born")}: {person.birthDate}
              </div>
            )}
            {displaySettings.showDeathDate && person.deathDate && (
              <div>
                {t("died")}: {person.deathDate}
              </div>
            )}
            {displaySettings.showCurrentPlace && person.currentPlace && (
              <div>
                {t("living")}: {person.currentPlace}
              </div>
            )}
            {displaySettings.showBirthPlace && person.birthPlace && (
              <div>{person.birthPlace}</div>
            )}
            {displaySettings.showOccupation && person.occupation && (
              <div>{person.occupation}</div>
            )}
            {displaySettings.showFatherName && person.fatherName && (
              <div>
                {t("father")}: {person.fatherName}
              </div>
            )}
            {siblings.length > 0 && (
              <div className="pt-2">
                <h5 className="font-semibold text-xs">{t("siblings")}:</h5>
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
