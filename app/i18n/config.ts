import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import enErrors from "./locales/en/errors.json";
import enValidation from "./locales/en/validation.json";
import idCommon from "./locales/id/common.json";
import idErrors from "./locales/id/errors.json";
import idValidation from "./locales/id/validation.json";

declare global {
  interface Window {
    __I18N_LANG__?: string;
  }
}

const LANGUAGE_COOKIE = "qp_lang";

const bundledResources = {
  en: {
    common: enCommon,
    errors: enErrors,
    validation: enValidation,
  },
  id: {
    common: idCommon,
    errors: idErrors,
    validation: idValidation,
  },
};

function getInitialLanguage(): string {
  if (typeof window !== "undefined" && window.__I18N_LANG__) {
    return window.__I18N_LANG__;
  }
  if (typeof document !== "undefined") {
    return getStoredLanguage();
  }
  return "en";
}

function getInitialResources(): typeof bundledResources {
  return bundledResources;
}

export function getLanguageFromCookie(
  cookieHeader: string | null | undefined,
): string {
  if (!cookieHeader) {
    return "en";
  }
  const match = cookieHeader.match(/(?:^|;\s*)qp_lang=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "en";
}

export function getStoredLanguage(): string {
  if (typeof document !== "undefined") {
    const stored = localStorage.getItem(LANGUAGE_COOKIE);
    if (stored) {
      return stored;
    }
    return getLanguageFromCookie(document.cookie);
  }
  return "en";
}

export function persistLanguage(lang: string): void {
  localStorage.setItem(LANGUAGE_COOKIE, lang);
  // biome-ignore lint/suspicious/noDocumentCookie: cookie needed for SSR language detection
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(lang)};path=/;max-age=31536000;SameSite=Lax`;
}

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "en",
  resources: getInitialResources(),
  defaultNS: "common",
  ns: ["common", "errors", "validation"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function getI18nHandoffScript(): string {
  return `window.__I18N_LANG__=${JSON.stringify(i18n.language)};`;
}

export default i18n;
