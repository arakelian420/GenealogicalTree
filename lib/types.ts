import type { Person as PrismaPerson } from "@prisma/client";

export interface DisplaySettings {
  showBirthDate: boolean;
  showDeathDate: boolean;
  showBirthPlace: boolean;
  showOccupation: boolean;
  showPhotos: boolean;
  treeLayout: "vertical" | "horizontal";
  compactMode: boolean;
}

export type Person = PrismaPerson & {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
};
