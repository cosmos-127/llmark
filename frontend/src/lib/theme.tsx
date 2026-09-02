import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "./utils";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("llmark-theme") as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        return stored;
      }
    }
    return "dark";
  });

  const [resolvedDark, setResolvedDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("llmark-theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    let isDark = false;
    if (theme === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      isDark = theme === "dark";
    }

    setResolvedDark(isDark);
    if (isDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    localStorage.setItem("llmark-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: resolvedDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeToggleProps {
  variant?: "sidebar" | "icon" | "full";
  collapsed?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "icon",
  collapsed = false,
  className,
}) => {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();

  if (variant === "icon") {
    return (
      <AnimatedThemeToggler
        theme={isDark ? "dark" : "light"}
        onThemeChange={(newT) => setTheme(newT)}
        className={className}
      />
    );
  }

  if (variant === "sidebar") {
    if (collapsed) {
      return (
        <div className="flex justify-center p-1">
          <AnimatedThemeToggler
            theme={isDark ? "dark" : "light"}
            onThemeChange={(newT) => setTheme(newT)}
            className="h-7 w-7"
          />
        </div>
      );
    }

    return (
      <div className={cn("flex items-center justify-between p-1.5 font-sans text-xs", className)}>
        <div className="flex items-center gap-2 text-[var(--text-main)] px-2 font-medium">
          {isDark ? <Moon className="h-3.5 w-3.5 text-[var(--brand-primary)]" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
          <span>{isDark ? "Dark theme" : "Light theme"}</span>
        </div>
        <div className="flex items-center bg-[var(--bg-surface-subtle)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              theme === "light"
                ? "bg-[var(--bg-card)] text-amber-600 shadow-xs font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
            title="Light mode"
          >
            <Sun className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              theme === "dark"
                ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-xs font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
            title="Dark mode"
          >
            <Moon className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1 bg-[var(--bg-surface-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]", className)}>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "light" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "dark" ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "system" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
        )}
      >
        <Monitor className="h-3.5 w-3.5" />
        Auto
      </button>
    </div>
  );
};
