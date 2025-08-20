"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [trees, setTrees] = useState<TreeWithUser[]>([]);

  interface User {
    id: string;
    email: string;
    role: string;
    status: string;
  }

  interface TreeWithUser {
    id: string;
    name: string;
    user: {
      email: string;
    };
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.role !== "admin") {
      router.push("/");
    } else {
      fetchUsers();
      fetchTrees();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    }
  };

  const fetchTrees = async () => {
    const response = await fetch("/api/admin/trees");
    if (response.ok) {
      const data = await response.json();
      setTrees(data);
    }
  };

  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    fetchUsers();
  };

  const deleteTree = async (treeId: string) => {
    await fetch(`/api/admin/trees/${treeId}`, {
      method: "DELETE",
    });
    fetchTrees();
  };

  if (status === "loading" || session?.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Link href="/">
          <Button variant="outline">{t("returnToDashboard")}</Button>
        </Link>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{t("users")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.status === "active"}
                    onCheckedChange={(checked) =>
                      handleUserStatusChange(
                        user.id,
                        checked ? "active" : "disabled"
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t("openMenu")}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => deleteUser(user.id)}>
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t("trees")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("owner")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trees.map((tree) => (
              <TableRow key={tree.id}>
                <TableCell>{tree.name}</TableCell>
                <TableCell>{tree.user.email}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTree(tree.id)}
                  >
                    {t("common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
