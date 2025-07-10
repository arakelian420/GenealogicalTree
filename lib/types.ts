import type { Person as PrismaPerson, Document } from "@prisma/client";

export interface DisplaySettings {
  showBirthDate: boolean;
  showDeathDate: boolean;
  showBirthPlace: boolean;
  showOccupation: boolean;
  showPhotos: boolean;
  showCurrentPlace: boolean;
  showFatherName: boolean;
}

export type Person = PrismaPerson & {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  documents?: Document[];
  color?: string | null;
};
