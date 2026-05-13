import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, ArrowRight } from "lucide-react";

interface EmptyStateBannerProps {
  hasData: boolean;
}

export function EmptyStateBanner({ hasData }: EmptyStateBannerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  if (hasData) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-[#FFBB03]/15 border border-[#FFBB03]/40 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFBB03]/30 text-[#080808]">
          <FileText className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
        <p className="text-sm sm:text-[15px] text-foreground truncate">
          {t('welcome.bannerMessage', 'Start by uploading your first bank statement to see your finances.')}
        </p>
      </div>
      <button
        onClick={() => navigate('/profile')}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1b76ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] hover:bg-[#1b76ff]/90 active:scale-[0.98]"
      >
        <span className="hidden sm:inline">{t('welcome.uploadButton', 'Upload file')}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
