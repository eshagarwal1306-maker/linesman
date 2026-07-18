"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Rolling odometer effect for the hero EV number: the displayed value
 * springs toward the target rather than snapping, per the motion spec.
 */
export function OdometerNumber({
  value,
  digits = 0,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  digits?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 140, damping: 20, mass: 0.6 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => setDisplay(latest));
    return unsubscribe;
  }, [spring]);

  return (
    <motion.span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display.toFixed(digits)}
      {suffix}
    </motion.span>
  );
}
