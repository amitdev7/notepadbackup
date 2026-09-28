"""
Zenithsui A/B Dedicated SLM Pipeline
Lightweight, deterministic handwriting recognition model focused exclusively on uppercase 'A' and 'B',
with multi-drawing learning session support and strict uncertainty rejection.
"""

CLASS_A = 0
CLASS_B = 1
CLASS_UNKNOWN = 2

CLASS_NAMES = {
    CLASS_A: "A",
    CLASS_B: "B",
    CLASS_UNKNOWN: "UNKNOWN",
}

__version__ = "1.0.0"
