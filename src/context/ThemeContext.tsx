import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Theme } from '../types';
import { safeStorage } from '../utils/storage';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = safeStorage.getItem('orchestra_theme') as Theme | null;
    let prefersDark = false;
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {}
    return saved ?? (prefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeStorage.setItem('orchestra_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
