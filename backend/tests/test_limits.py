"""The frontend repeats a few limits for the browser's own checks: they must match the backend."""

import re
from pathlib import Path

import pytest

from app import limits

FRONTEND_LIMITS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "limits.ts"


@pytest.mark.skipif(not FRONTEND_LIMITS.is_file(), reason="frontend sources not present")
def test_frontend_limits_match_backend():
    found = dict(re.findall(r"^\s*([A-Z_]+):\s*(\d+)", FRONTEND_LIMITS.read_text(), re.MULTILINE))
    assert found, "no limits found in limits.ts"
    for name, value in found.items():
        assert int(value) == getattr(limits, name), name
