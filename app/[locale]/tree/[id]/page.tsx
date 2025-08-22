"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "reactflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Settings, Plus, Users, Save } from "lucide-react";
import Link from "next/link";
import type {
  Tree,
  Person as PrismaPerson,
  Relationship,
  Document,
} from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import { layoutTree, convertToReactFlow } from "@/lib/flow-utils";
import { buildTree } from "@/lib/tree-builder";
import TreeView from "@/components/tree-view";
import PersonForm from "@/components/person-form";
import TreeSettings from "@/components/tree-settings";
import PersonDetailsModal from "@/components/person-details-modal";
import ConfirmationDialog from "@/components/confirmation-dialog";

type Person = PrismaPerson & {
  documents?: Document[];
};

export default function TreePage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const treeId = params.id as string;

  const [tree, setTree] = useState<
    (Tree & { people: Person[]; relationships: Relationship[] }) | null
  >(null);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    showBirthDate: true,
    showDeathDate: true,
    showBirthPlace: false,
    showOccupation: false,
    showPhotos: true,
    showCurrentPlace: true,
    showFatherName: true,
  });
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [screenWidth, setScreenWidth] = useState(1024);

  const handleDeletePerson = (person: Person) => {
    setDeletingPerson(person);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeletePerson = async () => {
    if (!deletingPerson) return;

    const response = await fetch(`/api/person/${deletingPerson.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setTree((prevTree) => {
        if (!prevTree) return null;
        return {
          ...prevTree,
          people: prevTree.people.filter((p) => p.id !== deletingPerson.id),
          relationships: prevTree.relationships.filter(
            (r) =>
              r.fromPersonId !== deletingPerson.id &&
              r.toPersonId !== deletingPerson.id
          ),
        };
      });
    } else {
      console.error(t("errors.failedToDeletePerson"));
    }

    setDeletingPerson(null);
    setIsConfirmDeleteDialogOpen(false);
  };

  const fetchTree = useCallback(async () => {
    const response = await fetch(`/api/tree/${treeId}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setTree(data);
    } else {
      router.push("/");
    }
  }, [treeId, router]);

  useEffect(() => {
    if (treeId) {
      fetchTree();
    }
  }, [treeId, fetchTree]);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!tree) return;

    const NODE_WIDTH = 200;
    const H_SPACING = screenWidth < 768 ? 20 : 50;
    const V_SPACING = 350;

    const connectedIds = new Set<string>();
    tree.relationships.forEach((r: Relationship) => {
      connectedIds.add(r.fromPersonId);
      connectedIds.add(r.toPersonId);
    });

    const unconnectedPeople = tree.people.filter(
      (p: Person) => !connectedIds.has(p.id)
    );
    const reactFlowNodes: Node[] = [];
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
          persons: tree.people,
          relationships: tree.relationships,
          displaySettings,
          onSelectPerson: (p: Person) => {
            setSelectedPerson(p);
            setIsDetailsModalOpen(true);
          },
          onEditPerson: (p: Person) => {
            setEditingPerson(p);
            setShowPersonForm(true);
          },
          onDeletePerson: (p: Person) => handleDeletePerson(p),
          onResizeEnd: () => {},
          isLocked: tree.isLocked,
        },
      });
      if ((person as Person).x === null || (person as Person).y === null) {
        x += NODE_WIDTH + H_SPACING;
        if (x > screenWidth - NODE_WIDTH) {
          x = 0;
          y += V_SPACING;
        }
      }
    }

    let yOffset = y > 0 ? y + V_SPACING : 0;

    const childIds = new Set(
      tree.relationships
        .filter((r: Relationship) => r.type === "parent_child")
        .map((r: Relationship) => r.toPersonId)
    );

    const rootPeople = tree.people.filter(
      (p: Person) => !childIds.has(p.id) && connectedIds.has(p.id)
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
          const { nodes: newNodes } = convertToReactFlow(
            familySubTree,
            displaySettings,
            (p: Person) => {
              setSelectedPerson(p);
              setIsDetailsModalOpen(true);
            },
            (p: Person) => {
              setEditingPerson(p);
              setShowPersonForm(true);
            },
            (p: Person) => handleDeletePerson(p),
            tree.people,
            tree.relationships,
            () => {},
            tree.isLocked,
            processedRelationshipIds,
            processedNodeIds
          );
          reactFlowNodes.push(...newNodes);
        }
      }
    }

    const allEdges: Edge[] = [];
    const addedEdges = new Set<string>();

    for (const rel of tree.relationships) {
      if (addedEdges.has(rel.id)) continue;

      const sourceNode = reactFlowNodes.find((n) => n.id === rel.fromPersonId);
      const targetNode = reactFlowNodes.find((n) => n.id === rel.toPersonId);

      if (sourceNode && targetNode) {
        let edge: Edge;
        if (rel.type === "spouse") {
          const fromNodeIsLeft = sourceNode.position.x < targetNode.position.x;
          edge = {
            id: rel.id,
            source: rel.fromPersonId,
            target: rel.toPersonId,
            type: "default",
            sourceHandle: fromNodeIsLeft ? "right" : "left",
            targetHandle: fromNodeIsLeft ? "left" : "right",
            style: { strokeWidth: 2 },
            zIndex: 1000,
          };
        } else {
          edge = {
            id: rel.id,
            source: rel.fromPersonId,
            target: rel.toPersonId,
            type: "default",
            sourceHandle: "bottom",
            targetHandle: "top",
          };
        }
        allEdges.push(edge);
        addedEdges.add(rel.id);
      }
    }

    setNodes(reactFlowNodes);
    setEdges(allEdges);
  }, [tree, displaySettings, setNodes, setEdges]);

  const handleUpdatePerson = (updatedPerson: Person) => {
    if (!tree) return;

    const personExists = tree.people.some(
      (p: Person) => p.id === updatedPerson.id
    );

    if (personExists) {
      setTree(
        (
          prevTree:
            | (Tree & {
                people: Person[];
                relationships: Relationship[];
              })
            | null
        ) => {
          if (!prevTree) return null;
          return {
            ...prevTree,
            people: prevTree.people.map((p: Person) =>
              p.id === updatedPerson.id
                ? { ...p, ...updatedPerson, documents: updatedPerson.documents }
                : p
            ),
          };
        }
      );
    } else {
      setTree(
        (
          prevTree:
            | (Tree & {
                people: Person[];
                relationships: Relationship[];
              })
            | null
        ) => {
          if (!prevTree) return null;
          return {
            ...prevTree,
            people: [...prevTree.people, updatedPerson],
          };
        }
      );
    }
  };

  const handleNodePositionChange = (
    personId: string,
    position: { x: number; y: number }
  ) => {
    if (!tree) return;
    setTree(
      (
        prevTree:
          | (Tree & {
              people: Person[];
              relationships: Relationship[];
            })
          | null
      ) => {
        if (!prevTree) return null;
        return {
          ...prevTree,
          people: prevTree.people.map((p: Person) =>
            p.id === personId ? { ...p, x: position.x, y: position.y } : p
          ),
        };
      }
    );
  };

  const handleNodeDragStop = async (event: React.MouseEvent, node: Node) => {
    await fetch(`/api/person/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personIds: [node.id],
        x: node.position.x,
        y: node.position.y,
      }),
    });
    handleNodePositionChange(node.id, node.position);
  };

  const handleSave = () => {
    window.print();
  };

  if (!tree) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">{t("common.loading")}</h2>
          <p className="text-gray-600">{t("tree.loadingDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("tree.backToDashboard")}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tree.name}
                </h1>
                {tree.description && (
                  <p className="text-gray-600">{tree.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-600 mr-4">
                <Users className="h-4 w-4" />
                <span>
                  {t("tree.peopleCount", { count: tree.people.length })}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPersonForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("person.add")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("tree.settings")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!tree}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {tree.people.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t("tree.noPeople")}
              </h3>
              <p className="text-gray-500 mb-4">
                {t("tree.noPeopleDescription")}
              </p>
              <Button onClick={() => setShowPersonForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("person.addFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="print-container">
            <ReactFlowProvider>
              <TreeView
                tree={tree}
                onUpdateTree={fetchTree}
                onEditPerson={(person) => {
                  setEditingPerson(person);
                  setShowPersonForm(true);
                }}
                isLocked={tree.isLocked}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                setNodes={setNodes}
                onNodeDragStop={handleNodeDragStop}
              />
            </ReactFlowProvider>
          </div>
        )}
      </main>

      <div className="sm:hidden fixed bottom-4 right-4 flex flex-col gap-2">
        <Button
          size="icon"
          className="rounded-full h-14 w-14"
          onClick={() => setShowPersonForm(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full h-14 w-14"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full h-14 w-14"
          onClick={handleSave}
          disabled={!tree}
        >
          <Save className="h-6 w-6" />
        </Button>
      </div>

      <PersonForm
        isOpen={showPersonForm}
        onClose={() => {
          setShowPersonForm(false);
          setEditingPerson(null);
        }}
        tree={tree}
        onUpdateTree={handleUpdatePerson}
        editingPerson={editingPerson}
      />

      <TreeSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={displaySettings}
        onUpdateSettings={setDisplaySettings}
        tree={tree}
        onUpdateTree={fetchTree}
      />

      <PersonDetailsModal
        person={selectedPerson}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
      <ConfirmationDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        onConfirm={confirmDeletePerson}
        title={t("dialogs.deletePersonTitle", {
          name: `${deletingPerson?.firstName} ${deletingPerson?.lastName}`,
        })}
        description={t("dialogs.deletePersonDescription")}
      />
    </div>
  );
}
