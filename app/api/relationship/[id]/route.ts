import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = request.url.split("/").pop() as string;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { id },
    include: { tree: true },
  });

  if (!relationship) {
    return new NextResponse("Relationship not found", { status: 404 });
  }

  if (relationship.tree.userId !== session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (relationship?.tree.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }

  await prisma.relationship.delete({
    where: { id },
  });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = request.url.split("/").pop() as string;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { id },
    include: { tree: true },
  });

  if (!relationship) {
    return new NextResponse("Relationship not found", { status: 404 });
  }

  if (relationship.tree.userId !== session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (relationship?.tree.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }
  const { fromPersonId, toPersonId } = await request.json();
  const updatedRelationship = await prisma.relationship.update({
    where: { id },
    data: {
      fromPersonId,
      toPersonId,
    },
  });
  return NextResponse.json(updatedRelationship);
}
