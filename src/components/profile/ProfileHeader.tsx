import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export function ProfileHeader() {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const { profile } = useProfile();

  const displayName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : user?.email?.split('@')[0] || t('header.guest');

  return (
    <div className="flex items-center gap-4">
      {/* Circle with person icon */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 flex items-center justify-center">
        <User className="w-8 h-8 md:w-10 md:h-10 text-foreground" />
      </div>
      
      {/* Name and email */}
      <div className="flex flex-col">
        <span className="text-lg md:text-xl font-bold text-foreground">
          {displayName}
        </span>
        <span className="text-sm md:text-base text-muted-foreground">
          {user?.email}
        </span>
      </div>
    </div>
  );
}
