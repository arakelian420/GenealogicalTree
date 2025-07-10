import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const parentChildDuplicates = await prisma.relationship.groupBy({
      by: ["fromPersonId", "toPersonId", "type", "treeId"],
      where: {
        type: "parent_child",
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    let deletedParentChildCount = 0;
    for (const group of parentChildDuplicates) {
      const relationships = await prisma.relationship.findMany({
        where: {
          fromPersonId: group.fromPersonId,
          toPersonId: group.toPersonId,
          type: "parent_child",
          treeId: group.treeId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const idsToDelete = relationships.slice(1).map((r) => r.id);
      if (idsToDelete.length > 0) {
        const deleteResult = await prisma.relationship.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
          },
        });
        deletedParentChildCount += deleteResult.count;
      }
    }

    const allSpouseRelationships = await prisma.relationship.findMany({
      where: { type: "spouse" },
    });

    const spouseDuplicates = new Map<string, string[]>();

    for (const rel of allSpouseRelationships) {
      const personIds = [rel.fromPersonId, rel.toPersonId].sort();
      const key = `${personIds[0]}-${personIds[1]}-${rel.treeId}`;
      if (!spouseDuplicates.has(key)) {
        spouseDuplicates.set(key, []);
      }
      spouseDuplicates.get(key)!.push(rel.id);
    }

    let deletedSpouseCount = 0;
    for (const ids of spouseDuplicates.values()) {
      if (ids.length > 1) {
        const relationships = await prisma.relationship.findMany({
          where: {
            id: {
              in: ids,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const idsToDelete = relationships.slice(1).map((r) => r.id);
        if (idsToDelete.length > 0) {
          const deleteResult = await prisma.relationship.deleteMany({
            where: {
              id: {
                in: idsToDelete,
              },
            },
          });
          deletedSpouseCount += deleteResult.count;
        }
      }
    }

    return NextResponse.json({
      message: "Cleanup successful",
      deletedParentChildCount,
      deletedSpouseCount,
    });
  } catch (error) {
    console.error("Error cleaning up relationships:", error);
    return NextResponse.json(
      { message: "Error cleaning up relationships", error },
      { status: 500 }
    );
  }
}
