import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { personId: id },
  });
  return NextResponse.json(documents);
}
