"""
Dedicated model architecture for uppercase handwritten Letter 'A' recognition.
Fuses deep structural topology evaluation, directional trajectory analysis,
and learned 28x28 raster weights with calibrated confidence and abstention.
"""

import math
import json
from typing import Dict, Any, List, Optional, Tuple
from .preprocess_a import (
    validate_and_clean_strokes,
    compute_bounds,
    extract_letter_a_features,
    rasterize_strokes,
    Stroke,
    Point
)

class LetterAModel:
    """
    Dedicated classifier for handwritten uppercase Letter 'A'.
    Learns binary classification: Letter 'A' vs NOT_A / UNKNOWN.
    """
    
    def __init__(self, acceptance_threshold: float = 0.82):
        self.acceptance_threshold = acceptance_threshold
        # Learned linear weights for 28x28 raster features (flattened 784-dim)
        self.raster_weights: List[float] = [0.0] * (28 * 28)
        self.raster_bias: float = 0.0
        self.trained: bool = False
        
    def score_raster(self, grid: List[List[float]]) -> float:
        """Computes feed-forward sigmoid score from 28x28 raster grid."""
        flat: List[float] = [val for row in grid for val in row]
        if len(flat) != len(self.raster_weights):
            return 0.5
        z = self.raster_bias
        for i in range(len(flat)):
            z += flat[i] * self.raster_weights[i]
        # Sigmoid with numerical clamping
        if z < -20.0:
            return 0.0
        if z > 20.0:
            return 1.0
        return 1.0 / (1.0 + math.exp(-z))

    def evaluate_structural_topology(self, strokes: List[Stroke]) -> Dict[str, Any]:
        """
        Evaluates strict topological and geometric invariants of Letter 'A'.
        Returns detailed scores and violation flags.
        """
        feats = extract_letter_a_features(strokes)
        if not feats["valid_input"]:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": feats.get("reason", "Invalid input")
            }
            
        # Structural Invariant 1: Aspect ratio sanity
        ar = feats["aspect_ratio"]
        if ar < 0.35 or ar > 1.25:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": f"Aspect ratio {ar:.2f} out of valid bounds [0.35, 1.25]"
            }
            
        # Structural Invariant 2: Top convergence
        # Apex width must be significantly smaller than bottom leg span
        if not feats["has_apex_convergence"]:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": f"Apex does not converge (ratio: {feats['apex_convergence']:.2f}, bottom span: {feats['bottom_span']:.2f})"
            }
            
        # Structural Invariant 3: Hard Negative Rejection - Triangle Bottom Closure
        # If the shape has a closed bottom base connecting the two feet, it is a TRIANGLE, not an 'A'
        if feats["has_bottom_closure"] and not feats["has_crossbar"]:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": "Closed bottom base with no mid-crossbar (Triangle)"
            }
            
        # Structural Invariant 4: Mid Crossbar Presence
        # Valid 'A' MUST have a horizontal crossbar or bridging stroke in the middle vertical zone
        if not feats["has_crossbar"]:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": "Missing horizontal mid-crossbar (Inverted V / Caret / Lambda)"
            }
            
        # Invariant 5: Crossbar vertical placement
        # Crossbar must lie strictly in the interior vertical band [0.25, 0.82]
        bar_y = feats["crossbar_y_ratio"]
        if bar_y < 0.25 or bar_y > 0.82:
            return {
                "is_structural_a": False,
                "confidence": 0.0,
                "reason": f"Crossbar position {bar_y:.2f} outside middle vertical zone [0.25, 0.82]"
            }
            
        # Compute continuous structural confidence
        # Bonus for clear convergence, well-centered crossbar, and symmetry
        bar_center_bonus = 1.0 - abs(bar_y - 0.55) * 1.5
        convergence_bonus = 1.0 - feats["apex_convergence"]
        base_confidence = 0.82 + 0.10 * max(0.0, bar_center_bonus) + 0.08 * max(0.0, convergence_bonus)
        base_confidence = min(0.999, max(0.0, base_confidence))
        
        return {
            "is_structural_a": True,
            "confidence": base_confidence,
            "reason": "Valid Letter 'A' structural topology",
            "features": feats
        }

    def predict(self, raw_strokes: Any) -> Dict[str, Any]:
        """
        Full inference entry point.
        Performs validation, geometric structural analysis, raster scoring,
        confidence calibration, and definitive acceptance / rejection.
        """
        cleaned = validate_and_clean_strokes(raw_strokes)
        if not cleaned:
            return {
                "prediction": None,
                "confidence": 0.0,
                "accepted": False,
                "reason": "Empty or malformed strokes"
            }
            
        # 1. Structural evaluation
        struct_res = self.evaluate_structural_topology(cleaned)
        if not struct_res["is_structural_a"]:
            return {
                "prediction": None,
                "confidence": 0.0,
                "accepted": False,
                "reason": struct_res["reason"]
            }
            
        # 2. Raster scoring (if trained)
        struct_conf = struct_res["confidence"]
        if self.trained:
            grid = rasterize_strokes(cleaned, grid_size=28)
            raster_score = self.score_raster(grid)
            # Ensemble fusion
            combined_conf = 0.70 * struct_conf + 0.30 * raster_score
        else:
            combined_conf = struct_conf
            
        calibrated_conf = round(min(0.999, max(0.0, combined_conf)), 4)
        is_accepted = calibrated_conf >= self.acceptance_threshold
        
        bounds = compute_bounds(cleaned)
        
        return {
            "prediction": "A" if is_accepted else None,
            "confidence": calibrated_conf,
            "accepted": is_accepted,
            "reason": "High confidence Letter 'A'" if is_accepted else "Low confidence / abstention",
            "bounds": bounds,
            "stroke_count": len(cleaned)
        }

    def save(self, filepath: str):
        """Saves model weights and configuration to JSON file."""
        data = {
            "version": "1.0.0",
            "model_type": "LetterAModel",
            "acceptance_threshold": self.acceptance_threshold,
            "trained": self.trained,
            "raster_bias": self.raster_bias,
            "raster_weights": self.raster_weights
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def load(self, filepath: str):
        """Loads model weights and configuration from JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.acceptance_threshold = data.get("acceptance_threshold", 0.82)
        self.trained = data.get("trained", False)
        self.raster_bias = data.get("raster_bias", 0.0)
        self.raster_weights = data.get("raster_weights", [0.0] * (28 * 28))
