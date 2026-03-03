#!/usr/bin/env node
/**
 * Contract drift check:
 * 1) API routes defined in calcRoutes.js must exist in OpenAPI.
 * 2) Required system routes (/health, /ready) must exist in OpenAPI.
 * 3) OpenAPI endpoints must exist in generated Postman collection.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const repoRoot = path.resolve(process.cwd());
const routesPath = path.join(repoRoot, 'services', 'api', 'src', 'routes', 'calcRoutes.js');
const openapiPath = path.join(repoRoot, 'contracts', 'openapi', 'bersn-api-v1.0.yaml');
const postmanPath = path.join(repoRoot, 'contracts', 'postman', 'BERSn_API_v1.0.postman_collection.json');

function fail(message) {
  console.error(`CONTRACT_CHECK_FAILED: ${message}`);
  process.exit(1);
}

function parseRouteFileRoutes(sourceText) {
  const routeRegex = /router\.(post|get|put|patch|delete)\((['"])(\/[^'"]+)\2/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(sourceText)) !== null) {
    const normalizedPath = match[3].replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    routes.push({
      method: match[1].toUpperCase(),
      path: `/api${normalizedPath}`,
    });
  }
  return routes;
}

function parseOpenApiEndpoints(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const endpoints = [];
  let inPaths = false;
  let currentPath = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');

    if (!inPaths) {
      if (line.trim() === 'paths:') inPaths = true;
      continue;
    }

    if (/^[A-Za-z]/.test(line) && !line.startsWith('  ')) break;

    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete|head|options):\s*$/i);
    if (methodMatch && currentPath) {
      endpoints.push({
        method: methodMatch[1].toUpperCase(),
        path: currentPath,
      });
    }
  }

  return endpoints;
}

function parsePostmanEndpoints(collectionJson) {
  const endpoints = [];

  function walkItems(items) {
    for (const item of items || []) {
      if (item.item) {
        walkItems(item.item);
        continue;
      }
      if (item.request?.url?.raw && item.request?.method) {
        const raw = String(item.request.url.raw);
        const pathFromRaw = raw
          .replace(/^{{baseUrl}}/, '')
          .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
        endpoints.push({
          method: String(item.request.method).toUpperCase(),
          path: pathFromRaw,
        });
      }
    }
  }

  walkItems(collectionJson.item || []);
  return endpoints;
}

function toKey(endpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function main() {
  if (!fs.existsSync(routesPath)) fail(`Missing routes file: ${routesPath}`);
  if (!fs.existsSync(openapiPath)) fail(`Missing OpenAPI file: ${openapiPath}`);

  // Re-generate collection so check runs on fresh artifact.
  const gen = spawnSync('node', ['tools/scripts/generate_postman_from_openapi.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (gen.status !== 0) {
    fail(`Postman generation failed.\n${gen.stdout}\n${gen.stderr}`);
  }

  if (!fs.existsSync(postmanPath)) fail(`Missing Postman collection: ${postmanPath}`);

  const routesText = fs.readFileSync(routesPath, 'utf8');
  const openapiText = fs.readFileSync(openapiPath, 'utf8');
  const postmanJson = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

  const routeEndpoints = parseRouteFileRoutes(routesText);
  const openapiEndpoints = parseOpenApiEndpoints(openapiText);
  const postmanEndpoints = parsePostmanEndpoints(postmanJson);

  const openapiSet = new Set(openapiEndpoints.map(toKey));
  const postmanSet = new Set(postmanEndpoints.map(toKey));

  const requiredSystem = ['GET /health', 'GET /ready'];
  for (const key of requiredSystem) {
    if (!openapiSet.has(key)) {
      fail(`OpenAPI missing required system endpoint: ${key}`);
    }
  }

  const missingInOpenApi = routeEndpoints
    .map(toKey)
    .filter((key) => !openapiSet.has(key))
    .sort();
  if (missingInOpenApi.length) {
    fail(`OpenAPI missing API routes:\n${missingInOpenApi.join('\n')}`);
  }

  const missingInPostman = openapiEndpoints
    .map(toKey)
    .filter((key) => !postmanSet.has(key))
    .sort();
  if (missingInPostman.length) {
    fail(`Postman collection missing OpenAPI endpoints:\n${missingInPostman.join('\n')}`);
  }

  console.log('Contract sync check passed.');
  console.log(`Routes in router: ${routeEndpoints.length}`);
  console.log(`Endpoints in OpenAPI: ${openapiEndpoints.length}`);
  console.log(`Requests in Postman: ${postmanEndpoints.length}`);
}

main();
