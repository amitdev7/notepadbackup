"""
Zenithsui A/B SLM — Multi-Drawing Learning Session Engine
Orchestrates sample collection, quality validation, candidate model training,
hard-negative validation, and safe model promotion.
"""

import time
import uuid
from enum import Enum
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

from .model import DedicatedABModel, CLASS_A, CLASS_B, CLASS_UNKNOWN
from .preprocess import Strokes, clean_strokes, validate_sample_quality, get_strokes_bounds
from .features import extract_features
from .train import train_ab_slm
from .evaluate import evaluate_model
from .dataset import get_datasets

class SessionState(str, Enum):
    IDLE = "IDLE"
    COLLECTING_EXAMPLES = "COLLECTING_EXAMPLES"
    SUFFICIENT_EXAMPLES_COLLECTED = "SUFFICIENT_EXAMPLES_COLLECTED"
    TRAINING_CANDIDATE_MODEL = "TRAINING_CANDIDATE_MODEL"
    VALIDATING_CANDIDATE_MODEL = "VALIDATING_CANDIDATE_MODEL"
    PROMOTED = "PROMOTED"
    REJECTED_SESSION = "REJECTED_SESSION"

@dataclass
class LearningSample:
    sample_id: str
    timestamp: float
    strokes: Strokes
    label: str               # "A" or "B"
    quality_score: float     # [0.0, 1.0]
    features: List[float]
    bounds: Dict[str, float]

