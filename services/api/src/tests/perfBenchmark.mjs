/**
 * Lightweight API benchmark for repeatable local performance checks.
 *
 * Environment variables:
 * - API_BASE_URL (default: http://localhost:8080)
 * - BENCH_ENDPOINT (default: /health)
 * - BENCH_METHOD (GET|POST, default: GET)
 * - BENCH_TOTAL_REQUESTS (default: 120)
 * - BENCH_CONCURRENCY (default: 12)
 * - BENCH_BODY_JSON (optional JSON string for POST body)
 * - BENCH_MIN_SUCCESS_RATE_PCT (optional, e.g. 99.5)
 * - BENCH_MAX_P95_MS (optional, e.g. 120)
 * - BENCH_MAX_P99_MS (optional, e.g. 250)
 * - BENCH_MIN_THROUGHPUT_RPS (optional, e.g. 20)
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const BENCH_ENDPOINT = process.env.BENCH_ENDPOINT || '/health';
const BENCH_METHOD = (process.env.BENCH_METHOD || 'GET').toUpperCase();
const BENCH_TOTAL_REQUESTS = Number(process.env.BENCH_TOTAL_REQUESTS || 120);
const BENCH_CONCURRENCY = Number(process.env.BENCH_CONCURRENCY || 12);
const BENCH_BODY_JSON = process.env.BENCH_BODY_JSON || null;
const BENCH_MIN_SUCCESS_RATE_PCT = process.env.BENCH_MIN_SUCCESS_RATE_PCT
  ? Number(process.env.BENCH_MIN_SUCCESS_RATE_PCT)
  : null;
const BENCH_MAX_P95_MS = process.env.BENCH_MAX_P95_MS ? Number(process.env.BENCH_MAX_P95_MS) : null;
const BENCH_MAX_P99_MS = process.env.BENCH_MAX_P99_MS ? Number(process.env.BENCH_MAX_P99_MS) : null;
const BENCH_MIN_THROUGHPUT_RPS = process.env.BENCH_MIN_THROUGHPUT_RPS
  ? Number(process.env.BENCH_MIN_THROUGHPUT_RPS)
  : null;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function requestOnce(index, bodyObj) {
  const started = performance.now();
  try {
    const resp = await fetch(`${API_BASE_URL}${BENCH_ENDPOINT}`, {
      method: BENCH_METHOD,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': `bench-${index}`,
      },
      body: BENCH_METHOD === 'GET' ? undefined : JSON.stringify(bodyObj || {}),
    });
    const elapsed = performance.now() - started;
    return { ok: resp.ok, status: resp.status, elapsed };
  } catch (error) {
    const elapsed = performance.now() - started;
    return { ok: false, status: 0, elapsed, error: String(error?.message || error) };
  }
}

async function run() {
  if (!['GET', 'POST'].includes(BENCH_METHOD)) {
    throw new Error(`Unsupported BENCH_METHOD: ${BENCH_METHOD}`);
  }
  if (BENCH_TOTAL_REQUESTS <= 0 || BENCH_CONCURRENCY <= 0) {
    throw new Error('BENCH_TOTAL_REQUESTS and BENCH_CONCURRENCY must be > 0');
  }

  let parsedBody = null;
  if (BENCH_BODY_JSON) {
    parsedBody = JSON.parse(BENCH_BODY_JSON);
  }

  const totalStartedAt = performance.now();
  const workers = [];
  const results = [];
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= BENCH_TOTAL_REQUESTS) return;
      const res = await requestOnce(i, parsedBody);
      results.push(res);
    }
  };

  for (let i = 0; i < Math.min(BENCH_CONCURRENCY, BENCH_TOTAL_REQUESTS); i += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);
  const totalMs = performance.now() - totalStartedAt;

  const latencies = results.map((r) => r.elapsed).sort((a, b) => a - b);
  const successCount = results.filter((r) => r.ok).length;
  const failureCount = results.length - successCount;
  const rps = (results.length / totalMs) * 1000;

  const summary = {
    endpoint: `${BENCH_METHOD} ${BENCH_ENDPOINT}`,
    total_requests: results.length,
    concurrency: BENCH_CONCURRENCY,
    success_count: successCount,
    failure_count: failureCount,
    success_rate_pct: Number(((successCount / results.length) * 100).toFixed(2)),
    throughput_rps: Number(rps.toFixed(2)),
    latency_ms: {
      min: Number((latencies[0] || 0).toFixed(2)),
      avg: Number(avg(latencies).toFixed(2)),
      p50: Number(percentile(latencies, 50).toFixed(2)),
      p95: Number(percentile(latencies, 95).toFixed(2)),
      p99: Number(percentile(latencies, 99).toFixed(2)),
      max: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
    },
    non_2xx_statuses: [...new Set(results.filter((r) => !r.ok).map((r) => r.status))],
  };

  const thresholdChecks = [];
  if (BENCH_MIN_SUCCESS_RATE_PCT !== null) {
    thresholdChecks.push({
      name: 'min_success_rate_pct',
      expected: `>= ${BENCH_MIN_SUCCESS_RATE_PCT}`,
      actual: summary.success_rate_pct,
      pass: summary.success_rate_pct >= BENCH_MIN_SUCCESS_RATE_PCT,
    });
  }
  if (BENCH_MAX_P95_MS !== null) {
    thresholdChecks.push({
      name: 'max_p95_ms',
      expected: `<= ${BENCH_MAX_P95_MS}`,
      actual: summary.latency_ms.p95,
      pass: summary.latency_ms.p95 <= BENCH_MAX_P95_MS,
    });
  }
  if (BENCH_MAX_P99_MS !== null) {
    thresholdChecks.push({
      name: 'max_p99_ms',
      expected: `<= ${BENCH_MAX_P99_MS}`,
      actual: summary.latency_ms.p99,
      pass: summary.latency_ms.p99 <= BENCH_MAX_P99_MS,
    });
  }
  if (BENCH_MIN_THROUGHPUT_RPS !== null) {
    thresholdChecks.push({
      name: 'min_throughput_rps',
      expected: `>= ${BENCH_MIN_THROUGHPUT_RPS}`,
      actual: summary.throughput_rps,
      pass: summary.throughput_rps >= BENCH_MIN_THROUGHPUT_RPS,
    });
  }

  if (thresholdChecks.length > 0) {
    summary.threshold_checks = thresholdChecks;
  }

  console.log(JSON.stringify(summary, null, 2));

  // Non-zero exit when any request fails, so CI/automation can gate on it.
  if (failureCount > 0) {
    process.exit(1);
  }

  // Non-zero exit when any configured threshold fails.
  if (thresholdChecks.some((c) => !c.pass)) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(`Benchmark failed: ${String(error?.message || error)}`);
  process.exit(1);
});
