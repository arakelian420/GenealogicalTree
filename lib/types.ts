export interface DisplaySettings {
  showBirthDate: boolean;
  showDeathDate: boolean;
  showBirthPlace: boolean;
  showOccupation: boolean;
  showPhotos: boolean;
  showCurrentPlace: boolean;
  showFatherName: boolean;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  personId: string;
  createdAt: Date;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthPlace: string | null;
  occupation: string | null;
  notes: string | null;
  gender: "male" | "female" | null;
  photo: string | null;
  nickname: string | null;
  currentPlace: string | null;
  facebookUrl: string | null;
  color: string | null;
  treeId: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  documents?: Document[];
  instagramUrl: string | null;
}

export interface Relationship {
  id: string;
  type: "parent_child" | "spouse";
  fromPersonId: string;
  toPersonId: string;
  treeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tree {
  id: string;
  name: string;
  description: string | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  people: Person[];
  relationships: Relationship[];
  rootPersonId: string | null;
  userId: string;
}
