import React from "react";
import { motion } from "framer-motion";

/**
 * Animated live streaming frequency wave (replaces static radar dots with real-time waveform effect)
 */
export const LiveStreamWave: React.FC<{ active?: boolean; className?: string }> = ({
  active = true,
  className = "h-4 w-12",
}) => {
  const bars = [
    { delay: 0, duration: 0.8, heights: [4, 14, 6, 12, 4] },
    { delay: 0.15, duration: 0.6, heights: [8, 16, 4, 14, 8] },
    { delay: 0.3, duration: 0.9, heights: [3, 10, 16, 6, 3] },
    { delay: 0.45, duration: 0.7, heights: [6, 15, 8, 12, 6] },
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-[var(--brand-primary)]"
          animate={
            active
              ? {
                  height: bar.heights,
                  opacity: [0.6, 1, 0.7, 1, 0.6],
                }
              : { height: 4, opacity: 0.3 }
          }
          transition={
            active
              ? {
                  duration: bar.duration,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  delay: bar.delay,
                }
              : { duration: 0.2 }
          }
          style={{ minHeight: "4px" }}
        />
      ))}
    </div>
  );
};

/**
 * Animated network ping ripple for waterfall profiler & DNS/TCP latency stages
 */
export const NetworkPulseSvg: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" fill="var(--brand-primary)" />
    <motion.circle
      cx="12"
      cy="12"
      r="6"
      stroke="var(--brand-primary)"
      strokeWidth="1.5"
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
    />
    <motion.circle
      cx="12"
      cy="12"
      r="9"
      stroke="var(--brand-secondary)"
      strokeWidth="1"
      initial={{ scale: 0.8, opacity: 0.6 }}
      animate={{ scale: 1.3, opacity: 0 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
    />
  </svg>
);

/**
 * Empty state minimal animated illustration
 */
export const EmptyStateIllustration: React.FC<{ className?: string }> = ({
  className = "h-20 w-20",
}) => (
  <svg viewBox="0 0 64 64" fill="none" className={className}>
    <rect x="8" y="14" width="48" height="36" rx="8" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
    <motion.line
      x1="16"
      y1="26"
      x2="48"
      y2="26"
      stroke="var(--brand-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.8 }}
      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
    />
    <motion.line
      x1="16"
      y1="34"
      x2="36"
      y2="34"
      stroke="var(--brand-secondary)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.6 }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.2, delay: 0.2, ease: "easeInOut" }}
    />
    <motion.circle
      cx="48"
      cy="34"
      r="2"
      fill="var(--brand-primary)"
      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);
