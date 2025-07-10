import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const relationship = await prisma.relationship.findUnique({
    where: { id: params.id },
    include: { tree: true },
  });

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
  const relationship = await prisma.relationship.findUnique({
    where: { id: params.id },
    include: { tree: true },
  });

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
