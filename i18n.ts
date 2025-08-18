// i18n.ts
import { getRequestConfig } from "next-intl/server";
export const locales = ["en", "ru", "am"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
function normalizeLocale(input: unknown): Locale {
  const v = String(input || "").toLowerCase();
  return (locales as readonly string[]).includes(v)
    ? (v as Locale)
    : defaultLocale;
}
export default getRequestConfig(async ({ locale }) => {
  const current = normalizeLocale(locale);
  return {
    locale: current,
    messages: (await import(`./messages/${current}.json`)).default,
  };
});
