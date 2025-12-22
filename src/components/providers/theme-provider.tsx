'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'quiz-app-theme';

// Get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Resolve theme based on setting
const resolveTheme = (t: Theme): 'light' | 'dark' => {
  if (t === 'system') return getSystemTheme();
  return t;
};

// Apply theme to document
const applyTheme = (resolved: 'light' | 'dark') => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
};

// Storage helpers for useSyncExternalStore
const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
};

const subscribeToStorage = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

const getServerSnapshot = (): Theme => 'system';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use useSyncExternalStore for localStorage to avoid setState in effect
  const storedTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredTheme,
    getServerSnapshot
  );

  const [theme, setThemeState] = useState<Theme>(storedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(storedTheme));
  const [mounted, setMounted] = useState(false);

  // Apply theme on mount and sync with stored value
  useEffect(() => {
    const resolved = resolveTheme(storedTheme);
    applyTheme(resolved);
    setMounted(true);
  }, [storedTheme]);

  // Sync theme state when stored theme changes
  useEffect(() => {
    setThemeState(storedTheme);
    setResolvedTheme(resolveTheme(storedTheme));
  }, [storedTheme]);

  // Listen for system theme changes
  const handleSystemThemeChange = useCallback(() => {
    if (theme === 'system') {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
  }, [theme]);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [mounted, handleSystemThemeChange]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
