"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  useReactFlow,
  ControlButton,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Tree, Relationship, RelationshipType } from "@prisma/client";

import type { DisplaySettings, Person } from "@/lib/types";
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
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo(
    () => ({ draggablePerson: DraggablePersonNode }),
    []
  );

  const deletePerson = useCallback(
    async (personId: string) => {
      const response = await fetch(`/api/person/${personId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onUpdateTree();
        if (selectedPerson?.id === personId) {
          setSelectedPerson(null);
        }
      }
    },
    [onUpdateTree, selectedPerson]
  );

  const onNodeResizeEnd = async (
    personId: string,
    width: number,
    height: number
  ) => {
    await fetch(`/api/person/${personId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        width,
        height,
      }),
    });
  };

  const layoutTree = useCallback(
    (
      node: HierarchyNode,
      x: number,
      y: number
    ): {
      maxX: number;
    } => {
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
    },
    []
  );

  useEffect(() => {
    if (tree.people.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const connectedIds = new Set<string>();
    tree.relationships.forEach((r) => {
      connectedIds.add(r.fromPersonId);
      connectedIds.add(r.toPersonId);
    });

    const unconnectedPeople = tree.people.filter(
      (p: Person) => !connectedIds.has(p.id)
    );
    const reactFlowNodes: Node[] = [];
    const reactFlowEdges: Edge[] = [];
    let x = 0;
    let y = 0;
    for (const person of unconnectedPeople) {
      reactFlowNodes.push({
        id: person.id,
        type: "draggablePerson",
        position:
          (person as Person).x !== null && (person as Person).y !== null
            ? { x: (person as Person).x!, y: (person as Person).y! }
            : { x, y },
        style: {
          width: person.width || "auto",
          height: person.height || "auto",
        },
        data: {
          person,
          displaySettings,
          onSelectPerson: setSelectedPerson,
          onEditPerson: setEditingPerson,
          onDeletePerson: deletePerson,
          selectedPerson,
          onResizeEnd: onNodeResizeEnd,
        },
      });
      if ((person as Person).x === null || (person as Person).y === null) {
        x += NODE_WIDTH + H_SPACING;
        if (x > 800) {
          x = 0;
          y += V_SPACING;
        }
      }
    }

    let yOffset = y > 0 ? y + V_SPACING : 0;

    const childIds = new Set(
      tree.relationships
        .filter((r) => r.type === "parent_child")
        .map((r) => r.toPersonId)
    );

    const rootPeople = tree.people.filter(
      (p) => !childIds.has(p.id) && connectedIds.has(p.id)
    );
    const processedIds = new Set<string>();
    const processedNodeIds = new Set<string>();
    const processedRelationshipIds = new Set<string>();

    for (const rootPerson of rootPeople) {
      if (!processedIds.has(rootPerson.id)) {
        const familySubTree = buildTree(
          tree.people,
          tree.relationships,
          rootPerson.id
        );

        if (familySubTree) {
          layoutTree(familySubTree, 0, yOffset);
          yOffset += V_SPACING;
          const { nodes: newNodes, edges: newEdges } = convertToReactFlow(
            familySubTree,
            displaySettings,
            selectedPerson,
            setSelectedPerson,
            setEditingPerson,
            deletePerson,
            tree.relationships,
            onNodeResizeEnd,
            processedRelationshipIds,
            processedNodeIds
          );
          reactFlowNodes.push(...newNodes);
          reactFlowEdges.push(...newEdges);
        }
      }
    }
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [
    tree,
    displaySettings,
    selectedPerson,
    onUpdateTree,
    setNodes,
    setEdges,
    deletePerson,
    layoutTree,
  ]);

  const onConnect = (connection: Connection) => {
    setNewConnection(connection);
  };

  const saveRelationship = async (type: RelationshipType) => {
    if (!newConnection) return;

    if (type === "spouse") {
      const sourceNode = nodes.find((n) => n.id === newConnection.source);
      const targetNode = nodes.find((n) => n.id === newConnection.target);
      if (sourceNode && targetNode) {
        targetNode.position = {
          x: sourceNode.position.x + NODE_WIDTH + H_SPACING,
          y: sourceNode.position.y,
        };
        setNodes([...nodes]);
      }
    }

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

  const onNodeDragStop = async (event: React.MouseEvent, node: Node) => {
    const spouseEdge = edges.find(
      (edge) =>
        (edge.source === node.id || edge.target === node.id) &&
        tree.relationships.find((r: Relationship) => r.id === edge.id)?.type ===
          "spouse"
    );

    if (spouseEdge) {
      const otherNodeId =
        spouseEdge.source === node.id ? spouseEdge.target : spouseEdge.source;
      const otherNode = nodes.find((n) => n.id === otherNodeId);

      if (otherNode) {
        const newOtherNodePosition = {
          x: otherNode.position.x,
          y: otherNode.position.y,
        };
        const newThisNodePosition = {
          x: node.position.x,
          y: node.position.y,
        };

        if (
          Math.abs(node.position.x - otherNode.position.x) <
          NODE_WIDTH + H_SPACING
        ) {
          newThisNodePosition.x = otherNode.position.x;
          newOtherNodePosition.x = node.position.x;

          await fetch(`/api/relationship/${spouseEdge.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromPersonId: spouseEdge.target,
              toPersonId: spouseEdge.source,
            }),
          });
        }
        await fetch(`/api/person/${otherNode.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x: newOtherNodePosition.x,
            y: newOtherNodePosition.y,
          }),
        });
        await fetch(`/api/person/${node.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x: newThisNodePosition.x,
            y: newThisNodePosition.y,
          }),
        });
        onUpdateTree();
        return;
      }
    }

    await fetch(`/api/person/${node.id}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: node.position.x, y: node.position.y }),
    });
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    const onBeforePrint = () => {
      fitView({ padding: 0.1 });
    };

    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, [fitView]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[800px] print:w-screen print:h-screen"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls className="print:hidden">
          <ControlButton onClick={handlePrint} title="Print">
            🖨️
          </ControlButton>
        </Controls>
        <MiniMap className="print:hidden" />
      </ReactFlow>

      <RelationshipModal
        isOpen={!!newConnection}
        onClose={() => setNewConnection(null)}
        onSave={saveRelationship}
      />

      {selectedPerson && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-6 print:hidden">
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
  relationships: Relationship[],
  onResizeEnd: (personId: string, width: number, height: number) => void,
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
        displaySettings,
        onSelectPerson,
        onEditPerson,
        onDeletePerson,
        selectedPerson,
        onResizeEnd,
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
          displaySettings,
          onSelectPerson,
          onEditPerson,
          onDeletePerson,
          selectedPerson,
          onResizeEnd,
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
      const fromNode =
        node.person.id === relationship.fromPersonId ? node : node.spouse;
      const toNode =
        node.person.id === relationship.toPersonId ? node : node.spouse;
      const fromNodeIsLeft = (fromNode.x ?? 0) < (toNode.x ?? 0);
      edges.push({
        id: relationship.id,
        source: relationship.fromPersonId,
        target: relationship.toPersonId,
        sourceHandle: fromNodeIsLeft ? "right" : "left",
        targetHandle: fromNodeIsLeft ? "left" : "right",
        type: "straight",
        style: { strokeWidth: 2 },
        zIndex: 1000,
      });
      processedRelationships.add(relationship.id);
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
      relationships,
      onResizeEnd,
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
        type: "step",
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
        type: "step",
      });
      processedRelationships.add(relationship.id);
    }
  }

  return { nodes, edges };
}
