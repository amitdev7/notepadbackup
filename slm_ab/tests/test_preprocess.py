"""
Tests for Preprocessing & Normalization in A/B SLM
"""

import unittest
from slm_ab.preprocess import (
    clean_stroke,
    clean_strokes,
    resample_stroke,
    normalize_strokes,
    get_strokes_bounds,
    validate_sample_quality,
)

class TestPreprocess(unittest.TestCase):

    def test_clean_stroke_removes_duplicates_and_nan(self):
        stroke = [(0.0, 0.0), (0.0001, 0.0001), (10.0, 10.0), (float("nan"), 5.0), (10.0, 10.0), (20.0, 20.0)]
        cleaned = clean_stroke(stroke, min_dist=0.01)
        self.assertEqual(len(cleaned), 3)
        self.assertEqual(cleaned[0], (0.0, 0.0))
        self.assertEqual(cleaned[1], (10.0, 10.0))
        self.assertEqual(cleaned[2], (20.0, 20.0))

    def test_resample_stroke_fixed_points(self):
        stroke = [(0.0, 0.0), (100.0, 0.0)]
        resampled = resample_stroke(stroke, num_points=32)
        self.assertEqual(len(resampled), 32)
        self.assertAlmostEqual(resampled[0][0], 0.0)
        self.assertAlmostEqual(resampled[-1][0], 100.0)
        self.assertAlmostEqual(resampled[16][0], 51.61, delta=1.0)

    def test_normalize_strokes_bounds(self):
        raw = [[(10.0, 20.0), (110.0, 20.0), (110.0, 220.0)]]
        norm, bounds = normalize_strokes(raw, target_size=1.0, margin=0.05)
        self.assertAlmostEqual(bounds["w"], 100.0)
        self.assertAlmostEqual(bounds["h"], 200.0)
        all_norm_pts = [p for s in norm for p in s]
        min_x = min(p[0] for p in all_norm_pts)
        max_x = max(p[0] for p in all_norm_pts)
        min_y = min(p[1] for p in all_norm_pts)
        max_y = max(p[1] for p in all_norm_pts)
        self.assertGreaterEqual(min_x, 0.04)
        self.assertLessEqual(max_x, 0.96)
        self.assertGreaterEqual(min_y, 0.04)
        self.assertLessEqual(max_y, 0.96)

    def test_validate_sample_quality_rejection(self):
        # Empty
        v1, _ = validate_sample_quality([])
        self.assertFalse(v1)

        # Too small
        v2, _ = validate_sample_quality([[(1.0, 1.0), (2.0, 2.0)]])
        self.assertFalse(v2)

        # Valid stroke
        valid_stroke = [[(0.0, 0.0), (20.0, 50.0), (40.0, 0.0), (10.0, 25.0), (30.0, 25.0), (35.0, 25.0)]]
        v3, msg = validate_sample_quality(valid_stroke)
        self.assertTrue(v3, msg)

if __name__ == "__main__":
    unittest.main()
