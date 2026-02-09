"use client";

import { useI18n } from "@/components/LanguageProvider";

type LanguageToggleProps = {
  className?: string;
  floating?: boolean;
};

export default function LanguageToggle({ className = "", floating = true }: LanguageToggleProps) {
  const { lang, setLang, t } = useI18n();
  const button = (
    <button
      type="button"
      className={`rounded-full border border-white/20 bg-slate-950/60 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur hover:border-white/40 hover:text-white ${className}`}
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      aria-label="Toggle language"
    >
      {t("lang.toggle")}
    </button>
  );

  if (!floating) {
    return button;
  }

  return <div className="fixed right-4 top-20 z-50 sm:top-20">{button}</div>;
}
