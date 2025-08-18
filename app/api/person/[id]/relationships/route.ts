import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const { id: personId } = await context.params;
  const {} = await request.json();

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

      // 3. Create new spouse relationships
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
