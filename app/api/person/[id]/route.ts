import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { photo, documents, ...personData } = await request.json();

  const person = await prisma.$transaction(async (tx) => {
    const updatedPerson = await tx.person.update({
      where: { id },
      data: {
        ...personData,
        ...(photo && { photo }),
      },
      include: {
        documents: true,
      },
    });

    if (documents && documents.length > 0) {
      await tx.document.deleteMany({
        where: { personId: id },
      });
      await tx.document.createMany({
        data: documents.map((doc: { name: string; url: string }) => ({
          ...doc,
          personId: id,
        })),
      });
    }

    return updatedPerson;
  });

  return NextResponse.json(person);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  try {
    await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return new NextResponse(null, { status: 204 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Failed to delete person:", error);
    return NextResponse.json(
      { error: `Failed to delete person: ${errorMessage}` },
      { status: 500 }
    );
  }
}
