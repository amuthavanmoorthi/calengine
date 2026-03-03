// Import Node.js filesystem helpers to read JSON parameter files from disk.
import fs from 'fs';
// Import Node.js path helpers to build stable absolute paths.
import path from 'path';
// Import file URL helper so we can resolve paths relative to this module in ESM.
import { fileURLToPath } from 'url';

// Resolve the current file path from ESM module metadata.
const __filename = fileURLToPath(import.meta.url);
// Resolve the current directory path from the current file path.
const __dirname = path.dirname(__filename);

// Point to the backend mapping file that links UI/internal types to spec tables.
const MAP_FILE_PATH = path.resolve(__dirname, '../building_type_maps.json');
// Point to the calc service data folder that stores BERS parameter JSON files.
// const CALC_DATA_DIR = path.resolve(__dirname, '../../../api/src/data/v1.0');
// // Point to Appendix 1 Table A baseline file used for AEUI/LEUI/EEUI/UR lookups.
// const TABLE_A_FILE_PATH = path.join(CALC_DATA_DIR, 'baseline_eui_tableA_v1.0_A1_O6_full.json');
// // Point to Table 3.2 file used for Es/YOHj lookups.
// const TABLE_3_2_FILE_PATH = path.join(CALC_DATA_DIR, 'table_3_2_es_yohj.json');
const CALC_DATA_DIR = path.resolve(__dirname, '../data/v1.0');
const TABLE_A_FILE_PATH = path.join(CALC_DATA_DIR, 'baseline_eui_tableA_v1.0_A1_O6_full.json');
const TABLE_3_2_FILE_PATH = path.join(CALC_DATA_DIR, 'table_3_2_es_yohj.json');

// Input guardrails to keep normalization predictable and avoid abuse payloads.
const MAX_SEGMENTS_PER_REQUEST = 500;
const MAX_STRING_LENGTH = 160;
const MAX_AREA_M2 = 1000000000;


// Keep a small in-memory cache so the API does not reread JSON on every request.
let cachedData = null;
// Track the file mtime signature that produced the cache so we can refresh on changes.
let cachedSignature = null;

// Read and parse a JSON file from disk.
function readJsonFile(filePath) {
  // Read raw UTF-8 text from the target file.
  const rawText = fs.readFileSync(filePath, 'utf8');
  // Parse the JSON text and return the resulting object.
  return JSON.parse(rawText);
}

// Build a simple signature using modification times to know when to refresh cache.
function getFileSignature() {
  // Read stat information for the mapping JSON file.
  const mapStat = fs.statSync(MAP_FILE_PATH);
  // Read stat information for the Appendix 1 Table A JSON file.
  const tableAStat = fs.statSync(TABLE_A_FILE_PATH);
  // Read stat information for the Table 3.2 JSON file.
  const table32Stat = fs.statSync(TABLE_3_2_FILE_PATH);
  // Combine mtimes into one string signature.
  return [mapStat.mtimeMs, tableAStat.mtimeMs, table32Stat.mtimeMs].join('|');
}

