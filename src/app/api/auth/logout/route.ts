import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  revokeSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
