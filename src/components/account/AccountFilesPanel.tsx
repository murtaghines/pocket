import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useImports } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { UploadedFilesHistoryList } from "@/components/imports/cashflow/UploadedFiles";

const NO_PENDING = new Set<string>();

interface AccountFilesPanelProps {
  accountId: string | null;
  onClose: () => void;
}

export function AccountFilesPanel({ accountId, onClose }: AccountFilesPanelProps) {
  const { t } = useTranslation("account");
  const { accounts } = useAccounts();
  const { imports, deleteImport, isDeleting } = useImports("CASHFLOW");

  const account = accounts.find((a) => a.id === accountId);
  const accountImports = imports.filter((i) => i.account_id === accountId);
  const cashAccounts = accounts.filter((a) => a.account_role === "CASH" && !a.archived);

  return (
    <Sheet open={!!accountId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card [&>button]:hidden">
        <SheetTitle className="sr-only">
          {account ? getAccountDisplayName(account) : t("accounts.manageFiles", "Manage files")}
        </SheetTitle>
        {accountImports.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("accounts.noFilesForAccount", "No files uploaded to this account yet")}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-data">{t("accounts.uploadFiles", "Upload files")}</Link>
            </Button>
          </div>
        ) : (
          <UploadedFilesHistoryList
            imports={accountImports}
            cashAccounts={cashAccounts}
            deleteImport={deleteImport}
            isDeleting={isDeleting}
            pendingImportIds={NO_PENDING}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
