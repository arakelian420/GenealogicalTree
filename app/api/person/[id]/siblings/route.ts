import { NextRequest, NextResponse } from "next/server";
import { getSiblings } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const siblings = await getSiblings(id);
  return NextResponse.json(siblings);
}
