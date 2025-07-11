import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { treeId, documents, ...personData } = await request.json();
  const tree = await prisma.tree.findFirst({
    where: { id: treeId, userId: session.user.id },
  });

  if (!tree) {
    return new NextResponse("Tree not found", { status: 404 });
  }

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
