import { NextRequest, NextResponse } from "next/server";
import { getSiblings } from "@/lib/tree-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const siblings = await getSiblings(id);
  return NextResponse.json(siblings);
}
