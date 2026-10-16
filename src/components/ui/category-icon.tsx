import { Circle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLucideIcon } from '@/lib/lucideIcon';

interface CategoryIconProps {
  iconName: string;
  colorVar: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBackground?: boolean;
}

export function CategoryIcon({ 
  iconName, 
  colorVar, 
  size = 'md', 
  className,
  showBackground = true 
}: CategoryIconProps) {
  const IconComponent = (getLucideIcon(iconName) || Circle) as LucideIcon;
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  if (showBackground) {
    return (
      <div 
        className={cn(
          'rounded-full flex items-center justify-center flex-shrink-0',
          sizeClasses[size],
          className
        )}
        style={{ 
          backgroundColor: `hsl(var(--${colorVar}) / 0.15)`,
          color: `hsl(var(--${colorVar}))`
        }}
      >
        <IconComponent size={iconSizes[size]} strokeWidth={2} />
      </div>
    );
  }

  return (
    <IconComponent 
      size={iconSizes[size]} 
      strokeWidth={2}
      className={className}
      style={{ color: `hsl(var(--${colorVar}))` }}
    />
  );
}
