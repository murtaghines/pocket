import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
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

type Step = "warning" | "email-sent" | "confirm-code";

export function DeleteAccountDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("warning");
  const [confirmCode, setConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signOut, user } = useAuth();

  const handleRequestCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-account-deletion");

      if (error) throw error;

      if (data?.success) {
        setStep("email-sent");
        toast({
          title: "Confirmation code sent",
          description: `Check your email at ${user?.email} for the 6-digit code.`,
        });
      } else {
        throw new Error(data?.error || "Failed to send confirmation code");
      }
    } catch (error: any) {
      console.error("Error requesting deletion:", error);
      toast({
        title: "Error",
        description: error.message || "Could not send confirmation code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmCode.length !== 6) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { code: confirmCode },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently deleted.",
        });
        await signOut();
      } else {
        throw new Error(data?.error || "Failed to delete account");
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Could not delete your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setStep("warning");
      setConfirmCode("");
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {step === "warning" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Delete Account Permanently
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your data including:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>All transactions and financial records</li>
                  <li>All uploaded files and documents</li>
                  <li>Investment records and accounts</li>
                  <li>Preferences and settings</li>
                  <li>Your profile information</li>
                </ul>
                <p className="text-sm pt-2">
                  For security, we'll send a confirmation code to <strong>{user?.email}</strong>.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleRequestCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Confirmation Code
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "email-sent" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Check Your Email
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  We've sent a 6-digit confirmation code to <strong>{user?.email}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  The code expires in 15 minutes. If you don't see the email, check your spam folder.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-code" className="text-sm font-medium">
                Enter the 6-digit code
              </Label>
              <Input
                id="confirm-code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mt-2 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                disabled={isLoading}
              />
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep("warning")}
                disabled={isLoading}
                className="sm:mr-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
