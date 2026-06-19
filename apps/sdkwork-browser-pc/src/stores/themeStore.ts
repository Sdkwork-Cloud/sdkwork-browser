import { create } from "zustand";

export type BrowserTheme = "light" | "dark";

const STORAGE_KEY = "sdkwork-browser-theme";

function readInitialTheme(): BrowserTheme {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersLight =
    window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
  return prefersLight ? "light" : "dark";
}

function applyTheme(theme: BrowserTheme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeState {
  theme: BrowserTheme;
  setTheme: (theme: BrowserTheme) => void;
  toggleTheme: () => void;
}

const initialTheme = readInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));
