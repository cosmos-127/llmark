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
        <div className="flex items-center gap-2 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 px-2 font-medium">
          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
          <span>{isDark ? "Dark theme" : "Light theme"}</span>
        </div>
        <div className="flex items-center bg-[#2C2C2C]/10 dark:bg-[#181719] rounded-lg p-0.5 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "p-1 rounded-md transition-all cursor-pointer",
              theme === "light"
                ? "bg-white text-amber-600 shadow-xs font-bold"
                : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
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
                ? "bg-[#853953] text-white shadow-xs font-bold"
                : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
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
    <div className={cn("inline-flex items-center gap-1 bg-[#F3F4F4] dark:bg-[#2C2C2C] p-1 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10", className)}>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "light" ? "bg-white text-[#2C2C2C] shadow-xs" : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "dark" ? "bg-[#853953] text-white shadow-xs" : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
          theme === "system" ? "bg-white dark:bg-[#353337] text-[#2C2C2C] dark:text-[#F3F4F4] shadow-xs" : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60"
        )}
      >
        <Monitor className="h-3.5 w-3.5" />
        Auto
      </button>
    </div>
  );
};