class LearningSession:
    """
    Manages a multi-drawing learning session for user-assisted handwriting learning of A or B.
    """

    def __init__(
        self,
        target_label: str,
        base_model: DedicatedABModel,
        min_required_samples: int = 3,
        max_allowed_samples: int = 10,
        session_id: Optional[str] = None
    ):
        if target_label not in ("A", "B"):
            raise ValueError(f"Invalid target label '{target_label}', must be 'A' or 'B'.")

        self.session_id = session_id or f"session_{uuid.uuid4().hex[:8]}"
        self.target_label = target_label
        self.base_model = base_model
        self.min_required_samples = min_required_samples
        self.max_allowed_samples = max_allowed_samples

        self.state: SessionState = SessionState.COLLECTING_EXAMPLES
        self.samples: List[LearningSample] = []
        self.candidate_model: Optional[DedicatedABModel] = None
        self.promoted_model: Optional[DedicatedABModel] = None
        self.session_log: List[str] = []
        self.rejection_reason: Optional[str] = None

        self._log(f"Initialized learning session {self.session_id} for Letter '{self.target_label}' (target: {min_required_samples} samples)")

    def _log(self, message: str):
        entry = f"[{time.strftime('%H:%M:%S')}] {message}"
        self.session_log.append(entry)

    def add_drawing(self, strokes: Strokes) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Adds a new user drawing to the session.
        Applies strict quality validation (detects empty, degenerate, or chaotic strokes).
        """
        if self.state not in (SessionState.COLLECTING_EXAMPLES, SessionState.SUFFICIENT_EXAMPLES_COLLECTED):
            return False, f"Session is in '{self.state}' state and not accepting new drawings.", {}

        if len(self.samples) >= self.max_allowed_samples:
            return False, f"Maximum sample limit ({self.max_allowed_samples}) reached.", {}

        # 1. Quality validation
        valid, err = validate_sample_quality(strokes)
        if not valid:
            self._log(f"Rejected sample: {err}")
            return False, f"Sample rejected by quality control: {err}", {}

        # 2. Quality scoring
        cleaned = clean_strokes(strokes)
        bounds = get_strokes_bounds(cleaned)
        features = extract_features(cleaned)

        # Basic consistency check: ensure drawing isn't an obvious complete opposite
        # (e.g. user selected learning 'A' but drew a double-loop B)
        if self.target_label == "A" and (features[25] > 0.60 or features[20] > 0.35):
            self._log("Rejected sample: Drawing has double right-loops inconsistent with Letter A")
            return False, "Sample appears inconsistent with Letter A (detected double right loops). Please draw an A.", {}
        if self.target_label == "B" and (features[14] > 0.50 or (features[8] > 0.60 and features[15] > 0.55)):
            self._log("Rejected sample: Drawing has apex/triangle characteristics inconsistent with Letter B")
            return False, "Sample appears inconsistent with Letter B. Please draw a B.", {}

        quality_score = round(min(1.0, 0.7 + 0.3 * (features[15] if self.target_label == "A" else features[25])), 3)

        sample = LearningSample(
            sample_id=f"sample_{len(self.samples) + 1}",
            timestamp=time.time(),
            strokes=cleaned,
            label=self.target_label,
            quality_score=quality_score,
            features=features,
            bounds=bounds,
        )
        self.samples.append(sample)
        self._log(f"Accepted sample {len(self.samples)}/{self.min_required_samples} (quality={quality_score})")

        # Check sufficiency
        if len(self.samples) >= self.min_required_samples:
            self.state = SessionState.SUFFICIENT_EXAMPLES_COLLECTED
            prompt = f"Sufficient examples collected ({len(self.samples)}/{self.min_required_samples}). Ready to train candidate model."
        else:
            prompt = f"Sample {len(self.samples)} accepted. Please provide {self.min_required_samples - len(self.samples)} more example(s)."

        return True, prompt, {
            "session_id": self.session_id,
            "samples_collected": len(self.samples),
            "samples_required": self.min_required_samples,
            "can_train": len(self.samples) >= self.min_required_samples,
            "sample_id": sample.sample_id,
            "quality_score": sample.quality_score,
        }

    def train_candidate(self, base_dataset: Optional[Dict[str, List[Dict[str, Any]]]] = None) -> Tuple[bool, str]:
        """
        Trains a candidate model incorporating the user's collected samples.
        """
        if len(self.samples) < self.min_required_samples:
            return False, f"Not enough samples to train ({len(self.samples)} < {self.min_required_samples})."

        self.state = SessionState.TRAINING_CANDIDATE_MODEL
        self._log("Starting candidate model training with augmented user samples...")

        # Prepare augmented dataset
        if base_dataset is None:
            base_dataset = get_datasets(num_a=150, num_b=150, num_unknown=200, seed=42)

        augmented_train = list(base_dataset["train"])

        # Add user samples with high replication weight
        for s in self.samples:
            for _ in range(5):
                augmented_train.append({
                    "label": self.target_label,
                    "strokes": s.strokes,
                    "variation": f"user_{self.session_id}",
                })

        # Train candidate
        candidate_version = f"{self.base_model.version}_candidate_{self.target_label}_{self.session_id[:6]}"
        self.candidate_model = train_ab_slm(
            train_samples=augmented_train,
            val_samples=base_dataset["val"],
            version=candidate_version,
            epochs=30
        )

        self.state = SessionState.VALIDATING_CANDIDATE_MODEL
        self._log(f"Candidate model {candidate_version} trained successfully. Proceeding to validation.")
        return True, f"Candidate model {candidate_version} trained. Now validating."

    def validate_and_promote(
        self,
        test_dataset: Optional[List[Dict[str, Any]]] = None,
        min_rejection_rate: float = 0.88,
        max_negative_false_rate: float = 0.06
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates the candidate model against held-out tests and hard negatives.
        If stable and safe, promotes the candidate model.
        """
        if self.candidate_model is None:
            return False, "No candidate model to validate. Call train_candidate() first.", {}

        self.state = SessionState.VALIDATING_CANDIDATE_MODEL
        self._log("Validating candidate model on benchmark and hard negatives...")

        if test_dataset is None:
            full_data = get_datasets(num_a=100, num_b=100, num_unknown=140, seed=999)
            test_dataset = full_data["test"]

        metrics = evaluate_model(self.candidate_model, test_dataset)

        # Criteria checks:
        # 1. User's collected samples must all be correctly recognized
        user_correct = 0
        for s in self.samples:
            cls_pred, conf, _, _ = self.candidate_model.predict(s.strokes)
            expected = CLASS_A if self.target_label == "A" else CLASS_B
            if cls_pred == expected and conf >= self.candidate_model.min_confidence_threshold:
                user_correct += 1

        user_acc = user_correct / len(self.samples)

        # 2. Hard negatives rejection
        unk_rate = metrics["unknown_rejection"]["rejection_rate"]
        false_a = metrics["unknown_rejection"]["false_a_rate"]
        false_b = metrics["unknown_rejection"]["false_b_rate"]

        passed = (
            user_acc >= 0.85 and
            unk_rate >= min_rejection_rate and
            false_a <= max_negative_false_rate and
            false_b <= max_negative_false_rate
        )

        if passed:
            self.state = SessionState.PROMOTED
            self.promoted_model = self.candidate_model
            self._log(f"Model PROMOTED! (User Acc={user_acc*100:.1f}%, Unk Rejection={unk_rate*100:.1f}%)")
            return True, f"Candidate model successfully validated and promoted to active recognition for Letter {self.target_label}.", metrics
        else:
            self.state = SessionState.REJECTED_SESSION
            reason = f"Validation failed: User Acc={user_acc*100:.1f}%, Rejection Rate={unk_rate*100:.1f}%, False A={false_a*100:.1f}%, False B={false_b*100:.1f}%"
            self.rejection_reason = reason
            self._log(reason)
            return False, f"Model promotion rejected: {reason}. Retaining previous model.", metrics
