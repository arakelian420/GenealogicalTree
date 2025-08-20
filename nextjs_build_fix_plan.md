Автоматический план — исправить ошибку сборки Next.js (invalid "DELETE" export)

(файл .md, который можно скормить AI-агенту)

Назначение: найти и исправить route handlers в app/\*\*/route.ts, где второй параметр ({ params }) типизирован как обычный объект { params: { ... } } — а в Next.js 15 он приходит как Promise. Исправление: поменять тип на Promise<...>, сделать handler async (если ещё нет) и разрешить params через await внутри функции.
Результат: npm run build должен пройти без ошибки типа Type "{ params: { id: string; }; }" is not a valid type for the function's second argument.

Краткая инструкция (шаги для агента — строго выполнять по порядку)

Создать ветку и сделать бэкап:

git checkout -b fix/nextjs-route-params
git status

Запустить сборку, чтобы зафиксировать текущее поведение и лог ошибки:

npm run build 2>&1 | tee build-before.log

Исправить конкретный файл (быстрый фикс) — app/api/admin/trees/[id]/route.ts (см. готовый патч ниже).

Проверить и исправить все похожие route handlers автоматически (если нужно) — запустить предложенный Node скрипт scripts/fix-nextjs-route-params.mjs.

Пересобрать проект:

rm -rf .next
npm run build 2>&1 | tee build-after.log

Если сборка успешна — выполнить линт и тесты:

npm run lint || true
npm test || true

Закоммитить изменения и открыть PR с описанием.

Если что-то пошло не так — откатить ветку:

git checkout main
git reset --hard origin/main

1. Готовый ручной патч (для app/api/admin/trees/[id]/route.ts)

Если хочешь быстро исправить только этот файл — используй этот патч (просто замени содержимое функции).

Unified diff (пример):

**_ Begin Patch
_** Update File: app/api/admin/trees/[id]/route.ts
@@
-export async function DELETE(

- request: NextRequest,
- { params }: { params: { id: string } }
  -) {
- const session = await getServerSession(authOptions);
-
- if (session?.user?.role !== "admin") {
- return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
- }
-
- try {
- await prisma.tree.delete({
-      where: { id: params.id },
- });
-
- return new NextResponse(null, { status: 204 });
- } catch (error) {
- console.error(error);
- return NextResponse.json(
-      { error: "Internal Server Error" },
-      { status: 500 }
- );
- }
  -}
  +export async function DELETE(

* request: NextRequest,
* { params }: { params: Promise<{ id: string }> }
  +): Promise<NextResponse> {
* // Разрешаем params (в Next.js 15 params — Promise)
* const { id } = await params;
*
* const session = await getServerSession(authOptions);
*
* if (session?.user?.role !== "admin") {
* return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
* }
*
* try {
* // опциональная проверка: есть ли запись, чтобы возвращать 404, если нет
* const tree = await prisma.tree.findUnique({ where: { id } });
* if (!tree) return NextResponse.json({ error: "Not Found" }, { status: 404 });
*
* await prisma.tree.delete({ where: { id } });
*
* return new NextResponse(null, { status: 204 });
* } catch (error) {
* console.error(error);
* return NextResponse.json(
*      { error: "Internal Server Error" },
*      { status: 500 }
* );
* }
  +}
  \*\*\* End Patch

Пояснение:

В сигнатуре второй аргумент стал { params }: { params: Promise<{ id: string }> }.

Сразу в теле: const { id } = await params; — разрешаем промис.

Используется id (вместо params.id) — это устраняет проблему типов.

Добавлена опция: сначала findUnique и 404 — улучшает UX и обработку ошибок Prisma (P2025).

2. Автоматическое исправление — Node скрипт (рекомендуется для больших кодовых баз)

Скрипт пытается автоматически:

Найти route.ts в app/\*\*/route.ts

Найти экспортированные handlers GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD

Если второй параметр имеет тип { params: { ... } } — заменить на { params: Promise<...> }