// Load and index mapping + parameter files used by 3-1 classification logic.
function loadClassificationData() {
  // Build the current signature from source files.
  const currentSignature = getFileSignature();
  // Return cached data when source files have not changed.
  if (cachedData && cachedSignature === currentSignature) {
    // Return the existing cache directly.
    return cachedData;
  }

  // Parse the mapping file from the API service folder.
  const mapsJson = readJsonFile(MAP_FILE_PATH);
  // Parse Appendix 1 Table A baselines from calc data.
  const tableAJson = readJsonFile(TABLE_A_FILE_PATH);
  // Parse Table 3.2 Es/YOHj data from calc data.
  const table32Json = readJsonFile(TABLE_3_2_FILE_PATH);

  // Read the mapping object from the mapping file, defaulting to an empty object.
  const mappingEntries = mapsJson.maps || {};
  // Read the baseline lookup object from Table A, defaulting to an empty object.
  const baselineByCode = tableAJson.baseline_eui || {};
  // Create an index from Table 3.2 source label to row object for fast lookup.
  const table32ByLabel = new Map();
  // Iterate through each Table 3.2 row and index it by the source label.
  for (const row of table32Json.rows || []) {
    // Store each row using its source_label as the lookup key.
    table32ByLabel.set(row.source_label, row);
  }

  // Create the cache object that bundles all loaded and indexed sources.
  cachedData = {
    // Keep the raw maps file for debugging and metadata.
    mapsJson,
    // Keep the raw Appendix 1 file for debugging and metadata.
    tableAJson,
    // Keep the raw Table 3.2 file for debugging and metadata.
    table32Json,
    // Expose the mapping entries used by internal type keys.
    mappingEntries,
    // Expose Appendix 1 baselines keyed by code.
    baselineByCode,
    // Expose Table 3.2 rows keyed by source label.
    table32ByLabel,
  };

  // Save the signature that produced the cache.
  cachedSignature = currentSignature;
  // Return the freshly loaded cache.
  return cachedData;
}

// Normalize the operation mode string coming from UI/API into Table A keys.
function normalizeOperationMode(operationMode) {
  // Return the default mode when the caller omitted the field.
  if (!operationMode) return 'full_year_ac';
  // Accept the exact Table A key for full-year AC.
  if (operationMode === 'full_year_ac') return 'full_year_ac';
  // Accept a UI-friendly alias and map it to the Table A key.
  if (operationMode === 'all_year') return 'full_year_ac';
  // Accept the exact Table A key for intermittent AC.
  if (operationMode === 'intermittent_ac') return 'intermittent_ac';
  // Accept a UI-friendly alias and map it to the Table A key.
  if (operationMode === 'intermittent') return 'intermittent_ac';
  // Throw a clear error when the mode is unsupported.
  throw new Error(`Unsupported operation_mode '${operationMode}'.`);
}

// Normalize urban zone input used to pick UR(A/B/C/D) from Table A.
function normalizeUrbanZone(urbanZone) {
  // Default to zone A when the caller omits the urban zone.
  if (!urbanZone) return 'A';
  // Convert the input to uppercase to make the API forgiving.
  const upper = String(urbanZone).toUpperCase();
  // Validate supported zone keys from Table A.
  if (!['A', 'B', 'C', 'D'].includes(upper)) {
    // Throw a descriptive error for invalid urban zone input.
    throw new Error(`Unsupported urban_zone '${urbanZone}'. Expected A/B/C/D.`);
  }
  // Return the normalized zone key.
  return upper;
}

// Select the Table 3.2 area band key based on total above-ground floor area.
function resolveAreaBandKey(totalAboveGroundAreaM2, areaBands) {
  // Ensure the total area is a finite positive number before lookup.
  if (typeof totalAboveGroundAreaM2 !== 'number' || !Number.isFinite(totalAboveGroundAreaM2) || totalAboveGroundAreaM2 <= 0) {
    // Throw a clear validation error for invalid total area.
    throw new Error('total_above_ground_floor_area_m2 must be a positive number.');
  }
  // Iterate through the configured Table 3.2 area bands in order.
  for (const band of areaBands || []) {
    // Read the inclusive lower bound from the current band.
    const min = band.min_inclusive;
    // Read the exclusive upper bound from the current band.
    const max = band.max_exclusive;
    // Check whether the total area satisfies the lower bound condition.
    const meetsMin = min === null || totalAboveGroundAreaM2 >= min;
    // Check whether the total area satisfies the upper bound condition.
    const meetsMax = max === null || totalAboveGroundAreaM2 < max;
    // Return the current band key when both conditions match.
    if (meetsMin && meetsMax) return band.key;
  }
  // Throw an error when no area band matched, which indicates bad table data.
  throw new Error(`No Table 3.2 area band matches total area '${totalAboveGroundAreaM2}'.`);
}

