"use client";

import { usePathname } from "next/navigation";
import LanguageToggle from "@/components/LanguageToggle";

export default function LanguageToggleGlobal() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/vision") ||
    pathname.startsWith("/demo")
  ) {
    return null;
  }
  return <LanguageToggle />;
}
