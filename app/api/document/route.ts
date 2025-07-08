import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { personId, name, url } = await request.json();
  const document = await prisma.document.create({
    data: {
      name,
      url,
      person: {
        connect: { id: personId },
      },
    },
  });
  return NextResponse.json(document);
}
