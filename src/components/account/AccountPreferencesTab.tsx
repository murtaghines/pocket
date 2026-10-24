import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format as formatDateFns } from "date-fns";
import { enUS, es as esLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useUserPreferences, type DefaultPeriod } from "@/hooks/useUserPreferences";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { detectLocalePattern } from "@/hooks/useLocalization";
import type { SupportedLanguage } from "@/i18n/config";
import { SUPPORTED_CURRENCIES, getLocaleForRegion } from "@/lib/currencies";
import { COUNTRIES } from "@/lib/onboardingConstants";
import {
  sanitizeDisplayFormat,
  compactDisplayFormat,
  formatMoneyWithFormat,
  buildFullDatePattern,
  buildDateTimePattern,
  resolveTimeFormat,
  type DisplayFormat,
  type DateOrder,
} from "@/lib/displayFormat";
import { toast } from "sonner";
import { Languages, DollarSign, Calendar, Sun, Moon, Monitor, Users, Loader2, Plus, X, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small chip-list input: add/remove free-text names. */
function NameChipsInput({ names, onChange, placeholder }: { names: string[]; onChange: (names: string[]) => void; placeholder: string }) {
  const [value, setValue] = useState("");

  const add = () => {
    const trimmed = value.trim();
    if (trimmed && !names.includes(trimmed)) {
      onChange([...names, trimmed]);
      setValue("");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          className="h-10 flex-1 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!value.trim()}
          aria-label={placeholder}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">
              {name}
              <button type="button" onClick={() => onChange(names.filter((n) => n !== name))} aria-label={`Remove ${name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


function Card({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-section md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface Option { value: string; label: string; disabled?: boolean }

function SelectControl({ value, onChange, options, label, width = "w-[190px]" }: { value: string; onChange: (v: string) => void; options: Option[]; label: string; width?: string }) {
  return (
    <div className={cn("pk-select-wrap", width)}>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (Option & { icon?: React.ElementType })[] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
            value === v ? "bg-card font-semibold text-foreground shadow-sm" : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold tabular-nums text-foreground">{children}</span>
    </div>
  );
}

interface Draft {
  language: string;
  country: string;
  dateOrder: string;
  currency: string;
  showDecimals: boolean;
  defaultPeriod: DefaultPeriod;
  jointNames: string[];
  aliases: string[];
  format: DisplayFormat;
}

const AUTO = "auto";

interface AccountPreferencesTabProps {
  /** Extra cards rendered at the end of the right-hand column (data export, danger zone). */
  rightExtra?: ReactNode;
}

export function AccountPreferencesTab({ rightExtra }: AccountPreferencesTabProps) {
  const { t } = useTranslation("account");
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const { theme, setTheme } = useTheme();

  const saved = useMemo<Draft>(() => ({
    language: currentLanguage,
    country: preferences.country ?? "",
    dateOrder: preferences.date_format ?? AUTO,
    currency: preferences.base_currency,
    showDecimals: preferences.show_decimals !== false,
    defaultPeriod: preferences.default_period ?? "month",
    jointNames: preferences.joint_account_names ?? [],
    aliases: preferences.own_name_aliases ?? [],
    format: sanitizeDisplayFormat(preferences.display_format),
  }), [currentLanguage, preferences]);

  const savedKey = JSON.stringify(saved);
  const [draft, setDraft] = useState<Draft>(saved);
  useEffect(() => setDraft(saved), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalized = (d: Draft) => JSON.stringify({ ...d, format: compactDisplayFormat(d.format) });
  const dirty = normalized(draft) !== normalized(saved);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setFormat = <K extends keyof DisplayFormat>(key: K, value: DisplayFormat[K] | undefined) =>
    setDraft((d) => {
      const next: DisplayFormat = { ...d.format, [key]: value };
      if (key === "decimal" && value !== undefined && next.group === value) delete next.group;
      return { ...d, format: compactDisplayFormat(next) };
    });

  const handleSave = () => {
    const updates: Record<string, unknown> = {};
    if (draft.currency !== saved.currency) updates.base_currency = draft.currency;
    if (draft.language !== saved.language) { changeLanguage(draft.language as SupportedLanguage); updates.language = draft.language; }
    if (draft.dateOrder !== saved.dateOrder) updates.date_format = draft.dateOrder === AUTO ? null : draft.dateOrder;
    if (draft.country !== saved.country) updates.country = draft.country || null;
    if (draft.showDecimals !== saved.showDecimals) updates.show_decimals = draft.showDecimals;
    if (draft.defaultPeriod !== saved.defaultPeriod) updates.default_period = draft.defaultPeriod;
    if (JSON.stringify(draft.jointNames) !== JSON.stringify(saved.jointNames)) updates.joint_account_names = draft.jointNames;
    if (JSON.stringify(draft.aliases) !== JSON.stringify(saved.aliases)) updates.own_name_aliases = draft.aliases;
    if (JSON.stringify(compactDisplayFormat(draft.format)) !== JSON.stringify(compactDisplayFormat(saved.format))) {
      updates.display_format = compactDisplayFormat(draft.format);
    }
    updatePreferences(updates as never, {
      onSuccess: () => toast.success(t("preferences.saved", "Preferences saved")),
      onError: () => toast.error(t("preferences.error", "Error saving preferences")),
    });
  };

  /* ---------- live previews ---------- */
  const locale = getLocaleForRegion(draft.country || undefined);
  const digits = draft.showDecimals ? 2 : 0;
  const moneyOpts = { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: "always" as unknown as boolean };
  const money = (n: number) => {
    try { return formatMoneyWithFormat(n, locale, draft.currency, moneyOpts, draft.format); } catch { return String(n); }
  };
  const order: DateOrder = draft.dateOrder === "DMY" || draft.dateOrder === "MDY" || draft.dateOrder === "YMD" ? draft.dateOrder : detectLocalePattern(locale);
  const sample = new Date(2026, 1, 28, 18, 30);
  const fnsLocale = draft.language === "es" ? esLocale : enUS;
  const datePreview = formatDateFns(sample, buildFullDatePattern(order, draft.format), { locale: fnsLocale });
  const dateTimePreview = formatDateFns(sample, buildDateTimePattern(order, locale, draft.format), { locale: fnsLocale });

  const auto = t("settings.auto", "Automatic");
  const opt = (value: string, label: string, disabled = false): Option => ({ value, label, disabled });
  const f = draft.format;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-6">
        <Card icon={Languages} title={t("settings.cards.region", "Language & region")}>
          <Row label={t("preferences.language", "Language")}>
            <SelectControl
              label={t("preferences.language", "Language")}
              value={draft.language}
              onChange={(v) => set("language", v)}
              options={supportedLanguages.map((l) => opt(l.code, l.nativeName))}
            />
          </Row>
          <Row label={t("preferences.country", "Country")} hint={t("settings.countryHint", "Sets the default number and date styles")}>
            <SelectControl
              label={t("preferences.country", "Country")}
              value={draft.country}
              onChange={(v) => set("country", v)}
              options={[opt("", t("preferences.countryPlaceholder", "Select your country")), ...COUNTRIES.map((c) => opt(c.code, c.name))]}
            />
          </Row>
        </Card>

        <Card icon={Calendar} title={t("settings.cards.dates", "Dates & time")}>
          <Row label={t("settings.dateOrder", "Date order")}>
            <SelectControl
              label={t("settings.dateOrder", "Date order")}
              value={draft.dateOrder}
              onChange={(v) => set("dateOrder", v)}
              options={[
                opt(AUTO, auto),
                opt("DMY", t("settings.order.DMY", "Day / Month / Year")),
                opt("MDY", t("settings.order.MDY", "Month / Day / Year")),
                opt("YMD", t("settings.order.YMD", "Year / Month / Day")),
              ]}
            />
          </Row>
          <Row label={t("settings.dateStyle", "Month")}>
            <SelectControl
              label={t("settings.dateStyle", "Month")}
              value={f.dateStyle ?? AUTO}
              onChange={(v) => setFormat("dateStyle", v === AUTO ? undefined : (v as DisplayFormat["dateStyle"]))}
              options={[opt(AUTO, t("settings.style.numeric", "Number (02)")), opt("short", t("settings.style.short", "Short name (Feb)"))]}
            />
          </Row>
          <Row label={t("settings.dateSeparator", "Separator")}>
            <SelectControl
              label={t("settings.dateSeparator", "Separator")}
              value={f.dateSeparator ?? AUTO}
              onChange={(v) => setFormat("dateSeparator", v === AUTO ? undefined : (v as DisplayFormat["dateSeparator"]))}
              options={[
                opt(AUTO, auto),
                opt("/", t("settings.sep.slash", "Slash ( / )"), f.dateStyle === "short"),
                opt("-", t("settings.sep.dash", "Dash ( - )"), f.dateStyle === "short"),
                opt(".", t("settings.sep.dot", "Dot ( . )"), f.dateStyle === "short"),
              ]}
            />
          </Row>
          <Row label={t("settings.timeFormat", "Time")}>
            <SelectControl
              label={t("settings.timeFormat", "Time")}
              value={f.timeFormat ?? AUTO}
              onChange={(v) => setFormat("timeFormat", v === AUTO ? undefined : (v as DisplayFormat["timeFormat"]))}
              options={[opt(AUTO, `${auto} (${resolveTimeFormat(locale, {})})`), opt("24h", t("settings.time.24h", "24-hour (18:30)")), opt("12h", t("settings.time.12h", "12-hour (6:30 PM)"))]}
            />
          </Row>
          <div className="pt-3">
            <Preview label={t("settings.preview", "Preview")}>
              <span className="block">{datePreview}</span>
              <span className="block text-xs font-normal text-muted-foreground">{dateTimePreview}</span>
            </Preview>
          </div>
        </Card>

        <Card icon={LayoutDashboard} title={t("settings.cards.display", "Display")}>
          <Row label={t("preferences.theme", "Theme")}>
            <Segmented
              value={theme}
              onChange={(v) => setTheme(v as "light" | "dark" | "system")}
              options={[
                { value: "light", label: t("preferences.themeLight", "Light"), icon: Sun },
                { value: "dark", label: t("preferences.themeDark", "Dark"), icon: Moon },
                { value: "system", label: t("preferences.themeSystem", "System"), icon: Monitor },
              ]}
            />
          </Row>
          <Row label={t("settings.startScreen", "Start screen")} hint={t("settings.startScreenHint", "The dashboard view that opens when you start Pocket or log in")}>
            <Segmented
              value={draft.defaultPeriod}
              onChange={(v) => set("defaultPeriod", v as DefaultPeriod)}
              options={[
                { value: "month", label: t("settings.period.month", "Month") },
                { value: "week", label: t("settings.period.week", "Week") },
                { value: "year", label: t("settings.period.year", "Year") },
              ]}
            />
          </Row>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        <Card icon={DollarSign} title={t("settings.cards.numbers", "Numbers & currency")}>
          <Row label={t("preferences.currency", "Base currency")}>
            <SelectControl
              label={t("preferences.currency", "Base currency")}
              value={draft.currency}
              onChange={(v) => set("currency", v)}
              options={SUPPORTED_CURRENCIES.map((c) => opt(c.code, `${c.symbol} ${c.code} – ${c.name}`))}
            />
          </Row>
          <Row label={t("settings.currencyDisplay", "Show currency as")}>
            <SelectControl
              label={t("settings.currencyDisplay", "Show currency as")}
              value={f.currencyDisplay ?? AUTO}
              onChange={(v) => setFormat("currencyDisplay", v === AUTO ? undefined : (v as DisplayFormat["currencyDisplay"]))}
              options={[opt(AUTO, auto), opt("symbol", t("settings.display.symbol", "Symbol ($)")), opt("code", t("settings.display.code", "Code (USD)"))]}
            />
          </Row>
          <Row label={t("settings.currencyPosition", "Currency position")}>
            <SelectControl
              label={t("settings.currencyPosition", "Currency position")}
              value={f.currencyPosition ?? AUTO}
              onChange={(v) => setFormat("currencyPosition", v === AUTO ? undefined : (v as DisplayFormat["currencyPosition"]))}
              options={[opt(AUTO, auto), opt("before", t("settings.position.before", "Before ($10)")), opt("after", t("settings.position.after", "After (10$)"))]}
            />
          </Row>
          <Row label={t("settings.currencySpace", "Space after the currency")}>
            <SelectControl
              label={t("settings.currencySpace", "Space after the currency")}
              value={f.currencySpace === undefined ? AUTO : f.currencySpace ? "yes" : "no"}
              onChange={(v) => setFormat("currencySpace", v === AUTO ? undefined : v === "yes")}
              options={[opt(AUTO, auto), opt("yes", t("settings.space.yes", "With space ($ 10)")), opt("no", t("settings.space.no", "No space ($10)"))]}
            />
          </Row>
          <Row label={t("settings.decimalSeparator", "Decimal mark")}>
            <SelectControl
              label={t("settings.decimalSeparator", "Decimal mark")}
              value={f.decimal ?? AUTO}
              onChange={(v) => setFormat("decimal", v === AUTO ? undefined : (v as DisplayFormat["decimal"]))}
              options={[opt(AUTO, auto), opt(",", t("settings.sep.comma", "Comma ( , )")), opt(".", t("settings.sep.period", "Period ( . )"))]}
            />
          </Row>
          <Row label={t("settings.groupSeparator", "Thousands separator")}>
            <SelectControl
              label={t("settings.groupSeparator", "Thousands separator")}
              value={f.group === undefined ? AUTO : f.group === "" ? "none" : f.group}
              onChange={(v) => setFormat("group", v === AUTO ? undefined : v === "none" ? "" : (v as DisplayFormat["group"]))}
              options={[
                opt(AUTO, auto),
                opt(".", t("settings.sep.period", "Period ( . )"), f.decimal === "."),
                opt(",", t("settings.sep.comma", "Comma ( , )"), f.decimal === ","),
                opt(" ", t("settings.sep.space", "Space")),
                opt("'", t("settings.sep.apostrophe", "Apostrophe ( ' )")),
                opt("none", t("settings.sep.none", "None")),
              ]}
            />
          </Row>
          <Row label={t("preferences.showDecimals", "Show decimals")} hint={t("settings.showDecimalsHint", "Show cents instead of whole numbers")}>
            <Switch checked={draft.showDecimals} onCheckedChange={(v) => set("showDecimals", v)} aria-label={t("preferences.showDecimals", "Show decimals")} />
          </Row>
          <div className="pt-3">
            <Preview label={t("settings.preview", "Preview")}>
              <span className="block">{money(1234567.89)}</span>
              <span className="block text-xs font-normal text-muted-foreground">{money(-45.9)}</span>
            </Preview>
          </div>
        </Card>

        <Card icon={Users} title={t("settings.cards.shared", "Shared finances")}>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t("settings.coHolders", "People you share accounts with")}</p>
              <NameChipsInput names={draft.jointNames} onChange={(n) => set("jointNames", n)} placeholder={t("settings.namePlaceholder", "Full name, as on your bank statements")} />
            </div>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-foreground">{t("settings.aliases", "Other names you appear under")}</p>
              <NameChipsInput names={draft.aliases} onChange={(n) => set("aliases", n)} placeholder={t("settings.namePlaceholder", "Full name, as on your bank statements")} />
            </div>
          </div>
        </Card>

        {rightExtra}
      </div>

      {/* Unsaved-changes bar */}
      {dirty && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-popup lg:col-span-2">
          <span className="text-sm font-medium text-foreground">{t("settings.unsaved", "You have unsaved changes")}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDraft(saved)} disabled={isUpdating}>{t("settings.discard", "Discard")}</Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUpdating ? t("preferences.saving", "Saving...") : t("preferences.save", "Save changes")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
