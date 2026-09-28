"""
Tests for Letter 'A' Recognition across styles in A/B SLM
"""

import unittest
from slm_ab.dataset import get_base_a_styles, generate_samples_for_letter, transform_strokes
from slm_ab.train import train_ab_slm
from slm_ab.dataset import get_datasets
from slm_ab.model import CLASS_A

class TestLetterA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        data = get_datasets(num_a=200, num_b=200, num_unknown=250, seed=42)
        cls.model = train_ab_slm(data["train"], data["val"], version="test_model_a")

    def test_canonical_styles_a(self):
        styles = get_base_a_styles()
        for idx, s in enumerate(styles):
            pred_cls, conf, reason, _ = self.model.predict(s)
            self.assertEqual(pred_cls, CLASS_A, f"Failed on canonical A style {idx}: {reason}")
            self.assertGreaterEqual(conf, 0.75)

    def test_variations_a(self):
        samples = generate_samples_for_letter(get_base_a_styles(), "A", 30, seed=777)
        correct = 0
        for s in samples:
            pred_cls, conf, _, _ = self.model.predict(s["strokes"])
            if pred_cls == CLASS_A and conf >= 0.70:
                correct += 1
        acc = correct / len(samples)
        self.assertGreaterEqual(acc, 0.85, f"Letter A variation accuracy ({acc:.2f}) below 85%")

if __name__ == "__main__":
    unittest.main()
