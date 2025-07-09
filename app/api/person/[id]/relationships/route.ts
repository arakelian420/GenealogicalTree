import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const personId = params.id;
  const { parents, spouses } = await request.json();

  if (!personId) {
    return NextResponse.json(
      { error: "Person ID is required" },
      { status: 400 }
    );
  }

  try {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { treeId: true },
    });

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    const { treeId } = person;

    await prisma.$transaction(async (tx) => {
      // 1. Delete existing parent and spouse relationships for this person
      await tx.relationship.deleteMany({
        where: {
          OR: [
            { type: "parent_child", toPersonId: personId },
            { type: "spouse", fromPersonId: personId },
            { type: "spouse", toPersonId: personId },
          ],
        },
      });

      // 2. Create new parent relationships
      if (parents && parents.length > 0) {
        await tx.relationship.createMany({
          data: parents.map((parentId: string) => ({
            fromPersonId: parentId,
            toPersonId: personId,
            type: "parent_child",
            treeId: treeId,
          })),
        });
      }

      // 3. Create new spouse relationships
      if (spouses && spouses.length > 0) {
        await tx.relationship.createMany({
          data: spouses.map((spouseId: string) => ({
            fromPersonId: personId,
            toPersonId: spouseId,
            type: "spouse",
            treeId: treeId,
          })),
        });
      }
    });

    return NextResponse.json({ message: "Relationships updated successfully" });
  } catch (error) {
    console.error("Failed to update relationships:", error);
    return NextResponse.json(
      { error: "Failed to update relationships" },
      { status: 500 }
    );
  }
}
