import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const { personIds, width, height } = await request.json();

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json(
        { error: "personIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (width === undefined || height === undefined) {
      return NextResponse.json(
        { error: "width and height are required" },
        { status: 400 }
      );
    }

    await prisma.person.updateMany({
      where: {
        id: {
          in: personIds,
        },
      },
      data: {
        width,
        height,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating node positions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
