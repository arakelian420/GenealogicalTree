import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const tree = await prisma.tree.findUnique({
    where: { id },
    include: {
      people: true,
      relationships: true,
    },
  });
  return NextResponse.json(tree);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { name, description } = await request.json();
  const tree = await prisma.tree.update({
    where: { id },
    data: {
      name,
      description,
    },
  });
  return NextResponse.json(tree);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.tree.delete({
    where: { id: params.id },
  });
  return new NextResponse(null, { status: 204 });
}
