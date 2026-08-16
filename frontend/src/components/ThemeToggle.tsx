/**
 * ThemeToggle.tsx
 *
 * A compact three-way theme switcher for the application header / sidebar.
 *
 * Renders three labelled buttons corresponding to the themes defined in
 * phase-1-pdf-workflow.md:
 *   - Light   (Group 1 – instant swap)
 *   - Dark    (Group 1 – instant swap)
 *   - Nostalgic (Group 2 – triggers page reload)
 *
 * The Nostalgic option includes a small visual hint that a page reload is
 * required, so the user is not surprised by the transition.
 */

import React from 'react';
import { useTheme, type Theme } from '../store/ThemeProvider';
import { Sun, Moon, type LucideIcon } from 'lucide-react';

// ─── Option config ────────────────────────────────────────────────────────────

interface ThemeOption {
  value: Theme;
  label: string;
  Icon: LucideIcon;
  /** Short tooltip shown on hover */
  title: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'XP Light',
    Icon: Sun,
    title: 'Select the light theme (classic Windows XP Luna).',
  },
  {
    value: 'dark',
    label: 'XP Dark',
    Icon: Moon,
    title: 'Select the dark theme (Windows XP Royale Noir / Zune).',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ThemeToggle: React.FC = () => {
  const { theme, switchTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selector"
      style={{
        display: 'inline-flex',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-muted)',
      }}
    >
      {THEME_OPTIONS.map(({ value, label, Icon, title }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            id={`theme-toggle-${value}`}
            title={title}
            aria-pressed={isActive}
            onClick={() => switchTheme(value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              border: 'none',
              borderRight: value !== 'dark' ? '1px solid var(--color-border)' : 'none',
              cursor: 'pointer',
              backgroundColor: isActive
                ? 'var(--color-accent)'
                : 'transparent',
              color: isActive
                ? 'var(--color-text-inverse)'
                : 'var(--color-text-secondary)',
              transition: 'background-color 150ms ease, color 150ms ease',
              outline: 'none',
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
