import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CloudUpload, ArrowRight } from "lucide-react";

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
    <div className="mb-6 rounded-3xl bg-[#FFBB03] p-6 sm:p-8 md:p-10 text-center shadow-lg">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#080808]/10">
        <CloudUpload className="h-8 w-8 text-[#080808]" strokeWidth={2} />
      </div>
      <h2 className="mb-2 text-xl sm:text-2xl font-bold text-[#080808]">
        {t('welcome.bannerTitle', '¡Bienvenido a pocket!')}
      </h2>
      <p className="mb-6 max-w-md mx-auto text-[#080808]/80 text-sm sm:text-base leading-relaxed">
        {t('welcome.bannerMessage', 'Aún no tienes información cargada. Sube tu primer extracto bancario para empezar a visualizar tus finanzas de forma clara y sencilla.')}
      </p>
      <button
        onClick={() => navigate('/profile')}
        className="inline-flex items-center gap-2 rounded-full bg-[#1b76ff] px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-[#1b76ff]/90 active:scale-[0.98]"
      >
        {t('welcome.uploadButton', 'Subir archivo')}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
