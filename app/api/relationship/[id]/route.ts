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
