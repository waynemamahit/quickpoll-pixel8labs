import i18next from "i18next";
import en from "./locales/en.json";
import id from "./locales/id.json";

let initialized = false;

export async function initServerI18n(): Promise<void> {
  if (initialized) {
    return;
  }

  await i18next.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
  });

  initialized = true;
}

export function t(
  key: string,
  locale = "en",
  params?: Record<string, string>,
): string {
  return i18next.t(key, { lng: locale, ...params });
}

export function resolveLocale(header: string | undefined): string {
  if (!header) {
    return "en";
  }
  const primary = header.split(",")[0]?.trim().split("-")[0];
  return primary === "id" ? "id" : "en";
}
