import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, description } = await request.json();
  const tree = await prisma.tree.create({
    data: {
      name,
      description,
    },
  });
  return NextResponse.json(tree);
}

export async function GET() {
  const trees = await prisma.tree.findMany({
    include: {
      people: true,
    },
  });
  return NextResponse.json(trees);
}
