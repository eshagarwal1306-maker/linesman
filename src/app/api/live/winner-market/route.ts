import { NextResponse } from "next/server";
import { getLiveWinnerMarket } from "@/lib/sources/polymarket";

export async function GET() {
  const market = await getLiveWinnerMarket();
  return NextResponse.json({ market });
}
