import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const documents = await prisma.document.findMany({
    where: { personId: id },
  });
  return NextResponse.json(documents);
}