// Validate a raw segment payload before any table lookup work.
function validateRawSegmentInput(segmentInput, index) {
  // Ensure segment is an object.
  if (!segmentInput || typeof segmentInput !== 'object' || Array.isArray(segmentInput)) {
    throw new Error(`segments[${index}] must be an object.`);
  }

  // Validate area with hard limits to prevent invalid or pathological payloads.
  const area = Number(segmentInput.area_m2);
  if (!Number.isFinite(area) || area <= 0) {
    throw new Error(`segments[${index}].area_m2 must be a positive number.`);
  }
  if (area > MAX_AREA_M2) {
    throw new Error(`segments[${index}].area_m2 exceeds max allowed area (${MAX_AREA_M2}).`);
  }

  // Validate optional string fields length to avoid oversized labels.
  const stringFields = ['internal_type_key', 'appendix1_code', 'table_3_2_label', 'display_name', 'operation_mode', 'urban_zone'];
  for (const fieldName of stringFields) {
    const value = segmentInput[fieldName];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        throw new Error(`segments[${index}].${fieldName} must be a string when provided.`);
      }
      if (value.length > MAX_STRING_LENGTH) {
        throw new Error(`segments[${index}].${fieldName} exceeds max length (${MAX_STRING_LENGTH}).`);
      }
    }
  }

  // Ensure the segment has either internal key or explicit spec keys.
  const hasInternalKey = Boolean(segmentInput.internal_type_key);
  const hasExplicitKeys = Boolean(segmentInput.appendix1_code && segmentInput.table_3_2_label);
  if (!hasInternalKey && !hasExplicitKeys) {
    throw new Error(
      `segments[${index}] must provide internal_type_key OR both appendix1_code and table_3_2_label.`,
    );
  }
}

// Apply the exact 3-1 mixed-use threshold rule to each segment.
function applyMixedUseThresholdRule(segments, totalAreaM2) {
  // Compute the 5% threshold area from the total project area.
  const thresholdByRatioM2 = totalAreaM2 * 0.05;
  // Define the absolute threshold area from the technical manual.
  const thresholdByAbsoluteM2 = 1000;
  // Return a new array with threshold evaluation metadata per segment.
  return segments.map((segment) => {
    // Read the current segment area for convenience.
    const area = segment.area_m2;
    // Compute the current segment area ratio against the total project area.
    const areaRatio = totalAreaM2 > 0 ? area / totalAreaM2 : 0;
    // Check whether the segment meets the 5% criterion.
    const meetsFivePercent = areaRatio >= 0.05;
    // Check whether the segment meets the 1000m2 criterion.
    const meetsThousandM2 = area >= thresholdByAbsoluteM2;
    // The spec says evaluate when a segment reaches either criterion.
    const includeInEvaluation = meetsFivePercent || meetsThousandM2;
    // Return the original segment plus rule evaluation fields.
    return {
      // Keep all original normalized segment fields.
      ...segment,
      // Store ratio for debugging and UI display.
      area_ratio_of_total: areaRatio,
      // Store the exact threshold checks for acceptance/debugging.
      threshold_rule: {
        // Include the computed 5% threshold area value.
        threshold_5_percent_m2: thresholdByRatioM2,
        // Include the fixed 1000m2 threshold value.
        threshold_1000_m2: thresholdByAbsoluteM2,
        // Store whether the segment passes the 5% criterion.
        meets_5_percent: meetsFivePercent,
        // Store whether the segment passes the 1000m2 criterion.
        meets_1000_m2: meetsThousandM2,
        // Store whether this segment should be evaluated by BERSn.
        include_in_evaluation: includeInEvaluation,
        // Store a human-readable reason string for debugging.
        reason: includeInEvaluation
          ? 'Included because area reaches >=5% of total or >=1000m2.'
          : 'Excluded because area is <5% of total and <1000m2.',
      },
    };
  });
}

