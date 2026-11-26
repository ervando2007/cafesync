import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/translate";
import { getThemePreference } from "@/lib/theme/server";
import { THEME_INIT_SCRIPT } from "@/lib/theme/shared";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CafeSync",
  description: "Cafe system powered by next.js",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const theme = await getThemePreference();

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline theme script adds the `dark` class before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers locale={locale} dict={dict} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
