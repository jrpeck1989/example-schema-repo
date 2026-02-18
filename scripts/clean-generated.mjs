#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";

const DATA_STRUCTURES_DIR = resolve("data-structures");
const GENERATED_DIR = resolve("generated");

function collectYamlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectYamlFiles(full));
    } else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
      results.push(full);
    }
  }
  return results;
}

function snakeToPascal(s) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function buildSchemaTypeMap() {
  const map = {};
  for (const file of collectYamlFiles(DATA_STRUCTURES_DIR)) {
    const doc = yaml.load(readFileSync(file, "utf8"));
    const schemaType = doc?.meta?.schemaType;
    const name = doc?.data?.self?.name;
    if (name && schemaType) {
      map[name] = schemaType;
    }
  }
  return map;
}

function removeFunctions(source, schemaTypeMap) {
  let cleaned = source;

  for (const [name, type] of Object.entries(schemaTypeMap)) {
    const pascal = snakeToPascal(name);

    if (type === "entity") {
      const trackPattern = new RegExp(
        `^export function track${pascal}\\b[\\s\\S]*?^\\}\n?`,
        "gm"
      );
      cleaned = cleaned.replace(trackPattern, "");
    } else if (type === "event") {
      const createPattern = new RegExp(
        `^export function create${pascal}\\b[\\s\\S]*?^\\}\n?`,
        "gm"
      );
      cleaned = cleaned.replace(createPattern, "");
    }
  }

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned;
}

const schemaTypeMap = buildSchemaTypeMap();
console.log("Schema type map:", schemaTypeMap);

const tsFiles = readdirSync(GENERATED_DIR).filter((f) => f.endsWith(".ts"));

for (const file of tsFiles) {
  const filePath = join(GENERATED_DIR, file);
  const source = readFileSync(filePath, "utf8");
  const cleaned = removeFunctions(source, schemaTypeMap);

  if (cleaned !== source) {
    writeFileSync(filePath, cleaned);
    console.log(`Cleaned: ${file}`);
  } else {
    console.log(`No changes: ${file}`);
  }
}

console.log("Done.");
