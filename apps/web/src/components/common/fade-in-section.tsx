import { type ReactNode } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

type FadeInSectionProps = {
  children: ReactNode;
  delay?: number;
};

export function FadeInSection({ children, delay = 0 }: FadeInSectionProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.56, ease: "easeOut", delay }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
