import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { toast } from "sonner";
import { Languages, DollarSign, Calendar, Globe, Sun, Moon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "EC", name: "Ecuador" },
  { code: "ES", name: "Spain" },
  { code: "GB", name: "United Kingdom" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "IE", name: "Ireland" },
  { code: "JP", name: "Japan" },
  { code: "MX", name: "Mexico" },
  { code: "NI", name: "Nicaragua" },
  { code: "NZ", name: "New Zealand" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Peru" },
  { code: "PR", name: "Puerto Rico" },
  { code: "PY", name: "Paraguay" },
  { code: "SV", name: "El Salvador" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
];

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {description && <p className="text-xs text-muted-foreground ml-6">{description}</p>}
    </div>
  );
}

export function AccountPreferencesTab() {
  const { t } = useTranslation("account");
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [currency, setCurrency] = useState(preferences.base_currency);
  const [language, setLanguage] = useState(currentLanguage);
  const [dateFormat, setDateFormat] = useState(preferences.date_format ?? "AUTO");
  const [country, setCountry] = useState(preferences.country ?? "");

  useEffect(() => { setCurrency(preferences.base_currency); }, [preferences.base_currency]);
  useEffect(() => { setLanguage(currentLanguage); }, [currentLanguage]);
  useEffect(() => { setDateFormat(preferences.date_format ?? "AUTO"); }, [preferences.date_format]);
  useEffect(() => { setCountry(preferences.country ?? ""); }, [preferences.country]);

  const handleSave = () => {
    const languageChanged = language !== currentLanguage;
    if (languageChanged) changeLanguage(language as "en" | "es");

    const updates: Record<string, unknown> = {};
    if (currency !== preferences.base_currency) updates.base_currency = currency;
    if (languageChanged) updates.language = language;
    if (dateFormat !== (preferences.date_format ?? "AUTO")) {
      updates.date_format = dateFormat === "AUTO" ? null : dateFormat;
    }
    if (country !== (preferences.country ?? "")) updates.country = country || null;

    if (Object.keys(updates).length === 0) {
      toast.success(t("preferences.saved", "Preferences saved"));
      return;
    }

    updatePreferences(updates as any, {
      onSuccess: () => toast.success(t("preferences.saved", "Preferences saved")),
      onError: () => toast.error(t("preferences.error", "Error saving preferences")),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Regional */}
      <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          icon={Globe}
          title={t("preferences.regional", "Regional")}
          description={t("preferences.regionalDescription", "Language and date formatting")}
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Languages className="h-3.5 w-3.5" />
              {t("preferences.language", "Language")}
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("preferences.country", "Country")}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder={t("preferences.countryPlaceholder", "Select your country")} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {t("preferences.dateFormat", "Date format")}
            </Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">{t("preferences.dateFormatAuto", "Auto (based on country)")}</SelectItem>
                <SelectItem value="DMY">DD/MM/YYYY · 28/02/2026</SelectItem>
                <SelectItem value="MDY">MM/DD/YYYY · 02/28/2026</SelectItem>
                <SelectItem value="YMD">YYYY-MM-DD · 2026-02-28</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Money */}
      <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          icon={DollarSign}
          title={t("preferences.money", "Money")}
          description={t("preferences.moneyDescription", "Currency and joint account settings")}
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t("preferences.currency", "Base currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} – {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          icon={Sun}
          title={t("preferences.appearance", "Appearance")}
          description={t("preferences.appearanceDescription", "Theme and display options")}
        />
        <div className="space-y-2">
          <Label className="text-sm">{t("preferences.theme", "Theme")}</Label>
          <div className="flex gap-2">
            {[
              { value: "light", label: t("preferences.themeLight", "Light"), icon: Sun },
              { value: "dark", label: t("preferences.themeDark", "Dark"), icon: Moon },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value as "light" | "dark")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                  theme === value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isUpdating} className="w-full sm:w-auto">
        {isUpdating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("preferences.saving", "Saving...")}
          </>
        ) : (
          t("preferences.save", "Save changes")
        )}
      </Button>
    </div>
  );
}
