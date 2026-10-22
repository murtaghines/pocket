import { FileText, FileSpreadsheet, Sheet as SheetIcon, File as FileIcon, type LucideIcon } from "lucide-react";
import { PillBadge } from "@/components/ui/pill-badge";
import { cn } from "@/lib/utils";
import type { Import } from "@/hooks/useImports";

export function getFileKind(imp: Pick<Import, "file_name" | "file_mime">): { label: string; Icon: LucideIcon } {
  const ext = (imp.file_name.split(".").pop() || "").toLowerCase();
  const mime = imp.file_mime || "";
  if (ext === "pdf" || mime.includes("pdf")) return { label: "PDF", Icon: FileText };
  if (ext === "csv" || mime.includes("csv")) return { label: "CSV", Icon: SheetIcon };
  if (ext === "xlsx" || ext === "xls" || mime.includes("sheet") || mime.includes("excel")) {
    return { label: ext === "xls" ? "XLS" : "XLSX", Icon: FileSpreadsheet };
  }
  return { label: ext ? ext.toUpperCase() : "FILE", Icon: FileIcon };
}

export function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_TONE: Record<string, string> = {
  PDF: "text-destructive",
  CSV: "text-primary",
  XLSX: "text-success",
  XLS: "text-success",
};

/** A page icon with the file extension printed inside, coloured by type (PDF red, CSV blue, Excel green). */
export function FileTypeIcon({ label, width = 26, className }: { label: string; width?: number; className?: string }) {
  const height = Math.round(width * 1.2);
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", KIND_TONE[label] ?? "text-muted-foreground", className)}
      style={{ width, height }}
      aria-label={label}
    >
      <svg viewBox="0 0 28 34" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <path d="M4 1h12.5L26 10.5V30a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M16.5 1v6.5a3 3 0 0 0 3 3H26" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span className="relative mt-[30%] font-bold leading-none tracking-tight" style={{ fontSize: Math.max(6, Math.round(width * 0.27)) }}>
        {label}
      </span>
    </span>
  );
}

/** Only unusual states are worth a badge: a finished file needs none. */
export function ImportStatusPill({ status, label }: { status: Import["status"]; label: Record<Import["status"], string> }) {
  if (status === "NORMALIZED") return null;
  return <PillBadge tone={status === "FAILED" ? "red" : "amber"}>{label[status]}</PillBadge>;
}
