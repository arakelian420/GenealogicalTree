import prisma from "./prisma";
import type { Person, Relationship } from "@prisma/client";

export async function getPersonById(personId: string): Promise<Person | null> {
  return prisma.person.findUnique({ where: { id: personId } });
}

export async function getRelationships(
  personId: string
): Promise<Relationship[]> {
  return prisma.relationship.findMany({
    where: {
      OR: [{ fromPersonId: personId }, { toPersonId: personId }],
    },
  });
}

export async function getChildren(parentId: string): Promise<Person[]> {
  const relationships = await prisma.relationship.findMany({
    where: { fromPersonId: parentId, type: "parent_child" },
    include: { toPerson: true },
  });
  return relationships.map((r) => r.toPerson);
}

export async function getParents(childId: string): Promise<Person[]> {
  const relationships = await prisma.relationship.findMany({
    where: { toPersonId: childId, type: "parent_child" },
    include: { fromPerson: true },
  });
  return relationships.map((r) => r.fromPerson);
}

export async function getSpouses(personId: string): Promise<Person[]> {
  const relationships = await prisma.relationship.findMany({
    where: {
      type: "spouse",
      OR: [{ fromPersonId: personId }, { toPersonId: personId }],
    },
    include: { fromPerson: true, toPerson: true },
  });

  return relationships.map((r) =>
    r.fromPersonId === personId ? r.toPerson : r.fromPerson
  );
}

export async function getSiblings(personId: string): Promise<Person[]> {
  const parents = await getParents(personId);
  if (parents.length === 0) return [];

  const parentIds = parents.map((p) => p.id);

  const siblingsRelationships = await prisma.relationship.findMany({
    where: {
      fromPersonId: { in: parentIds },
      type: "parent_child",
      toPersonId: { not: personId },
    },
    include: { toPerson: true },
  });

  const siblings = siblingsRelationships.map((r) => r.toPerson);
  // Remove duplicates
  return siblings.filter(
    (sibling, index, self) =>
      index === self.findIndex((s) => s.id === sibling.id)
  );
}
