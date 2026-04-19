import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1 h-11">
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={theme === "dark"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
          theme === "dark"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="w-[18px] h-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={theme === "light"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
          theme === "light"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}
