"""
Zenithsui A/B SLM — Confidence & Uncertainty Calibration
Provides calibration curves, rejection thresholds, and temperature tuning.
"""

import math
from typing import List, Dict, Any, Tuple

def compute_entropy(probs: List[float]) -> float:
    """Computes Shannon entropy across class probabilities."""
    ent = 0.0
    for p in probs:
        if p > 1e-9:
            ent -= p * math.log(p)
    return ent

def calibrate_confidence(
    raw_confidence: float,
    margin: float,
    entropy: float,
    min_confidence: float = 0.75,
    min_margin: float = 0.20
) -> Tuple[float, bool]:
    """
    Calibrates confidence and determines whether the prediction is uncertain.
    Returns: (calibrated_confidence, is_uncertain)
    """
    # High entropy or narrow margin indicates uncertainty
    is_uncertain = (raw_confidence < min_confidence) or (margin < min_margin) or (entropy > 0.85)

    if is_uncertain:
        calibrated = max(0.0, raw_confidence * 0.5)
    else:
        # Boost confident, well-separated predictions
        calibrated = min(0.99, raw_confidence + (margin * 0.1))

    return round(calibrated, 4), is_uncertain
