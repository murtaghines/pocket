import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAccountDisplayName } from "@/lib/accountColors";
import {
  LogOut, Download, Trash2, AlertTriangle, Loader2,
} from "lucide-react";

interface AccountSecurityTabProps {
  onLogout: () => void;
}

async function fetchAllTransactions(userId: string) {
  // Supabase caps responses at 1000 rows, so paginate
  const PAGE_SIZE = 1000;
  let all: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CSV_COLUMNS = ["date", "description", "account", "movement", "category", "amount", "currency"] as const;

function toCsv(rows: Record<string, unknown>[], accountNames: Map<string, string>) {
  const escape = (v: unknown) => {
    const str = v == null ? "" : String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = rows.map((r) =>
    [
      r.date,
      r.description,
      accountNames.get(String(r.account_id)) ?? "",
      r.movement,
      r.category,
      r.amount,
      r.currency,
    ].map(escape).join(","),
  );
  return [CSV_COLUMNS.join(","), ...lines].join("\n");
}

function ExportDataSection() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

  const handleExport = async (format: "json" | "csv") => {
    if (!user) return;
    setExporting(format);
    try {
      const day = new Date().toISOString().slice(0, 10);
      const transactions = await fetchAllTransactions(user.id);

      if (format === "csv") {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, institution, name")
          .eq("user_id", user.id);
        const names = new Map((accounts || []).map((a) => [a.id, getAccountDisplayName(a)]));
        downloadBlob(toCsv(transactions, names), "text/csv;charset=utf-8", `pocket-transactions-${day}.csv`);
        return;
      }

      const [profileRes, prefsRes, accountsRes, importsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("imports").select("id, file_name, domain, status, uploaded_at, transactions_count").eq("user_id", user.id),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        preferences: prefsRes.data,
        accounts: accountsRes.data || [],
        imports: importsRes.data || [],
        transactions,
      };
      downloadBlob(JSON.stringify(payload, null, 2), "application/json", `pocket-export-${day}.json`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 md:p-6 shadow-section">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t("security.exportData", "Export my data")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("security.exportDescription", "Download your data as JSON (everything) or CSV (transactions only)")}
      </p>
      <div className="flex flex-wrap gap-2">
        {(["json", "csv"] as const).map((format) => (
          <Button
            key={format}
            variant="outline"
            size="sm"
            onClick={() => handleExport(format)}
            disabled={exporting !== null}
            className="gap-2"
          >
            {exporting === format ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {exporting === format
              ? t("security.exporting", "Exporting...")
              : t(format === "json" ? "security.exportDownload" : "security.exportDownloadCsv", format === "json" ? "Download JSON" : "Download CSV")}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SessionSection({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation("account");
  return (
    <div className="bg-card rounded-xl p-5 md:p-6 shadow-section">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t("security.session", "Session")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("security.sessionDescription", "End your session on this device. You can log back in at any time.")}
      </p>
      <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
        <LogOut className="w-3.5 h-3.5" />
        {t("security.logOut", "Log out")}
      </Button>
    </div>
  );
}

function DeleteAccountSection() {
  const { t } = useTranslation("profile");
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { t: ta } = useTranslation("account");

  const confirmWord = t("deleteAccount.confirmWord", "DELETE");

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.success) {
        toast({ title: t("deleteAccount.deleted"), description: t("deleteAccount.deletedDescription") });
        await signOut();
      } else {
        throw new Error(data?.error || t("deleteAccount.error"));
      }
    } catch (error: any) {
      toast({ title: t("deleteAccount.errorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
      setConfirmText("");
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 md:p-6 shadow-section border border-destructive/30 lg:col-span-2">
      <h3 className="text-lg font-semibold text-destructive mb-1">
        {ta("security.dangerZone", "Danger zone")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {ta("security.deleteWarning", "This action cannot be undone. All your data will be permanently deleted.")}
      </p>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2">
            <Trash2 className="w-3.5 h-3.5" />
            {t("deleteAccount.button")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("deleteAccount.title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t("deleteAccount.warning")}</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>{t("deleteAccount.items.transactions")}</li>
                  <li>{t("deleteAccount.items.files")}</li>
                  <li>{t("deleteAccount.items.investments")}</li>
                  <li>{t("deleteAccount.items.preferences")}</li>
                  <li>{t("deleteAccount.items.profile")}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-8 pb-5">
            <Label htmlFor="confirm-delete" className="text-[13px] font-medium text-muted-foreground">
              {t("deleteAccount.typeToConfirm", { word: confirmWord })}
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              className="mt-2 h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none"
              disabled={isDeleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("deleteAccount.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== confirmWord || isDeleting}
              className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("deleteAccount.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("deleteAccount.confirm")}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AccountSecurityTab({ onLogout }: AccountSecurityTabProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <ExportDataSection />
      <SessionSection onLogout={onLogout} />
      <DeleteAccountSection />
    </div>
  );
}
