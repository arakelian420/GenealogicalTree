import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Разрешаем params (в Next.js 15 params — Promise)
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // опциональная проверка: есть ли запись, чтобы возвращать 404, если нет
    const tree = await prisma.tree.findUnique({ where: { id } });
    if (!tree)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    await prisma.tree.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
