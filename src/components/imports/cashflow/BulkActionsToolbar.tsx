import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Eye, EyeOff, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface BulkActionsToolbarProps {
  count: number;
  categories: Category[];
  getCategoryIcon: (slug: string) => string;
  getCategoryColor: (slug: string) => string;
  getCategoryLabel: (slug: string) => string;
  onClear: () => void;
  onHide: () => void;
  onShow: () => void;
  onAssignCategory: (category: Category) => void;
}

const MOVEMENT_ORDER: Category["movement_type"][] = ["INCOME", "EXPENSE", "TRANSFER"];

export function BulkActionsToolbar({
  count,
  categories,
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel,
  onClear,
  onHide,
  onShow,
  onAssignCategory,
}: BulkActionsToolbarProps) {
  const { t } = useTranslation("common");
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full border border-border bg-card px-2 py-1.5 shadow-lg">
        <span className="shrink-0 whitespace-nowrap px-2 text-[13px] font-semibold tabular-nums text-foreground">
          {count === 1 ? t("imports.selectedCountOne") : t("imports.selectedCount", { count })}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-full text-[13px]"
          onClick={onHide}
        >
          <EyeOff className="h-3.5 w-3.5" />
          {t("imports.hideSelected")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-full text-[13px]"
          onClick={onShow}
        >
          <Eye className="h-3.5 w-3.5" />
          {t("imports.showSelected")}
        </Button>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-full text-[13px]"
            >
              <Tag className="h-3.5 w-3.5" />
              {t("imports.assignCategory")}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="top"
            sideOffset={10}
            className="w-64 max-h-80 overflow-y-auto rounded-lg border-0 bg-card p-1.5 shadow-popup"
          >
            {MOVEMENT_ORDER.map((mv) => {
              const group = categories.filter((c) => c.movement_type === mv);
              if (group.length === 0) return null;
              return (
                <div key={mv} className="mb-1 last:mb-0">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(`imports.movement${mv.charAt(0)}${mv.slice(1).toLowerCase()}`)}
                  </p>
                  {group.map((cat) => {
                    const slug = cat.slug || "";
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onAssignCategory(cat);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent",
                        )}
                      >
                        <CategoryIcon
                          iconName={getCategoryIcon(slug)}
                          colorVar={getCategoryColor(slug)}
                          size="sm"
                          showBackground
                        />
                        <span className="truncate">{getCategoryLabel(slug)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 rounded-full p-0"
          onClick={onClear}
          aria-label={t("imports.clearSelection")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
