"use client";

/**
 * Proximity hover. As the pointer nears each child, that child subtly scales
 * and lifts based on distance, so the interface feels responsive rather than
 * binary. Driven by the pointer position, eased with spring physics, and
 * disabled under prefers-reduced-motion.
 *
 * The effect uses transform and opacity only, per the design system.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";

const SPRING = { stiffness: 220, damping: 20, mass: 0.4 };
// How far the pointer reaches, in px, and how much closeness amplifies scale.
const RADIUS = 130;
const MAX_SCALE = 0.28;

export function Proximity({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(Number.POSITIVE_INFINITY);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      onPointerMove={(e) => pointerX.set(e.clientX)}
      onPointerLeave={() => pointerX.set(Number.POSITIVE_INFINITY)}
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <ProximityItem pointerX={pointerX}>
            {child as ReactElement}
          </ProximityItem>
        ) : (
          child
        )
      )}
    </div>
  );
}

function ProximityItem({
  pointerX,
  children,
}: {
  pointerX: ReturnType<typeof useMotionValue<number>>;
  children: ReactElement;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Distance from the pointer to this item's horizontal center.
  const distance = useTransform(pointerX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return RADIUS;
    const center = rect.x + rect.width / 2;
    return Math.abs(x - center);
  });

  const target = useTransform(distance, (d) => {
    const t = Math.max(0, 1 - d / RADIUS);
    return 1 + t * MAX_SCALE;
  });
  const lift = useTransform(distance, (d) => {
    const t = Math.max(0, 1 - d / RADIUS);
    return -t * 6;
  });

  const scale = useSpring(target, SPRING);
  const y = useSpring(lift, SPRING);

  return (
    <motion.div ref={ref} style={{ scale, y }}>
      {children}
    </motion.div>
  );
}
