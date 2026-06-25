import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { persistLanguage } from "../i18n/config";

const LANGUAGES = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "id", label: "Indonesia", shortLabel: "ID" },
] as const;

export function LanguageSelector(): React.ReactElement {
  const { i18n, t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const lang = event.target.value;
    void i18n.changeLanguage(lang);
    persistLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <label className="inline-flex items-center gap-1.5 shrink-0">
      <Languages
        className="size-4 shrink-0 text-base-content/70"
        aria-hidden="true"
      />
      <span className="sr-only">{t("language")}</span>
      <select
        className="select select-bordered select-xs sm:select-sm w-auto min-w-0"
        value={i18n.language}
        onChange={handleChange}
        aria-label={t("language")}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.shortLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
