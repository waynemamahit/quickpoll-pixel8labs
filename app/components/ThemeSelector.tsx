import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const THEMES = ["light", "dark", "cupcake", "corporate", "dracula"] as const;
const STORAGE_KEY = "qp_theme";

export function ThemeSelector(): React.ReactElement {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "light";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value;
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <label className="inline-flex items-center gap-1.5 shrink-0">
      <Palette
        className="size-4 shrink-0 text-base-content/70"
        aria-hidden="true"
      />
      <span className="sr-only">{t("theme")}</span>
      <select
        className="select select-bordered select-xs sm:select-sm w-auto min-w-0 max-w-22 sm:max-w-28 capitalize"
        value={theme}
        onChange={handleChange}
        aria-label={t("theme")}
      >
        {THEMES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
