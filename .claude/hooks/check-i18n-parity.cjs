#!/usr/bin/env node
// PostToolUse hook: after an Edit/Write on src/i18n/locales/{en,es}/*.json,
// diff the two languages' keys for that namespace and print what's missing.
// Pure local check (no LLM call) — zero token cost. Always exits 0: informational only.
const fs = require("fs");
const path = require("path");

function flatten(obj, prefix = "") {
  const out = [];
  for (const [key, value] of Object.entries(obj ?? {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flatten(value, full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const payload = readInput();
const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path;
if (!filePath) process.exit(0);

const match = filePath.match(/src\/i18n\/locales\/(en|es)\/([\w-]+)\.json$/);
if (!match) process.exit(0);

const [, lang, namespace] = match;
const otherLang = lang === "en" ? "es" : "en";
const cwd = payload.cwd || process.cwd();
const thisFile = path.join(cwd, "src/i18n/locales", lang, `${namespace}.json`);
const otherFile = path.join(cwd, "src/i18n/locales", otherLang, `${namespace}.json`);

if (!fs.existsSync(otherFile)) {
  console.log(`[i18n-parity] ${otherFile} does not exist — create it to match ${namespace}.json`);
  process.exit(0);
}

let thisKeys, otherKeys;
try {
  thisKeys = new Set(flatten(JSON.parse(fs.readFileSync(thisFile, "utf8"))));
  otherKeys = new Set(flatten(JSON.parse(fs.readFileSync(otherFile, "utf8"))));
} catch (e) {
  console.log(`[i18n-parity] couldn't parse ${namespace}.json: ${e.message}`);
  process.exit(0);
}

const missingInOther = [...thisKeys].filter((k) => !otherKeys.has(k));
const missingInThis = [...otherKeys].filter((k) => !thisKeys.has(k));

if (missingInOther.length === 0 && missingInThis.length === 0) process.exit(0);

console.log(`[i18n-parity] ${namespace}.json is out of sync between en/es:`);
if (missingInOther.length) {
  console.log(`  missing in ${otherLang}: ${missingInOther.join(", ")}`);
}
if (missingInThis.length) {
  console.log(`  missing in ${lang}: ${missingInThis.join(", ")}`);
}
process.exit(0);
