# Website Translation to Russian — Simple Implementation Plan (Next.js App Router + `next-intl`)

> **Context**: Next.js App Router project, TypeScript, components incl. shadcn/ui; no DB schema changes allowed; developer is an AI agent → plan must be deterministic, linear, and easy to automate.

**Targets to translate (from your list)**

- **Pages**: `app/page.tsx`, `app/admin/page.tsx`, `app/register/page.tsx`, `app/signin/page.tsx`, `app/tree/[id]/page.tsx`
- **Components**: `components/confirmation-dialog.tsx`, `components/draggable-person-node.tsx`, `components/person-card.tsx`, `components/person-details-modal.tsx`, `components/person-form.tsx`, `components/relationship-manager.tsx`, `components/relationship-modal.tsx`, `components/tree-settings.tsx`, `components/tree-view.tsx`, and **all** under `components/ui/`

**Constraints**

- No DB changes. User content (names, notes) stays as-is.
- Keep URLs stable; use locale prefix in routing (`/en`, `/ru`).
- Minimal moving parts; favor built-in `next-intl` patterns.

---

## TL;DR Checklist (run top-to-bottom)

1. Install & scaffold `next-intl`.
2. Add `i18n.ts` + `middleware.ts` (locale routing).
3. Move pages into `app/[locale]/...` and set up `NextIntlClientProvider`.
4. Create `messages/en.json` & `messages/ru.json` (start skeleton provided below).
5. Implement `LocaleSwitcher` and replace `<Link>` with `next-intl/link`.
6. Replace hardcoded strings with `t(...)` (Client) and `getTranslations(...)` (Server).
7. Translate a11y (`alt`, `aria-*`, `title`) + dialogs/toasts.
8. Add date/number formatting via `useFormatter`.
9. Map enums/statuses to i18n keys (no DB change).
10. Add simple CI check for missing/extra keys.
11. Add SEO alternates (`hreflang`) and Cyrillic font subset.
12. Manual test pass in `/en` and `/ru`.

---

## 1) Install & Project Scaffold

```bash
npm install next-intl
```

Create structure:

```
/messages
  en.json
  ru.json
/i18n.ts
/middleware.ts
```

---

## 2) `i18n.ts` — locales & messages

```ts
// i18n.ts
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

---

## 3) `middleware.ts` — locale routing

```ts
// middleware.ts
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // URLs: /en, /ru
  localeDetection: true, // Accept-Language → cookie
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

---

## 4) Move pages under `[locale]` and set provider

**Move files (keep exact same page code):**

- `app/page.tsx` → `app/[locale]/page.tsx`
- `app/admin/page.tsx` → `app/[locale]/admin/page.tsx`
- `app/register/page.tsx` → `app/[locale]/register/page.tsx`
- `app/signin/page.tsx` → `app/[locale]/signin/page.tsx`
- `app/tree/[id]/page.tsx` → `app/[locale]/tree/[id]/page.tsx`

**Create** `app/[locale]/layout.tsx`:

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
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

---

## 5) Messages files — start skeleton

`/messages/en.json`

```json
{
  "nav": {
    "home": "Home",
    "admin": "Admin",
    "signin": "Sign in",
    "register": "Register"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "close": "Close"
  },
  "auth": {
    "title": "Sign in to your account",
    "registerTitle": "Create an account",
    "email": "Email",
    "password": "Password",
    "repeatPassword": "Repeat password",
    "signin": "Sign in",
    "signup": "Sign up",
    "errors": {
      "required": "This field is required",
      "mismatch": "Passwords do not match",
      "invalidEmail": "Invalid email"
    }
  },
  "personForm": {
    "title": "Person",
    "firstName": "First name",
    "lastName": "Last name",
    "birthDate": "Birth date",
    "notes": "Notes",
    "submit": "Save person"
  },
  "relationship": {
    "managerTitle": "Relationships",
    "add": "Add relationship",
    "type": {
      "parent": "Parent",
      "child": "Child",
      "spouse": "Spouse",
      "sibling": "Sibling"
    }
  },
  "tree": {
    "title": "Family tree",
    "settings": "Tree settings",
    "empty": "No persons yet. Add the first one.",
    "lastUpdated": "Last updated: {date}"
  },
  "dialogs": {
    "confirmDeleteTitle": "Delete item?",
    "confirmDeleteDesc": "This action cannot be undone."
  },
  "a11y": {
    "dragNode": "Drag person node",
    "dropHere": "Drop here",
    "openDetails": "Open details"
  },
  "validation": {
    "generic": "Invalid value",
    "string": {
      "tooSmall": "Must be at least {min} characters"
    }
  },
  "admin": {
    "title": "Admin panel"
  }
}
```

