/**
 * Smoke checks for calc transport hardening.
 *
 * Validates:
 * - 504 + CALC_ENGINE_TIMEOUT when calc dependency is too slow
 * - 502 + CALC_ENGINE_UNAVAILABLE when calc dependency is unreachable
 */
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApi(baseUrl, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const resp = await fetch(`${baseUrl}/api/bersn/formulas/general-eei`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (resp.status === 400) return;
    } catch (_) {
      // API not ready yet; continue polling.
    }
    await sleep(120);
  }
  throw new Error(`API did not become ready within ${timeoutMs}ms at ${baseUrl}`);
}

function startApiProcess({
  apiPort,
  calcUrl,
  calcTimeoutMs,
}) {
  const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const env = {
    ...process.env,
    API_PORT: String(apiPort),
    CALC_URL: calcUrl,
    CALC_TIMEOUT_MS: String(calcTimeoutMs),
    CALC_MAX_RETRIES: '0',
    API_RATE_LIMIT_MAX: '10000',
  };

  const proc = spawn(process.execPath, ['src/server.js'], {
    cwd: apiRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  proc.stdout.on('data', (chunk) => { logs += String(chunk); });
  proc.stderr.on('data', (chunk) => { logs += String(chunk); });

  return { proc, getLogs: () => logs };
}

async function stopProcess(proc) {
  if (!proc || proc.killed) return;
  proc.kill('SIGTERM');
  const done = new Promise((resolve) => {
    proc.once('exit', () => resolve());
  });
  await Promise.race([done, sleep(2000)]);
  if (!proc.killed) {
    proc.kill('SIGKILL');
  }
}

async function postGeneralEei(baseUrl) {
  const resp = await fetch(`${baseUrl}/api/bersn/formulas/general-eei`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      calc_run_id: 'transport-smoke-001',
      formula_version: 'v1.0',
      inputs: {
        AF: 12000,
        elevators: [{ Nej: 1, Eelj: 8.24, YOHj: 2500 }],
        AEUI: 42.4,
        LEUI: 20.0,
        EAC: 0.72,
        EEV: 0.85,
        Es: 0.05,
        EL: 0.65,
        Et: 0.5,
      },
    }),
  });

  const body = await resp.json();
  return { status: resp.status, body };
}

async function run() {
  // CASE 1: timeout behavior with intentionally slow calc server.
  const slowCalcPort = 19090;
  const slowCalcServer = http.createServer((_req, res) => {
    setTimeout(() => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    }, 1500);
  });
  await new Promise((resolve) => slowCalcServer.listen(slowCalcPort, '127.0.0.1', resolve));

  const timeoutApi = startApiProcess({
    apiPort: 18080,
    calcUrl: `http://127.0.0.1:${slowCalcPort}`,
    calcTimeoutMs: 120,
  });

  try {
    await waitForApi('http://127.0.0.1:18080');
    const timeoutResp = await postGeneralEei('http://127.0.0.1:18080');
    assert(timeoutResp.status === 504, `timeout case expected 504, got ${timeoutResp.status}`);
    assert(timeoutResp.body?.ok === false, 'timeout case: ok must be false');
    assert(
      timeoutResp.body?.error_code === 'CALC_ENGINE_TIMEOUT',
      `timeout case expected CALC_ENGINE_TIMEOUT, got ${timeoutResp.body?.error_code}`,
    );
  } finally {
    await stopProcess(timeoutApi.proc);
    slowCalcServer.close();
  }

  // CASE 2: unavailable behavior with no calc listener.
  const unavailableApi = startApiProcess({
    apiPort: 18081,
    calcUrl: 'http://127.0.0.1:19091',
    calcTimeoutMs: 500,
  });

  try {
    await waitForApi('http://127.0.0.1:18081');
    const unavailableResp = await postGeneralEei('http://127.0.0.1:18081');
    assert(unavailableResp.status === 502, `unavailable case expected 502, got ${unavailableResp.status}`);
    assert(unavailableResp.body?.ok === false, 'unavailable case: ok must be false');
    assert(
      unavailableResp.body?.error_code === 'CALC_ENGINE_UNAVAILABLE',
      `unavailable case expected CALC_ENGINE_UNAVAILABLE, got ${unavailableResp.body?.error_code}`,
    );
  } finally {
    await stopProcess(unavailableApi.proc);
  }

  console.log('calc-transport smoke checks passed');
}

run().catch((err) => {
  console.error('calc-transport smoke checks failed:', err.message || err);
  process.exit(1);
});

