import type { Person, Relationship } from "@prisma/client";

export interface HierarchyNode {
  person: Person;
  spouse: HierarchyNode | null;
  children: HierarchyNode[];
  x: number;
  y: number;
  modifier: number;
  width: number;
}

export function buildTree(
  people: Person[],
  relationships: Relationship[],
  rootPersonId: string,
  processedIds: Set<string>
): HierarchyNode | null {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const relationshipsMap = new Map(
    relationships.map((r) => [r.fromPersonId, r])
  );

  function getSpouse(personId: string): Person | null {
    for (const rel of relationships) {
      if (rel.type === "spouse") {
        if (rel.fromPersonId === personId) {
          return peopleMap.get(rel.toPersonId) || null;
        }
        if (rel.toPersonId === personId) {
          return peopleMap.get(rel.fromPersonId) || null;
        }
      }
    }
    return null;
  }

  function getChildren(personId: string, spouseId: string | null): Person[] {
    const parentIds = spouseId ? [personId, spouseId] : [personId];
    const childRels = relationships.filter(
      (r) => r.type === "parent_child" && parentIds.includes(r.fromPersonId)
    );
    const childIds = [...new Set(childRels.map((r) => r.toPersonId))];
    return childIds
      .map((id) => peopleMap.get(id))
      .filter((p): p is Person => !!p);
  }

  function buildNode(person: Person): HierarchyNode | null {
    if (processedIds.has(person.id)) {
      return null;
    }
    processedIds.add(person.id);

    const spousePerson = getSpouse(person.id);
    if (spousePerson) {
      processedIds.add(spousePerson.id);
    }
    const children = getChildren(person.id, spousePerson?.id || null);

    const childNodes = children
      .map(buildNode)
      .filter((n): n is HierarchyNode => !!n);

    const spouseNode = spousePerson
      ? {
          person: spousePerson,
          spouse: null,
          children: [],
          x: 0,
          y: 0,
          modifier: 0,
          width: 0,
        }
      : null;

    return {
      person,
      spouse: spouseNode,
      children: childNodes,
      x: 0,
      y: 0,
      modifier: 0,
      width: 0,
    };
  }

  const rootPerson = peopleMap.get(rootPersonId);
  if (!rootPerson) return null;

  return buildNode(rootPerson);
}