`/messages/ru.json`

```json
{
  "nav": {
    "home": "Главная",
    "admin": "Админ",
    "signin": "Вход",
    "register": "Регистрация"
  },
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Изменить",
    "confirm": "Подтвердить",
    "close": "Закрыть"
  },
  "auth": {
    "title": "Войдите в аккаунт",
    "registerTitle": "Создайте аккаунт",
    "email": "Email",
    "password": "Пароль",
    "repeatPassword": "Повторите пароль",
    "signin": "Войти",
    "signup": "Зарегистрироваться",
    "errors": {
      "required": "Это обязательное поле",
      "mismatch": "Пароли не совпадают",
      "invalidEmail": "Некорректный email"
    }
  },
  "personForm": {
    "title": "Персона",
    "firstName": "Имя",
    "lastName": "Фамилия",
    "birthDate": "Дата рождения",
    "notes": "Заметки",
    "submit": "Сохранить персону"
  },
  "relationship": {
    "managerTitle": "Связи",
    "add": "Добавить связь",
    "type": {
      "parent": "Родитель",
      "child": "Ребёнок",
      "spouse": "Супруг/супруга",
      "sibling": "Брат/сестра"
    }
  },
  "tree": {
    "title": "Семейное древо",
    "settings": "Настройки древа",
    "empty": "Пока нет персон. Добавьте первую.",
    "lastUpdated": "Обновлено: {date}"
  },
  "dialogs": {
    "confirmDeleteTitle": "Удалить элемент?",
    "confirmDeleteDesc": "Действие необратимо."
  },
  "a11y": {
    "dragNode": "Перетащите узел персоны",
    "dropHere": "Перетащите сюда",
    "openDetails": "Открыть детали"
  },
  "validation": {
    "generic": "Некорректное значение",
    "string": {
      "tooSmall": "Минимум {min} символов"
    }
  },
  "admin": {
    "title": "Админ-панель"
  }
}
```

**Key conventions** (stable, not based on English text): `nav.home`, `personForm.firstName`, `relationship.type.parent`, etc. Use ICU for variables (`{date}`, `{min}`).

---

## 6) Locale Switcher (URL-based)

```tsx
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
```

**Replace all `<Link>` imports** with `next-intl/link` so locale stays in URL.

---

## 7) Replace hardcoded strings

### Client Components

```tsx
import { useTranslations } from "next-intl";

export default function PersonFormHeader() {
  const t = useTranslations("personForm");
  return <h2>{t("title")}</h2>;
}
```

### Server Components / Pages

```tsx
import { getTranslations } from "next-intl/server";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  return <h1>{t("title")}</h1>;
}
```

### Search & replace routine (automation-friendly)

1. Grep JSX text nodes and common props: `placeholder`, `aria-label`, `title`.
2. For each literal → create key in `en.json` → add `ru.json` value → replace with `t('key')`.

Heuristics the agent can use:

- Treat any non-empty string in JSX children as a candidate.
- Ignore attributes like `className`, `id`, `data-*`, `href`.

---

## 8) Format dates & numbers

```tsx
import { useFormatter } from "next-intl";

export function LastUpdated({ date }: { date: Date }) {
  const f = useFormatter();
  return (
    <span>{f.dateTime(date, { dateStyle: "medium", timeStyle: "short" })}</span>
  );
}
```

Where text like `tree.lastUpdated` is used, interpolate formatted value:

```tsx
const t = useTranslations("tree");
<span>
  {t("lastUpdated", { date: f.dateTime(date, { dateStyle: "medium" }) })}
</span>;
```

---

## 9) Enums / statuses → keys (no DB change)

```ts
// example: relationship type label mapping
export type RelationType = "parent" | "child" | "spouse" | "sibling";
const relKey: Record<RelationType, string> = {
  parent: "relationship.type.parent",
  child: "relationship.type.child",
  spouse: "relationship.type.spouse",
  sibling: "relationship.type.sibling",
};
// usage
// t(relKey[type])
```

---

## 10) A11y & UI library strings

- Translate all `alt`, `aria-label`, `title`, tooltip texts, dialog headers/descriptions.
- For shadcn/ui-based components in `components/ui/*`, pass text via props sourced from `t(...)`.

Example for a dialog:

```tsx
import {useTranslations} from 'next-intl';

export function ConfirmationDialog({...}) {
  const t = useTranslations('dialogs');
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
        <DialogDescription>{t('confirmDeleteDesc')}</DialogDescription>
      </DialogHeader>
      {/* ... */}
    </Dialog>
  );
}
```

