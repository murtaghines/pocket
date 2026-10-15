import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export function DeleteAccountDialog() {
  const { t } = useTranslation('profile');
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  
  const confirmWord = t('deleteAccount.confirmWord');

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) throw error;

      if (data?.success) {
        toast({
          title: t('deleteAccount.deleted'),
          description: t('deleteAccount.deletedDescription'),
        });
        await signOut();
      } else {
        throw new Error(data?.error || t('deleteAccount.error'));
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: t('deleteAccount.errorTitle'),
        description: error.message || t('deleteAccount.errorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('deleteAccount.button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t('deleteAccount.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t('deleteAccount.warning')}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>{t('deleteAccount.items.transactions')}</li>
              <li>{t('deleteAccount.items.files')}</li>
              <li>{t('deleteAccount.items.investments')}</li>
              <li>{t('deleteAccount.items.preferences')}</li>
              <li>{t('deleteAccount.items.profile')}</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-8 pb-5">
          <Label htmlFor="confirm-delete" className="text-[13px] font-medium text-muted-foreground">
            {t('deleteAccount.typeToConfirm', { word: confirmWord })}
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
          <AlertDialogCancel disabled={isDeleting}>{t('deleteAccount.cancel')}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== confirmWord || isDeleting}
            className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('deleteAccount.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deleteAccount.confirm')}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
