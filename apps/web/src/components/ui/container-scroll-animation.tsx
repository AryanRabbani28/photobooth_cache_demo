import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export const ContainerScroll: React.FC<{
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}> = ({ titleComponent, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -5]);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      ref={containerRef}
    >
      <div className="py-10 md:py-20 w-full">
        <div className="mx-auto w-full max-w-5xl px-4">
          <motion.div
            style={{ scale, rotateX: rotate }}
            className="relative rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-6 md:p-10 shadow-2xl"
          >
            <div className="mb-8">{titleComponent}</div>
            <div className="overflow-auto max-h-[70vh]">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
