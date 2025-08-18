// navigation.ts
import {
  Link as NextIntlLink,
  redirect as NextIntlRedirect,
  usePathname as NextIntlUsePathname,
  useRouter as NextIntlUseRouter,
} from "next-intl/navigation";

export const Link = NextIntlLink;
export const redirect = NextIntlRedirect;
export const usePathname = NextIntlUsePathname;
export const useRouter = NextIntlUseRouter;
