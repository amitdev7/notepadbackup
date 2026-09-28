"""
Zenithsui Dedicated A/B SLM Model
Lightweight, deterministic handwriting recognition model supporting CLASS_A (0), CLASS_B (1), and CLASS_UNKNOWN (2).
Combines learned feature prototypes, linear discriminant scoring, and dual-gate geometric verification.
"""

import math
import json
from typing import List, Dict, Any, Tuple, Optional
from .features import extract_features, NUM_FEATURES
from .preprocess import Strokes, validate_sample_quality

CLASS_A = 0
CLASS_B = 1
CLASS_UNKNOWN = 2

CLASS_NAMES = {
    CLASS_A: "A",
    CLASS_B: "B",
    CLASS_UNKNOWN: "UNKNOWN"
}

class DedicatedABModel:
    """
    Dedicated Small Language/Recognition Model (SLM) for Handwritten 'A' and 'B'.
    Enforces strict abstention (UNKNOWN) whenever uncertainty or geometric contradiction is detected.
    """

    def __init__(self, version: str = "model_v1"):
        self.version = version
        self.num_features = NUM_FEATURES

        # Discriminant weights and biases
        self.weights_a: List[float] = [0.0] * self.num_features
        self.bias_a: float = 0.0
        self.weights_b: List[float] = [0.0] * self.num_features
        self.bias_b: float = 0.0
        self.bias_unknown: float = 0.5

        # Class prototypes (centroids in normalized feature space)
        self.prototype_a: List[float] = [0.0] * self.num_features
        self.prototype_b: List[float] = [0.0] * self.num_features

        # Metric feature scaling weights (diagonal Mahalanobis/relevance metric)
        self.feature_weights: List[float] = [1.0] * self.num_features

        # Thresholds and calibration parameters
        self.min_confidence_threshold: float = 0.75
        self.min_margin_threshold: float = 0.20
        self.temperature: float = 1.0

        # Metadata
        self.trained_samples_count: int = 0
        self.created_timestamp: float = 0.0
        self.validation_metrics: Dict[str, float] = {}

    def predict_features(self, feat: List[float]) -> Tuple[int, float, str, Dict[str, float]]:
        """
        Runs model inference on an extracted 48-element feature vector.
        Returns: (predicted_class_id, confidence, reason, score_dict)
        """
        if len(feat) != self.num_features:
            return CLASS_UNKNOWN, 0.0, f"Invalid feature length ({len(feat)} != {self.num_features})", {}

        # 1. Feature distances to prototypes
        dist_a = 0.0
        dist_b = 0.0
        for i in range(self.num_features):
            w = self.feature_weights[i]
            dist_a += w * ((feat[i] - self.prototype_a[i]) ** 2)
            dist_b += w * ((feat[i] - self.prototype_b[i]) ** 2)
        dist_a = math.sqrt(max(dist_a, 0.0))
        dist_b = math.sqrt(max(dist_b, 0.0))

        # 2. Linear discriminant scores
        dot_a = sum(self.weights_a[i] * feat[i] for i in range(self.num_features)) + self.bias_a
        dot_b = sum(self.weights_b[i] * feat[i] for i in range(self.num_features)) + self.bias_b

        # Combined logits
        logit_a = dot_a - 0.35 * dist_a
        logit_b = dot_b - 0.35 * dist_b
        logit_u = self.bias_unknown

        # Softmax with temperature
        max_l = max(logit_a, logit_b, logit_u)
        exp_a = math.exp(min((logit_a - max_l) / self.temperature, 50.0))
        exp_b = math.exp(min((logit_b - max_l) / self.temperature, 50.0))
        exp_u = math.exp(min((logit_u - max_l) / self.temperature, 50.0))
        sum_exp = exp_a + exp_b + exp_u

        prob_a = exp_a / sum_exp
        prob_b = exp_b / sum_exp
        prob_u = exp_u / sum_exp

        # 3. Geometric Verification Gates
        # Extract key geometric descriptors from feature vector:
        # idx 8: apex_convergence, idx 10: crossbar_presence, idx 14: bottom_closure_base
        # idx 15: a_geometric_score
        # idx 16: left_stem_straightness, idx 18: upper_loop_area, idx 19: lower_loop_area
        # idx 20: waist_indentation, idx 23: d_loop_singularity, idx 24: p_bottom_emptiness
        # idx 25: b_geometric_score
        apex_conv = feat[8]
        crossbar = feat[10]
        bottom_closure = feat[14]
        a_geom_score = feat[15]

        left_stem = feat[16]
        upper_loop = feat[18]
        lower_loop = feat[19]
        waist_indent = feat[20]
        d_singularity = feat[23]
        p_emptiness = feat[24]
        b_geom_score = feat[25]

        gate_a_passed = (
            apex_conv >= 0.12 and
            (crossbar >= 0.25 or a_geom_score >= 0.28) and
            bottom_closure <= 0.50
        )

        gate_b_passed = (
            left_stem >= 0.10 and
            upper_loop >= 0.05 and
            lower_loop >= 0.05 and
            d_singularity <= 0.50 and
            p_emptiness <= 0.50 and
            apex_conv <= 0.75
        )

        scores = {
            "prob_a": prob_a,
            "prob_b": prob_b,
            "prob_unknown": prob_u,
            "dist_a": dist_a,
            "dist_b": dist_b,
            "a_geom_score": a_geom_score,
            "b_geom_score": b_geom_score,
            "gate_a": 1.0 if gate_a_passed else 0.0,
            "gate_b": 1.0 if gate_b_passed else 0.0,
        }

        # 4. Decision Arbitration & Explicit Uncertainty Rejection
        margin = abs(prob_a - prob_b)

        # Candidate A
        if prob_a > prob_b and prob_a >= self.min_confidence_threshold:
            if not gate_a_passed:
                return CLASS_UNKNOWN, prob_u, "Failed A geometric verification gate (missing apex, crossbar, or closed base)", scores
            if margin < self.min_margin_threshold:
                return CLASS_UNKNOWN, prob_u, f"Insufficient margin between A and B ({margin:.3f} < {self.min_margin_threshold})", scores
            calibrated_conf = min(0.99, max(0.80, prob_a * 0.7 + a_geom_score * 0.3))
            return CLASS_A, calibrated_conf, "Confident A match", scores

        # Candidate B
        elif prob_b > prob_a and prob_b >= self.min_confidence_threshold:
            if not gate_b_passed:
                return CLASS_UNKNOWN, prob_u, "Failed B geometric verification gate (missing stem, loops, or waist indent)", scores
            if margin < self.min_margin_threshold:
                return CLASS_UNKNOWN, prob_u, f"Insufficient margin between B and A ({margin:.3f} < {self.min_margin_threshold})", scores
            calibrated_conf = min(0.99, max(0.80, prob_b * 0.7 + b_geom_score * 0.3))
            return CLASS_B, calibrated_conf, "Confident B match", scores

        # Uncertain / Low confidence / Unknown
        return CLASS_UNKNOWN, max(prob_u, 1.0 - max(prob_a, prob_b)), "Low confidence or non-A/B input rejected", scores

    def predict(self, raw_strokes: Strokes) -> Tuple[int, float, str, Dict[str, float]]:
        """
        Runs full end-to-end prediction on raw strokes.
        Applies input quality validation before feature extraction.
        """
        valid, msg = validate_sample_quality(raw_strokes)
        if not valid:
            return CLASS_UNKNOWN, 0.0, f"Quality check failed: {msg}", {}

        feat = extract_features(raw_strokes)
        return self.predict_features(feat)

    def to_dict(self) -> Dict[str, Any]:
        """Serializes model weights and parameters to a dictionary."""
        return {
            "version": self.version,
            "num_features": self.num_features,
            "weights_a": self.weights_a,
            "bias_a": self.bias_a,
            "weights_b": self.weights_b,
            "bias_b": self.bias_b,
            "bias_unknown": self.bias_unknown,
            "prototype_a": self.prototype_a,
            "prototype_b": self.prototype_b,
            "feature_weights": self.feature_weights,
            "min_confidence_threshold": self.min_confidence_threshold,
            "min_margin_threshold": self.min_margin_threshold,
            "temperature": self.temperature,
            "trained_samples_count": self.trained_samples_count,
            "created_timestamp": self.created_timestamp,
            "validation_metrics": self.validation_metrics,
        }

    def save_json(self, filepath: str):
        """Saves model to a JSON file."""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DedicatedABModel":
        """Loads model from a dictionary."""
        model = cls(version=data.get("version", "model_v1"))
        model.num_features = data.get("num_features", NUM_FEATURES)
        model.weights_a = data.get("weights_a", [0.0] * model.num_features)
        model.bias_a = data.get("bias_a", 0.0)
        model.weights_b = data.get("weights_b", [0.0] * model.num_features)
        model.bias_b = data.get("bias_b", 0.0)
        model.bias_unknown = data.get("bias_unknown", 0.5)
        model.prototype_a = data.get("prototype_a", [0.0] * model.num_features)
        model.prototype_b = data.get("prototype_b", [0.0] * model.num_features)
        model.feature_weights = data.get("feature_weights", [1.0] * model.num_features)
        model.min_confidence_threshold = data.get("min_confidence_threshold", 0.75)
        model.min_margin_threshold = data.get("min_margin_threshold", 0.20)
        model.temperature = data.get("temperature", 1.0)
        model.trained_samples_count = data.get("trained_samples_count", 0)
        model.created_timestamp = data.get("created_timestamp", 0.0)
        model.validation_metrics = data.get("validation_metrics", {})
        return model

    @classmethod
    def from_json(cls, filepath: str) -> "DedicatedABModel":
        """Loads model from a JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
