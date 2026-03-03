"""Versioned JSON table loader for BERSn parameter datasets.

All formula endpoints load static parameter tables through this helper to ensure:
- one canonical path resolution strategy
- consistent error format for missing/invalid tables
- support for versioned datasets (`v1.0`, future `v1.1`, etc.)
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict


class TableLoadError(Exception):
    """Raised when a versioned JSON lookup table cannot be loaded."""


def load_json_table(filename: str, version: str = "v1.0") -> Dict[str, Any]:
    """Load one versioned table from `app/data/<version>/<filename>`."""
    base_dir = os.path.join(os.path.dirname(__file__), "..", "data", version)
    path = os.path.abspath(os.path.join(base_dir, filename))
    if not os.path.exists(path):
        raise TableLoadError(f"JSON table not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise TableLoadError(f"Invalid JSON table format: {path}: {exc}") from exc
