"""Trace builder used for government-grade auditability.

This class provides a single trace contract for all formula endpoints:
  - ordered step logs (description, inputs, result)
  - normalized equation list (`formulas_used`) extracted from step inputs
  - stable engine version tag
"""


class TraceBuilder:
    """Collect, normalize, and emit formula execution trace data."""

    def __init__(self):
        # Ordered execution steps; each entry is a dict with description/inputs/result.
        self.steps = []

    def add_step(self, description, inputs, result):
        """Append one auditable calculation step to the trace."""
        self.steps.append({
            "description": description,
            "inputs": inputs,
            "result": result,
        })

    def build(self):
        """Build final trace payload with unique equation tags in execution order."""
        formulas_used = []
        seen = set()

        for step in self.steps:
            inputs = step.get("inputs") or {}

            # Equation tags are explicitly passed by formula modules as `equation`.
            explicit = inputs.get("equation")
            if explicit:
                values = explicit if isinstance(explicit, list) else [explicit]
                for value in values:
                    key = str(value)
                    if key not in seen:
                        seen.add(key)
                        formulas_used.append(key)

        return {
            "formulas_used": formulas_used,
            "steps": self.steps,
            "engine_version": "BERSn-2024-v1",
        }
