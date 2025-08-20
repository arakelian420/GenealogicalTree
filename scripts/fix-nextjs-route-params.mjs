#!/usr/bin/env node
/**
 * scripts/fix-nextjs-route-params.mjs
 * WARNING: run in git branch, review changes before commit
 */

import { Project } from "ts-morph";
import path from "path";

(async () => {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: true,
  });

  // Подбирать по вашему шаблону: app/**/route.ts
  const files = project.addSourceFilesAtPaths("app/**/route.ts");

  const METHODS = new Set([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
  ]);

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
            const newText = block
              .getText()
              .replace(/\bparams\./g, `${unique}.`);
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
