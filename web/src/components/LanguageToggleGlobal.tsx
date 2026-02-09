"use client";

import { usePathname } from "next/navigation";
import LanguageToggle from "@/components/LanguageToggle";

export default function LanguageToggleGlobal() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/chat")) {
    return null;
  }
  return <LanguageToggle />;
}
