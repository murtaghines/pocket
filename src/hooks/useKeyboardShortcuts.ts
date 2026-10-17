import { useEffect, useCallback, useRef, useState } from "react";

export type EditableColumn = "movement" | "amount" | "description" | "category";

export interface FocusedCell {
  txId: string;
  column: EditableColumn;
}

const COLUMN_ORDER: EditableColumn[] = ["movement", "amount", "description", "category"];

interface UseKeyboardShortcutsOpts {
  containerRef: React.RefObject<HTMLElement | null>;
  visibleTxIds: string[];
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onEditCell: (cell: FocusedCell) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  hasSelection: boolean;
}

export function useKeyboardShortcuts({
  containerRef,
  visibleTxIds,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onEditCell,
  onCancelEdit,
  isEditing,
  hasSelection,
}: UseKeyboardShortcutsOpts) {
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const focusedRef = useRef(focusedCell);
  focusedRef.current = focusedCell;

  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  const idsRef = useRef(visibleTxIds);
  idsRef.current = visibleTxIds;

  const navigate = useCallback(
    (dRow: number, dCol: number) => {
      const current = focusedRef.current;
      if (!current) return;
      const ids = idsRef.current;
      const rowIdx = ids.indexOf(current.txId);
      if (rowIdx === -1) return;

      const colIdx = COLUMN_ORDER.indexOf(current.column);
      let newRow = rowIdx + dRow;
      let newCol = colIdx + dCol;

      if (newCol >= COLUMN_ORDER.length) {
        newCol = 0;
        newRow += 1;
      } else if (newCol < 0) {
        newCol = COLUMN_ORDER.length - 1;
        newRow -= 1;
      }

      if (newRow < 0 || newRow >= ids.length) return;

      const next: FocusedCell = {
        txId: ids[newRow],
        column: COLUMN_ORDER[newCol],
      };
      setFocusedCell(next);
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      // Undo / Redo — only when not typing in an input
      if (mod && e.key === "z" && !e.shiftKey && !inInput) {
        e.preventDefault();
        onUndo();
        return;
      }
      if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y") && !inInput) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Copy / Paste — only with row selection, not in inputs
      if (mod && e.key === "c" && !inInput && hasSelection) {
        e.preventDefault();
        onCopy();
        return;
      }
      if (mod && e.key === "v" && !inInput) {
        e.preventDefault();
        onPaste();
        return;
      }

      // Delete / Backspace on selected rows
      if ((e.key === "Delete" || e.key === "Backspace") && !inInput && hasSelection) {
        e.preventDefault();
        onDelete();
        return;
      }

      // Escape — cancel edit or clear focus
      if (e.key === "Escape") {
        if (isEditingRef.current) {
          onCancelEdit();
        } else {
          setFocusedCell(null);
        }
        return;
      }

      // The rest only applies when we have a focused cell and aren't in a text input
      if (!focusedRef.current || inInput) return;

      // Tab / Shift+Tab — navigate cells
      if (e.key === "Tab") {
        e.preventDefault();
        navigate(0, e.shiftKey ? -1 : 1);
        return;
      }

      // Enter — edit focused cell or confirm + move down
      if (e.key === "Enter") {
        e.preventDefault();
        if (isEditingRef.current) {
          navigate(1, 0);
        } else {
          onEditCell(focusedRef.current);
        }
        return;
      }

      // F2 — enter edit mode
      if (e.key === "F2") {
        e.preventDefault();
        onEditCell(focusedRef.current);
        return;
      }

      // Arrow keys — navigate rows/columns
      if (e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1, 0);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigate(1, 0);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(0, -1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate(0, 1);
        return;
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [containerRef, onUndo, onRedo, onCopy, onPaste, onDelete, onEditCell, onCancelEdit, navigate, hasSelection]);

  return { focusedCell, setFocusedCell };
}
