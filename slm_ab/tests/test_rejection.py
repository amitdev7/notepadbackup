"""
Tests for Strict Rejection of Hard Negatives in A/B SLM
Verifies that confusable shapes (Triangle, V, Lambda, H, X, 4, P, R, D, 8, Scribble, Zigzag)
are reliably classified as UNKNOWN and never converted to A or B.
"""

import unittest
from slm_ab.hard_negatives import get_hard_negatives
from slm_ab.train import train_ab_slm
from slm_ab.dataset import get_datasets
from slm_ab.model import CLASS_A, CLASS_B, CLASS_UNKNOWN

class TestHardNegativeRejection(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        data = get_datasets(num_a=200, num_b=200, num_unknown=250, seed=42)
        cls.model = train_ab_slm(data["train"], data["val"], version="test_model_rej")

    def test_all_canonical_hard_negatives_rejected(self):
        negatives = get_hard_negatives()
        for neg_name, strokes in negatives:
            pred_cls, conf, reason, scores = self.model.predict(strokes)
            self.assertEqual(
                pred_cls,
                CLASS_UNKNOWN,
                f"Negative '{neg_name}' was NOT rejected! Predicted as {pred_cls} (conf={conf:.3f}, reason={reason})"
            )

    def test_triangle_vs_a_rejection(self):
        """Triangle has a closed base; must be rejected even though it has apex."""
        from slm_ab.hard_negatives import make_line
        triangle = [
            make_line(25, 5, 5, 55),
            make_line(5, 55, 45, 55),
            make_line(45, 55, 25, 5)
        ]
        pred_cls, conf, reason, _ = self.model.predict(triangle)
        self.assertEqual(pred_cls, CLASS_UNKNOWN, f"Triangle wrongly predicted as {pred_cls}: {reason}")

    def test_d_vs_b_rejection(self):
        """Letter D has a single continuous loop with no waist indentation; must NOT be recognized as B."""
        from slm_ab.hard_negatives import make_line, make_arc
        import math
        d_shape = [
            make_line(8, 5, 8, 55),
            make_line(8, 5, 20, 5) + make_arc(20, 30, 22, 25, -math.pi / 2, math.pi / 2) + make_line(20, 55, 8, 55),
        ]
        pred_cls, conf, reason, _ = self.model.predict(d_shape)
        self.assertNotEqual(pred_cls, CLASS_B, f"D wrongly predicted as B: {reason}")
        self.assertEqual(pred_cls, CLASS_UNKNOWN)

    def test_p_vs_b_rejection(self):
        """Letter P has only an upper loop; must NOT be recognized as B."""
        from slm_ab.hard_negatives import make_line, make_arc
        import math
        p_shape = [
            make_line(8, 5, 8, 55),
            make_line(8, 5, 25, 5) + make_arc(25, 18, 16, 13, -math.pi / 2, math.pi / 2) + make_line(25, 31, 8, 31),
        ]
        pred_cls, conf, reason, _ = self.model.predict(p_shape)
        self.assertNotEqual(pred_cls, CLASS_B, f"P wrongly predicted as B: {reason}")
        self.assertEqual(pred_cls, CLASS_UNKNOWN)

    def test_eight_vs_b_rejection(self):
        """Digit 8 has no vertical left stem; must NOT be recognized as B."""
        from slm_ab.hard_negatives import make_arc
        import math
        eight_shape = [
            make_arc(25, 18, 16, 13, 0, math.pi * 2) +
            make_arc(25, 42, 19, 14, 0, math.pi * 2)
        ]
        pred_cls, conf, reason, _ = self.model.predict(eight_shape)
        self.assertNotEqual(pred_cls, CLASS_B, f"8 wrongly predicted as B: {reason}")
        self.assertEqual(pred_cls, CLASS_UNKNOWN)

if __name__ == "__main__":
    unittest.main()
