import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Plainer picker chrome for the transaction forms — a flat list of rows with
 * a trailing checkmark on the selected one, no colored highlight box. Kept
 * local to imports/ rather than folded into ui/select.tsx: that primitive is
 * shared by ~10 other screens, and this look hasn't been rolled out there yet.
 */

export const MinimalSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-80 min-w-[10rem] overflow-hidden rounded-2xl border-0 bg-card text-card-foreground shadow-lg p-1.5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      sideOffset={6}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
MinimalSelectContent.displayName = "MinimalSelectContent";

export const MinimalSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-muted",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText asChild>
      <span className="flex min-w-0 items-center gap-2">{children}</span>
    </SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator>
      <Check className="h-4 w-4 shrink-0 text-foreground" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
MinimalSelectItem.displayName = "MinimalSelectItem";
