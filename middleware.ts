// middleware.ts
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // always /en or /ru in the URL
  localeDetection: true, // redirect from / to /<locale> based on Accept-Language
});
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"], // everything except api, static/files
};
