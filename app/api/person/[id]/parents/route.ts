import { NextRequest, NextResponse } from "next/server";
import { getParents } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const parents = await getParents(id);
  return NextResponse.json(parents);
}
