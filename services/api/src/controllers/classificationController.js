// Import the 3-1 normalization helper that resolves spec lookups and threshold logic.
import { normalizeBersnClassificationInput } from '../utils/bersnClassification.js';

// Handle API requests that normalize building segments under BERSn section 3-1.
export async function normalizeBersnClassification(req, res) {
  // Wrap the logic in a try/catch so validation errors return cleanly.
  try {
    // Read the request body and default to an empty object.
    const body = req.body || {};
    // Run the 3-1 normalization logic and collect the normalized result.
    const normalized = normalizeBersnClassificationInput(body);
    // Return a success response with the normalized payload for frontend/debug use.
    return res.status(200).json({
      // Mark the response as successful.
      ok: true,
      // Return the normalized classification/mixed-use result.
      result: normalized,
    });
  } catch (error) {
    // Return a validation-style error response when normalization fails.
    return res.status(400).json({
      // Mark the response as failed.
      ok: false,
      // Provide a stable error code for frontend handling.
      error_code: 'BERSN_3_1_NORMALIZATION_ERROR',
      // Keep standardized message field used by other API endpoints.
      message: String(error?.message || error),
      // Return the human-readable error message.
      error: String(error?.message || error),
    });
  }
}
