#!/usr/bin/env node
/**
 * Enforce error-code registry consistency.
 *
 * Rules:
 * 1) Any code token used in API/calc/openapi must exist in registry.
 * 2) Any code in registry must be used at least once in those sources.
 */
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(process.cwd());
const registryPath = path.join(
  repoRoot,
  'contracts',
  'error-codes',
  'bersn-error-codes-v1.0.json',
);

const scanRoots = [
  path.join(repoRoot, 'services', 'api', 'src'),
  path.join(repoRoot, 'services', 'calc', 'app'),
  path.join(repoRoot, 'contracts', 'openapi'),
];

const scanExtensions = new Set(['.js', '.mjs', '.py', '.yaml', '.yml']);
const codePattern = /\b(?:BERSN_[A-Z0-9_]+|CALC_ENGINE_[A-Z0-9_]+)\b/g;

function fail(message) {
  console.error(`ERROR_CODE_REGISTRY_CHECK_FAILED: ${message}`);
  process.exit(1);
}

function walkFiles(dirPath, acc) {
  if (!fs.existsSync(dirPath)) return;
  for (const name of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, acc);
    } else if (scanExtensions.has(path.extname(fullPath))) {
      acc.push(fullPath);
    }
  }
}

function parseRegistry(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing registry file: ${filePath}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const codes = (data.codes || []).map((entry) => entry.code).filter(Boolean);
  if (codes.length === 0) {
    fail('Registry has no codes.');
  }
  return new Set(codes);
}

function collectUsedCodes(files) {
  const usedCodes = new Map();
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(codePattern) || [];
    for (const code of matches) {
      if (!usedCodes.has(code)) usedCodes.set(code, new Set());
      usedCodes.get(code).add(path.relative(repoRoot, filePath));
    }
  }
  return usedCodes;
}

function main() {
  const registryCodes = parseRegistry(registryPath);

  const files = [];
  for (const root of scanRoots) {
    walkFiles(root, files);
  }
  if (files.length === 0) {
    fail('No source files found for scanning.');
  }

  const usedCodes = collectUsedCodes(files);

  const unknownCodes = [...usedCodes.keys()]
    .filter((code) => !registryCodes.has(code))
    .sort();
  if (unknownCodes.length) {
    const lines = unknownCodes.map((code) => {
      const refs = [...(usedCodes.get(code) || [])].sort().join(', ');
      return `${code} -> ${refs}`;
    });
    fail(`Unregistered codes found:\n${lines.join('\n')}`);
  }

  const unusedRegistryCodes = [...registryCodes]
    .filter((code) => !usedCodes.has(code))
    .sort();
  if (unusedRegistryCodes.length) {
    fail(`Registry has unused codes:\n${unusedRegistryCodes.join('\n')}`);
  }

  console.log('Error-code registry check passed.');
  console.log(`Registered codes: ${registryCodes.size}`);
  console.log(`Used codes: ${usedCodes.size}`);
}

main();
