import { NextRequest, NextResponse } from "next/server";
import { getSpouses } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spouses = await getSpouses(id);
  return NextResponse.json(spouses);
}
