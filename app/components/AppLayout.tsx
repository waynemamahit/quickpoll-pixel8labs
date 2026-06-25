import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeSelector } from "./ThemeSelector";

export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 btn btn-sm btn-primary"
      >
        {t("skipToContent")}
      </a>
      <header className="navbar bg-base-200 px-2 sm:px-4 gap-2">
        <nav aria-label="Primary navigation" className="navbar-start min-w-0">
          <Link
            to="/"
            className="btn btn-ghost px-2 sm:px-4 text-lg sm:text-xl font-bold"
          >
            {t("appName")}
          </Link>
        </nav>
        <div className="navbar-end flex-nowrap gap-1 sm:gap-2 shrink-0">
          <ThemeSelector />
          <LanguageSelector />
        </div>
      </header>
      <main id="main-content" className="container mx-auto p-4 max-w-2xl">
        {children}
      </main>
      <footer
        role="contentinfo"
        className="footer footer-center p-4 text-base-content/60 text-sm"
      >
        <p>{t("tagline")}</p>
      </footer>
    </>
  );
}
