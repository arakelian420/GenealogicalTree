"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReactFlowProvider } from "reactflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Settings, Plus, Users, Save } from "lucide-react";
import Link from "next/link";
import type { Tree, Person, Relationship } from "@prisma/client";
import type { DisplaySettings } from "@/lib/types";
import TreeView from "@/components/tree-view";
import PersonForm from "@/components/person-form";
import TreeSettings from "@/components/tree-settings";

export default function TreePage() {
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
    treeLayout: "vertical",
    compactMode: false,
  });
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fetchTree = useCallback(async () => {
    const response = await fetch(`/api/tree/${treeId}`);
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

  const handleSave = () => {
    if (!tree) return;
    const dataStr = JSON.stringify(tree, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tree.name.replace(/\s/g, "_")}_family_tree.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!tree) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">
            Please wait while we load your family tree.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
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
                <span>{tree.people.length} people</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPersonForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
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
                No People Added Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start building your family tree by adding the first person
              </p>
              <Button onClick={() => setShowPersonForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Person
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="print-container">
            <ReactFlowProvider>
              <TreeView
                tree={tree}
                displaySettings={displaySettings}
                onUpdateTree={fetchTree}
              />
            </ReactFlowProvider>
          </div>
        )}
      </main>

      <PersonForm
        isOpen={showPersonForm}
        onClose={() => setShowPersonForm(false)}
        tree={tree}
        onUpdateTree={fetchTree}
      />

      <TreeSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={displaySettings}
        onUpdateSettings={setDisplaySettings}
      />
    </div>
  );
}
