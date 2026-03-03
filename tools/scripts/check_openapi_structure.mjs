#!/usr/bin/env node
/**
 * Lightweight OpenAPI structure checks without external dependencies.
 *
 * Scope:
 * - openapi/info/paths/components must exist
 * - each path must have at least one HTTP operation
 * - each operation must define responses
 */
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(process.cwd());
const files = [
  path.join(repoRoot, 'contracts', 'openapi', 'bersn-api-v1.0.yaml'),
  path.join(repoRoot, 'contracts', 'openapi', 'bersn-calc-v1.0.yaml'),
];

function fail(message) {
  console.error(`OPENAPI_CHECK_FAILED: ${message}`);
  process.exit(1);
}

function checkTopLevel(content, filePath) {
  const required = ['openapi:', 'info:', 'paths:', 'components:'];
  for (const marker of required) {
    if (!content.includes(`\n${marker}`) && !content.startsWith(marker)) {
      fail(`${path.basename(filePath)} missing top-level key: ${marker.replace(':', '')}`);
    }
  }
}

function parsePathBlocks(content) {
  const lines = content.split(/\r?\n/);
  let inPaths = false;
  const blocks = [];
  let currentPath = null;
  let currentLines = [];

  const flush = () => {
    if (currentPath) {
      blocks.push({ path: currentPath, lines: currentLines.slice() });
    }
    currentPath = null;
    currentLines = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (!inPaths) {
      if (line.trim() === 'paths:') inPaths = true;
      continue;
    }

    if (/^[A-Za-z]/.test(line) && !line.startsWith('  ')) {
      flush();
      break;
    }

    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      flush();
      currentPath = pathMatch[1];
      continue;
    }

    if (currentPath) currentLines.push(line);
  }

  flush();
  return blocks;
}

function checkPathBlock(block, filePath) {
  const methodRegex = /^    (get|post|put|patch|delete|head|options):\s*$/i;
  const methods = [];
  let currentMethod = null;
  const methodHasResponses = new Map();

  for (const line of block.lines) {
    const mm = line.match(methodRegex);
    if (mm) {
      currentMethod = mm[1].toLowerCase();
      methods.push(currentMethod);
      methodHasResponses.set(currentMethod, false);
      continue;
    }
    if (currentMethod && /^      responses:\s*$/.test(line)) {
      methodHasResponses.set(currentMethod, true);
    }
  }

  if (!methods.length) {
    fail(`${path.basename(filePath)} path ${block.path} has no HTTP operation`);
  }

  for (const method of methods) {
    if (!methodHasResponses.get(method)) {
      fail(`${path.basename(filePath)} path ${block.path} method ${method.toUpperCase()} missing responses`);
    }
  }
}

function main() {
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      fail(`Missing OpenAPI file: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    checkTopLevel(content, filePath);
    const blocks = parsePathBlocks(content);
    if (!blocks.length) {
      fail(`${path.basename(filePath)} has no path entries`);
    }
    for (const block of blocks) {
      checkPathBlock(block, filePath);
    }
    console.log(`OpenAPI structure OK: ${path.basename(filePath)} (${blocks.length} paths)`);
  }
}

main();
