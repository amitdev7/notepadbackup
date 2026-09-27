"""
Zenithsui A/B SLM — Model Training Engine
Trains feature prototypes, discriminative weights, and margin parameters.
"""

import time
import math
import random
from typing import List, Dict, Any, Tuple
from .model import DedicatedABModel, CLASS_A, CLASS_B, CLASS_UNKNOWN
from .features import extract_features, NUM_FEATURES
from .preprocess import validate_sample_quality

def compute_mean_vector(vectors: List[List[float]]) -> List[float]:
    """Computes coordinate-wise mean across a list of vectors."""
    if not vectors:
        return [0.0] * NUM_FEATURES
    n = len(vectors)
    mean = [0.0] * NUM_FEATURES
    for v in vectors:
        for i in range(NUM_FEATURES):
            mean[i] += v[i]
    return [x / n for x in mean]

def train_ab_slm(
    train_samples: List[Dict[str, Any]],
    val_samples: List[Dict[str, Any]] = None,
    version: str = "model_v1",
    epochs: int = 40,
    learning_rate: float = 0.05,
    seed: int = 42
) -> DedicatedABModel:
    """
    Trains a DedicatedABModel on vector stroke data.
    """
    rng = random.Random(seed)
    model = DedicatedABModel(version=version)
    model.created_timestamp = time.time()

    # 1. Extract features for training samples
    a_feats: List[List[float]] = []
    b_feats: List[List[float]] = []
    unk_feats: List[List[float]] = []

    for s in train_samples:
        lbl = s["label"]
        raw = s["strokes"]
        valid, _ = validate_sample_quality(raw)
        if not valid:
            continue
        feat = extract_features(raw)
        if lbl == "A":
            a_feats.append(feat)
        elif lbl == "B":
            b_feats.append(feat)
        else:
            unk_feats.append(feat)

    if not a_feats or not b_feats:
        raise ValueError(f"Insufficient training data: A={len(a_feats)}, B={len(b_feats)}")

    # 2. Compute Class Prototypes
    proto_a = compute_mean_vector(a_feats)
    proto_b = compute_mean_vector(b_feats)
    proto_unk = compute_mean_vector(unk_feats) if unk_feats else [0.0] * NUM_FEATURES

    model.prototype_a = proto_a
    model.prototype_b = proto_b

    # 3. Compute Feature Relevance Weights (Diagonal metric learning)
    # Higher weights for dimensions where A and B strongly differ
    feat_weights = [1.0] * NUM_FEATURES
    for i in range(NUM_FEATURES):
        diff_ab = abs(proto_a[i] - proto_b[i])
        var_a = sum((v[i] - proto_a[i]) ** 2 for v in a_feats) / max(len(a_feats), 1)
        var_b = sum((v[i] - proto_b[i]) ** 2 for v in b_feats) / max(len(b_feats), 1)
        intra_var = max((var_a + var_b) / 2.0, 1e-4)
        fisher_ratio = (diff_ab ** 2) / intra_var
        feat_weights[i] = max(0.5, min(4.0, 1.0 + fisher_ratio * 0.5))

    # Prioritize domain-critical geometric dimensions
    # A features: idx 8 (apex_conv), 10 (crossbar), 14 (bottom_closure), 15 (a_geom)
    feat_weights[8] *= 2.5
    feat_weights[10] *= 2.5
    feat_weights[14] *= 2.0
    feat_weights[15] *= 2.5

    # B features: idx 16 (stem), 18 (upper loop), 19 (lower loop), 20 (waist), 25 (b_geom)
    feat_weights[16] *= 2.5
    feat_weights[18] *= 2.5
    feat_weights[19] *= 2.5
    feat_weights[20] *= 2.5
    feat_weights[25] *= 2.5

    model.feature_weights = feat_weights

    # 4. Multiclass Logistic / Cross-Entropy Optimization
    w_a = [0.0] * NUM_FEATURES
    w_b = [0.0] * NUM_FEATURES
    w_u = [0.0] * NUM_FEATURES
    b_a = 0.0
    b_b = 0.0
    b_u = 0.0

    all_train = []
    for f in a_feats:
        all_train.append((f, CLASS_A))
    for f in b_feats:
        all_train.append((f, CLASS_B))
    for f in unk_feats:
        all_train.append((f, CLASS_UNKNOWN))

    for epoch in range(epochs):
        rng.shuffle(all_train)
        cur_lr = learning_rate * (1.0 - (epoch / epochs) * 0.5)

        for feat, target in all_train:
            z_a = sum(w_a[i] * feat[i] for i in range(NUM_FEATURES)) + b_a
            z_b = sum(w_b[i] * feat[i] for i in range(NUM_FEATURES)) + b_b
            z_u = sum(w_u[i] * feat[i] for i in range(NUM_FEATURES)) + b_u

            max_z = max(z_a, z_b, z_u)
            ea = math.exp(z_a - max_z)
            eb = math.exp(z_b - max_z)
            eu = math.exp(z_u - max_z)
            sz = ea + eb + eu
            pa, pb, pu = ea / sz, eb / sz, eu / sz

            ga = pa - (1.0 if target == CLASS_A else 0.0)
            gb = pb - (1.0 if target == CLASS_B else 0.0)
            gu = pu - (1.0 if target == CLASS_UNKNOWN else 0.0)

            for i in range(NUM_FEATURES):
                w_a[i] -= cur_lr * (ga * feat[i] + 0.0001 * w_a[i])
                w_b[i] -= cur_lr * (gb * feat[i] + 0.0001 * w_b[i])
                w_u[i] -= cur_lr * (gu * feat[i] + 0.0001 * w_u[i])
            b_a -= cur_lr * ga
            b_b -= cur_lr * gb
            b_u -= cur_lr * gu

    # Set parameters relative to unknown reference
    model.weights_a = [w_a[i] - w_u[i] for i in range(NUM_FEATURES)]
    model.weights_b = [w_b[i] - w_u[i] for i in range(NUM_FEATURES)]
    model.bias_a = b_a - b_u
    model.bias_b = b_b - b_u
    model.bias_unknown = 0.0
    model.min_confidence_threshold = 0.65
    model.trained_samples_count = len(train_samples)

    # 6. Evaluate on validation set if provided
    if val_samples:
        correct = 0
        total = 0
        for s in val_samples:
            raw = s["strokes"]
            lbl = s["label"]
            pred_cls, conf, _, _ = model.predict(raw)
            expected = CLASS_A if lbl == "A" else (CLASS_B if lbl == "B" else CLASS_UNKNOWN)
            if pred_cls == expected:
                correct += 1
            total += 1
        acc = correct / max(total, 1)
        model.validation_metrics = {
            "val_accuracy": round(acc, 4),
            "val_samples": total,
        }

    return model
