import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Copy,
  Trash2,
  Split as SplitIcon,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthTransaction } from "./types";

const TRANSITION_MS = 140;
const ROW_H = 44;
const MENU_W = 232;
const GAP = 8;
const MARGIN = 12;

interface MobileTransactionActionsProps {
  tx: MonthTransaction | null;
  anchorRect: DOMRect | null;
  isLocked: boolean;
  isManual: boolean;
  isHidden: boolean;
  isEdited: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onAddNote: () => void;
  onSplit: () => void;
  onRevert: () => void;
  onCopyDescription: () => void;
  onCopyAmount: () => void;
}

export function MobileTransactionActions({
  tx,
  anchorRect,
  isLocked,
  isManual,
  isHidden,
  isEdited,
  onClose,
  onEdit,
  onToggleHidden,
  onDelete,
  onAddNote,
  onSplit,
  onRevert,
  onCopyDescription,
  onCopyAmount,
}: MobileTransactionActionsProps) {
  const { t } = useTranslation("common");
  const open = tx !== null && anchorRect !== null;

  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted || !anchorRect) return null;

  const act = (fn: () => void) => {
    onClose();
    setTimeout(fn, TRANSITION_MS);
  };

  const primaryActions: { icon: React.ReactNode; label: string; onClick: () => void }[] = [];
  if (!isLocked) primaryActions.push({ icon: <Pencil className="w-[17px] h-[17px]" />, label: t("imports.editTransaction"), onClick: () => act(onEdit) });
  if (!isLocked) primaryActions.push({ icon: <MessageSquarePlus className="w-[17px] h-[17px]" />, label: t("imports.addNote"), onClick: () => act(onAddNote) });
  if (!isLocked) primaryActions.push({ icon: <SplitIcon className="w-[17px] h-[17px]" />, label: t("imports.splitAmount"), onClick: () => act(onSplit) });
  if (!isLocked) {
    primaryActions.push({
      icon: isHidden ? <Eye className="w-[17px] h-[17px]" /> : <EyeOff className="w-[17px] h-[17px]" />,
      label: isHidden ? t("imports.showEntry") : t("imports.hideEntry"),
      onClick: () => act(onToggleHidden),
    });
  }
  if (!isLocked && isEdited && !isManual) {
    primaryActions.push({ icon: <RotateCcw className="w-[17px] h-[17px]" />, label: t("imports.revertToOriginal"), onClick: () => act(onRevert) });
  }
  primaryActions.push({ icon: <Copy className="w-[17px] h-[17px]" />, label: t("imports.copyDescription"), onClick: () => act(onCopyDescription) });
  primaryActions.push({ icon: <Copy className="w-[17px] h-[17px]" />, label: t("imports.copyAmount"), onClick: () => act(onCopyAmount) });

  const showDelete = !isLocked && isManual;

  const estHeight =
    primaryActions.length * ROW_H + (showDelete ? GAP + ROW_H : 0) + 4;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.left + anchorRect.width / 2 - MENU_W / 2;
  left = Math.max(MARGIN, Math.min(left, vw - MENU_W - MARGIN));

  const fitsBelow = anchorRect.bottom + GAP + estHeight <= vh - MARGIN;
  const top = fitsBelow
    ? anchorRect.bottom + GAP
    : Math.max(MARGIN, anchorRect.top - GAP - estHeight);

  const originY = fitsBelow ? "top" : "bottom";

  const panel = (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/10 backdrop-blur-[2px] transition-opacity ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed z-40 flex flex-col gap-2 transition-[opacity,transform] ease-out",
          shown ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
        style={{
          left,
          top,
          width: MENU_W,
          transformOrigin: `center ${originY}`,
          transitionDuration: `${TRANSITION_MS}ms`,
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="rounded-2xl bg-card shadow-lg overflow-hidden">
          {primaryActions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 text-[15px] text-foreground active:bg-muted/60 transition-colors",
                i < primaryActions.length - 1 && "border-b border-border/60",
              )}
              style={{ height: ROW_H }}
              onClick={a.onClick}
            >
              {a.label}
              <span className="text-muted-foreground shrink-0">{a.icon}</span>
            </button>
          ))}
        </div>

        {showDelete && (
          <div className="rounded-2xl bg-card shadow-lg overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 text-[15px] text-destructive active:bg-destructive/10 transition-colors"
              style={{ height: ROW_H }}
              onClick={() => act(onDelete)}
            >
              {t("imports.deleteEntry")}
              <Trash2 className="w-[17px] h-[17px] shrink-0" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
