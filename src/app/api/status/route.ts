import { NextResponse } from "next/server";
import { getSourceStatus } from "@/lib/sources/manager";

export async function GET() {
  const status = await getSourceStatus();
  return NextResponse.json({ status, checkedAt: Date.now() });
}
