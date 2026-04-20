import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center bg-[hsl(0_0%_88%)] dark:bg-muted rounded-full p-1 gap-1 h-12">
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        aria-pressed={theme === "dark"}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          theme === "dark"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        aria-pressed={theme === "light"}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          theme === "light"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="w-5 h-5" />
      </button>
    </div>
  );
}
