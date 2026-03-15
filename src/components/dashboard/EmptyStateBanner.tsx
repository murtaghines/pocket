import { Upload, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
    <div className="mb-6 rounded-2xl border border-border bg-muted/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('welcome.message')}
        </p>
      </div>
      <Button 
        onClick={() => navigate('/profile')}
        size="sm"
        className="gap-1.5 whitespace-nowrap rounded-full px-5 text-sm"
      >
        <Upload className="w-3.5 h-3.5" />
        {t('welcome.uploadButton')}
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
