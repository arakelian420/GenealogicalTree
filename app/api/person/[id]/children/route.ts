import { NextRequest, NextResponse } from "next/server";
import { getChildren } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const children = await getChildren(id);
  return NextResponse.json(children);
}
