// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { locales, formats } from "@/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  // In Next.js 15+ params can be a Promise, so type it as Promise
  params: Promise<{ locale: string }>;
}) {
  // 1) Await params (this fixes the Next.js error)
  const { locale: incomingLocale } = await params;

  // 2) Validate locale and fallback to the first defined locale
  const fallbackLocale = locales[0];
  const locale =
    typeof incomingLocale === "string" &&
    (locales as readonly string[]).includes(incomingLocale)
      ? (incomingLocale as (typeof locales)[number])
      : fallbackLocale;

  // 3) Tell next-intl the request locale BEFORE loading messages/formatters
  setRequestLocale(locale);

  // 4) Load messages (next-intl will use the request locale)
  const messages = await getMessages({ locale });
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider
          messages={messages}
          locale={locale}
          formats={formats}
        >
          <div className="absolute top left">
            <LocaleSwitcher />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
