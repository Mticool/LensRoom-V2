'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className={`
        p-2 rounded-lg
        text-[var(--muted)] hover:text-[var(--text)]
        hover:bg-[var(--surface2)]
        transition-all duration-200
        theme-toggle-icon
        ${className}
      `}
    >
      {theme === 'dark' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}

export default ThemeToggle;


