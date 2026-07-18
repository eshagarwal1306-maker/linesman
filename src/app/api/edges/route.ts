import { NextResponse } from "next/server";
import { getSourceEdges } from "@/lib/sources/manager";

export async function GET() {
  const { edges, status } = await getSourceEdges();
  return NextResponse.json({ edges, status, generatedAt: Date.now() });
}
