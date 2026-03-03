import { Router } from 'express';
import {
  runCalc,
  runAFe,
  runEtEUI,
  runWeights,
  runGeneralEEIPath,
  runPreprocessEfficiency,
  runEEIGeneral,
  runScoreGeneral,
  runScaleValuesGeneral,
  runIndicatorsGeneral,
  runGradeGeneral,
  runGeneralFull,
  runEAC,
  runEL,
  runHotwaterPreprocess,
  runHotwaterFull,
  runRenewablePreprocess,
  runRenewableBonus,
  runNZBEligibility,
  runNZBBalance,
  runNZBEvaluate,
  getRunDetails,
} from '../controllers/calcController.js';
import { normalizeBersnClassification } from '../controllers/classificationController.js';

const router = Router();

/**
 * BERSn route registry.
 *
 * Grouping:
 * - classification + run creation
 * - formula-by-formula endpoints
 * - end-to-end branch endpoints (general/hotwater)
 * - renewable + NZB endpoints
 */

// Route for BERSn section 3-1 classification normalization (Appendix 1 + Table 3.2 + threshold rule).
router.post('/bersn/classification/normalize', normalizeBersnClassification);

// Route for BERSn calculation
router.post('/bersn/calc', runCalc);

//For AFE calculation
router.post('/bersn/formulas/afe', runAFe);

// For EtEUI calculation
router.post('/bersn/formulas/eteui', runEtEUI);

//For weights calculation
router.post("/bersn/formulas/weights", runWeights);

// For 3-3-1 general non-residential EEI path (Eq. 3.1~3.6)
router.post("/bersn/formulas/general-eei", runGeneralEEIPath);

// DB-backed 3-2-2 preprocessing (EEV/EAC/EL)
router.post("/bersn/formulas/preprocess-efficiency", runPreprocessEfficiency);

// DB-backed Eq. 3.6 EEI (general branch)
router.post("/bersn/formulas/eei-general", runEEIGeneral);

// DB-backed 3-4 SCOREEE (Eq. 3.16a / 3.16b)
router.post("/bersn/formulas/score-general", runScoreGeneral);

// DB-backed 3-5 scale values (Eq. 3.17~3.20)
router.post("/bersn/formulas/scale-values-general", runScaleValuesGeneral);

// DB-backed 3-6 indicators (Eq. 3.21~3.24)
router.post("/bersn/formulas/indicators-general", runIndicatorsGeneral);

// DB-backed 3-7 grade mapping (Table 3.4)
router.post("/bersn/formulas/grade-general", runGradeGeneral);

// DB-backed end-to-end general branch (3-2-1 -> 3-7)
router.post("/bersn/formulas/general-full", runGeneralFull);

// DB-backed Appendix 2 EAC/EL
router.post("/bersn/formulas/eac", runEAC);
router.post("/bersn/formulas/el", runEL);

// DB-backed hot-water branch
router.post("/bersn/formulas/hotwater-preprocess", runHotwaterPreprocess);
router.post("/bersn/formulas/hotwater-full", runHotwaterFull);

// DB-backed renewable bonus branch (3-8)
router.post("/bersn/formulas/renewable-preprocess", runRenewablePreprocess);
router.post("/bersn/formulas/renewable-bonus", runRenewableBonus);

// DB-backed NZB branch (3-9)
router.post("/bersn/formulas/nzb-eligibility", runNZBEligibility);
router.post("/bersn/formulas/nzb-balance", runNZBBalance);
router.post("/bersn/formulas/nzb-evaluate", runNZBEvaluate);

//used by Energy Analysis page
router.get('/bersn/runs/:calc_run_id', getRunDetails);

export default router;