Сделать функцию async (если не async)

Вставить const **resolvedParams = await params; и заменить params. → **resolvedParams. внутри тела функции (простая замена текста внутри функции)

ВАЖНО: скрипт не идеален — требует ревью после выполнения. Всегда проверяй diff и тесты.

Файловое имя: scripts/fix-nextjs-route-params.mjs
Установка зависимости: npm i -D ts-morph (или pnpm add -D ts-morph)

Содержимое скрипта:

#!/usr/bin/env node
/\*\*

- scripts/fix-nextjs-route-params.mjs
- WARNING: run in git branch, review changes before commit
  \*/

import { Project } from "ts-morph";
import path from "path";

(async () => {
const project = new Project({
tsConfigFilePath: "tsconfig.json",
skipAddingFilesFromTsConfig: true,
});

// Подбирать по вашему шаблону: app/**/route.ts
const files = project.addSourceFilesAtPaths("app/**/route.ts");

const METHODS = new Set(["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"]);

function extractInnerParamsType(typeText) {
// простой экстракт: { params: <inner> }
const m = typeText.match(/^\s*\{\s*params\s*:\s*([\s\S]+?)\s*\}\s*$/s);
    if (m) return m[1].trim();
    // fallback: найти "params: ..." внутри
    const m2 = typeText.match(/params\s*:\s*([\s\S]+)$/s);
if (m2) return m2[1].trim().replace(/\}$/, "").trim();
return null;
}

for (const sf of files) {
const filePath = path.relative(process.cwd(), sf.getFilePath());
console.log("===", filePath);

    let madeChange = false;

    // 1) Function declarations: export async function DELETE(...) { ... }
    for (const fn of sf.getFunctions()) {
      const name = fn.getName();
      if (!name || !METHODS.has(name)) continue;

      const params = fn.getParameters();
      if (params.length < 2) continue;

      const ctxParam = params[1];
      const typeNode = ctxParam.getTypeNode();
      if (!typeNode) continue;

      const typeText = typeNode.getText();
      if (typeText.includes("params: Promise")) {
        console.log(`  skip (already Promise) ${name}`);
        continue;
      }

      const inner = extractInnerParamsType(typeText);
      if (!inner) {
        console.warn(`  can't parse type for ${name} — please check manually`);
        continue;
      }

      // заменяем тип
      ctxParam.setType(`{ params: Promise<${inner}> }`);
      fn.setIsAsync(true);

      // вставляем разрезолв params, если он используется
      const body = fn.getBody();
      if (body) {
        const bodyText = body.getText();
        if (/\bparams\b/.test(bodyText)) {
          const unique = "__resolvedParams";
          body.insertStatements(0, `const ${unique} = await params;`);
          const newText = body.getText().replace(/\bparams\./g, `${unique}.`);
          body.replaceWithText(newText);
        }
      }

      madeChange = true;
      console.log(`  fixed function ${name}`);
    }

    // 2) Exported const arrow functions: export const DELETE = async (...) => { ... }
    for (const vs of sf.getVariableStatements()) {
      if (!vs.isExported()) continue;
      for (const dec of vs.getDeclarations()) {
        const name = dec.getName();
        if (!METHODS.has(name)) continue;
        const init = dec.getInitializer();
        if (!init) continue;
        if (init.getKindName() !== "ArrowFunction") continue;

        const arrow = init;
        const params = arrow.getParameters();
        if (params.length < 2) continue;
        const ctxParam = params[1];
        const typeNode = ctxParam.getTypeNode();
        if (!typeNode) continue;
        const typeText = typeNode.getText();
        if (typeText.includes("params: Promise")) {
          console.log(`  skip (already Promise) ${name}`);
          continue;
        }
        const inner = extractInnerParamsType(typeText);
        if (!inner) {
          console.warn(`  can't parse arrow type for ${name}`);
          continue;
        }
        ctxParam.setType(`{ params: Promise<${inner}> }`);
        arrow.setIsAsync(true);

        // body may be expression or block — normalize to block
        if (arrow.getBody().getKindName() !== "Block") {
          const expr = arrow.getBody().getText();
          arrow.setBodyText(`{ return ${expr}; }`);
        }

        const block = arrow.getBody();
        if (block) {
          const blockText = block.getText();
          if (/\bparams\b/.test(blockText)) {
            const unique = "__resolvedParams";
            block.insertStatements(0, `const ${unique} = await params;`);
            const newText = block.getText().replace(/\bparams\./g, `${unique}.`);
            block.replaceWithText(newText);
          }
        }
        madeChange = true;
        console.log(`  fixed arrow ${name}`);
      }
    }

    if (madeChange) {
      await sf.save();
      console.log("  saved", filePath);
    } else {
      console.log("  no changes");
    }

}

console.log("DONE - review changes (git diff) and run build.");
})();

