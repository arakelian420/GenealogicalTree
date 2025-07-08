import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { treeId, ...personData } = await request.json();
  const person = await prisma.person.create({
    data: {
      ...personData,
      tree: {
        connect: { id: treeId },
      },
    },
  });
  return NextResponse.json(person);
}
