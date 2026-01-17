/**
 * Common UI type definitions
 */

import { LucideIcon } from 'lucide-react';

/**
 * Icon type - supports Lucide icons or custom components
 */
export type IconType = LucideIcon | React.ComponentType<{ className?: string }>;

/**
 * Stat card props
 */
export interface StatCard {
  label: string;
  value: number | string;
  icon: IconType;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * Menu item with icon
 */
export interface MenuItem {
  id: string;
  label: string;
  description?: string;
  icon: IconType;
  color?: string;
  emoji?: string;
  onClick?: () => void;
  href?: string;
}

/**
 * Card with action
 */
export interface ActionCard {
  title: string;
  description: string;
  icon: IconType;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Quick action button
 */
export interface QuickAction {
  id: string;
  title: string;
  icon: IconType;
  color: string;
  path: string;
}

/**
 * Filter option
 */
export interface FilterOption {
  id: string;
  label: string;
  icon: IconType;
  count?: number;
}
