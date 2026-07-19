"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { IconArrowDown } from "@/components/linesman/icons";

const PULL_THRESHOLD = 64;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pull = useMotionValue(0);
  const rotate = useTransform(pull, [0, PULL_THRESHOLD], [0, 180]);
  const opacity = useTransform(pull, [0, 24], [0, 1]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (window.scrollY > 4) {
      startY.current = null;
      return;
    }
    startY.current = event.touches[0].clientY;
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (startY.current === null || refreshing) return;
    const delta = event.touches[0].clientY - startY.current;
    pull.set(Math.max(0, Math.min(delta * 0.5, PULL_THRESHOLD * 1.4)));
  }

  async function onTouchEnd() {
    if (startY.current === null) return;
    const shouldRefresh = pull.get() >= PULL_THRESHOLD;
    startY.current = null;
    if (shouldRefresh) {
      setRefreshing(true);
      pull.set(PULL_THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    pull.set(0);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => void onTouchEnd()}>
      <motion.div
        style={{ height: pull, opacity }}
        className="flex items-center justify-center overflow-hidden text-[color:var(--color-accent)]"
      >
        <motion.span style={{ rotate: refreshing ? undefined : rotate }} className={refreshing ? "animate-spin" : ""}>
          <IconArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.div>
      {children}
    </div>
  );
}
