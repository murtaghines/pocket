import { useTranslation } from "react-i18next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Trash2,
  SplitIcon,
  RotateCcw,
  Sparkles,
  Tag,
} from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface TransactionContextMenuProps {
  children: React.ReactNode;
  isHidden: boolean;
  isManual: boolean;
  isEdited: boolean;
  isPending: boolean;
  hasCategoryChange: boolean;
  selectedCount: number;
  onToggleHidden: () => void;
  onDelete: () => void;
  onEditDescription: () => void;
  onCopyAmount: () => void;
  onCopyDescription: () => void;
  onSplit: () => void;
  onRevert: () => void;
  onSaveWithRule: () => void;
  onBulkHide?: () => void;
  onBulkShow?: () => void;
  onBulkAssignCategory?: (cat: Category) => void;
  bulkCategories?: Category[];
  getCategoryIcon?: (slug: string) => string;
  getCategoryColor?: (slug: string) => string;
  getCategoryLabel?: (slug: string) => string;
}

const MOVEMENT_ORDER: Category["movement_type"][] = ["INCOME", "EXPENSE", "TRANSFER"];

export function TransactionContextMenu({
  children,
  isHidden,
  isManual,
  isEdited,
  isPending,
  hasCategoryChange,
  selectedCount,
  onToggleHidden,
  onDelete,
  onEditDescription,
  onCopyAmount,
  onCopyDescription,
  onSplit,
  onRevert,
  onSaveWithRule,
  onBulkHide,
  onBulkShow,
  onBulkAssignCategory,
  bulkCategories,
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel,
}: TransactionContextMenuProps) {
  const { t } = useTranslation("common");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {selectedCount > 1 ? (
          <>
            {onBulkHide && (
              <ContextMenuItem onClick={onBulkHide} className="gap-2">
                <EyeOff className="w-4 h-4" />
                {t("imports.hideSelected")} ({selectedCount})
              </ContextMenuItem>
            )}
            {onBulkShow && (
              <ContextMenuItem onClick={onBulkShow} className="gap-2">
                <Eye className="w-4 h-4" />
                {t("imports.showSelected")} ({selectedCount})
              </ContextMenuItem>
            )}
            {onBulkAssignCategory && bulkCategories && bulkCategories.length > 0 && (
              <>
                {(onBulkHide || onBulkShow) && <ContextMenuSeparator />}
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="gap-2">
                    <Tag className="w-4 h-4" />
                    {t("imports.assignCategory")}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-52 max-h-72 overflow-y-auto">
                    {MOVEMENT_ORDER.map((mv) => {
                      const group = bulkCategories.filter((c) => c.movement_type === mv);
                      if (group.length === 0) return null;
                      return group.map((cat, i) => (
                        <ContextMenuItem
                          key={cat.id}
                          onClick={() => onBulkAssignCategory(cat)}
                          className="gap-2"
                        >
                          {getCategoryIcon && getCategoryColor && (
                            <CategoryIcon
                              iconName={getCategoryIcon(cat.slug || "")}
                              colorVar={getCategoryColor(cat.slug || "")}
                              size="sm"
                              showBackground
                            />
                          )}
                          <span className="truncate text-[13px]">
                            {getCategoryLabel?.(cat.slug || "") ?? cat.slug}
                          </span>
                        </ContextMenuItem>
                      ));
                    })}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            )}
          </>
        ) : (
          <>
            <ContextMenuItem onClick={onEditDescription} className="gap-2">
              <Pencil className="w-4 h-4" />
              {t("imports.editDescription")}
            </ContextMenuItem>

            <ContextMenuItem onClick={onSplit} className="gap-2">
              <SplitIcon className="w-4 h-4" />
              {t("imports.splitAmount")}
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={onToggleHidden} className="gap-2">
              {isHidden ? (
                <>
                  <Eye className="w-4 h-4" />
                  {t("imports.showEntry")}
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  {t("imports.hideEntry")}
                </>
              )}
            </ContextMenuItem>

            {isEdited && (
              <ContextMenuItem onClick={onRevert} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {t("imports.revertToOriginal")}
              </ContextMenuItem>
            )}

            {isPending && hasCategoryChange && (
              <ContextMenuItem onClick={onSaveWithRule} className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t("imports.saveAndCreateRule")}
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem onClick={onCopyDescription} className="gap-2">
              <Copy className="w-4 h-4" />
              {t("imports.copyDescription")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopyAmount} className="gap-2">
              <Copy className="w-4 h-4" />
              {t("imports.copyAmount")}
            </ContextMenuItem>

            {isManual && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={onDelete}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("imports.deleteEntry")}
                </ContextMenuItem>
              </>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
