import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import type { SupportedLanguage } from "@/i18n/config";
import { SUPPORTED_CURRENCIES, getLocaleForRegion } from "@/lib/currencies";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Languages, DollarSign, Calendar, Globe, Sun, Moon, Monitor, Users, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepJointAccount } from "@/components/onboarding/StepJointAccount";
import { Input } from "@/components/ui/input";

/** Small chip-list input: add/remove free-text names. Used for own-name aliases — no
 *  enable/disable toggle needed (an empty list is simply "no aliases set"). */
function NameChipsInput({
  names,
  onChange,
  placeholder,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const trimmed = value.trim();
    if (trimmed && !names.includes(trimmed)) {
      onChange([...names, trimmed]);
      setValue("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          className="flex-1 h-10 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!value.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-muted text-foreground"
            >
              {name}
              <button type="button" onClick={() => onChange(names.filter((n) => n !== name))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [jointAccountNames, setJointAccountNames] = useState<string[]>(preferences.joint_account_names ?? []);
  const [ownNameAliases, setOwnNameAliases] = useState<string[]>(preferences.own_name_aliases ?? []);
  const [showDecimals, setShowDecimals] = useState(preferences.show_decimals !== false);

  useEffect(() => { setCurrency(preferences.base_currency); }, [preferences.base_currency]);
  useEffect(() => { setLanguage(currentLanguage); }, [currentLanguage]);
  useEffect(() => { setDateFormat(preferences.date_format ?? "AUTO"); }, [preferences.date_format]);
  useEffect(() => { setCountry(preferences.country ?? ""); }, [preferences.country]);
  useEffect(() => { setJointAccountNames(preferences.joint_account_names ?? []); }, [preferences.joint_account_names]);
  useEffect(() => { setOwnNameAliases(preferences.own_name_aliases ?? []); }, [preferences.own_name_aliases]);
  useEffect(() => { setShowDecimals(preferences.show_decimals !== false); }, [preferences.show_decimals]);

  const numberPreview = (() => {
    const digits = showDecimals ? 2 : 0;
    try {
      return new Intl.NumberFormat(getLocaleForRegion(country || undefined), {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(1234567.89);
    } catch {
      return "";
    }
  })();

  const handleSave = () => {
    const languageChanged = language !== currentLanguage;
    if (languageChanged) changeLanguage(language);

    const updates: Record<string, unknown> = {};
    if (currency !== preferences.base_currency) updates.base_currency = currency;
    if (languageChanged) updates.language = language;
    if (dateFormat !== (preferences.date_format ?? "AUTO")) {
      updates.date_format = dateFormat === "AUTO" ? null : dateFormat;
    }
    if (country !== (preferences.country ?? "")) updates.country = country || null;
    if (showDecimals !== (preferences.show_decimals !== false)) updates.show_decimals = showDecimals;
    const currentNames = preferences.joint_account_names ?? [];
    if (
      jointAccountNames.length !== currentNames.length ||
      jointAccountNames.some((n, i) => n !== currentNames[i])
    ) {
      updates.joint_account_names = jointAccountNames;
    }
    const currentAliases = preferences.own_name_aliases ?? [];
    if (
      ownNameAliases.length !== currentAliases.length ||
      ownNameAliases.some((n, i) => n !== currentAliases[i])
    ) {
      updates.own_name_aliases = ownNameAliases;
    }

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
            <div className="pk-select-wrap">
              <select value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("preferences.country", "Country")}</Label>
            <div className="pk-select-wrap">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">{t("preferences.countryPlaceholder", "Select your country")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {t("preferences.dateFormat", "Date format")}
            </Label>
            <div className="pk-select-wrap">
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="AUTO">{t("preferences.dateFormatAuto", "Auto (based on country)")}</option>
                <option value="DMY">DD/MM/YYYY · 28/02/2026</option>
                <option value="MDY">MM/DD/YYYY · 02/28/2026</option>
                <option value="YMD">YYYY-MM-DD · 2026-02-28</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Currency & numbers */}
      <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          icon={DollarSign}
          title={t("preferences.money", "Currency & numbers")}
          description={t("preferences.moneyDescription", "Base currency and how amounts are displayed")}
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t("preferences.currency", "Base currency")}</Label>
            <div className="pk-select-wrap">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} – {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <div>
              <Label htmlFor="show-decimals" className="text-sm">{t("preferences.showDecimals", "Show decimals")}</Label>
              <p className="text-xs text-muted-foreground">{t("preferences.showDecimalsHelp", "Display amounts with cents, e.g. 1.234,56 instead of 1.235")}</p>
            </div>
            <Switch id="show-decimals" checked={showDecimals} onCheckedChange={setShowDecimals} />
          </div>

          <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("preferences.numberPreview", "Preview")}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{numberPreview}</span>
          </div>
        </div>
      </div>

      {/* Shared finances */}
      <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <SectionHeader
          icon={Users}
          title={t("preferences.sharedFinances", "Shared finances")}
          description={t("preferences.sharedFinancesDescription", "Joint accounts and how you appear on statements")}
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t("preferences.jointAccountNames", "Joint account co-holders")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("preferences.jointAccountNamesHelp")}
            </p>
            <StepJointAccount
              jointAccountNames={jointAccountNames}
              onJointAccountNamesChange={setJointAccountNames}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm">{t("preferences.ownNameAliases", "Also known as")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("preferences.ownNameAliasesHelp")}
            </p>
            <NameChipsInput
              names={ownNameAliases}
              onChange={setOwnNameAliases}
              placeholder={t("preferences.ownNameAliasesPlaceholder", "Full name...")}
            />
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
              { value: "system", label: t("preferences.themeSystem", "System"), icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value as "light" | "dark" | "system")}
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
