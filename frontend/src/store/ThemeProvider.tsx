/**
 * ThemeProvider.tsx
 *
 * Implements the dual-execution theming strategy from phase-1-pdf-workflow.md:
 *
 *   Group 1 – Modern Light ↔ Dark
 *     Pure CSS variable swap via the data-theme attribute on <html>.
 *     Instant, no page refresh.
 *
 *   Group 2 – Modern ↔ Nostalgic ("the Big Swap")
 *     Saves the desired theme to localStorage, then triggers
 *     window.location.reload() so Monaco, react-pdf, and all layout-heavy
 *     components re-initialise with a clean slate.
 *
 * The ThemeProvider reads localStorage on boot and applies the persisted
 * theme before the first paint, preventing a flash of the wrong theme.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  /** The currently active theme identifier. */
  theme: Theme;
  /**
   * Switch to a new theme.
   *
   * Instant CSS variable swap, no page refresh.
   */
  switchTheme: (next: Theme) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'resume-app-theme';
const DEFAULT_THEME: Theme = 'light';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Read the persisted theme from localStorage, falling back to the default.
 * Called synchronously during provider initialisation.
 */
function readPersistedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in certain sandboxed contexts.
  }
  return DEFAULT_THEME;
}

/**
 * Apply the data-theme attribute to <html> and suppress the CSS transition
 * during the initial boot paint to avoid a colour flash.
 */
function applyThemeToDocument(theme: Theme, suppressTransition = false): void {
  const root = document.documentElement;
  if (suppressTransition) {
    root.setAttribute('data-no-transition', '');
  }
  root.setAttribute('data-theme', theme);
  if (suppressTransition) {
    // Re-enable transitions after a single frame so the initial paint settles.
    root.removeAttribute('data-no-transition');
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  switchTheme: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(readPersistedTheme);

  // Apply the persisted theme before the first paint.
  useEffect(() => {
    applyThemeToDocument(theme, /* suppressTransition */ true);
  // This effect intentionally runs only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTheme = useCallback((next: Theme) => {
    if (next === theme) return;

    // Persist the selection.
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures; the UI still functions, just won't persist.
    }

    // Instant swap – just update the attribute and state.
    setTheme(next);
    applyThemeToDocument(next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume the theme context.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
