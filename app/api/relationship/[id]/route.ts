import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.relationship.delete({
    where: { id: params.id },
  });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
