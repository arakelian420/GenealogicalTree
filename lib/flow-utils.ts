import { type Node, type Edge } from "reactflow";
import type { Person, Relationship } from "@prisma/client";
import { type HierarchyNode } from "@/lib/tree-builder";
import { type DisplaySettings } from "@/lib/types";

const NODE_WIDTH = 200;
const H_SPACING = 50;
const V_SPACING = 350;

export function layoutTree(
  node: HierarchyNode,
  x: number,
  y: number
): { maxX: number } {
  const person = node.person as Person;
  const spouse = node.spouse?.person as Person | undefined;
  node.x = person.x ?? x;
  node.y = person.y ?? y;
  let currentX = node.x;
  if (node.spouse) {
    node.spouse.x = spouse?.x ?? node.x + NODE_WIDTH + H_SPACING;
    node.spouse.y = spouse?.y ?? node.y;
    currentX = node.spouse.x;
  }
  let childX = x;
  for (const child of node.children) {
    const { maxX: childMaxX } = layoutTree(child, childX, y + V_SPACING);
    childX = childMaxX + H_SPACING;
  }
  return {
    maxX: Math.max(currentX, childX),
  };
}

export function convertToReactFlow(
  node: HierarchyNode,
  displaySettings: DisplaySettings,
  onSelectPerson: (person: Person) => void,
  onEditPerson: (person: Person) => void,
  onDeletePerson: (person: Person) => void,
  persons: Person[],
  relationships: Relationship[],
  onResizeEnd: (personId: string, width: number, height: number) => void,
  isLocked: boolean,
  processedRelationships: Set<string>,
  processedNodes: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!processedNodes.has(node.person.id)) {
    nodes.push({
      id: node.person.id,
      type: "draggablePerson",
      position: { x: node.x ?? 0, y: node.y ?? 0 },
      style: {
        width: (node.person as Person).width || "auto",
        height: (node.person as Person).height || "auto",
      },
      data: {
        person: node.person,
        persons,
        displaySettings,
        onSelectPerson,
        onEditPerson,
        onDeletePerson,
        onResizeEnd,
        isLocked,
      },
    });
    processedNodes.add(node.person.id);
  }

  if (node.spouse) {
    if (!processedNodes.has(node.spouse.person.id)) {
      nodes.push({
        id: node.spouse.person.id,
        type: "draggablePerson",
        position: { x: node.spouse.x ?? 0, y: node.spouse.y ?? 0 },
        style: {
          width: (node.spouse.person as Person).width || "auto",
          height: (node.spouse.person as Person).height || "auto",
        },
        data: {
          person: node.spouse.person,
          persons,
          displaySettings,
          onSelectPerson,
          onEditPerson,
          onDeletePerson,
          onResizeEnd,
          isLocked,
        },
      });
      processedNodes.add(node.spouse.person.id);
    }
    const relationship = relationships.find(
      (r) =>
        r.type === "spouse" &&
        ((r.fromPersonId === node.person.id &&
          r.toPersonId === node.spouse!.person.id) ||
          (r.fromPersonId === node.spouse!.person.id &&
            r.toPersonId === node.person.id))
    );
    if (relationship && !processedRelationships.has(relationship.id)) {
      const fromPersonIsNode = node.person.id === relationship.fromPersonId;
      const fromNode = fromPersonIsNode ? node : node.spouse;
      const toNode = fromPersonIsNode ? node.spouse : node;

      if (fromNode && toNode) {
        const fromNodeIsLeft = (fromNode.x ?? 0) < (toNode.x ?? 0);
        edges.push({
          id: relationship.id,
          source: relationship.fromPersonId,
          target: relationship.toPersonId,
          sourceHandle: fromNodeIsLeft ? "right" : "left",
          targetHandle: fromNodeIsLeft ? "left" : "right",
          type: "default",
          style: { stroke: "#888", strokeWidth: 2 },
          zIndex: 1000,
        });
      }
      processedRelationships.add(relationship.id);
    }
  }

  for (const child of node.children) {
    const { nodes: childNodes, edges: childEdges } = convertToReactFlow(
      child,
      displaySettings,
      onSelectPerson,
      onEditPerson,
      onDeletePerson,
      persons,
      relationships,
      onResizeEnd,
      isLocked,
      processedRelationships,
      processedNodes
    );
    nodes.push(...childNodes);
    edges.push(...childEdges);

    const parentIds = [node.person.id];
    if (node.spouse) {
      parentIds.push(node.spouse.person.id);
    }

    const relationship = relationships.find(
      (r) =>
        r.type === "parent_child" &&
        parentIds.includes(r.fromPersonId) &&
        r.toPersonId === child.person.id
    );

    if (relationship && !processedRelationships.has(relationship.id)) {
      edges.push({
        id: relationship.id,
        source: relationship.fromPersonId,
        target: child.person.id,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "default",
        style: { stroke: "#888", strokeWidth: 2 },
      });
      processedRelationships.add(relationship.id);
    }
  }

  for (const parent of node.parents) {
    const relationship = relationships.find(
      (r) =>
        r.type === "parent_child" &&
        r.fromPersonId === parent.person.id &&
        r.toPersonId === node.person.id
    );

    if (relationship && !processedRelationships.has(relationship.id)) {
      edges.push({
        id: relationship.id,
        source: parent.person.id,
        target: node.person.id,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "default",
        style: { stroke: "#888", strokeWidth: 2 },
      });
      processedRelationships.add(relationship.id);
    }
  }

  return { nodes, edges };
}
