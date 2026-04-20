import { Folder } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DataFolderButton() {
  const location = useLocation();
  const active = location.pathname === '/my-data';

  return (
    <Link to="/my-data">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full w-12 h-12",
          active
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-[hsl(0_0%_88%)] dark:bg-muted text-foreground hover:bg-[hsl(0_0%_82%)] dark:hover:bg-muted/70"
        )}
        aria-label="My data"
      >
        <Folder className="w-[22px] h-[22px]" />
      </Button>
    </Link>
  );
}