// Compute normalized weights for evaluated mixed-use segments.
function computeEvaluationWeights(segments) {
  // Filter out segments that do not need evaluation under the 3-1 rule.
  const included = segments.filter((segment) => segment.threshold_rule?.include_in_evaluation);
  // Compute the total evaluated area used as weighting denominator.
  const evaluatedAreaTotal = included.reduce((sum, segment) => sum + segment.area_m2, 0);
  // Return all segments with their evaluation weight fields added.
  const weightedSegments = segments.map((segment) => {
    // Determine whether this segment is included in evaluation.
    const includedFlag = Boolean(segment.threshold_rule?.include_in_evaluation);
    // Compute the segment weight over evaluated area when included.
    const evaluatedWeight = includedFlag && evaluatedAreaTotal > 0 ? segment.area_m2 / evaluatedAreaTotal : 0;
    // Return the segment plus weight values.
    return {
      // Preserve the prior normalized and threshold fields.
      ...segment,
      // Add weighting fields for later mixed-use aggregation.
      weighting: {
        // Weight among evaluated segments (used for final weighted score/result).
        evaluated_area_weight: evaluatedWeight,
        // Weight over the total project area (debug/reference).
        total_area_weight: segment.area_ratio_of_total,
      },
    };
  });
  // Return both the weighted segments and the denominator total.
  return { weightedSegments, evaluatedAreaTotal };
}

