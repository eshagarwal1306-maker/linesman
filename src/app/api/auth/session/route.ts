import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";

export async function GET() {
  try {
    return NextResponse.json(await requireSession());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
