import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, ArrowRight } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";

interface EmptyStateBannerProps {
  hasData?: boolean;
}

export function EmptyStateBanner({ hasData }: EmptyStateBannerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { transactions } = useTransactions();

  const resolvedHasData = hasData ?? transactions.length > 0;
  if (resolvedHasData) return null;

  return (
    <div className="flex items-center gap-3 rounded-full bg-[#FFBB03]/15 border border-[#FFBB03]/40 pl-3 pr-1.5 py-1.5 max-w-full">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFBB03]/30 text-[#080808]">
        <FileText className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <p className="hidden lg:block text-xs xl:text-sm text-foreground truncate">
        {t('welcome.bannerMessage', 'Start by uploading your first bank statement to see your finances.')}
      </p>
      <button
        onClick={() => navigate('/my-data?tab=bank')}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1b76ff] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] hover:bg-[#1b76ff]/90 active:scale-[0.98]"
      >
        <span>{t('welcome.uploadButton', 'Upload file')}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