// Resolve one segment from either internal mapping key OR explicit spec keys to Appendix 1 + Table 3.2 parameters.
function resolveSegmentParameters(segmentInput, totalAreaBandKey, classificationData) {
  // Read the user-facing internal type key that should exist in building_type_maps.json.
  const internalTypeKey = segmentInput.internal_type_key;
  // Read an explicit Appendix 1 code from the request (used when crosswalk is not finalized).
  const explicitAppendix1Code = segmentInput.appendix1_code || null;
  // Read an explicit Table 3.2 row label from the request (used when crosswalk is not finalized).
  const explicitTable32Label = segmentInput.table_3_2_label || null;
  // Determine whether the caller is using explicit spec keys instead of internal mapping.
  const usesExplicitSpecKeys = Boolean(explicitAppendix1Code && explicitTable32Label);

  // Find the mapping entry when an internal type key was provided.
  const mapEntry = internalTypeKey ? classificationData.mappingEntries[internalTypeKey] : null;
  // Reject payloads that provide neither a mapping key nor explicit spec keys.
  if (!mapEntry && !usesExplicitSpecKeys) {
    // Throw a clear error that explains both supported input styles.
    throw new Error(
      'Each segment must provide either internal_type_key (mapped in building_type_maps.json) OR both appendix1_code and table_3_2_label.'
    );
  }
  // Reject unknown internal keys when explicit spec keys are not used.
  if (internalTypeKey && !mapEntry && !usesExplicitSpecKeys) {
    // Throw an error to make missing mapping coverage obvious.
    throw new Error(`No mapping found for internal_type_key '${internalTypeKey}' in building_type_maps.json.`);
  }

  // Read and validate the segment area.
  const areaM2 = Number(segmentInput.area_m2);
  // Reject invalid segment areas.
  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    // Throw a descriptive error for invalid area input.
    throw new Error(`Segment '${internalTypeKey}' has invalid area_m2 '${segmentInput.area_m2}'.`);
  }

  // Normalize operation mode to Table A keys.
  const operationModeKey = normalizeOperationMode(segmentInput.operation_mode || segmentInput.ac_operation_type);
  // Normalize urban zone to Table A UR zone keys.
  const urbanZoneKey = normalizeUrbanZone(segmentInput.urban_zone);

  // Prefer an explicit Appendix 1 code from the request when provided (safe override for crosswalk gaps).
  const resolvedAppendix1Code = explicitAppendix1Code || mapEntry?.appendix1_code;
  // Stop when neither the request nor the mapping provides an Appendix 1 code.
  if (!resolvedAppendix1Code) {
    // Throw a clear error so the caller knows this row still needs a crosswalk mapping.
    throw new Error(`No Appendix 1 code is set for '${internalTypeKey}'. Add it to building_type_maps.json or send segment.appendix1_code.`);
  }
  // Lookup Appendix 1 baseline row using the resolved code.
  const baselineRow = classificationData.baselineByCode[resolvedAppendix1Code];
  // Stop when Appendix 1 baseline code is not found.
  if (!baselineRow) {
    // Throw a detailed error for bad mapping entries.
    throw new Error(`Appendix 1 baseline code '${resolvedAppendix1Code}' not found for '${internalTypeKey}'.`);
  }

  // Read the requested baseline mode row from Appendix 1.
  let baselineModeRow = baselineRow[operationModeKey];
  // Track whether we had to fallback from intermittent to full-year mode.
  let usedOperationModeFallback = false;
  // Fallback to full-year AC when intermittent row is null and the mapping allows it.
  if (!baselineModeRow && operationModeKey === 'intermittent_ac') {
    // Read the full-year row as the fallback.
    baselineModeRow = baselineRow.full_year_ac;
    // Record that fallback happened for debugging.
    usedOperationModeFallback = true;
  }
  // Stop when no usable baseline row exists.
  if (!baselineModeRow) {
    // Throw a detailed error for missing baseline mode data.
    throw new Error(`No Appendix 1 baseline row available for code '${resolvedAppendix1Code}' and mode '${operationModeKey}'.`);
  }

  // Read UR values from Appendix 1.
  const urRow = baselineRow.UR || {};
  // Select UR by normalized urban zone.
  const urValue = urRow[urbanZoneKey];
  // Stop when the requested UR zone is missing in Table A data.
  if (urValue === undefined || urValue === null) {
    // Throw a descriptive error for missing UR zone data.
    throw new Error(`UR zone '${urbanZoneKey}' not found for Appendix 1 code '${resolvedAppendix1Code}'.`);
  }

  // Lookup Table 3.2 row using the mapped source label.
  const resolvedTable32Label = explicitTable32Label || mapEntry?.table_3_2_label;
  // Lookup Table 3.2 row using the resolved source label.
  const table32Row = classificationData.table32ByLabel.get(resolvedTable32Label);
  // Stop when the mapped label is not found in Table 3.2 data.
  if (!table32Row) {
    // Throw a detailed error for invalid Table 3.2 mapping labels.
    throw new Error(`Table 3.2 row '${resolvedTable32Label}' not found for '${internalTypeKey || 'explicit segment'}'.`);
  }

  // Read the Es value for the current total-area band from Table 3.2.
  const esValue = table32Row.es_by_area_band?.[totalAreaBandKey];
  // Stop when Es is missing for the selected area band.
  if (esValue === undefined || esValue === null) {
    // Throw a descriptive error for malformed Table 3.2 row data.
    throw new Error(`Es missing for area band '${totalAreaBandKey}' in Table 3.2 row '${resolvedTable32Label}'.`);
  }

  // Build the normalized segment payload used by downstream calculation code.
  return {
    // Preserve the caller's internal type key.
    internal_type_key: internalTypeKey,
    // Preserve the original segment area.
    area_m2: areaM2,
    // Keep the normalized operation mode used for Table A lookup.
    operation_mode_key: operationModeKey,
    // Keep the normalized urban zone used for UR lookup.
    urban_zone_key: urbanZoneKey,
    // Copy the mapped Appendix 1 code for traceability.
    appendix1_code: resolvedAppendix1Code,
    // Copy the mapped Table 3.2 label for traceability.
    table_3_2_label: resolvedTable32Label,
    // Copy hot-water category mapping for later 3-3-2 logic.
    hotwater_branch_category: segmentInput.hotwater_branch_category ?? mapEntry?.hotwater_branch_category ?? null,
    // Include an optional display name so UI/debug logs can show a human-friendly label.
    display_name: segmentInput.display_name || segmentInput.name || internalTypeKey || resolvedTable32Label,
    // Include whether intermittent requested mode had to fallback.
    baseline_mode_fallback_to_full_year_ac: usedOperationModeFallback,
    // Include the baseline values resolved from Appendix 1 Table A.
    baseline_values: {
      // Air-conditioning baseline energy use intensity.
      AEUI: baselineModeRow.AEUI,
      // Lighting baseline energy use intensity.
      LEUI: baselineModeRow.LEUI,
      // Elevator/equipment baseline energy use intensity from Table A.
      EEUI: baselineModeRow.EEUI,
      // Urban regional adjustment coefficient.
      UR: urValue,
    },
    // Include the Table 3.2 values resolved for this segment.
    table_3_2_values: {
      // Maximum envelope AC saving rate selected by total-area band.
      Es: esValue,
      // Elevator annual operation hours (or project-specific placeholder text).
      YOHj: table32Row.yohj_h_per_yr,
    },
    // Include raw source traceability for audits/debugging.
    source_trace: {
      // Mapping file version for reproducibility.
      mapping_version: classificationData.mapsJson.version || null,
      // Appendix 1 source label from mapping file if present.
      appendix1_label: (segmentInput.appendix1_label || mapEntry?.appendix1_label) ?? null,
      // Source Table 3.2 row label.
      table_3_2_source_label: table32Row.source_label,
      // Record which resolution style was used for this segment.
      resolution_mode: usesExplicitSpecKeys ? 'explicit_spec_keys' : 'internal_type_mapping',
    },
  };
}

