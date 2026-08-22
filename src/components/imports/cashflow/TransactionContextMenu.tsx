import { useTranslation } from "react-i18next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Eye,
  EyeOff,
  MessageSquarePlus,
  Copy,
  Trash2,
  SplitIcon,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface TransactionContextMenuProps {
  children: React.ReactNode;
  isHidden: boolean;
  isManual: boolean;
  isLocked: boolean;
  isEdited: boolean;
  isPending: boolean;
  hasCategoryChange: boolean;
  selectedCount: number;
  onToggleHidden: () => void;
  onDelete: () => void;
  onAddNote: () => void;
  onCopyAmount: () => void;
  onCopyDescription: () => void;
  onSplit: () => void;
  onRevert: () => void;
  onSaveWithRule: () => void;
  onBulkHide?: () => void;
  onBulkShow?: () => void;
}

export function TransactionContextMenu({
  children,
  isHidden,
  isManual,
  isLocked,
  isEdited,
  isPending,
  hasCategoryChange,
  selectedCount,
  onToggleHidden,
  onDelete,
  onAddNote,
  onCopyAmount,
  onCopyDescription,
  onSplit,
  onRevert,
  onSaveWithRule,
  onBulkHide,
  onBulkShow,
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
          </>
        ) : (
          <>
            {!isLocked && (
              <ContextMenuItem onClick={onAddNote} className="gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                {t("imports.addNote")}
              </ContextMenuItem>
            )}

            {!isLocked && (
              <ContextMenuItem onClick={onSplit} className="gap-2">
                <SplitIcon className="w-4 h-4" />
                {t("imports.splitAmount")}
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            {!isLocked && (
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
            )}

            {!isLocked && isEdited && (
              <ContextMenuItem onClick={onRevert} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {t("imports.revertToOriginal")}
              </ContextMenuItem>
            )}

            {!isLocked && isPending && hasCategoryChange && (
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

            {!isLocked && isManual && (
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
