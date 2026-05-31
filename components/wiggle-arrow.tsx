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
      className="pointer-events-none fixed right-3 top-[3.6rem] z-30 sm:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: hidden ? 0 : 0.8 }}
      transition={{ duration: 0.4 }}
    >
      <motion.svg
        width="46"
        height="58"
        viewBox="0 0 46 58"
        fill="none"
        animate={
          reduce
            ? {}
            : { rotate: [-3, 3, -3], y: [0, -2, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformOrigin: "80% 10%" }}
      >
        {/* curved shaft sweeping up toward the menu button */}
        <motion.path
          d="M30 54 C8 46 6 28 18 18 C24 13 34 12 38 8"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? {} : { pathLength: 1 }}
          transition={reduce ? {} : { duration: 0.9, ease: "easeOut" }}
        />
        {/* arrowhead at the top */}
        <motion.path
          d="M30 9 L38 7 L37 15"
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
