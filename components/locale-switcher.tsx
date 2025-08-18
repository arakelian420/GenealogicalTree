// components/locale-switcher.tsx
"use client";
import Link from "next-intl/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "ru" : "en";
  return (
    <Link href={pathname} locale={other} className="underline">
      {other.toUpperCase()}
    </Link>
  );
}
