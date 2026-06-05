import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const getThemePreference = (): Theme => {
    // 1. Check local storage
    const stored = localStorage.getItem("luxe_admin_theme") as Theme;
    if (stored === "light" || stored === "dark") return stored;

    // 2. Check cookie (useful for localhost cross-port development)
    const match = document.cookie.match(/(?:^|; )luxe_theme=([^;]*)/);
    if (match?.[1] === "light" || match?.[1] === "dark") {
      return match[1] as Theme;
    }

    // Default to dark, matching the admin default
    return "dark";
  };

  const [theme, setThemeState] = useState<Theme>(getThemePreference);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("luxe_admin_theme", t);
    // Write cookie for cross-port / cross-subdomain sharing
    document.cookie = `luxe_theme=${t};path=/;max-age=31536000;SameSite=Lax`;
  };

  // Sync theme to HTML and document body
  useEffect(() => {
    const body = document.body;
    body.classList.remove("light", "dark");
    body.classList.add(theme);

    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(theme);
  }, [theme]);

  // Listen for storage events (same-origin tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "luxe_admin_theme" && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Poll cookie (cross-origin / different ports localhost tab sync)
  useEffect(() => {
    const interval = setInterval(() => {
      const match = document.cookie.match(/(?:^|; )luxe_theme=([^;]*)/);
      const val = match?.[1];
      if ((val === "light" || val === "dark") && val !== theme) {
        setThemeState(val as Theme);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
