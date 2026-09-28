"""
Tests for Multi-Drawing Learning Sessions in A/B SLM
"""

import unittest
from slm_ab.learning_session import LearningSession, SessionState
from slm_ab.dataset import get_datasets, get_base_a_styles, get_base_b_styles, transform_strokes
from slm_ab.train import train_ab_slm
from slm_ab.model import CLASS_A, CLASS_B

class TestLearningSession(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        data = get_datasets(num_a=150, num_b=150, num_unknown=180, seed=42)
        cls.base_model = train_ab_slm(data["train"], data["val"], version="base_v1")
        cls.datasets = data

    def test_learning_session_full_lifecycle_for_a(self):
        session = LearningSession(target_label="A", base_model=self.base_model, min_required_samples=3)
        self.assertEqual(session.state, SessionState.COLLECTING_EXAMPLES)

        # Draw 3 varied A's
        styles = get_base_a_styles()
        for i in range(3):
            s = transform_strokes(styles[i], scale_x=0.9, scale_y=1.1, angle_rad=0.05 * i)
            ok, msg, meta = session.add_drawing(s)
            self.assertTrue(ok, f"Failed to add drawing {i}: {msg}")

        # Check sufficiency
        self.assertEqual(session.state, SessionState.SUFFICIENT_EXAMPLES_COLLECTED)
        self.assertEqual(len(session.samples), 3)

        # Train candidate
        ok_tr, msg_tr = session.train_candidate(self.datasets)
        self.assertTrue(ok_tr, msg_tr)
        self.assertIsNotNone(session.candidate_model)

        # Validate and promote
        ok_val, msg_val, metrics = session.validate_and_promote(self.datasets["test"])
        self.assertTrue(ok_val, f"Validation failed: {msg_val}")
        self.assertEqual(session.state, SessionState.PROMOTED)
        self.assertIsNotNone(session.promoted_model)

    def test_quality_control_rejects_empty_and_contradictory(self):
        session = LearningSession(target_label="A", base_model=self.base_model, min_required_samples=3)

        # Empty stroke
        ok_empty, msg_empty, _ = session.add_drawing([])
        self.assertFalse(ok_empty)

        # Contradictory shape (drawing B when learning A)
        b_strokes = get_base_b_styles()[0]
        ok_contra, msg_contra, _ = session.add_drawing(b_strokes)
        self.assertFalse(ok_contra)
        self.assertIn("inconsistent with Letter A", msg_contra)

if __name__ == "__main__":
    unittest.main()
