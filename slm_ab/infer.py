"""
Zenithsui A/B SLM — Unified Inference Interface
Provides fast, deterministic inference for single drawings.
"""

from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, asdict
from .model import DedicatedABModel, CLASS_A, CLASS_B, CLASS_UNKNOWN, CLASS_NAMES
from .preprocess import Strokes, get_strokes_bounds
from .features import extract_features

@dataclass
class RecognitionResult:
    label: str                  # "A", "B", or "UNKNOWN"
    class_id: int               # 0, 1, or 2
    confidence: float           # [0.0, 1.0]
    is_uncertain: bool          # True if confidence is below threshold or margin is narrow
    reason: str                 # Diagnostic reason
    scores: Dict[str, float]    # Intermediate probabilities and geometric gates
    bounds: Dict[str, float]    # Drawing bounds

_DEFAULT_MODEL: Optional[DedicatedABModel] = None

def set_default_model(model: DedicatedABModel):
    global _DEFAULT_MODEL
    _DEFAULT_MODEL = model

def get_default_model() -> DedicatedABModel:
    global _DEFAULT_MODEL
    if _DEFAULT_MODEL is None:
        # Train default baseline model if not yet loaded
        from .dataset import get_datasets
        from .train import train_ab_slm
        data = get_datasets(num_a=180, num_b=180, num_unknown=220, seed=42)
        _DEFAULT_MODEL = train_ab_slm(data["train"], data["val"], version="model_v1_baseline")
    return _DEFAULT_MODEL

def infer_ab(raw_strokes: Strokes, model: Optional[DedicatedABModel] = None) -> RecognitionResult:
    """
    Classifies a raw drawing into A, B, or UNKNOWN.
    """
    if model is None:
        model = get_default_model()

    bounds = get_strokes_bounds(raw_strokes)
    pred_cls, conf, reason, scores = model.predict(raw_strokes)
    label = CLASS_NAMES.get(pred_cls, "UNKNOWN")
    is_uncertain = (pred_cls == CLASS_UNKNOWN) or (conf < model.min_confidence_threshold)

    return RecognitionResult(
        label=label,
        class_id=pred_cls,
        confidence=round(conf, 4),
        is_uncertain=is_uncertain,
        reason=reason,
        scores=scores,
        bounds=bounds,
    )
