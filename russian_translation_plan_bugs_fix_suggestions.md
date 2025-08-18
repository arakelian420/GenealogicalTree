The error says: at the moment of loading messages, `locale` = `undefined`, so the import goes to `./messages/undefined.json`. This is almost always due to locale routing: either **middleware did not work**, or **you accessed a URL without a locale prefix** (`/` instead of `/en` or `/ru`), or **there is no safe fallback** in `i18n.ts`.
Below is a step-by-step, easy-to-execute fix.

---

# 1) Mini-fix (immediately removes the crash)

## `i18n.ts` — add a safe fallback and locale validation

```ts
// i18n.ts
import {getRequestConfig} from ‘next-intl/server’;
export const locales = [‘en’, ‘ru’] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = ‘en’;
function normalizeLocale(input: unknown): Locale {
  const v = String(input || ‘’).toLowerCase();
  return (locales as readonly string[]).includes(v) ? (v as Locale) : defaultLocale;
}
export default getRequestConfig(async ({locale}) => {
  const current = normalizeLocale(locale);
  return {
    locale: current,
    messages: (await import(`./messages/${current}.json`)).default
  };
});
```

> This ensures that even if `locale` is not provided, you will load `en.json` instead of crashing.

---

# 2) Let's make sure that locale routing actually works

## `middleware.ts` — correct location and matcher

The file should be located in the **project root** (at the same level as `app/`).

```ts
// middleware.ts
import createMiddleware from ‘next-intl/middleware’;
import {locales, defaultLocale} from ‘./i18n’;
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: ‘always’,   // always /en or /ru in the URL
  localeDetection: true     // redirect from / to /<locale> based on Accept-Language
});
export const config = {
  matcher: ['/((?!_next|.*\\. .*).*)'] // everything except static/files
};
```

## **Quick check:** open `/` in your browser — it should redirect to `/en` or `/ru`. If it doesn't redirect → `middleware.ts` is not applied (wrong path/name/build).

# 3) The `[locale]` segment and linking the locale to the request

## `app/[locale]/layout.tsx` — set the request locale

Add `unstable_setRequestLocale(locale)` (this links the locale to server components/caching).

```tsx
// app/[locale]/layout.tsx
import {NextIntlClientProvider} from ‘next-intl’;
import {getMessages, unstable_setRequestLocale} from ‘next-intl/server’;
import type {ReactNode} from ‘react’;
import {Inter} from ‘next/font/google’;
const inter = Inter({subsets: [‘latin’, ‘cyrillic’]});
export default async function RootLayout({
  children,
  params: {locale}
}: {
  children: ReactNode;
  params: {locale: string};
}) {
  unstable_setRequestLocale(locale); // <<< important line
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## (Optional, but useful) `generateStaticParams`

This removes warnings and makes pages predictable during compilation.

```ts
// app/[locale]/layout.tsx (or page.tsx)
import {locales} from ‘@/i18n’;
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}
```

---

# 4) Make sure there is a locale prefix in all links

- **Replace** `next/link` with `next-intl/link` (as in the plan).
- Check that there are **no** hard links to `“/”` (it should be `href=“/”` via `next-intl/link`, which will add the current locale itself).
- In `LocaleSwitcher`, we already do `Link href={pathname} locale={other}` — ok.

---

# 5) Do the messages really exist?

Check that the files exist at the following paths:

```
/messages/en.json
/messages/ru.json
```

## And that they contain correct JSON (without trailing commas).

# 6) Quick checklist after fixes

1. Open `/` → **redirect** to `/en` or `/ru`.
2. Open `/en` → the site loads **without error**.
3. Switch the language via `LocaleSwitcher` → the URL changes to `/ru` and everything is displayed in Russian.
4. Direct transition to any page **with locale** in the URL (for example, `/ru/admin`) — everything loads.
5. There are **no** errors about `undefined.json` in the console.

---

# 7) (Optional) Catch illegal locales nicely

If someone lands on `/de/...`, you can return a 404:

```ts
// app/[locale]/layout.tsx
import {locales} from ‘@/i18n’;
import {notFound} from ‘next/navigation’;
export default async function RootLayout({children, params:{locale}}:{children: React.ReactNode; params:{locale:string}}) {
  if (!locales.includes(locale as any)) notFound();
  // continue as in the example above
}

---
## Why did this happen?
`next-intl` expects that **either** you access a URL with a locale prefix (`/en`, `/ru`), **or** the middleware will set the locale and redirect. If the middleware is not applied (wrong `matcher`, wrong file location, running in an environment without middleware support), `locale` does not get into `getRequestConfig`, and `import(\`./messages/\${locale}.json\`)` tries to load `undefined.json\`.
With the fallback in `i18n.ts`, you will no longer crash, and the correct `middleware` + `[locale]` will make the behavior stable and predictable.
```
