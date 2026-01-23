import { useEffect, useRef, useState } from "react";

import { updateThemePreferenceAction } from "@/app/auth/actions";

const getInitialTheme = (
  initialTheme?: "light" | "dark" | null,
): "light" | "dark" => {
  if (initialTheme === "light" || initialTheme === "dark") {
    return initialTheme;
  }
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("folia-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

export function useThemePreference(
  initialTheme?: "light" | "dark" | null,
) {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getInitialTheme(initialTheme),
  );
  const lastThemeRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("folia-theme", theme);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
    if (theme === lastThemeRef.current) return;
    lastThemeRef.current = theme;
    updateThemePreferenceAction(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme, setTheme };
}
