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
          "rounded-full w-11 h-11",
          active
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-foreground hover:bg-muted/70"
        )}
        aria-label="My data"
      >
        <Folder className="w-5 h-5" />
      </Button>
    </Link>
  );
}
