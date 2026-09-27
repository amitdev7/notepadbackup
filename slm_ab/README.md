# Zenithsui Dedicated A/B Handwriting SLM Pipeline

A lightweight, deterministic handwriting-recognition model pipeline focused exclusively on recognizing handwritten uppercase **A** and **B**, with strict uncertainty rejection (**UNKNOWN**) and multi-drawing learning workflow.

## Target Architecture

- **Active Classes**:
  * `A` (Class ID 0)
  * `B` (Class ID 1)
  * `UNKNOWN` (Class ID 2)
- **Frozen Classes**:
  * All remaining letters (`C` through `Z`) and digits (`0` through `9`), geometry, symbols, and objects are frozen and preserved in `recognition_backup/frozen_non_ab/` with cryptographic SHA-256 manifest verification.

## Capabilities

1. **Deterministic Feature Extraction (48 features)**:
   - Stroke resampling, coordinate normalization, aspect ratio preservation.
   - Domain-specific topological descriptors:
     * Apex convergence & apex location.
     * Horizontal mid-crossbar detection, span, and vertical position.
     * Bottom leg openness vs. closed base rejection (A vs Triangle).
     * Straight left vertical stem detection (span and variance).
     * Stacked double loop convexity and area (upper vs lower loop).
     * Middle waist indentation ratio (B vs D disambiguation).
     * D-loop singularity rejection (single giant loop without waist indent).
     * P-loop emptiness rejection (missing lower loop).
     * 8 figure-eight rejection (no straight left stem).
   - Horizontal and vertical projection profiles (8 bins each).
   - Stroke dynamics, curvature variance, symmetry, and endpoint metrics.

2. **Inference & Uncertainty Rejection**:
   - Prototype distance metric learning + linear discriminant perceptron scoring.
   - Dual geometric verification gates for A and B.
   - Temperature-scaled softmax probabilities and margin thresholding.
   - Rejection threshold: Any ambiguous drawing, insufficient margin, or non-matching geometry yields `UNKNOWN`.

3. **Multi-Drawing Learning Mode**:
   - `LearningSession` state machine:
     `COLLECTING_EXAMPLES` -> `SUFFICIENT_EXAMPLES_COLLECTED` -> `TRAINING_CANDIDATE_MODEL` -> `VALIDATING_CANDIDATE_MODEL` -> `PROMOTED` / `REJECTED_SESSION`
   - Quality control: discards empty, degenerate, or contradictory drawings.
   - Candidate model training with user samples.
   - Hard negatives validation (Triangle, V, Lambda, H, X, 4, P, R, D, 8, scribbles, zigzags) before promotion.
   - Automatic rollback and version tracking via `ModelRegistry`.

## Running Tests

```bash
python3 -m unittest discover -s slm_ab/tests
```
