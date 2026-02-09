import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RouteTransition from "@/components/RouteTransition";
import AppProviders from "@/components/AppProviders";
import LanguageToggleGlobal from "@/components/LanguageToggleGlobal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gopherchat",
  description: "Gopherchat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>
          <RouteTransition>
            <LanguageToggleGlobal />
            {children}
          </RouteTransition>
        </AppProviders>
      </body>
    </html>
  );
}
