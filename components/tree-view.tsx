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

import { useMedia } from "react-use";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import type {
  Tree,
  Relationship,
  Document,
  RelationshipType,
} from "@prisma/client";

import type { Person } from "@/lib/types";
import DraggablePersonNode from "./draggable-person-node";
import RelationshipManager from "./relationship-manager";
import RelationshipModal from "./relationship-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";

const NODE_WIDTH = 200;
const H_SPACING = 50;

interface TreeViewProps {
  tree: Tree & { people: Person[]; relationships: Relationship[] };
  onUpdateTree: () => void;
  onEditPerson: (person: Person) => void;
  isLocked: boolean;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
}

export default function TreeView({
  tree,
  onUpdateTree,
  isLocked,
  onEditPerson,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  onNodeDragStop,
}: TreeViewProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showRelationshipManager, setShowRelationshipManager] = useState(false);
  const [newConnection, setNewConnection] = useState<Connection | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      className="w-full h-screen print:w-screen print:h-screen user-select-none touch-action-none"
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
          className="print:hidden flex flex-col space-y-2 bg-white/80 p-2 rounded-lg"
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        >
          <ControlButton
            onClick={() => zoomIn()}
            title="Zoom In"
            className="p-2"
          >
            <ZoomIn className="w-6 h-6" />
          </ControlButton>
          <ControlButton
            onClick={() => zoomOut()}
            title="Zoom Out"
            className="p-2"
          >
            <ZoomOut className="w-6 h-6" />
          </ControlButton>
          <ControlButton
            onClick={() => fitView()}
            title="Fit View"
            className="p-2"
          >
            <Maximize className="w-6 h-6" />
          </ControlButton>
          <ControlButton
            onClick={handleToggleLock}
            title={isLocked ? "Unlock" : "Lock"}
            className="p-2"
          >
            {isLocked ? (
              <Lock className="w-6 h-6" />
            ) : (
              <Unlock className="w-6 h-6" />
            )}
          </ControlButton>
          <ControlButton onClick={handlePrint} title="Print" className="p-2">
            <Printer className="w-6 h-6" />
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
        <PersonDetails
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onEditPerson={onEditPerson}
          onManageRelationships={() => setShowRelationshipManager(true)}
        />
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

function PersonDetails({
  person,
  onClose,
  onEditPerson,
  onManageRelationships,
}: {
  person: Person;
  onClose: () => void;
  onEditPerson: (person: Person) => void;
  onManageRelationships: () => void;
}): React.ReactElement {
  const isDesktop = useMedia("(min-width: 768px)");

  const content = (
    <>
      <div className="space-y-3">
        {person.birthDate && (
          <div>
            <span className="font-medium">Birth Date:</span>
            <p>{person.birthDate}</p>
          </div>
        )}
        {person.deathDate && (
          <div>
            <span className="font-medium">Death Date:</span>
            <p>{person.deathDate}</p>
          </div>
        )}
        {person.birthPlace && (
          <div>
            <span className="font-medium">Birth Place:</span>
            <p>{person.birthPlace}</p>
          </div>
        )}
        {person.occupation && (
          <div>
            <span className="font-medium">Occupation:</span>
            <p>{person.occupation}</p>
          </div>
        )}
        {person.notes && (
          <div>
            <span className="font-medium">Notes:</span>
            <p>{person.notes}</p>
          </div>
        )}
        {person.documents && person.documents.length > 0 && (
          <div>
            <span className="font-medium">Documents:</span>
            <ul className="list-disc list-inside">
              {person.documents.map((doc: Document) => (
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
          onClick={() => onEditPerson(person)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Edit Person
        </button>
        <button
          onClick={onManageRelationships}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Manage Relationships
        </button>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-6 print:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-4">Person Details</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Name:</span>
                <p>
                  {person.firstName} {person.lastName}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 -mt-2 -mr-2 rounded-full hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Drawer open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {person.firstName} {person.lastName}
          </DrawerTitle>
          <DrawerDescription>Person Details</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
