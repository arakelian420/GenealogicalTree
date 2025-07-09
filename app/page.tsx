"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, TreePine, Users, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { type Tree, type Person, type Relationship } from "@prisma/client";

export default function Dashboard() {
  const [trees, setTrees] = useState<
    (Tree & { people: Person[]; relationships: Relationship[] })[]
  >([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDescription, setNewTreeDescription] = useState("");

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    const response = await fetch("/api/tree");
    const data = await response.json();
    setTrees(data);
  };

  const createTree = async () => {
    if (!newTreeName.trim()) return;

    const response = await fetch("/api/tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTreeName,
        description: newTreeDescription,
      }),
    });

    if (response.ok) {
      fetchTrees();
      setNewTreeName("");
      setNewTreeDescription("");
      setIsCreateDialogOpen(false);
    }
  };

  const deleteTree = async (treeId: string) => {
    const response = await fetch(`/api/tree/${treeId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      fetchTrees();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TreePine className="h-8 w-8 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Family Tree Manager
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Create and manage your family genealogy
          </p>
        </header>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Your Family Trees
          </h2>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Tree
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Family Tree</DialogTitle>
                <DialogDescription>
                  Start building your family genealogy by creating a new tree.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tree-name">Tree Name</Label>
                  <Input
                    id="tree-name"
                    value={newTreeName}
                    onChange={(e) => setNewTreeName(e.target.value)}
                    placeholder="e.g., Smith Family Tree"
                  />
                </div>
                <div>
                  <Label htmlFor="tree-description">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="tree-description"
                    value={newTreeDescription}
                    onChange={(e) => setNewTreeDescription(e.target.value)}
                    placeholder="Brief description of this family tree..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createTree}>Create Tree</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {trees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <TreePine className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Family Trees Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first family tree to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tree
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <Card key={tree.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tree.name}</CardTitle>
                      {tree.description && (
                        <CardDescription className="mt-1">
                          {tree.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTree(tree.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{tree.people?.length || 0} people</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(tree.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link href={`/tree/${tree.id}`}>
                    <Button className="w-full">View & Edit Tree</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
