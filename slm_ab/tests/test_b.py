"""
Tests for Letter 'B' Recognition across styles in A/B SLM
"""

import unittest
from slm_ab.dataset import get_base_b_styles, generate_samples_for_letter
from slm_ab.train import train_ab_slm
from slm_ab.dataset import get_datasets
from slm_ab.model import CLASS_B

class TestLetterB(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        data = get_datasets(num_a=200, num_b=200, num_unknown=250, seed=42)
        cls.model = train_ab_slm(data["train"], data["val"], version="test_model_b")

    def test_canonical_styles_b(self):
        styles = get_base_b_styles()
        for idx, s in enumerate(styles):
            pred_cls, conf, reason, _ = self.model.predict(s)
            self.assertEqual(pred_cls, CLASS_B, f"Failed on canonical B style {idx}: {reason}")
            self.assertGreaterEqual(conf, 0.75)

    def test_variations_b(self):
        samples = generate_samples_for_letter(get_base_b_styles(), "B", 30, seed=888)
        correct = 0
        for s in samples:
            pred_cls, conf, _, _ = self.model.predict(s["strokes"])
            if pred_cls == CLASS_B and conf >= 0.70:
                correct += 1
        acc = correct / len(samples)
        self.assertGreaterEqual(acc, 0.85, f"Letter B variation accuracy ({acc:.2f}) below 85%")

if __name__ == "__main__":
    unittest.main()
