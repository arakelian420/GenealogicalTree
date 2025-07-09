"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  Tree,
  Person,
  Relationship,
  RelationshipType,
} from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import { buildTree, HierarchyNode } from "@/lib/tree-builder";
import DraggablePersonNode from "./draggable-person-node";
import PersonForm from "./person-form";
import RelationshipManager from "./relationship-manager";
import RelationshipModal from "./relationship-modal";

const NODE_WIDTH = 200;
const H_SPACING = 50;
const V_SPACING = 350;

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newConnection, setNewConnection] = useState<Connection | null>(null);

  const nodeTypes = useMemo(
    () => ({ draggablePerson: DraggablePersonNode }),
    []
  );

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

  useEffect(() => {
    if (tree.people.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const childIds = new Set(
      tree.relationships
        .filter((r) => r.type === "parent_child")
        .map((r) => r.toPersonId)
    );

    const rootPeople = tree.people.filter((p) => !childIds.has(p.id));
    const processedIds = new Set<string>();
    const reactFlowNodes: Node[] = [];
    const reactFlowEdges: Edge[] = [];
    let yOffset = 0;

    for (const rootPerson of rootPeople) {
      if (!processedIds.has(rootPerson.id)) {
        const familySubTree = buildTree(
          tree.people,
          tree.relationships,
          rootPerson.id,
          processedIds
        );

        if (familySubTree) {
          const { maxX } = layoutTree(familySubTree, 0, yOffset);
          yOffset += V_SPACING;
          const { nodes: newNodes, edges: newEdges } = convertToReactFlow(
            familySubTree,
            displaySettings,
            selectedPerson,
            setSelectedPerson,
            setEditingPerson,
            deletePerson,
            tree.relationships
          );
          reactFlowNodes.push(...newNodes);
          reactFlowEdges.push(...newEdges);
        }
      }
    }
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [tree, displaySettings, selectedPerson, onUpdateTree, setNodes, setEdges]);

  const onConnect = (connection: Connection) => {
    setNewConnection(connection);
  };

  const saveRelationship = async (type: RelationshipType) => {
    if (!newConnection) return;
    await fetch("/api/relationship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treeId: tree.id,
        fromPersonId: newConnection.source,
        toPersonId: newConnection.target,
        type,
      }),
    });
    onUpdateTree();
    setNewConnection(null);
  };

  const onEdgeClick = async (event: React.MouseEvent, edge: Edge) => {
    if (window.confirm("Are you sure you want to delete this relationship?")) {
      await fetch(`/api/relationship/${edge.id}`, {
        method: "DELETE",
      });
      onUpdateTree();
    }
  };

  function layoutTree(
    node: HierarchyNode,
    x: number,
    y: number
  ): { maxX: number } {
    node.x = x;
    node.y = y;
    let currentX = x;

    if (node.spouse) {
      node.spouse.x = x + NODE_WIDTH + H_SPACING;
      node.spouse.y = y;
      currentX = node.spouse.x;
    }

    let childX = x;
    for (const child of node.children) {
      const { maxX: childMaxX } = layoutTree(child, childX, y + V_SPACING);
      childX = childMaxX + H_SPACING;
    }

    return { maxX: Math.max(currentX, childX) };
  }

  return (
    <div className="w-full h-[800px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <RelationshipModal
        isOpen={!!newConnection}
        onClose={() => setNewConnection(null)}
        onSave={saveRelationship}
      />

      {selectedPerson && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-6">
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

function convertToReactFlow(
  node: HierarchyNode,
  displaySettings: DisplaySettings,
  selectedPerson: Person | null,
  onSelectPerson: (person: Person) => void,
  onEditPerson: (person: Person) => void,
  onDeletePerson: (personId: string) => void,
  relationships: Relationship[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: node.person.id,
    type: "draggablePerson",
    position: { x: node.x, y: node.y },
    data: {
      person: node.person,
      displaySettings,
      onSelectPerson,
      onEditPerson,
      onDeletePerson,
      selectedPerson,
    },
  });

  if (node.spouse) {
    nodes.push({
      id: node.spouse.person.id,
      type: "draggablePerson",
      position: { x: node.spouse.x, y: node.spouse.y },
      data: {
        person: node.spouse.person,
        displaySettings,
        onSelectPerson,
        onEditPerson,
        onDeletePerson,
        selectedPerson,
      },
    });
    const relationship = relationships.find(
      (r) =>
        r.type === "spouse" &&
        ((r.fromPersonId === node.person.id &&
          r.toPersonId === node.spouse!.person.id) ||
          (r.fromPersonId === node.spouse!.person.id &&
            r.toPersonId === node.person.id))
    );
    if (relationship) {
      edges.push({
        id: relationship.id,
        source: node.person.id,
        target: node.spouse.person.id,
        type: "step",
      });
    }
  }

  for (const child of node.children) {
    const { nodes: childNodes, edges: childEdges } = convertToReactFlow(
      child,
      displaySettings,
      selectedPerson,
      onSelectPerson,
      onEditPerson,
      onDeletePerson,
      relationships
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

    if (relationship) {
      edges.push({
        id: relationship.id,
        source: relationship.fromPersonId,
        target: child.person.id,
        type: "step",
      });
    }
  }

  return { nodes, edges };
}
