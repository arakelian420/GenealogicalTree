import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { photo, ...personData } = await request.json();
  const person = await prisma.person.update({
    where: { id },
    data: {
      ...personData,
      ...(photo && { photo }),
    },
  });
  return NextResponse.json(person);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  await prisma.person.delete({
    where: { id },
  });
  return new NextResponse(null, { status: 204 });
}
