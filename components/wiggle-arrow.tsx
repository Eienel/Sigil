"use client";

import { motion, useReducedMotion } from "motion/react";

/*
  A thin hand-drawn arrow that gently wiggles, pointing up at the mobile
  hamburger menu. Mobile only, hidden when the menu is open. Stroke uses the
  wax accent and a slight rotation sway, on brand with the ink-and-seal flow.
*/
export function WiggleArrow({ hidden }: { hidden?: boolean }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed right-4 top-[3.6rem] z-30 sm:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: hidden ? 0 : 0.4 }}
      transition={{ duration: 0.4 }}
    >
      <motion.svg
        width="32"
        height="60"
        viewBox="0 0 32 60"
        fill="none"
        animate={
          reduce
            ? {}
            : { rotate: [-2, 2, -2], y: [0, -2, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformOrigin: "50% 8%" }}
      >
        {/* mostly vertical hand-drawn wiggle pointing up at the menu */}
        <motion.path
          d="M16 56 C10 49 22 43 14 36 C7 30 21 24 15 17 C13 14 15 12 16 10"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? {} : { pathLength: 1 }}
          transition={reduce ? {} : { duration: 0.9, ease: "easeOut" }}
        />
        {/* arrowhead at the top */}
        <motion.path
          d="M10 17 L16 9 L22 17"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={reduce ? {} : { pathLength: 1, opacity: 1 }}
          transition={reduce ? {} : { duration: 0.4, delay: 0.7 }}
        />
      </motion.svg>
    </motion.div>
  );
}
