import { 
  Briefcase, 
  RotateCcw, 
  ArrowDownLeft, 
  PlusCircle, 
  TrendingUp, 
  Laptop, 
  Home, 
  ShoppingCart, 
  Utensils, 
  Car, 
  HeartPulse, 
  Gamepad2, 
  ShoppingBag, 
  GraduationCap, 
  Repeat, 
  Plane, 
  Dumbbell, 
  MoreHorizontal, 
  PawPrint, 
  ArrowLeftRight,
  Circle,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  'briefcase': Briefcase,
  'rotate-ccw': RotateCcw,
  'arrow-down-left': ArrowDownLeft,
  'plus-circle': PlusCircle,
  'trending-up': TrendingUp,
  'laptop': Laptop,
  'home': Home,
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'graduation-cap': GraduationCap,
  'repeat': Repeat,
  'plane': Plane,
  'dumbbell': Dumbbell,
  'more-horizontal': MoreHorizontal,
  'paw-print': PawPrint,
  'arrow-left-right': ArrowLeftRight,
  'circle': Circle,
};

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
  const IconComponent = iconMap[iconName] || Circle;
  
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
