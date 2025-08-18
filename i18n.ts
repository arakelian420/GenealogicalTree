// i18n.ts
import { getRequestConfig } from "next-intl/server";
import { type Formats } from "next-intl";
export const locales = ["en", "ru", "hy"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
function normalizeLocale(input: unknown): Locale {
  const v = String(input || "").toLowerCase();
  return (locales as readonly string[]).includes(v)
    ? (v as Locale)
    : defaultLocale;
}
export const formats: Formats = {
  dateTime: {
    short: {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
    medium: {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  },
};

export default getRequestConfig(async ({ locale }) => {
  const current = normalizeLocale(locale);
  return {
    locale: current,
    messages: (await import(`./messages/${current}.json`)).default,
    formats,
  };
});
