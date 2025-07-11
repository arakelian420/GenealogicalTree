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
  MiniMap,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  useReactFlow,
  ControlButton,
  useOnSelectionChange,
} from "reactflow";
import {
  AlertTriangle,
  X,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Maximize,
  Printer,
} from "lucide-react";
import "reactflow/dist/style.css";
import type {
  Tree,
  Relationship,
  Document,
  RelationshipType,
} from "@prisma/client";

import type { DisplaySettings, Person } from "@/lib/types";
import { buildTree, HierarchyNode } from "@/lib/tree-builder";
import DraggablePersonNode from "./draggable-person-node";
import PersonForm from "./person-form";
import RelationshipManager from "./relationship-manager";
import RelationshipModal from "./relationship-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";

const NODE_WIDTH = 200;
const H_SPACING = 50;
const V_SPACING = 350;

interface TreeViewProps {
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  displaySettings: DisplaySettings;
  onUpdateTree: () => void;
  onEditPerson: (person: Person) => void;
  isLocked: boolean;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodePositionChange: (
    personId: string,
    position: { x: number; y: number }
  ) => void;
  onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
}

export default function TreeView({
  tree,
  displaySettings,
  onUpdateTree,
  isLocked,
  onEditPerson,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  onNodePositionChange,
  onNodeDragStop,
}: TreeViewProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showRelationshipManager, setShowRelationshipManager] = useState(false);
  const [newConnection, setNewConnection] = useState<Connection | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeIds(nodes.map((node) => node.id));
    },
  });

  const nodeTypes = useMemo(
    () => ({ draggablePerson: DraggablePersonNode }),
    []
  );

  const deletePerson = useCallback(
    async (personId: string) => {
      try {
        const response = await fetch(`/api/person/${personId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          onUpdateTree();
          setSelectedPerson((prev: Person | null) =>
            prev?.id === personId ? null : prev
          );
        } else {
          const { error } = await response.json();
          alert(`Failed to delete person: ${error}`);
        }
      } catch (error) {
        console.error("Error deleting person:", error);
      }
      setPersonToDelete(null);
    },
    [onUpdateTree]
  );

  const onNodeResizeEnd = async (
    personId: string,
    width: number,
    height: number
  ) => {
    console.log("Resizing, selected nodes:", selectedNodeIds);
    const nodeIdsToResize =
      selectedNodeIds.length > 1 && selectedNodeIds.includes(personId)
        ? selectedNodeIds
        : [personId];

    setNodes((nds) =>
      nds.map((n) =>
        nodeIdsToResize.includes(n.id)
          ? { ...n, style: { ...n.style, width, height } }
          : n
      )
    );

    await fetch(`/api/person/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personIds: nodeIdsToResize,
        width,
        height,
      }),
    });
  };

  useEffect(() => {
    console.log("Edges in TreeView:", edges);
  }, [edges]);
  useEffect(() => {
    console.log("Edges in TreeView:", edges);
  }, [edges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedPerson?.id,
      }))
    );
  }, [selectedPerson, setNodes]);

  const handleSelectPerson = (person: Person) => {
    if (selectedPerson?.id === person.id) {
      setSelectedPerson(null);
    } else {
      setSelectedPerson(person);
    }
  };

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

    const response = await fetch("/api/relationship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treeId: tree.id,
        fromPersonId: newConnection.source,
        toPersonId: newConnection.target,
        type,
      }),
    });

    if (response.ok) {
      onUpdateTree();
    } else if (response.status === 409) {
      const { error } = await response.json();
      alert(error);
    }

    setNewConnection(null);
  };

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    if (isLocked) return;
    setEdgeToDelete(edge);
  };

  const deleteRelationship = async () => {
    if (!edgeToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/relationship/${edgeToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onUpdateTree();
      } else {
        const errorText = await response.text();
        alert(`Failed to delete relationship: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting relationship:", error);
    } finally {
      setIsDeleting(false);
      setEdgeToDelete(null);
    }
  };

  const handleToggleLock = async () => {
    try {
      const response = await fetch(`/api/tree/${tree.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !isLocked }),
      });

      if (response.ok) {
        onUpdateTree();
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to update tree lock status. Server response:",
          errorText
        );
      }
    } catch (error) {
      console.error("Error updating tree lock status:", error);
    }
  };

  const handlePrint = useCallback(() => {
    fitView({ padding: 0.1 });
    setTimeout(() => {
      window.print();
    }, 100);
  }, [fitView]);

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
        minZoom={0.1}
        onPaneClick={() => setSelectedPerson(null)}
        nodesDraggable={!isLocked}
        nodesConnectable={true}
        elementsSelectable={true}
        multiSelectionKeyCode="Shift"
      >
        <Background />
        <Controls
          className="print:hidden flex flex-col space-y-2"
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        >
          <ControlButton onClick={() => zoomIn()} title="Zoom In">
            <ZoomIn />
          </ControlButton>
          <ControlButton onClick={() => zoomOut()} title="Zoom Out">
            <ZoomOut />
          </ControlButton>
          <ControlButton onClick={() => fitView()} title="Fit View">
            <Maximize />
          </ControlButton>
          <ControlButton
            onClick={handleToggleLock}
            title={isLocked ? "Unlock" : "Lock"}
          >
            {isLocked ? <Lock /> : <Unlock />}
          </ControlButton>
          <ControlButton onClick={handlePrint} title="Print">
            <Printer />
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
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-4">Person Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Name:</span>
                  <p>
                    {selectedPerson.firstName} {selectedPerson.lastName}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPerson(null)}
              className="p-1 -mt-2 -mr-2 rounded-full hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
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
            {selectedPerson.documents &&
              selectedPerson.documents.length > 0 && (
                <div>
                  <span className="font-medium">Documents:</span>
                  <ul className="list-disc list-inside">
                    {selectedPerson.documents.map((doc: Document) => (
                      <li key={doc.id}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {doc.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
          <div className="mt-6 space-y-2">
            <button
              onClick={() => onEditPerson(selectedPerson)}
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

      <RelationshipManager
        isOpen={showRelationshipManager}
        onClose={() => setShowRelationshipManager(false)}
        tree={tree}
        selectedPerson={selectedPerson}
        onUpdateTree={onUpdateTree}
        isLocked={isLocked}
      />
      <Dialog
        open={!!personToDelete}
        onOpenChange={(isOpen) => !isOpen && setPersonToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" />
              Are you sure?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>
                {personToDelete?.firstName} {personToDelete?.lastName}
              </strong>{" "}
              and all of their relationships.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersonToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => personToDelete && deletePerson(personToDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!edgeToDelete}
        onOpenChange={(isOpen) => !isOpen && setEdgeToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" />
              Are you sure?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              relationship.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdgeToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteRelationship}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function convertToReactFlow(
  node: HierarchyNode,
  displaySettings: DisplaySettings,
  onSelectPerson: (person: Person) => void,
  onEditPerson: (person: Person) => void,
  onDeletePerson: (person: Person) => void,
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
      onSelectPerson,
      onEditPerson,
      onDeletePerson,
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
