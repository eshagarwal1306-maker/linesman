"use client";

import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useViewportStore } from "@/lib/store/viewport-store";
import { usePhonePreviewActive } from "@/lib/hooks/use-phone-preview-active";
import { IconX } from "@/components/linesman/icons";

/**
 * Mounted once at the app root. In "phone" mode this takes over the *entire*
 * viewport — a true full-screen overlay, not a panel living next to the
 * desktop sidebar — showing the current route inside a real 390x844
 * browsing context (an iframe, so every responsive class resolves against a
 * genuine mobile viewport). Because it's full-screen, the desktop shell
 * (sidebar, ticker, banner, tab bar) underneath is fully hidden — no double
 * chrome, nothing bleeding in from the edges.
 *
 * `usePhonePreviewActive` guards against this framing itself: it checks
 * `window.self !== window.top` so nothing rendered inside this iframe can
 * ever open a *second* overlay, no matter which route the user navigates to
 * inside it. `?view=phone` in the top-level URL lets any link force the
 * overlay open from outside.
 */
export function PhonePreviewOverlay() {
  return (
    <Suspense fallback={null}>
      <PhonePreviewOverlayInner />
    </Suspense>
  );
}

function PhonePreviewOverlayInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setMode = useViewportStore((state) => state.setMode);

  const isPhone = usePhonePreviewActive();
  if (!isPhone) return null;

  const frameParams = new URLSearchParams(searchParams);
  frameParams.delete("view");
  const query = frameParams.toString();
  const src = query ? `${pathname}?${query}` : pathname;

  return (
    <AnimatePresence>
      <motion.div
        key="phone-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-5 py-8"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 50% 8%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent), #05070c",
        }}
      >
        <button
          type="button"
          onClick={() => setMode("desktop")}
          className="relative z-10 flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-[color:var(--color-muted)] backdrop-blur transition-colors hover:text-[color:var(--color-text)]"
        >
          <IconX className="h-3.5 w-3.5" />
          Exit phone preview
        </button>

        {/* Device shell: titanium bezel, dynamic island, side buttons, ambient glow, screen glare. */}
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative shrink-0"
          style={{ width: 390 + 14, height: 844 + 14, maxHeight: "calc(100vh - 132px)" }}
        >
          <div
            className="absolute inset-0 rounded-[3.4rem]"
            style={{
              background: "linear-gradient(155deg, #3a3d45 0%, #14161b 22%, #0a0b0d 55%, #26282e 100%)",
              boxShadow:
                "0 40px 90px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 2px 0 rgba(255,255,255,0.08) inset",
            }}
          />

          <span className="absolute -left-[2px] top-[128px] h-16 w-[3px] rounded-full bg-[#1c1e23]" />
          <span className="absolute -left-[2px] top-[188px] h-10 w-[3px] rounded-full bg-[#1c1e23]" />
          <span className="absolute -left-[2px] top-[236px] h-10 w-[3px] rounded-full bg-[#1c1e23]" />
          <span className="absolute -right-[2px] top-[168px] h-20 w-[3px] rounded-full bg-[#1c1e23]" />

          <div
            className="absolute flex flex-col overflow-hidden rounded-[2.9rem] bg-black"
            style={{ inset: 7 }}
          >
            {/* Status-bar strip reserves room for the island so it never covers real app content. */}
            <div className="relative flex h-[30px] shrink-0 items-center justify-center bg-[#0a0e14]">
              <div className="h-[22px] w-[104px] rounded-full bg-black" />
            </div>
            <div className="relative min-h-0 flex-1">
              <iframe
                key={src}
                src={src}
                title="Linesman — phone preview"
                className="h-full w-full border-0"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-[2.9rem]"
              style={{
                background: "linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 24%, transparent 78%, rgba(255,255,255,0.03) 100%)",
                boxShadow: "0 0 0 2px rgba(255,255,255,0.06) inset",
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
