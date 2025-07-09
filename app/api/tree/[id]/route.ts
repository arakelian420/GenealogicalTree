import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tree = await prisma.tree.findUnique({
    where: { id: params.id },
    include: {
      people: true,
      relationships: true,
    },
  });
  if (!tree) {
    return new NextResponse("Tree not found", { status: 404 });
  }
  return NextResponse.json(tree);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isLocked } = await request.json();
    const tree = await prisma.tree.update({
      where: { id: params.id },
      data: { isLocked },
    });
    return NextResponse.json(tree);
  } catch (error) {
    console.error("Failed to update tree:", error);
    return NextResponse.json(
      { error: "Failed to update tree" },
      { status: 500 }
    );
  }
}
