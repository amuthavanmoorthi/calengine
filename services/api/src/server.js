import express from "express";
import pg from "pg";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

const {
  DB_HOST = "postgres",
  DB_PORT = "5432",
  DB_NAME = "bersn",
  DB_USER = "bersn",
  DB_PASSWORD = "bersn",
  CALC_URL = "http://bersn_calc:8000"
} = process.env;

const pool = new pg.Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1;");
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ status: "fail", error: String(e.message || e) });
  }
});

/**
 * POST /api/bersn/calc
 * body: { project_id, branch_type, formula_version, inputs }
 */
app.post("/api/bersn/calc", async (req, res) => {
  const { project_id, branch_type, formula_version, inputs } = req.body || {};

  if (!project_id || !branch_type || !formula_version || !inputs) {
    return res.status(400).json({
      error: "Missing required fields: project_id, branch_type, formula_version, inputs"
    });
  }

  const inputVersionId = crypto.randomUUID();
  const calcRunId = crypto.randomUUID();
  const payloadJson = { branch_type, formula_version, inputs };
  const inputsHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payloadJson))
    .digest("hex");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Insert input snapshot
    await client.query(
      `INSERT INTO bersn_input_versions (id, project_id, branch_type, formula_version, payload_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [inputVersionId, project_id, branch_type, formula_version, payloadJson]
    );

    // 2) Create calc run
    await client.query(
      `INSERT INTO calc_runs (id, input_version_id, inputs_hash, status, started_at)
       VALUES ($1, $2, $3, 'RUNNING', now())`,
      [calcRunId, inputVersionId, inputsHash]
    );

    // 3) Call Python calc engine
    const calcResp = await fetch(`${CALC_URL}/calc/bersn/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calc_run_id: calcRunId,
        branch_type,
        formula_version,
        inputs
      })
    });

    if (!calcResp.ok) {
      const text = await calcResp.text();
      throw new Error(`Calc engine error ${calcResp.status}: ${text}`);
    }

    const resultJson = await calcResp.json();

    // 4) Save result artifact
    await client.query(
      `INSERT INTO calc_results (calc_run_id, result_json)
       VALUES ($1, $2)`,
      [calcRunId, resultJson]
    );

    // 5) Mark run success
    await client.query(
      `UPDATE calc_runs SET status='SUCCEEDED', finished_at=now() WHERE id=$1`,
      [calcRunId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      calc_run_id: calcRunId,
      input_version_id: inputVersionId,
      result: resultJson
    });
  } catch (e) {
    await client.query("ROLLBACK");

    // best effort mark failed
    try {
      await pool.query(
        `UPDATE calc_runs SET status='FAILED', finished_at=now(), error_message=$2 WHERE id=$1`,
        [calcRunId, String(e.message || e)]
      );
    } catch (_) {}

    return res.status(500).json({ error: String(e.message || e) });
  } finally {
    client.release();
  }
});

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`BERSn API listening on ${PORT}`);
});
