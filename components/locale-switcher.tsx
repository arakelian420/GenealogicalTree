// components/locale-switcher.tsx
"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const locales = ["en", "ru", "am"];
  const otherLocales = locales.filter((l) => l !== locale);

  return (
    <div className="flex gap-2">
      {otherLocales.map((other) => (
        <Link key={other} href={pathname} locale={other} className="underline">
          {other.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