Запуск:

# установить ts-morph

npm i -D ts-morph

# дать права и запустить

node scripts/fix-nextjs-route-params.mjs

# посмотреть git diff

git add -A
git diff --staged

3. Команды для поиска потенциальных файлов/мест вручную

(если не хочешь запускать автоматический скрипт — сначала просканируй код)

# найти все файлы route.ts с упоминанием "params"

rg --hidden --glob "app/\*\*/route.ts" "params" -n

# или (grep)

grep -RIn --include="route.ts" "params" app || true

# искать экспорты HTTP-методов

rg "export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)" -n app || true
rg "export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s\*=" -n app || true

4. Проверки после изменений (обязательно)

Сборка:

rm -rf .next
npm run build

Линт:

npm run lint

Юнит/интеграционные тесты (если есть):

npm test

Пройти по изменённым файлам и убедиться, что params больше не используется как обычный объект (теперь — либо await params, либо \_\_resolvedParams).

5. Рекомендации по улучшению и безопасному кодированию

Не использовать any для контекста — лучше явно указать тип Promise<...>.

Для удаления через Prisma лучше сначала сделать findUnique и возвращать 404, чтобы не ловить исключения типа P2025.

В route-handlers возвращай NextResponse/Response и подпиши : Promise<NextResponse> — так Typescript ловит ошибки раньше.

Добавь unit-тесты для основных API-эндпойнтов (особенно для авторизации и 404/204 сценариев).

6. PR / Commit message — шаблон

Commit:

fix(nextjs): resolve route params Promise typing in app route handlers

- Change second parameter types from { params: { ... } } to { params: Promise<...> }
- Add await params resolution in handlers
- Add existence check before prisma.delete (return 404)
- Make handlers async when needed

PR description:

Коротко: исправляет ошибку сборки Next.js 15, где params приходит как Promise.

Что сделано: патч для app/api/admin/trees/[id]/route.ts, + (опционально) автоматический фикс по всем app/\*\*/route.ts.

Тесты: npm run build — успешна после исправления.

Просьба ревью: проверить изменённые роуты на корректность логики владения params.

7. Контрольный чеклист (для AI-агента — выполнять в точности)

Создать ветку: fix/nextjs-route-params.

Сохранить лог сборки до изменений (build-before.log).

Применить ручной патч для app/api/admin/trees/[id]/route.ts и/или запустить scripts/fix-nextjs-route-params.mjs.

Посмотреть git diff и убедиться, что изменения осмысленные.

Запустить rm -rf .next && npm run build. Если ошибка ушла — перейти дальше.

Запустить npm run lint и npm test.

Закоммитить, открыть PR с описанием.

Вернуть build-after.log (или его вывод) в ответ.

8. Что делать, если скрипт или фиксы не помогли

Смотри build-after.log — прикрепи его в PR/issue.

Найди точную строку и сообщение TypeScript — пришли этот фрагмент (я помогу разобрать).

Возможно, проблема не в params — тогда склей build лог и отмечай новые ошибки, я подскажу следующие патчи.
