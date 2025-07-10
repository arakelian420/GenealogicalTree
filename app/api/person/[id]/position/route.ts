import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { x, y, width, height } = await request.json();
  const person = await prisma.person.findUnique({
    where: { id },
    include: { tree: true },
  });

  if (person?.tree.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }
  const updatedPerson = await prisma.person.update({
    where: { id },
    data: { x, y, width, height },
  });
  return NextResponse.json(updatedPerson);
}
