"use client";

import { useSearchParams } from "next/navigation";
import { useViewportStore } from "@/lib/store/viewport-store";

/**
 * True when the full-screen phone preview overlay owns the screen.
 *
 * The overlay's iframe shares localStorage with the parent window (same
 * origin), so if we only gated on a `?view=desktop` query param, every
 * in-app `<Link>` click *inside* the iframe (which doesn't carry that param
 * along) would read the persisted "phone" mode straight back off
 * localStorage and re-open the overlay recursively — a phone-frame nested
 * inside the phone-frame, shrinking and doubling every navigation. Checking
 * `window.self !== window.top` sidesteps that entirely: any document
 * running inside *any* iframe (ours included) simply never activates the
 * overlay, no matter what mode is persisted or which URL it's on.
 */
export function usePhonePreviewActive(): boolean {
  const storeMode = useViewportStore((state) => state.mode);
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");

  if (typeof window !== "undefined" && window.self !== window.top) return false;
  if (urlView === "desktop") return false;
  return urlView === "phone" || storeMode === "phone";
}
