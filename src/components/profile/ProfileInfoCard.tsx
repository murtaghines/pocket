import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { User, Mail, Calendar, LogOut, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileInfoCardProps {
  onLogout?: () => void;
  className?: string;
}

export function ProfileInfoCard({ onLogout, className }: ProfileInfoCardProps) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation('common');
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const { formatDate } = useLocalization();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");

  const handleEdit = () => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateProfile(
      { first_name: firstName.trim(), last_name: lastName.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({
            title: tc('success'),
            description: t('personalInfo.updateSuccess'),
          });
        },
        onError: () => {
          toast({
            title: tc('error'),
            description: t('personalInfo.updateError', { defaultValue: 'Could not update profile.' }),
            variant: "destructive",
          });
        },
      }
    );
  };

  const displayName = profile?.first_name || profile?.last_name 
    ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
    : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('personalInfo.description')}
        </p>
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">{t('personalInfo.firstName')}</Label>
                <Input
                  id="edit-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">{t('personalInfo.lastName')}</Label>
                <Input
                  id="edit-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Check className="w-4 h-4 mr-1" />
                {tc('save')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                {tc('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {displayName && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('personalInfo.name', { defaultValue: 'Name' })}</p>
                  <p className="font-medium">{displayName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('personalInfo.email')}</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            {user?.created_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('personalInfo.memberSince', { defaultValue: 'Member since' })}</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onLogout}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            {tc('navigation.logout')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
