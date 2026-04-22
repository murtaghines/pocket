import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Type,
  Hash,
  Calendar as CalendarIcon,
  CircleDot,
  Tag,
  CheckSquare,
  Link2,
  FileText,
  Wallet,
  Coins,
  ArrowLeftRight,
  Lock as LockIcon,
} from "lucide-react";

/**
 * Airtable-inspired data table primitives.
 *
 * Design tokens (visual contract):
 *  - White surface (`bg-card`), thin gray hairlines (`border-border`)
 *  - Compact-medium density: 36px header, 44px row
 *  - Left-aligned text everywhere except numeric columns
 *  - Inter / system font, regular weights, no heavy borders
 *  - Soft pill badges for selects/status
 */

/* ──────────────────────────  Column type icons  ────────────────────────── */

export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "tag"
  | "checkbox"
  | "link"
  | "file"
  | "account"
  | "currency"
  | "movement"
  | "lock";

const COLUMN_TYPE_ICONS: Record<ColumnType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: CalendarIcon,
  select: CircleDot,
  tag: Tag,
  checkbox: CheckSquare,
  link: Link2,
  file: FileText,
  account: Wallet,
  currency: Coins,
  movement: ArrowLeftRight,
  lock: LockIcon,
};

export function ColumnTypeIcon({ type, className }: { type?: ColumnType; className?: string }) {
  if (!type) return null;
  const Icon = COLUMN_TYPE_ICONS[type];
  return <Icon className={cn("w-3.5 h-3.5 text-muted-foreground/70 shrink-0", className)} />;
}

/* ──────────────────────────  Container  ────────────────────────── */

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DataTable({ className, children, ...props }: DataTableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-border bg-card",
        className,
      )}
      {...props}
    >
      <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
        {children}
      </table>
    </div>
  );
}

/* ──────────────────────────  Header  ────────────────────────── */

export function DataTableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-muted/30", className)} {...props}>
      {children}
    </thead>
  );
}

interface DataTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  type?: ColumnType;
  numeric?: boolean;
  /** When true renders a `#` row-number column header. */
  rowNumber?: boolean;
}

export function DataTableHead({
  className,
  type,
  numeric,
  rowNumber,
  children,
  ...props
}: DataTableHeadProps) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle font-medium text-xs text-muted-foreground",
        "border-b border-border",
        // hairline column separator on the right (except last)
        "[&:not(:last-child)]:border-r [&:not(:last-child)]:border-border/60",
        numeric && "text-right",
        rowNumber && "w-[44px] text-center text-muted-foreground/60",
        className,
      )}
      {...props}
    >
      {rowNumber ? (
        <Hash className="w-3.5 h-3.5 mx-auto opacity-60" />
      ) : (
        <span className={cn("inline-flex items-center gap-1.5", numeric && "justify-end w-full")}>
          {!numeric && <ColumnTypeIcon type={type} />}
          <span className="truncate">{children}</span>
          {numeric && <ColumnTypeIcon type={type ?? "number"} />}
        </span>
      )}
    </th>
  );
}

/* ──────────────────────────  Body / Row / Cell  ────────────────────────── */

export function DataTableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Visually separates a "totals" or accent row. */
  accent?: boolean;
}

export function DataTableRow({ className, accent, children, ...props }: DataTableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/30 group",
        accent && "bg-primary/5 hover:bg-primary/5",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** When true renders a centered # row-index cell. */
  rowNumber?: number;
  muted?: boolean;
  noPadding?: boolean;
}

export function DataTableCell({
  className,
  numeric,
  rowNumber,
  muted,
  noPadding,
  children,
  ...props
}: DataTableCellProps) {
  return (
    <td
      className={cn(
        "align-middle border-b border-border/60",
        "[&:not(:last-child)]:border-r [&:not(:last-child)]:border-border/40",
        !noPadding && "h-11 px-3 py-2",
        numeric && "text-right tabular-nums",
        rowNumber !== undefined && "w-[44px] text-center text-xs text-muted-foreground/70 font-normal",
        muted && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {rowNumber !== undefined ? rowNumber : children}
    </td>
  );
}

/* ──────────────────────────  Empty / CTA row  ────────────────────────── */

interface DataTableAddRowProps {
  colSpan: number;
  label: string;
  onClick?: () => void;
  /** Render hidden file input overlay so the entire row acts as a file picker. */
  fileInput?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function DataTableAddRow({
  colSpan,
  label,
  onClick,
  fileInput,
  className,
  icon,
}: DataTableAddRowProps) {
  return (
    <tr className={cn("group hover:bg-primary/5 transition-colors", className)}>
      <td
        colSpan={colSpan}
        className="h-11 px-3 py-0 border-b border-border/60 cursor-pointer"
        onClick={onClick}
      >
        <div className="relative flex items-center gap-2 text-primary text-sm font-medium">
          {icon ?? <span className="text-base leading-none">+</span>}
          <span>{label}</span>
          {fileInput}
        </div>
      </td>
    </tr>
  );
}

/* ──────────────────────────  Toolbar / chips  ────────────────────────── */

export function DataTableToolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-wrap items-center gap-2 mb-3", className)}>{children}</div>;
}