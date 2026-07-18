import { NextResponse } from "next/server";
import { MOCK_RECORDINGS } from "@/lib/store/replay-store";

export async function GET() {
  return NextResponse.json({ recordings: MOCK_RECORDINGS });
}
