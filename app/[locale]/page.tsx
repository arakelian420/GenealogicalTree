"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useFormatter } from "next-intl";
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
import {
  Plus,
  TreePine,
  Users,
  Calendar,
  Trash2,
  AlertTriangle,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import type { Tree, Person, Relationship } from "@/lib/types";

export default function Dashboard() {
  const t = useTranslations();
  const format = useFormatter();
  const { data: session, status } = useSession();
  const [trees, setTrees] = useState<
    (Tree & { people: Person[]; relationships: Relationship[] })[]
  >([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDescription, setNewTreeDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchTrees();
    }
  }, [status]);

  const fetchTrees = async () => {
    const response = await fetch("/api/tree");
    if (response.ok) {
      const data = await response.json();
      setTrees(data);
    }
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TreePine className="h-12 w-12 text-green-600" />
            <h1 className="text-5xl font-bold text-gray-900">
              {t("home.title")}
            </h1>
          </div>
          <p className="text-xl text-gray-600">{t("home.signInPrompt")}</p>
        </div>
        <div className="flex gap-4">
          <Link href="/signin">
            <Button size="lg">
              <LogIn className="mr-2 h-5 w-5" />
              {t("common.signIn")}
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              {t("common.register")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <TreePine className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                {t("home.title")}
              </h1>
            </div>
            <p className="text-lg text-gray-600">{t("home.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <p className="text-sm text-gray-700">
              {t("home.signedInAs")} <strong>{session?.user?.email}</strong>
            </p>
            {session?.user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  {t("common.adminPanel")}
                </Button>
              </Link>
            )}
            <Button onClick={() => signOut()} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.signOut")}
            </Button>
          </div>
        </header>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {t("home.yourTrees")}
          </h2>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t("tree.createNew")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("tree.createNewTitle")}</DialogTitle>
                <DialogDescription>
                  {t("tree.createNewDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tree-name">{t("tree.name")}</Label>
                  <Input
                    id="tree-name"
                    value={newTreeName}
                    onChange={(e) => setNewTreeName(e.target.value)}
                    placeholder={t("tree.namePlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="tree-description">
                    {t("tree.description")}
                  </Label>
                  <Textarea
                    id="tree-description"
                    value={newTreeDescription}
                    onChange={(e) => setNewTreeDescription(e.target.value)}
                    placeholder={t("tree.descriptionPlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={createTree}>{t("tree.create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {trees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <TreePine className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t("tree.emptyTitle")}
              </h3>
              <p className="text-gray-500 mb-4">{t("tree.emptyDescription")}</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("tree.createFirst")}
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
                    <Dialog
                      open={showDeleteConfirm === tree.id}
                      onOpenChange={(isOpen) =>
                        !isOpen && setShowDeleteConfirm(null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(tree.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-red-500" />
                            {t("dialogs.confirmDeleteTitle")}
                          </DialogTitle>
                          <DialogDescription>
                            {t("dialogs.confirmDeleteDescription", {
                              treeName: tree.name,
                            })}
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              deleteTree(tree.id);
                              setShowDeleteConfirm(null);
                            }}
                          >
                            {t("common.delete")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {t("tree.peopleCount", {
                          count: tree.people?.length || 0,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format.dateTime(new Date(tree.createdAt), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Link href={`/tree/${tree.id}`}>
                    <Button className="w-full">{t("tree.viewAndEdit")}</Button>
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
