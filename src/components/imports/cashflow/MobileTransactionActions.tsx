import { useEffect, useRef, useState, useCallback } from "react";
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
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { MonthTransaction } from "./types";

const TRANSITION_MS = 280;

interface MobileTransactionActionsProps {
  tx: MonthTransaction | null;
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
  description: string;
  formattedAmount: string;
  amountColorClass: string;
  amountSign: string;
}

export function MobileTransactionActions({
  tx,
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
  description,
  formattedAmount,
  amountColorClass,
  amountSign,
}: MobileTransactionActionsProps) {
  const { t } = useTranslation("common");
  const open = tx !== null;

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

  useBodyScrollLock(mounted);

  const dragStartY = useRef(0);
  const dragYRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const DISMISS_THRESHOLD = 80;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const updateDragY = useCallback((v: number) => {
    dragYRef.current = v;
    setDragY(v);
  }, []);

  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const handleDragMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) updateDragY(dy);
  };
  const handleDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragYRef.current > DISMISS_THRESHOLD) {
      setShown(false);
      onCloseRef.current();
    }
    updateDragY(0);
  };

  const act = (fn: () => void) => {
    onClose();
    setTimeout(fn, TRANSITION_MS);
  };

  if (!mounted) return null;

  const panel = (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 bg-card rounded-t-2xl shadow-lg",
          !dragging.current && "transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          shown ? "translate-y-0" : "translate-y-full",
        )}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="flex flex-col items-center pt-2 pb-1">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pt-1 pb-3">
            <p className="text-[13px] font-medium text-foreground truncate">{description}</p>
            <p className={cn("text-[13px] font-semibold tabular-nums mt-0.5", amountColorClass)}>
              {amountSign}{formattedAmount}
            </p>
          </div>
        </div>

        <div className="border-t border-border/60 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {!isLocked && (
            <ActionRow icon={<Pencil className="w-[18px] h-[18px]" />} label={t("imports.editTransaction")} onClick={() => act(onEdit)} />
          )}
          {!isLocked && (
            <ActionRow icon={<MessageSquarePlus className="w-[18px] h-[18px]" />} label={t("imports.addNote")} onClick={() => act(onAddNote)} />
          )}
          {!isLocked && (
            <ActionRow icon={<SplitIcon className="w-[18px] h-[18px]" />} label={t("imports.splitAmount")} onClick={() => act(onSplit)} />
          )}
          {!isLocked && (
            <ActionRow
              icon={isHidden ? <Eye className="w-[18px] h-[18px]" /> : <EyeOff className="w-[18px] h-[18px]" />}
              label={isHidden ? t("imports.showEntry") : t("imports.hideEntry")}
              onClick={() => act(onToggleHidden)}
            />
          )}
          {!isLocked && isEdited && !isManual && (
            <ActionRow icon={<RotateCcw className="w-[18px] h-[18px]" />} label={t("imports.revertToOriginal")} onClick={() => act(onRevert)} />
          )}
          <ActionRow icon={<Copy className="w-[18px] h-[18px]" />} label={t("imports.copyDescription")} onClick={() => act(onCopyDescription)} />
          <ActionRow icon={<Copy className="w-[18px] h-[18px]" />} label={t("imports.copyAmount")} onClick={() => act(onCopyAmount)} />
          {!isLocked && isManual && (
            <ActionRow
              icon={<Trash2 className="w-[18px] h-[18px]" />}
              label={t("imports.deleteEntry")}
              onClick={() => act(onDelete)}
              destructive
            />
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}

function ActionRow({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 px-5 py-3 text-left text-[14px] font-medium active:bg-muted/60 transition-colors",
        destructive ? "text-destructive" : "text-foreground",
      )}
      onClick={onClick}
    >
      <span className={destructive ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
      {label}
    </button>
  );
}
