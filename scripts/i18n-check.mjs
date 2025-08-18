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
