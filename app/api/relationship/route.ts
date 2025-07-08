import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { treeId, fromPersonId, toPersonId, type } = await request.json();
  const relationship = await prisma.relationship.create({
    data: {
      type,
      tree: {
        connect: { id: treeId },
      },
      fromPerson: {
        connect: { id: fromPersonId },
      },
      toPerson: {
        connect: { id: toPersonId },
      },
    },
  });
  return NextResponse.json(relationship);
}
