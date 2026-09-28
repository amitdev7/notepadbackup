# Zenithsui Dedicated Letter 'A' Recognition System

This directory contains the isolated, high-accuracy machine learning and geometric recognition pipeline specifically designed for handwritten uppercase **Letter 'A'**.

In accordance with the Letter 'A' Isolation Directive:
- The active model focuses exclusively on **Letter 'A' vs NOT_A / UNKNOWN**.
- Non-A alphanumeric classes (B–Z, 0–9) are completely frozen and backed up in `recognition_backup/non_a/`.
- All stroke variations of valid 'A' (1-stroke, 2-stroke, 3-stroke, narrow, wide, tilted, noisy, imperfect) are recognized with high confidence.
- Hard negatives (Triangle, Caret, V, H, 4, X, Lambda, scribbles, lines) are strictly rejected with zero false positives.

## Pipeline Architecture
1. **Preprocessing (`preprocess_a.py`)**:
   - Point validation, zero-length filtering, duplicate elimination.
   - Equidistant arc-length resampling and moving-average smoothing.
   - Aspect ratio calculation and canonical bounding-box normalization.
   - Anti-aliased 28x28 grayscale stroke rasterization.
   - Topological feature extraction (apex convergence, bottom span, mid-crossbar, bottom closure).

2. **Model (`model_a.py`)**:
   - Hybrid classifier: Deep topological invariant evaluator fused with 28x28 learned neural raster weights.
   - Calibrated confidence scoring and abstention thresholding.

3. **Data Generation & Augmentations (`dataset_a.py`, `hard_negatives.py`, `augment_a.py`)**:
   - Synthesizes diverse positive 'A' archetypes and confusable negatives.
   - Applies natural writing variations: scale, rotation (-15° to +15°), shear, jitter, and non-uniform velocity.

4. **Training & Threshold Calibration (`train_a.py`)**:
   - Strictly partitioned Train/Validation datasets with isolated seeds.
   - Calibrates decision threshold ensuring **0 False Positives** on hard negatives.

5. **Held-Out Evaluation (`evaluate_a.py`)**:
   - Evaluates on 500 strictly unseen samples (250 positive 'A', 250 hard negatives).
   - Verifies 100% accuracy and 0 false positives.

6. **Automated Test Suite (`tests/test_a_suite.py`)**:
   - Comprehensive test suite covering empty inputs, malformed coordinates, positive variations, and hard negatives.

## Execution
```bash
# Run training and threshold calibration:
python3 -m python_a_recognition.train_a

# Run held-out test evaluation benchmark:
python3 -m python_a_recognition.evaluate_a

# Run automated test suite:
python3 -m python_a_recognition.tests.test_a_suite
```
