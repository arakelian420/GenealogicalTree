import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await request.json();
  const tree = await prisma.tree.create({
    data: {
      name,
      description,
      userId: session.user.id,
    },
  });
  return NextResponse.json(tree);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trees = await prisma.tree.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      people: true,
    },
  });
  return NextResponse.json(trees);
}
