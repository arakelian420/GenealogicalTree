"use client";

import React from "react";

import { useState, useEffect, useMemo } from "react";
import type { Tree, Person, Relationship } from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import PersonForm from "./person-form";
import RelationshipManager from "./relationship-manager";
import PersonNode from "./person-node";
import { buildTree, HierarchyNode } from "@/lib/tree-builder";

const NODE_WIDTH = 200;
const H_SPACING = 50;
const V_SPACING = 450;

interface TreeViewProps {
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  displaySettings: DisplaySettings;
  onUpdateTree: () => void;
}

export default function TreeView({
  tree,
  displaySettings,
  onUpdateTree,
}: TreeViewProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showRelationshipManager, setShowRelationshipManager] = useState(false);

  const familyTrees = useMemo(() => {
    if (tree.people.length === 0) return [];

    const childIds = new Set(
      tree.relationships
        .filter((r) => r.type === "parent_child")
        .map((r) => r.toPersonId)
    );

    const rootPeople = tree.people.filter((p) => !childIds.has(p.id));
    const processedIds = new Set<string>();
    const builtTrees: HierarchyNode[] = [];

    for (const rootPerson of rootPeople) {
      if (!processedIds.has(rootPerson.id)) {
        const familySubTree = buildTree(
          tree.people,
          tree.relationships,
          rootPerson.id,
          processedIds
        );
        if (familySubTree) {
          builtTrees.push(familySubTree);
        }
      }
    }
    return builtTrees;
  }, [tree]);

  const positionedTrees = useMemo(() => {
    if (familyTrees.length === 0) return [];
    return calculateLayout(familyTrees);
  }, [familyTrees]);

  function calculateLayout(roots: HierarchyNode[]): HierarchyNode[] {
    const contour = new Map<string, { left: number[]; right: number[] }>();
    const modifier = new Map<string, number>();

    function getLeftContour(node: HierarchyNode): number[] {
      if (contour.has(node.person.id) && contour.get(node.person.id)!.left) {
        return contour.get(node.person.id)!.left;
      }

      let cont: number[] = [node.x];
      if (node.children.length > 0) {
        cont = cont.concat(getLeftContour(node.children[0]));
      }
      contour.set(node.person.id, {
        ...(contour.get(node.person.id) || { right: [] }),
        left: cont,
      });
      return cont;
    }

    function getRightContour(node: HierarchyNode): number[] {
      if (contour.has(node.person.id) && contour.get(node.person.id)!.right) {
        return contour.get(node.person.id)!.right;
      }

      let cont: number[] = [node.x + NODE_WIDTH];
      if (node.children.length > 0) {
        cont = cont.concat(
          getRightContour(node.children[node.children.length - 1])
        );
      }
      contour.set(node.person.id, {
        ...(contour.get(node.person.id) || { left: [] }),
        right: cont,
      });
      return cont;
    }

    function firstPass(node: HierarchyNode) {
      node.children.forEach(firstPass);
      if (node.children.length === 0) {
        node.x = 0;
        return;
      }

      let shift = 0;
      for (let i = 0; i < node.children.length - 1; i++) {
        const right = getRightContour(node.children[i]);
        const left = getLeftContour(node.children[i + 1]);
        for (let j = 0; j < Math.min(right.length, left.length); j++) {
          const distance = right[j] - left[j] + H_SPACING;
          if (distance > shift) {
            shift = distance;
          }
        }
      }

      if (shift > 0) {
        for (let i = 1; i < node.children.length; i++) {
          const currentModifier =
            (modifier.get(node.children[i].person.id) || 0) + shift;
          modifier.set(node.children[i].person.id, currentModifier);
        }
      }

      const lastChild = node.children[node.children.length - 1];
      const lastChildModifier = modifier.get(lastChild.person.id) || 0;
      const childrenWidth = lastChild.x + lastChildModifier + NODE_WIDTH;
      const childrenCenter = childrenWidth / 2;

      if (node.spouse) {
        const coupleWidth = 2 * NODE_WIDTH + H_SPACING;
        node.x = childrenCenter - coupleWidth / 2;
      } else {
        node.x = childrenCenter - NODE_WIDTH / 2;
      }
    }

    function secondPass(node: HierarchyNode, mod: number, depth: number) {
      node.x += mod;
      node.y = depth * V_SPACING;

      if (node.spouse) {
        node.spouse.x = node.x + NODE_WIDTH + H_SPACING;
        node.spouse.y = node.y;
      }

      for (const child of node.children) {
        const childMod = mod + (modifier.get(child.person.id) || 0);
        secondPass(child, childMod, depth + 1);
      }
    }

    let totalWidth = 0;
    for (const root of roots) {
      firstPass(root);
      secondPass(root, totalWidth, 0);
      const { min, max } = getTreeBounds(root);
      totalWidth = max + H_SPACING * 4;
    }

    return roots;
  }

  function getTreeBounds(node: HierarchyNode) {
    let min = node.x;
    let max = node.x + NODE_WIDTH;
    if (node.spouse) {
      max = node.spouse.x + NODE_WIDTH;
    }
    for (const child of node.children) {
      const childBounds = getTreeBounds(child);
      min = Math.min(min, childBounds.min);
      max = Math.max(max, childBounds.max);
    }
    return { min, max };
  }

  const renderNodes = (node: HierarchyNode): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    nodes.push(
      <g key={node.person.id}>
        <foreignObject x={node.x} y={node.y} width={NODE_WIDTH} height={400}>
          <PersonNode
            node={node}
            displaySettings={displaySettings}
            selectedPerson={selectedPerson}
            onSelectPerson={setSelectedPerson}
            onEditPerson={setEditingPerson}
            onDeletePerson={deletePerson}
          />
        </foreignObject>
        {node.spouse && (
          <foreignObject
            x={node.spouse.x}
            y={node.spouse.y}
            width={NODE_WIDTH}
            height={400}
          >
            <PersonNode
              node={{
                ...node,
                person: node.spouse.person,
                spouse: node,
                children: [],
              }}
              displaySettings={displaySettings}
              selectedPerson={selectedPerson}
              onSelectPerson={setSelectedPerson}
              onEditPerson={setEditingPerson}
              onDeletePerson={deletePerson}
            />
          </foreignObject>
        )}
      </g>
    );
    node.children.forEach((child) => {
      nodes.push(...renderNodes(child));
    });
    return nodes;
  };

  const renderConnections = (node: HierarchyNode): React.ReactNode[] => {
    const connections: React.ReactNode[] = [];
    if (node.spouse) {
      connections.push(
        <line
          key={`${node.person.id}-${node.spouse.person.id}`}
          x1={node.x + NODE_WIDTH / 2}
          y1={node.y + 50}
          x2={node.spouse.x + NODE_WIDTH / 2}
          y2={node.spouse.y + 50}
          stroke="black"
        />
      );
    }

    if (node.children.length > 0) {
      const parentMidX = node.spouse
        ? (node.x + node.spouse.x + NODE_WIDTH) / 2
        : node.x + NODE_WIDTH / 2;
      const parentY = node.y + 100;

      connections.push(
        <line
          key={`${node.person.id}-v-line-parent`}
          x1={parentMidX}
          y1={parentY}
          x2={parentMidX}
          y2={parentY + V_SPACING / 2}
          stroke="black"
        />
      );

      const firstChild = node.children[0];
      const lastChild = node.children[node.children.length - 1];
      const hLineY = parentY + V_SPACING / 2;
      connections.push(
        <line
          key={`${node.person.id}-h-line`}
          x1={firstChild.x + NODE_WIDTH / 2}
          y1={hLineY}
          x2={lastChild.x + NODE_WIDTH / 2}
          y2={hLineY}
          stroke="black"
        />
      );

      node.children.forEach((child) => {
        connections.push(
          <line
            key={`${node.person.id}-${child.person.id}-v-line-child`}
            x1={child.x + NODE_WIDTH / 2}
            y1={hLineY}
            x2={child.x + NODE_WIDTH / 2}
            y2={child.y}
            stroke="black"
          />
        );
        connections.push(...renderConnections(child));
      });
    }
    return connections;
  };

  const deletePerson = async (personId: string) => {
    const response = await fetch(`/api/person/${personId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      onUpdateTree();
      if (selectedPerson?.id === personId) {
        setSelectedPerson(null);
      }
    }
  };

  if (positionedTrees.length === 0) return <div>Loading tree...</div>;

  const getMaxX = (node: HierarchyNode): number => {
    if (!node) return 0;
    const childrenMaxX =
      node.children.length > 0 ? Math.max(...node.children.map(getMaxX)) : 0;
    const spouseX = node.spouse ? node.spouse.x + NODE_WIDTH : 0;
    return Math.max(node.x + NODE_WIDTH, spouseX, childrenMaxX);
  };

  const getMaxY = (node: HierarchyNode): number => {
    if (!node) return 0;
    const childrenMaxY =
      node.children.length > 0 ? Math.max(...node.children.map(getMaxY)) : 0;
    return Math.max(node.y + 400, childrenMaxY);
  };

  const totalWidth = Math.max(...positionedTrees.map(getMaxX)) + H_SPACING;
  const maxHeight = Math.max(...positionedTrees.map(getMaxY)) + V_SPACING;

  return (
    <div className="w-full">
      <div className="flex gap-6">
        <div className="flex-1 overflow-x-auto">
          <svg className="min-w-max p-8" width={totalWidth} height={maxHeight}>
            {positionedTrees.map((tree) => (
              <g key={tree.person.id}>
                {renderNodes(tree)}
                {renderConnections(tree)}
              </g>
            ))}
          </svg>
        </div>
        {selectedPerson && (
          <div className="w-80 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Person Details</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Name:</span>
                <p>
                  {selectedPerson.firstName} {selectedPerson.lastName}
                </p>
              </div>
              {selectedPerson.birthDate && (
                <div>
                  <span className="font-medium">Birth Date:</span>
                  <p>{selectedPerson.birthDate}</p>
                </div>
              )}
              {selectedPerson.deathDate && (
                <div>
                  <span className="font-medium">Death Date:</span>
                  <p>{selectedPerson.deathDate}</p>
                </div>
              )}
              {selectedPerson.birthPlace && (
                <div>
                  <span className="font-medium">Birth Place:</span>
                  <p>{selectedPerson.birthPlace}</p>
                </div>
              )}
              {selectedPerson.occupation && (
                <div>
                  <span className="font-medium">Occupation:</span>
                  <p>{selectedPerson.occupation}</p>
                </div>
              )}
              {selectedPerson.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p>{selectedPerson.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setEditingPerson(selectedPerson)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit Person
              </button>
              <button
                onClick={() => setShowRelationshipManager(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Manage Relationships
              </button>
            </div>
          </div>
        )}
      </div>

      <PersonForm
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        tree={tree}
        onUpdateTree={onUpdateTree}
        editingPerson={editingPerson}
      />

      <RelationshipManager
        isOpen={showRelationshipManager}
        onClose={() => setShowRelationshipManager(false)}
        tree={tree}
        selectedPerson={selectedPerson}
        onUpdateTree={onUpdateTree}
      />
    </div>
  );
}
