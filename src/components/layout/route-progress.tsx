"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Slim progress bar shown while an in-app link navigates, so a click always
 * produces immediate feedback (the same idea as YouTube's loading bar).
 *
 * It starts on the click, creeps towards 90% while the next route streams in,
 * then snaps to 100% and fades once the pathname or query changes.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;

      const [path] = href.split("#");
      const current = `${window.location.pathname}${window.location.search}`;
      if (!path || path === current) return;

      setVisible(true);
      setValue(8);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timer = window.setInterval(() => {
      setValue((current) =>
        current >= 90
          ? current
          : Math.min(90, current + Math.max(1, (90 - current) * 0.12)),
      );
    }, 180);

    return () => window.clearInterval(timer);
  }, [visible]);

  const query = searchParams.toString();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const finish = window.setTimeout(() => setValue(100), 0);
    const reset = window.setTimeout(() => {
      setVisible(false);
      setValue(0);
    }, 320);

    return () => {
      window.clearTimeout(finish);
      window.clearTimeout(reset);
    };
  }, [pathname, query]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-200 motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_0_var(--color-primary)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.round(value)}%` }}
      />
    </div>
  );
}