---

## 11) SEO: `hreflang`, html `lang`

- `html lang` is already set in layout from `params.locale`.
- Add alternates per locale:

```ts
// app/[locale]/page.tsx or layout
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return {
    alternates: {
      languages: {
        en: "/en",
        ru: "/ru",
      },
    },
  };
}
```

- Include both `/en` and `/ru` in your sitemap.

---

## 12) Simple CI key consistency check

Add a tiny Node script `scripts/i18n-check.mjs`:

```js
import fs from "node:fs";

function flat(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flat(v, key));
    } else {
      acc[key] = true;
    }
    return acc;
  }, {});
}

const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
const ru = JSON.parse(fs.readFileSync("messages/ru.json", "utf8"));
const enKeys = Object.keys(flat(en));
const ruKeys = Object.keys(flat(ru));

const missingInRu = enKeys.filter((k) => !ruKeys.includes(k));
const extraInRu = ruKeys.filter((k) => !enKeys.includes(k));

if (missingInRu.length || extraInRu.length) {
  console.log("Missing in ru:", missingInRu);
  console.log("Extra in ru:", extraInRu);
  process.exit(1);
} else {
  console.log("i18n keys OK");
}
```

Add script to `package.json`:

```json
{
  "scripts": {
    "i18n:check": "node scripts/i18n-check.mjs"
  }
}
```

Run in CI and locally.

---

## 13) Testing pass (manual)

1. Open `/en` and `/ru` for each page:

   - `/(home)`, `/admin`, `/register`, `/signin`, `/tree/:id`.

2. Verify: labels, placeholders, buttons, dialogs, toasts, empty states, a11y texts.
3. Check layout overflows with longer RU strings.
4. Verify locale switcher preserves the current route and state where applicable.

Optional: add a **pseudo-locale** (e.g., duplicate `en.json` and stretch strings) to catch overflow.

---

## 14) Performance notes (kept simple)

- Messages are lazy-loaded per locale via dynamic import in `i18n.ts` → minimal bundle impact.
- Avoid importing message JSON inside Client Components directly; rely on provider context.

---

## 15) File-by-file starter diff (examples)

**`components/person-form.tsx`**

```tsx
import { useTranslations } from "next-intl";

export function PersonForm() {
  const t = useTranslations("personForm");
  return (
    <form>
      <h2>{t("title")}</h2>
      <label>
        {t("firstName")}
        <input name="firstName" placeholder={t("firstName")} />
      </label>
      <label>
        {t("lastName")}
        <input name="lastName" placeholder={t("lastName")} />
      </label>
      <button type="submit">{t("submit")}</button>
    </form>
  );
}
```

**`components/relationship-manager.tsx`** (enum mapping)

```tsx
import { useTranslations } from "next-intl";

const relKey = {
  parent: "relationship.type.parent",
  child: "relationship.type.child",
  spouse: "relationship.type.spouse",
  sibling: "relationship.type.sibling",
} as const;

export function RelationshipLabel({ type }: { type: keyof typeof relKey }) {
  const t = useTranslations();
  return <span>{t(relKey[type])}</span>;
}
```

**`components/draggable-person-node.tsx`** (a11y)

```tsx
import { useTranslations } from "next-intl";

export function DraggablePersonNode() {
  const t = useTranslations("a11y");
  return (
    <div role="button" aria-label={t("dragNode")} draggable>
      {/* ... */}
    </div>
  );
}
```

**`app/[locale]/tree/[id]/page.tsx`** (server + formatter)

```tsx
import { getTranslations } from "next-intl/server";
import { getFormatter } from "next-intl/server";

export default async function TreePage() {
  const t = await getTranslations("tree");
  const f = await getFormatter();
  const updated = new Date();
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>
        {t("lastUpdated", {
          date: f.dateTime(updated, { dateStyle: "medium" }),
        })}
      </p>
    </div>
  );
}
```

---

## 16) Done criteria

- All user-facing strings sourced from `t(...)` (`getTranslations` on server) including a11y and placeholders.
- `/en` and `/ru` routes render identically aside from language.
- `i18n:check` passes (no missing/extra keys).
- Locale switcher toggles language preserving path.
- Dates/numbers localized.
- No DB changes; enums mapped to i18n keys.

---

## 17) Future (optional, not required now)

- Introduce `t.rich` for safe rich text in messages where needed.
- Add runtime logging for missing keys (dev only) and Sentry warnings (prod).
- Split messages by feature (`messages/ru/auth.json`, etc.) and compose in build step if size grows.
