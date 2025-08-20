import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { treeId, fromPersonId, toPersonId, type } = await request.json();
  const tree = await prisma.tree.findFirst({
    where: { id: treeId, userId: session.user.id },
  });

  if (!tree) {
    return new NextResponse("Tree not found", { status: 404 });
  }

  if (tree?.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }
  const existingRelationship = await prisma.relationship.findFirst({
    where: {
      fromPersonId,
      toPersonId,
      type,
      treeId,
    },
  });

  if (existingRelationship) {
    return NextResponse.json(
      { error: "Relationship already exists" },
      { status: 409 }
    );
  }

  const relationship = await prisma.relationship.create({
    data: {
      type,
      tree: {
        connect: { id: treeId },
      },
      fromPerson: {
        connect: { id: fromPersonId },
      },
      toPerson: {
        connect: { id: toPersonId },
      },
    },
  });
  return NextResponse.json(relationship);
}
