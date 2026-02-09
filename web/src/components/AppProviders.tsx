"use client";

import { LanguageProvider } from "@/components/LanguageProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
