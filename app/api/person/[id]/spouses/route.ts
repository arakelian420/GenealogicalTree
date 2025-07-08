import { NextRequest, NextResponse } from "next/server";
import { getSpouses } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const spouses = await getSpouses(id);
  return NextResponse.json(spouses);
}
