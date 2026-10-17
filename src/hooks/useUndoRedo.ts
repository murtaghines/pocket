import { useState, useCallback, useRef } from "react";

export interface UndoEntry {
  id: string;
  txId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  meta?: Record<string, unknown>;
  metaOld?: Record<string, unknown>;
  timestamp: number;
}

type SaveFn = (args: {
  id: string;
  payload: Record<string, unknown>;
  before: Record<string, unknown>;
}) => Promise<unknown>;

const MAX_DEPTH = 50;

export function useUndoRedo(saveFn: SaveFn) {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const busyRef = useRef(false);

  const push = useCallback((entry: Omit<UndoEntry, "id" | "timestamp">) => {
    const full: UndoEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setUndoStack((prev) => {
      const next = [...prev, full];
      if (next.length > MAX_DEPTH) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let entry: UndoEntry | undefined;
      setUndoStack((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        entry = next.pop()!;
        return next;
      });

      // Wait a tick for the setState to flush so we can read `entry`
      await Promise.resolve();
      if (!entry) { busyRef.current = false; return; }

      const payload: Record<string, unknown> = {};
      const before: Record<string, unknown> = {};

      if (entry.field.includes("+")) {
        const fields = entry.field.split("+");
        const oldVals = entry.oldValue as Record<string, unknown>;
        const newVals = entry.newValue as Record<string, unknown>;
        for (const f of fields) {
          payload[f] = oldVals[f];
          before[f] = newVals[f];
        }
      } else {
        payload[entry.field] = entry.oldValue;
        before[entry.field] = entry.newValue;
      }

      if (entry.metaOld) Object.assign(payload, entry.metaOld);
      if (entry.meta) Object.assign(before, entry.meta);
      payload.__action = "undo";

      await saveFn({ id: entry.txId, payload, before });
      setRedoStack((prev) => [...prev, entry!]);
    } finally {
      busyRef.current = false;
    }
  }, [saveFn]);

  const redo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let entry: UndoEntry | undefined;
      setRedoStack((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        entry = next.pop()!;
        return next;
      });

      await Promise.resolve();
      if (!entry) { busyRef.current = false; return; }

      const payload: Record<string, unknown> = {};
      const before: Record<string, unknown> = {};

      if (entry.field.includes("+")) {
        const fields = entry.field.split("+");
        const oldVals = entry.oldValue as Record<string, unknown>;
        const newVals = entry.newValue as Record<string, unknown>;
        for (const f of fields) {
          payload[f] = newVals[f];
          before[f] = oldVals[f];
        }
      } else {
        payload[entry.field] = entry.newValue;
        before[entry.field] = entry.oldValue;
      }

      if (entry.meta) Object.assign(payload, entry.meta);
      if (entry.metaOld) Object.assign(before, entry.metaOld);
      payload.__action = "redo";

      await saveFn({ id: entry.txId, payload, before });
      setUndoStack((prev) => [...prev, entry!]);
    } finally {
      busyRef.current = false;
    }
  }, [saveFn]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