// Normalize and validate 3-1 building classification inputs for one project.
export function normalizeBersnClassificationInput(payload) {
  // Ensure payload is an object to avoid unexpected coercion behavior.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('payload must be an object.');
  }

  // Read the top-level total area field using the expected API key.
  const totalAreaM2 = Number(payload?.total_above_ground_floor_area_m2);
  // Validate total area before any lookup work.
  if (!Number.isFinite(totalAreaM2) || totalAreaM2 <= 0) {
    // Throw a clear error for missing or invalid total area.
    throw new Error('total_above_ground_floor_area_m2 must be a positive number.');
  }
  // Enforce upper bound to reject unrealistic payload values.
  if (totalAreaM2 > MAX_AREA_M2) {
    throw new Error(`total_above_ground_floor_area_m2 exceeds max allowed area (${MAX_AREA_M2}).`);
  }

  // Read the mixed-use segments array from the payload.
  const rawSegments = payload?.segments;
  // Validate that the caller provided at least one segment.
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    // Throw a descriptive validation error for missing segment list.
    throw new Error('segments must be a non-empty array.');
  }
  // Enforce segment-count cap to keep worst-case lookup work bounded.
  if (rawSegments.length > MAX_SEGMENTS_PER_REQUEST) {
    throw new Error(`segments exceeds max allowed count (${MAX_SEGMENTS_PER_REQUEST}).`);
  }
  // Validate each segment shape before lookup resolution.
  rawSegments.forEach((segmentInput, index) => validateRawSegmentInput(segmentInput, index));

  // Load mapping + parameter data required by 3-1 lookups.
  const classificationData = loadClassificationData();
  // Resolve the Table 3.2 area band key using total area.
  const totalAreaBandKey = resolveAreaBandKey(totalAreaM2, classificationData.table32Json.area_bands);

  // Normalize and resolve every incoming segment to spec lookup values.
  const resolvedSegments = rawSegments.map((segmentInput) =>
    // Resolve each segment using shared data and total-area band context.
    resolveSegmentParameters(segmentInput, totalAreaBandKey, classificationData),
  );

  // Sum the declared segment areas for consistency/debug checks.
  const sumSegmentAreaM2 = resolvedSegments.reduce((sum, segment) => sum + segment.area_m2, 0);
  // Apply the exact 3-1 threshold rule to determine which segments must be evaluated.
  const thresholdedSegments = applyMixedUseThresholdRule(resolvedSegments, totalAreaM2);
  // Compute mixed-use weights after threshold filtering.
  const { weightedSegments, evaluatedAreaTotal } = computeEvaluationWeights(thresholdedSegments);

  // Build a warnings array for non-fatal validation observations.
  const warnings = [];
  // Warn when segment total differs from the declared total area by a non-trivial amount.
  if (Math.abs(sumSegmentAreaM2 - totalAreaM2) > 0.5) {
    // Add a warning so the caller can reconcile area bookkeeping.
    warnings.push({
      // Provide a stable warning code for frontend handling.
      code: 'SEGMENT_AREA_SUM_MISMATCH',
      // Explain the mismatch and include both values.
      message: `Sum of segment areas (${sumSegmentAreaM2}) does not match total_above_ground_floor_area_m2 (${totalAreaM2}).`,
    });
  }

  // Return the normalized 3-1 output object for downstream calculation and debug.
  return {
    // Include a high-level summary of the 3-1 normalization context.
    summary: {
      // Echo the declared total above-ground floor area.
      total_above_ground_floor_area_m2: totalAreaM2,
      // Return the selected Table 3.2 area band key used for Es lookup.
      table_3_2_area_band_key: totalAreaBandKey,
      // Return the total area represented by provided segments.
      sum_segment_area_m2: sumSegmentAreaM2,
      // Return the total evaluated area after threshold filtering.
      evaluated_segment_area_m2: evaluatedAreaTotal,
      // Return counts for all and included segments.
      segment_count: weightedSegments.length,
      // Return the count of segments included in evaluation.
      evaluated_segment_count: weightedSegments.filter((segment) => segment.threshold_rule.include_in_evaluation).length,
    },
    // Return all normalized segments including threshold and weight details.
    segments: weightedSegments,
    // Return warnings that do not block processing.
    warnings,
  };
}

