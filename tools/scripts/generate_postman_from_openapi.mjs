#!/usr/bin/env node
/**
 * Generate a Postman v2.1 collection from the local OpenAPI YAML file.
 *
 * Design note:
 * We intentionally avoid external dependencies so the script runs in a locked
 * environment. The parser is line-based and expects the current house style
 * used by contracts/openapi/bersn-api-v1.0.yaml.
 */
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(process.cwd());
const openapiPath = path.join(repoRoot, 'contracts', 'openapi', 'bersn-api-v1.0.yaml');
const outputDir = path.join(repoRoot, 'contracts', 'postman');
const outputPath = path.join(outputDir, 'BERSn_API_v1.0.postman_collection.json');

/**
 * Parse path + method + summary from the YAML file using indentation rules.
 */
function parseEndpoints(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const endpoints = [];
  let inPaths = false;
  let currentPath = null;
  let currentMethod = null;
  let currentSummary = null;

  const flush = () => {
    if (currentPath && currentMethod) {
      endpoints.push({
        path: currentPath,
        method: currentMethod.toUpperCase(),
        summary: currentSummary || `${currentMethod.toUpperCase()} ${currentPath}`,
      });
    }
    currentMethod = null;
    currentSummary = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');

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

    const methodMatch = line.match(/^    (get|post|put|patch|delete|head|options):\s*$/i);
    if (methodMatch) {
      flush();
      currentMethod = methodMatch[1].toLowerCase();
      continue;
    }

    const summaryMatch = line.match(/^      summary:\s*(.+)\s*$/);
    if (summaryMatch && currentMethod) {
      currentSummary = summaryMatch[1].replace(/^["']|["']$/g, '');
    }
  }

  flush();
  return endpoints;
}

/**
 * Group endpoints into Postman folders for cleaner UX.
 */
function folderForPath(endpointPath) {
  if (endpointPath === '/health' || endpointPath === '/ready') return 'System';
  if (!endpointPath.startsWith('/api/bersn/')) return 'Other';
  if (endpointPath.startsWith('/api/bersn/formulas/')) return 'Formulas';
  if (endpointPath.startsWith('/api/bersn/classification/')) return 'Classification';
  if (endpointPath.startsWith('/api/bersn/runs/')) return 'Runs';
  if (endpointPath === '/api/bersn/calc') return 'Orchestration';
  return 'BERSn';
}

function buildSampleBody(endpointPath) {
  if (endpointPath === '/api/bersn/classification/normalize') {
    return {
      total_above_ground_floor_area_m2: 12000,
      segments: [
        {
          appendix1_code: 'G2',
          table_3_2_label: 'G-2 辦公場所',
          display_name: 'Office',
          area_m2: 9000,
          operation_mode: 'all_year',
          urban_zone: 'A',
        },
      ],
    };
  }

  if (endpointPath === '/api/bersn/calc') {
    return {
      project_id: '11111111-1111-1111-1111-111111111111',
      branch_type: 'general',
      formula_version: 'v1.0',
      inputs: {},
    };
  }

  if (endpointPath.startsWith('/api/bersn/formulas/general-eei')) {
    return {
      calc_run_id: 'test-run-001',
      formula_version: 'v1.0',
      inputs: {},
    };
  }

  if (endpointPath.startsWith('/api/bersn/formulas/')) {
    return {
      project_id: '11111111-1111-1111-1111-111111111111',
      calc_run_id: 'test-run-001',
      formula_version: 'v1.0',
      inputs: {},
    };
  }

  return null;
}

function buildRequestItem(endpoint) {
  const isPathParam = endpoint.path.includes('{') && endpoint.path.includes('}');
  const postmanPath = endpoint.path.replace(/\{([^}]+)\}/g, ':$1');

  const url = {
    raw: `{{baseUrl}}${postmanPath}`,
    host: ['{{baseUrl}}'],
    path: postmanPath.split('/').filter(Boolean),
  };

  if (isPathParam) {
    const vars = [...endpoint.path.matchAll(/\{([^}]+)\}/g)].map((m) => ({
      key: m[1],
      value: 'test-run-001',
    }));
    url.variable = vars;
  }

  const item = {
    name: endpoint.summary,
    request: {
      method: endpoint.method,
      header: [
        { key: 'Content-Type', value: 'application/json' },
      ],
      url,
      description: `${endpoint.method} ${endpoint.path}`,
    },
    response: [],
  };

  if (endpoint.method !== 'GET') {
    const sample = buildSampleBody(endpoint.path);
    if (sample) {
      item.request.body = {
        mode: 'raw',
        raw: JSON.stringify(sample, null, 2),
      };
    }
  }

  return item;
}

function buildCollection(endpoints) {
  const folders = new Map();
  for (const endpoint of endpoints) {
    const folder = folderForPath(endpoint.path);
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push(buildRequestItem(endpoint));
  }

  const items = [...folders.entries()].map(([name, requests]) => ({
    name,
    item: requests,
  }));

  return {
    info: {
      _postman_id: 'a12c0f2f-7de1-4f0d-8f89-0f85c14ddc11',
      name: 'BERSn API v1.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'Generated from contracts/openapi/bersn-api-v1.0.yaml',
    },
    item: items,
    variable: [
      { key: 'baseUrl', value: 'http://localhost:8080' },
    ],
  };
}

function main() {
  if (!fs.existsSync(openapiPath)) {
    throw new Error(`OpenAPI file not found: ${openapiPath}`);
  }

  const yamlText = fs.readFileSync(openapiPath, 'utf8');
  const endpoints = parseEndpoints(yamlText);
  if (!endpoints.length) {
    throw new Error('No endpoints parsed from OpenAPI file.');
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const collection = buildCollection(endpoints);
  fs.writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');

  console.log(`Generated Postman collection: ${outputPath}`);
  console.log(`Endpoint count: ${endpoints.length}`);
}

main();
