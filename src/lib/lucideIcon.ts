import { icons } from 'lucide-react';
import type { ComponentType } from 'react';

// Lucide's `icons` export is keyed by PascalCase names ("PawPrint"). We store
// icon references as kebab-case ("paw-print") in categories/custom rules, so
// resolve the key here. Returns null when the name doesn't exist so callers
// can render a fallback rather than crash.

export function lucidePascalCase(name: string): string {
  return name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export function getLucideIcon(name: string): ComponentType<{ className?: string; size?: number; strokeWidth?: number }> | null {
  if (!name) return null;
  const key = lucidePascalCase(name);
  return (icons as Record<string, ComponentType<{ className?: string; size?: number; strokeWidth?: number }>>)[key] ?? null;
}
