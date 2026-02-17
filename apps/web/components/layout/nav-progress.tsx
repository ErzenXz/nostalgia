"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      // Navigation completed
      prevPathRef.current = pathname;
      setProgress(100);
      cleanup();
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }
    return cleanup;
  }, [pathname, cleanup]);

  // Intercept link clicks to show progress bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (href === prevPathRef.current) return;

      setVisible(true);
      setProgress(30);
      cleanup();
      timerRef.current = setTimeout(() => setProgress(60), 150);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [cleanup]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] h-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="h-full bg-primary"
            style={{ boxShadow: "0 0 8px rgba(201, 166, 107, 0.4)" }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: progress === 100 ? 0.2 : 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
