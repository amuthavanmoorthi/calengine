import pool from '../db.js';

export async function getSystemParameter(clientOrPool, key) {
  const { rows } = await clientOrPool.query(
    `SELECT
        key,
        numeric_value,
        unit,
        source_authority,
        source_url,
        source_note,
        effective_year,
        status,
        auto_managed,
        last_verified_at,
        created_at,
        updated_at
     FROM system_parameters
     WHERE key = $1
     LIMIT 1`,
    [key],
  );
  return rows[0] || null;
}

export async function upsertSystemParameter(clientOrPool, parameter) {
  const {
    key,
    numericValue,
    unit,
    sourceAuthority = null,
    sourceUrl = null,
    sourceNote = null,
    effectiveYear = null,
    status = 'ACTIVE',
    autoManaged = true,
    lastVerifiedAt = null,
  } = parameter;

  const { rows } = await clientOrPool.query(
    `INSERT INTO system_parameters (
        key,
        numeric_value,
        unit,
        source_authority,
        source_url,
        source_note,
        effective_year,
        status,
        auto_managed,
        last_verified_at,
        updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (key)
     DO UPDATE SET
       numeric_value = EXCLUDED.numeric_value,
       unit = EXCLUDED.unit,
       source_authority = EXCLUDED.source_authority,
       source_url = EXCLUDED.source_url,
       source_note = EXCLUDED.source_note,
       effective_year = EXCLUDED.effective_year,
       status = EXCLUDED.status,
       auto_managed = EXCLUDED.auto_managed,
       last_verified_at = EXCLUDED.last_verified_at,
       updated_at = now()
     RETURNING
       key,
       numeric_value,
       unit,
       source_authority,
       source_url,
       source_note,
       effective_year,
       status,
       auto_managed,
       last_verified_at,
       created_at,
       updated_at`,
    [
      key,
      numericValue,
      unit,
      sourceAuthority,
      sourceUrl,
      sourceNote,
      effectiveYear,
      status,
      autoManaged,
      lastVerifiedAt,
    ],
  );

  return rows[0] || null;
}

export async function touchSystemParameterVerification(clientOrPool, key, verifiedAt = new Date()) {
  const { rows } = await clientOrPool.query(
    `UPDATE system_parameters
        SET last_verified_at = $2,
            updated_at = now()
      WHERE key = $1
      RETURNING
        key,
        numeric_value,
        unit,
        source_authority,
        source_url,
        source_note,
        effective_year,
        status,
        auto_managed,
        last_verified_at,
        created_at,
        updated_at`,
    [key, verifiedAt],
  );

  return rows[0] || null;
}

export async function insertSystemParameterHistory(clientOrPool, historyEntry) {
  const {
    id,
    key,
    oldNumericValue = null,
    newNumericValue,
    unit,
    sourceAuthority = null,
    sourceUrl = null,
    sourceNote = null,
    effectiveYear = null,
    changeReason,
  } = historyEntry;

  await clientOrPool.query(
    `INSERT INTO system_parameter_history (
        id,
        key,
        old_numeric_value,
        new_numeric_value,
        unit,
        source_authority,
        source_url,
        source_note,
        effective_year,
        change_reason
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      key,
      oldNumericValue,
      newNumericValue,
      unit,
      sourceAuthority,
      sourceUrl,
      sourceNote,
      effectiveYear,
      changeReason,
    ],
  );
}

export { pool };
