/**
 * Phase-1 System Initial Test (系統初測) pack.
 *
 * Covers:
 * 1) General non-residential (no hot water)
 * 2) Central hot-water case
 * 3) Mixed-use building case
 * 4) Boundary cases:
 *    - 99m2 vs 100m2 excluded-zone rule
 *    - 4.9% vs 5% mixed-use rule
 *    - grade threshold crossing around EUI* grade-3/4 boundary
 *
 * Output evidence:
 * - docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.json
 * - docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.md
 */

import fs from 'node:fs';
import path from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8081';
const RESULTS_DIR = process.env.PHASE1_RESULTS_DIR || path.resolve(process.cwd(), '../../docs/testing/results');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function postJson(pathname, payload) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

function nowIso() {
  return new Date().toISOString();
}

function mdEscape(value) {
  return String(value).replace(/\|/g, '\\|');
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Phase-1 System Initial Test Results');
  lines.push('');
  lines.push(`- generated_at: ${report.generated_at}`);
  lines.push(`- api_base_url: ${report.api_base_url}`);
  lines.push(`- total_cases: ${report.summary.total}`);
  lines.push(`- pass: ${report.summary.pass}`);
  lines.push(`- fail: ${report.summary.fail}`);
  lines.push('');
  lines.push('## Case Summary');
  lines.push('');
  lines.push('| Case ID | Category | Result | Notes |');
  lines.push('|---|---|---:|---|');
  for (const c of report.cases) {
    lines.push(`| ${mdEscape(c.case_id)} | ${mdEscape(c.category)} | ${c.pass ? 'PASS' : 'FAIL'} | ${mdEscape(c.notes || '')} |`);
  }
  lines.push('');
  lines.push('## Detailed Results');
  lines.push('');
  for (const c of report.cases) {
    lines.push(`### ${c.case_id} - ${c.title}`);
    lines.push(`- category: ${c.category}`);
    lines.push(`- result: ${c.pass ? 'PASS' : 'FAIL'}`);
    lines.push(`- expected: ${c.expected}`);
    lines.push(`- actual: ${c.actual}`);
    if (c.notes) lines.push(`- notes: ${c.notes}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function run() {
  const cases = [];
  const projectId = '11111111-1111-1111-1111-111111111111';

  const register = ({ caseId, title, category, expected, actual, pass, notes = '' }) => {
    cases.push({
      case_id: caseId,
      title,
      category,
      expected,
      actual,
      pass: Boolean(pass),
      notes,
    });
  };

  // Shared calc run for DB-backed formula endpoints.
  const runCreate = await postJson('/api/bersn/calc', {
    project_id: projectId,
    branch_type: 'WITHOUT_HOT_WATER',
    formula_version: 'v1.0',
    inputs: {
      E_design: 1000,
      E_baseline: 1200,
    },
  });
  assert(runCreate.status === 200 && runCreate.body?.ok === true, 'Failed to create calc run');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc_run_id missing');

  // TC-01: General non-residential (no hot water).
  {
    const resp = await postJson('/api/bersn/formulas/general-full', {
      project_id: projectId,
      calc_run_id: calcRunId,
      formula_version: 'v1.0',
      inputs: {
        AF: 12000,
        excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
        elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
        AEUI: 42.4,
        LEUI: 20.0,
        EEUI: 6.0,
        UR: 1.0,
        EEV: 0.85,
        EAC: 0.72,
        EL: 0.65,
        Es: 0.05,
        Et: 0.5,
        beta1: 0.474,
        CFn: 0.91,
      },
    });

    const pass = resp.status === 200 &&
      resp.body?.ok === true &&
      Number.isFinite(resp.body?.outputs?.EEI) &&
      Number.isFinite(resp.body?.outputs?.SCOREEE) &&
      typeof resp.body?.outputs?.grade_result?.grade === 'string';

    register({
      caseId: 'P1-TC-01',
      title: 'General non-residential (no hot water)',
      category: 'Core path',
      expected: 'EEI/SCOREEE/grade_result returned with valid numeric values.',
      actual: pass
        ? `EEI=${resp.body.outputs.EEI}, SCORE=${resp.body.outputs.SCOREEE}, grade=${resp.body.outputs.grade_result.grade}`
        : `status=${resp.status}, ok=${resp.body?.ok ?? 'n/a'}`,
      pass,
    });
  }

  // TC-02: Central hot-water case.
  {
    const resp = await postJson('/api/bersn/formulas/hotwater-full', {
      project_id: projectId,
      calc_run_id: calcRunId,
      formula_version: 'v1.0',
      inputs: {
        AF: 12000,
        excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
        elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
        AEUI: 42.4,
        LEUI: 20.0,
        EEUI: 6.0,
        UR: 1.0,
        EEV: 0.85,
        EAC: 0.71,
        EL: 0.4921367521367521,
        Es: 0.05,
        Et: 0.5,
        beta1: 0.474,
        CFn: 0.91,
        hotwater_category: 'hotel',
        hotwater_system_type: 'electric_storage',
        NPi: 300,
      },
    });

    const pass = resp.status === 200 &&
      resp.body?.ok === true &&
      Number.isFinite(resp.body?.outputs?.hotwater?.HpEUI) &&
      Number.isFinite(resp.body?.outputs?.hotwater?.EHW) &&
      Number.isFinite(resp.body?.outputs?.weights?.d);

    register({
      caseId: 'P1-TC-02',
      title: 'Central hot-water branch',
      category: 'Core path',
      expected: 'Hot-water outputs (HpEUI/EHW) and hot-water weight d are produced.',
      actual: pass
        ? `HpEUI=${resp.body.outputs.hotwater.HpEUI}, EHW=${resp.body.outputs.hotwater.EHW}, d=${resp.body.outputs.weights.d}`
        : `status=${resp.status}, ok=${resp.body?.ok ?? 'n/a'}`,
      pass,
    });
  }

  // TC-03: Mixed-use building classification + 5%/1000m2 rule.
  {
    const resp = await postJson('/api/bersn/classification/normalize', {
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
        {
          appendix1_code: 'K3',
          table_3_2_label: 'B-3 餐飲場所',
          display_name: 'Restaurant',
          area_m2: 400,
          operation_mode: 'all_year',
          urban_zone: 'A',
        },
        {
          appendix1_code: 'K1',
          table_3_2_label: 'B-2 商場百貨',
          display_name: 'Dept Store',
          area_m2: 2600,
          operation_mode: 'all_year',
          urban_zone: 'A',
        },
      ],
    });

    const pass = resp.status === 200 &&
      resp.body?.ok === true &&
      resp.body?.result?.summary?.evaluated_segment_count === 2 &&
      resp.body?.result?.segments?.[1]?.threshold_rule?.include_in_evaluation === false;

    register({
      caseId: 'P1-TC-03',
      title: 'Mixed-use building (weighting and threshold filter)',
      category: 'Core path',
      expected: 'Sub-segment under both 5% and 1000m2 is excluded from evaluated set.',
      actual: pass
        ? `evaluated_segment_count=${resp.body.result.summary.evaluated_segment_count}, segment[1].included=${resp.body.result.segments[1].threshold_rule.include_in_evaluation}`
        : `status=${resp.status}, ok=${resp.body?.ok ?? 'n/a'}`,
      pass,
    });
  }

  // TC-04A: Boundary 99m2 vs 100m2 excluded-zone rule.
  {
    const resp99 = await postJson('/api/bersn/formulas/general-eei', {
      calc_run_id: 'phase1-boundary-99',
      formula_version: 'v1.0',
      inputs: {
        AF: 1000,
        AEUI: 42.4,
        LEUI: 20,
        EAC: 0.72,
        EEV: 0.85,
        Es: 0.05,
        EL: 0.65,
        Et: 0.5,
        elevators: [{ Nej: 1, Eelj: 8.24, YOHj: 2500 }],
        excluded_zones: [{ type: 'storage_or_equipment_space', area_m2: 99, has_air_conditioning: false }],
      },
    });

    const resp100 = await postJson('/api/bersn/formulas/general-eei', {
      calc_run_id: 'phase1-boundary-100',
      formula_version: 'v1.0',
      inputs: {
        AF: 1000,
        AEUI: 42.4,
        LEUI: 20,
        EAC: 0.72,
        EEV: 0.85,
        Es: 0.05,
        EL: 0.65,
        Et: 0.5,
        elevators: [{ Nej: 1, Eelj: 8.24, YOHj: 2500 }],
        excluded_zones: [{ type: 'storage_or_equipment_space', area_m2: 100, has_air_conditioning: false }],
      },
    });

    const include99 = resp99.body?.outputs?.excluded_zone_evaluation?.[0]?.include_in_afk;
    const include100 = resp100.body?.outputs?.excluded_zone_evaluation?.[0]?.include_in_afk;
    const pass = resp99.status === 200 && resp100.status === 200 && include99 === false && include100 === true;

    register({
      caseId: 'P1-TC-04A',
      title: 'Boundary: excluded zone area 99m2 vs 100m2',
      category: 'Boundary',
      expected: '99m2 storage/equipment(no AC)=not excluded; 100m2=excluded.',
      actual: `99m2 include_in_afk=${include99}, 100m2 include_in_afk=${include100}`,
      pass,
    });
  }

  // TC-04B: Boundary 4.9% vs 5.0% mixed-use threshold.
  {
    const payload = (minorArea) => ({
      total_above_ground_floor_area_m2: 10000,
      segments: [
        {
          appendix1_code: 'G2',
          table_3_2_label: 'G-2 辦公場所',
          display_name: 'Office',
          area_m2: 10000 - minorArea,
          operation_mode: 'all_year',
          urban_zone: 'A',
        },
        {
          appendix1_code: 'K3',
          table_3_2_label: 'B-3 餐飲場所',
          display_name: 'Restaurant',
          area_m2: minorArea,
          operation_mode: 'all_year',
          urban_zone: 'A',
        },
      ],
    });

    const resp49 = await postJson('/api/bersn/classification/normalize', payload(490));
    const resp50 = await postJson('/api/bersn/classification/normalize', payload(500));

    const include49 = resp49.body?.result?.segments?.[1]?.threshold_rule?.include_in_evaluation;
    const include50 = resp50.body?.result?.segments?.[1]?.threshold_rule?.include_in_evaluation;
    const pass = resp49.status === 200 && resp50.status === 200 && include49 === false && include50 === true;

    register({
      caseId: 'P1-TC-04B',
      title: 'Boundary: mixed-use area ratio 4.9% vs 5.0%',
      category: 'Boundary',
      expected: '4.9% segment excluded, 5.0% segment included.',
      actual: `4.9% include=${include49}, 5.0% include=${include50}`,
      pass,
    });
  }

  // TC-04C: Grade threshold crossing around grade-3/4 EUI boundary.
  {
    const base = {
      project_id: projectId,
      calc_run_id: calcRunId,
      formula_version: 'v1.0',
      inputs: {
        SCOREEE: 65,
        EUIn: 40,
        EUIg: 60,
        EUImax: 140,
      },
    };

    const threshold3 = 55; // grade-3 boundary for this EUIn/EUIg setup in current mapping.
    const low = await postJson('/api/bersn/formulas/grade-general', {
      ...base,
      inputs: { ...base.inputs, EUI_star: threshold3 - 0.001 },
    });
    const high = await postJson('/api/bersn/formulas/grade-general', {
      ...base,
      inputs: { ...base.inputs, EUI_star: threshold3 + 0.001 },
    });

    const lowGrade = low.body?.outputs?.grade_by_eui;
    const highGrade = high.body?.outputs?.grade_by_eui;
    const pass = low.status === 200 && high.status === 200 && lowGrade !== highGrade;

    register({
      caseId: 'P1-TC-04C',
      title: 'Boundary: grade threshold crossing (EUI*)',
      category: 'Boundary',
      expected: 'Small EUI* change across threshold changes grade_by_eui bucket.',
      actual: `below(${(threshold3 - 0.001).toFixed(3)})=${lowGrade}, above(${(threshold3 + 0.001).toFixed(3)})=${highGrade}`,
      pass,
      notes: 'Threshold uses current Section 3-7 mapping behavior.',
    });
  }

  const summary = {
    total: cases.length,
    pass: cases.filter((c) => c.pass).length,
    fail: cases.filter((c) => !c.pass).length,
  };

  const report = {
    generated_at: nowIso(),
    api_base_url: API_BASE_URL,
    summary,
    cases,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const jsonPath = path.join(RESULTS_DIR, 'PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.json');
  const mdPath = path.join(RESULTS_DIR, 'PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, buildMarkdown(report), 'utf8');

  if (summary.fail > 0) {
    console.error(`phase1-system-initial tests failed: ${summary.fail}/${summary.total} failed`);
    console.error(`results: ${jsonPath}`);
    process.exit(1);
  }

  console.log(`phase1-system-initial tests passed: ${summary.pass}/${summary.total}`);
  console.log(`results: ${jsonPath}`);
}

run().catch((err) => {
  console.error('phase1-system-initial test runner failed:', err.message || err);
  process.exit(1);
});
