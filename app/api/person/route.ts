import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { treeId, documents, ...personData } = await request.json();
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree?.isLocked) {
    return new NextResponse("Tree is locked", { status: 403 });
  }
  const person = await prisma.person.create({
    data: {
      ...personData,
      tree: {
        connect: { id: treeId },
      },
      documents: {
        create: documents.map((doc: { name: string; url: string }) => ({
          name: doc.name,
          url: doc.url,
        })),
      },
    },
  });
  return NextResponse.json(person);
}
