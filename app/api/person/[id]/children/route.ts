import { NextRequest, NextResponse } from "next/server";
import { getChildren } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const children = await getChildren(id);
  return NextResponse.json(children);
}
