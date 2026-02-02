import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Settings, Upload, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface ProfileHeaderProps {
  currentTab: 'data' | 'settings';
  onTabChange: (tab: string) => void;
}

export function ProfileHeader({ currentTab, onTabChange }: ProfileHeaderProps) {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const { profile } = useProfile();

  // Build display name from profile or fallback to email username
  const displayName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : user?.email?.split('@')[0] || t('header.guest');

  return (
    <div className="flex items-center gap-4 animate-fade-in">
      {/* Circle with person icon - same gray as dashboard */}
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
      
      {/* Divider - hidden on mobile */}
      <div className="hidden md:block w-px h-10 bg-border mx-2" />
      
      {/* Tab selectors - hidden on mobile (bottom nav controls tabs) */}
      <div className="hidden md:flex items-center gap-3">
        {currentTab === 'data' ? (
          <>
            {/* Data tab active - expanded blue button with Upload icon */}
            <Button 
              variant="default" 
              className="rounded-full gap-2 px-5"
            >
              <Upload className="w-4 h-4" />
              {t('tabs.data')}
            </Button>
            
            {/* Settings tab inactive - gray circle with visible icon */}
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={() => onTabChange('settings')}
            >
              <Settings className="w-4 h-4 text-foreground" />
            </Button>
          </>
        ) : (
          <>
            {/* Data tab inactive - gray circle with visible icon */}
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full bg-gray-200 hover:bg-gray-300"
              onClick={() => onTabChange('data')}
            >
              <Upload className="w-4 h-4 text-foreground" />
            </Button>
            
            {/* Settings tab active - expanded blue button with Settings icon */}
            <Button 
              variant="default" 
              className="rounded-full gap-2 px-5"
            >
              <Settings className="w-4 h-4" />
              {t('tabs.settings')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
