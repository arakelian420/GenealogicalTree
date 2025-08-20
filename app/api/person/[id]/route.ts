import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { documents, ...personUpdateData } = body;

  try {
    const person = await prisma.person.findUnique({
      where: { id },
      include: { tree: true },
    });

    if (!person) {
      return new NextResponse("Person not found", { status: 404 });
    }

    if (person.tree.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (person?.tree.isLocked) {
      return new NextResponse("Tree is locked", { status: 403 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPersonData = await tx.person.update({
        where: { id },
        data: personUpdateData,
      });

      if (documents) {
        await tx.document.deleteMany({
          where: { personId: id },
        });
        if (documents.length > 0) {
          await tx.document.createMany({
            data: documents.map((doc: { name: string; url: string }) => ({
              name: doc.name,
              url: doc.url,
              personId: id,
            })),
          });
        }
      }

      return updatedPersonData;
    });

    const personWithDocuments = await prisma.person.findUnique({
      where: { id },
      include: { documents: true },
    });

    return NextResponse.json(personWithDocuments);
  } catch (error) {
    console.error("Failed to update person:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to update person: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: { tree: true },
  });

  if (!person) {
    return new NextResponse("Person not found", { status: 404 });
  }

  if (person.tree.userId !== session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (person?.tree.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.tree.updateMany({
        where: { rootPersonId: id },
        data: { rootPersonId: null },
      });
      await tx.relationship.deleteMany({
        where: {
          OR: [{ fromPersonId: id }, { toPersonId: id }],
        },
      });
      await tx.document.deleteMany({
        where: { personId: id },
      });
      await tx.person.delete({
        where: { id },
      });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      e.code === "P2025"
    ) {
      return new NextResponse(null, { status: 204 });
    }
    const error = e as Error;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Failed to delete person:", error);
    return NextResponse.json(
      { error: `Failed to delete person: ${errorMessage}` },
      { status: 500 }
    );
  }
}
