import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await unstable_getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { id: params.id },
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
    where: { id: params.id },
  });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await unstable_getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { id: params.id },
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
    where: { id: params.id },
    data: {
      fromPersonId,
      toPersonId,
    },
  });
  return NextResponse.json(updatedRelationship);
}
