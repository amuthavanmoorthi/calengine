/**
 * Smoke checks for readiness + rate-limit hardening.
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const health = await fetch('http://localhost:8081/health');
  assert(health.ok, `health expected 200, got ${health.status}`);
  const healthBody = await health.json();
  assert(healthBody.status === 'ok', 'health status must be ok');

  const ready = await fetch('http://localhost:8081/ready');
  assert(ready.ok, `ready expected 200, got ${ready.status}`);
  const readyBody = await ready.json();
  assert(readyBody.status === 'ready', 'ready status must be ready');

  const apiReq = await fetch('http://localhost:8081/api/bersn/formulas/afe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(apiReq.status === 400, `api validation expected 400, got ${apiReq.status}`);
  assert(apiReq.headers.get('x-ratelimit-limit') !== null, 'x-ratelimit-limit header missing');
  assert(apiReq.headers.get('x-ratelimit-remaining') !== null, 'x-ratelimit-remaining header missing');
  assert(apiReq.headers.get('x-ratelimit-reset') !== null, 'x-ratelimit-reset header missing');

  const apiBody = await apiReq.json();
  assert(apiBody.ok === false, 'api error body must include ok=false');

  console.log('readiness/rate-limit smoke checks passed');
}

run().catch((err) => {
  console.error('readiness/rate-limit smoke checks failed:', err.message || err);
  process.exit(1);
});
