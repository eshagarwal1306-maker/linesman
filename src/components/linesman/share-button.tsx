"use client";

import { useState } from "react";
import { IconCheck, IconShare } from "@/components/linesman/icons";

export function ShareButton({
  title,
  text,
  ogPath,
  compact = false,
}: {
  title: string;
  text: string;
  /** Path to this receipt's `/api/og/...` image route. */
  ogPath: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}${ogPath}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    } catch {
      // clipboard unavailable — nothing more we can do gracefully
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void share(event)}
      aria-label="Share this receipt"
      className={compact ? "-m-2 flex h-11 w-11 items-center justify-center rounded-full p-2 text-sm" : "flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border)] text-sm"}
      style={{ color: "var(--color-muted)" }}
    >
      {copied ? <IconCheck className="h-4 w-4" /> : <IconShare className="h-4 w-4" />}
    </button>
  );
}
