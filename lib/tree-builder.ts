import type { Person, Relationship } from "@prisma/client";

export interface HierarchyNode {
  person: Person;
  parents: HierarchyNode[];
  spouse: HierarchyNode | null;
  children: HierarchyNode[];
  x?: number;
  y?: number;
  modifier: number;
  width: number;
}

export function buildTree(
  people: Person[],
  relationships: Relationship[],
  rootPersonId: string
): HierarchyNode | null {
  const peopleMap = new Map(people.map((p) => [p.id, p]));

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

  function getParents(personId: string): Person[] {
    const parentRels = relationships.filter(
      (r) => r.type === "parent_child" && r.toPersonId === personId
    );
    const parentIds = parentRels.map((r) => r.fromPersonId);
    return parentIds
      .map((id) => peopleMap.get(id))
      .filter((p): p is Person => !!p);
  }

  function buildNode(
    person: Person,
    processedIds: Set<string>
  ): HierarchyNode | null {
    if (processedIds.has(person.id)) {
      return null;
    }
    processedIds.add(person.id);
    const spousePerson = getSpouse(person.id);
    if (spousePerson) {
      processedIds.add(spousePerson.id);
    }
    const children = getChildren(person.id, spousePerson?.id || null);
    const parents = getParents(person.id);

    const childNodes = children
      .map((child) => buildNode(child, processedIds))
      .filter((n): n is HierarchyNode => !!n);

    const parentNodes = parents
      .map((p) => buildParentNode(p))
      .filter((n): n is HierarchyNode => !!n);

    const spouseNode = spousePerson
      ? buildSpouseNode(spousePerson, new Set())
      : null;

    return {
      person,
      parents: parentNodes,
      spouse: spouseNode,
      children: childNodes,
      modifier: 0,
      width: 0,
    };
  }

  function buildParentNode(person: Person): HierarchyNode {
    return {
      person,
      parents: [],
      spouse: null,
      children: [],
      modifier: 0,
      width: 0,
    };
  }

  function buildSpouseNode(
    person: Person,
    processedIds: Set<string>
  ): HierarchyNode | null {
    if (processedIds.has(person.id)) {
      return null;
    }
    processedIds.add(person.id);

    const parents = getParents(person.id);
    const parentNodes = parents
      .map((p) => buildParentNode(p))
      .filter((n): n is HierarchyNode => !!n);

    return {
      person,
      parents: parentNodes,
      spouse: null,
      children: [],
      modifier: 0,
      width: 0,
    };
  }

  const rootPerson = peopleMap.get(rootPersonId);
  if (!rootPerson) return null;

  return buildNode(rootPerson, new Set());
}
