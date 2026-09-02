import React, { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star";

export interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
  variant?: TransitionVariant;
  /** When true, the transition expands from the viewport center instead of the button center. */
  fromCenter?: boolean;
  /**
   * Controlled theme value. When provided, the parent owns persistence
   * (e.g. `next-themes`) and this component will not write to localStorage.
   */
  theme?: "light" | "dark";
  /** Called on toggle. Pair with `theme` for controlled usage. */
  onThemeChange?: (theme: "light" | "dark") => void;
}

function polygonCollapsed(point: string, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => point).join(", ");
  return `polygon(${pairs})`;
}

// All coordinates are percentages of the snapshot reference box: Chrome 150
// renders absolute px clip-path coordinates on ::view-transition-new(root)
// unscaled on fractional display scales (e.g. Windows 150%) for the first
// transition after load, so px values land at the wrong position (#989).
function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`;
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`;
  const point = (x: number, y: number) => `${toX(x)} ${toY(y)}`;
  // circle() percentage radii resolve against hypot(w, h) / sqrt(2) of the reference box.
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;

  switch (variant) {
    case "circle":
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ];
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "triangle": {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + 0.5 * scale),
        point(cx - dx, cy + 0.5 * scale),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`];
    }
    case "diamond": {
      // Slightly larger than the view-transition circle radius so axis-aligned coverage matches the circle reveal.
      const R = maxRadius * Math.SQRT2;
      const end = [
        point(cx, cy - R),
        point(cx + R, cy),
        point(cx, cy + R),
        point(cx - R, cy),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "hexagon": {
      const R = maxRadius * Math.SQRT2;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(point(cx + R * Math.cos(a), cy + R * Math.sin(a)));
      }
      return [
        polygonCollapsed(point(cx, cy), 6),
        `polygon(${verts.join(", ")})`,
      ];
    }
    case "rectangle": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const end = [
        point(cx - halfW, cy - halfH),
        point(cx + halfW, cy - halfH),
        point(cx + halfW, cy + halfH),
        point(cx - halfW, cy + halfH),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "star": {
      // Small overscan so the last frames never leave a 1px seam before the transition group ends.
      const R = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (radius: number) => {
        const verts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            point(
              cx + radius * Math.cos(outerA),
              cy + radius * Math.sin(outerA)
            )
          );
          const innerA = outerA + Math.PI / 5;
          verts.push(
            point(
              cx + radius * innerRatio * Math.cos(innerA),
              cy + radius * innerRatio * Math.sin(innerA)
            )
          );
        }
        return `polygon(${verts.join(", ")})`;
      };
      const startR = Math.max(2, R * 0.025);
      return [starPolygon(startR), starPolygon(R)];
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ];
  }
}

export const AnimatedThemeToggler = React.forwardRef<HTMLButtonElement, AnimatedThemeTogglerProps>(
  (
    {
      className,
      duration = 600,
      variant = "circle",
      fromCenter = false,
      theme,
      onThemeChange,
      onClick,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const shape = variant ?? "circle";
    const isControlled = theme !== undefined;
    const [internalIsDark, setInternalIsDark] = useState(false);
    const isDark = isControlled ? theme === "dark" : internalIsDark;
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const isTransitioningRef = useRef(false);
    const activeAnimRef = useRef<Animation | null>(null);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const cancelAnim = useCallback(() => {
      activeAnimRef.current?.cancel();
      activeAnimRef.current = null;
    }, []);

    useEffect(() => {
      return () => {
        cancelAnim();
        const root = document.documentElement;
        if (root.dataset.magicuiThemeVt !== "active") return;
        delete root.dataset.magicuiThemeVt;
        root.style.removeProperty("--magicui-theme-toggle-vt-duration");
        root.style.removeProperty("--magicui-theme-vt-clip-from");
      };
    }, [cancelAnim]);

    useEffect(() => {
      if (isControlled) return;

      const updateTheme = () => {
        setInternalIsDark(document.documentElement.classList.contains("dark"));
      };

      updateTheme();

      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => observer.disconnect();
    }, [isControlled]);

    const toggleTheme = useCallback(() => {
      const button = buttonRef.current;
      if (
        !button ||
        isTransitioningRef.current ||
        document.documentElement.dataset.magicuiThemeVt === "active"
      )
        return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x: number;
      let y: number;
      if (fromCenter) {
        x = viewportWidth / 2;
        y = viewportHeight / 2;
      } else {
        const rect = button.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      const maxRadius = Math.hypot(
        Math.max(x, viewportWidth - x),
        Math.max(y, viewportHeight - y)
      );

      const applyTheme = () => {
        const newTheme = !isDark;
        const nextMode = newTheme ? "dark" : "light";
        
        if (newTheme) {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }

        localStorage.setItem("llmark_theme_preference", nextMode);
        localStorage.setItem("theme", nextMode);

        if (isControlled) {
          onThemeChange?.(nextMode);
        } else {
          setInternalIsDark(newTheme);
        }
      };

      if (
        typeof document.startViewTransition !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        applyTheme();
        return;
      }

      try {
        const clipPath = getThemeTransitionClipPaths(
          shape,
          x,
          y,
          maxRadius,
          viewportWidth,
          viewportHeight
        );

        const root = document.documentElement;
        root.dataset.magicuiThemeVt = "active";
        root.style.setProperty(
          "--magicui-theme-toggle-vt-duration",
          `${duration}ms`
        );
        root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0]);
        
        const cleanup = () => {
          isTransitioningRef.current = false;
          delete root.dataset.magicuiThemeVt;
          root.style.removeProperty("--magicui-theme-toggle-vt-duration");
          root.style.removeProperty("--magicui-theme-vt-clip-from");
          cancelAnim();
        };

        isTransitioningRef.current = true;
        const transition = document.startViewTransition(() => {
          flushSync(applyTheme);
        });

        // Safety fallback timer to prevent button locking
        const timerId = setTimeout(cleanup, duration + 200);

        if (transition?.finished) {
          transition.finished
            .finally(() => {
              clearTimeout(timerId);
              cleanup();
            })
            .catch(() => {
              clearTimeout(timerId);
              cleanup();
            });
        }

        if (transition?.ready) {
          transition.ready
            .then(() => {
              const anim = document.documentElement.animate(
                { clipPath },
                {
                  duration,
                  easing: shape === "star" ? "linear" : "cubic-bezier(0.4, 0, 0.2, 1)",
                  fill: "forwards",
                  pseudoElement: "::view-transition-new(root)",
                }
              );
              activeAnimRef.current = anim;
            })
            .catch(() => {});
        }
      } catch (e) {
        console.warn("View transitions error, falling back:", e);
        applyTheme();
      }
    }, [
      shape,
      fromCenter,
      duration,
      isDark,
      isControlled,
      onThemeChange,
      cancelAnim,
    ]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        toggleTheme();
      }
    };

    return (
      <button
        type="button"
        ref={setRef}
        onClick={handleClick}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-300 cursor-pointer select-none overflow-hidden",
          "bg-[var(--toggle-btn-bg)] border-[var(--toggle-btn-border)] text-[var(--toggle-btn-text)]",
          "hover:bg-[var(--toggle-btn-hover)] hover:border-[var(--brand-primary)] hover:scale-105 active:scale-95 shadow-xs hover:shadow-sm",
          className
        )}
        {...props}
      >
        {children ? (
          children
        ) : isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 fill-current text-[var(--toggle-btn-text)] transition-transform duration-300 hover:-rotate-12" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }
);
AnimatedThemeToggler.displayName = "AnimatedThemeToggler";
