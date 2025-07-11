import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const { personIds, x, y, width, height } = await request.json();

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json(
        { error: "personIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const data: { x?: number; y?: number; width?: number; height?: number } =
      {};
    if (x !== undefined) data.x = x;
    if (y !== undefined) data.y = y;
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "At least one of x, y, width, or height must be provided" },
        { status: 400 }
      );
    }

    await prisma.person.updateMany({
      where: {
        id: {
          in: personIds,
        },
      },
      data,
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
