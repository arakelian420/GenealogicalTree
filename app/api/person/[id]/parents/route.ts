import { NextRequest, NextResponse } from "next/server";
import { getParents } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parents = await getParents(id);
  return NextResponse.json(parents);
}