// Aggregate per-segment calculation outputs into one mixed-use weighted result.
export function aggregateMixedUseResults(segmentResults) {
  // Validate the input list before aggregation.
  if (!Array.isArray(segmentResults) || segmentResults.length === 0) {
    // Throw a clear error when no segment results were provided.
    throw new Error('segmentResults must be a non-empty array.');
  }

  // Filter to segments that are marked for inclusion and have numeric weights.
  const included = segmentResults.filter((segment) =>
    // Keep only rows that have an included flag and a finite evaluated weight.
    segment?.threshold_rule?.include_in_evaluation && Number.isFinite(segment?.weighting?.evaluated_area_weight),
  );

  // Stop when nothing remains after filtering.
  if (included.length === 0) {
    // Throw a clear error for invalid or missing included segment results.
    throw new Error('No included segment results available for weighted aggregation.');
  }

  // Define the numeric result fields commonly aggregated by mixed-use area weighting.
  const weightedFields = ['eei', 'scoreEEE', 'euiStar', 'ceiStar', 'teui', 'esr'];
  // Create an object to store aggregated field totals.
  const aggregated = {};

  // Iterate through each weighted output field to compute one weighted total.
  for (const fieldName of weightedFields) {
    // Initialize the weighted sum accumulator for the field.
    let weightedSum = 0;
    // Track whether every included segment has a numeric value for this field.
    let allPresent = true;
    // Sum field values multiplied by evaluated-area weight.
    for (const segment of included) {
      // Read the field value from the segment result.
      const value = segment[fieldName];
      // Read the evaluated-area weight from the segment.
      const weight = segment.weighting.evaluated_area_weight;
      // Mark the field as unavailable when any segment misses a numeric value.
      if (!Number.isFinite(value)) {
        // Flip the availability flag and stop summing this field.
        allPresent = false;
        // Exit the inner loop early because one missing value is enough.
        break;
      }
      // Add the weighted contribution of the current segment to the accumulator.
      weightedSum += value * weight;
    }
    // Save either the weighted sum or null when data is incomplete.
    aggregated[fieldName] = allPresent ? weightedSum : null;
  }

  // Return the mixed-use weighted result object.
  return {
    // Return the count of included segments used in aggregation.
    included_segment_count: included.length,
    // Return the weighted totals for supported result fields.
    weighted_result: aggregated,
  };
}
