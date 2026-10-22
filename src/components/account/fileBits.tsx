import { FileText, FileSpreadsheet, Sheet as SheetIcon, File as FileIcon, type LucideIcon } from "lucide-react";
import { PillBadge } from "@/components/ui/pill-badge";
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

export function ImportStatusPill({ status, label }: { status: Import["status"]; label: Record<Import["status"], string> }) {
  const tone = status === "FAILED" ? "red" : status === "NORMALIZED" ? "green" : "amber";
  return <PillBadge tone={tone}>{label[status]}</PillBadge>;
}
