import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const tree = await prisma.tree.findUnique({
    where: { id_userId: { id, userId: session.user.id } },
    include: {
      people: true,
    },
  });

  if (!tree) {
    return new NextResponse("Tree not found", { status: 404 });
  }

  const personIds = tree.people.map((p) => p.id);

  const relationships =
    personIds.length > 0
      ? await prisma.relationship.findMany({
          where: {
            treeId: id,
            OR: [
              { fromPersonId: { in: personIds } },
              { toPersonId: { in: personIds } },
            ],
          },
        })
      : [];

  return NextResponse.json({ ...tree, relationships });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { isLocked } = await request.json();
    const tree = await prisma.tree.update({
      where: { id_userId: { id, userId: session.user.id } },
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
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const tree = await prisma.tree.findUnique({
      where: { id_userId: { id, userId: session.user.id } },
    });

    if (!tree) {
      return new NextResponse("Tree not found", { status: 404 });
    }

    await prisma.$transaction([
      prisma.relationship.deleteMany({
        where: { treeId: id },
      }),
      prisma.person.deleteMany({
        where: { treeId: id },
      }),
      prisma.tree.delete({
        where: { id_userId: { id, userId: session.user.id } },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete tree:", error);
    return NextResponse.json(
      { error: "Failed to delete tree" },
      { status: 500 }
    );
  }
}
