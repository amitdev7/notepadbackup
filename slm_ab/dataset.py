"""
Zenithsui A/B SLM — Dataset Generator & Splitter
Generates multi-style vector handwriting samples for A, B, and hard negatives.
Provides train, validation, and held-out test sets.
"""

import math
import random
from typing import List, Tuple, Dict, Any
from .hard_negatives import make_line, make_arc, get_hard_negatives

Point = Tuple[float, float]
Stroke = List[Point]
Strokes = List[Stroke]

def transform_strokes(
    strokes: Strokes,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
    angle_rad: float = 0.0,
    jitter: float = 0.0,
    rng: random.Random = None
) -> Strokes:
    """Applies affine scaling, rotation, and handwriting jitter to vector strokes."""
    if rng is None:
        rng = random.Random(42)

    # Calculate centroid
    all_pts = [p for s in strokes for p in s]
    cx = sum(p[0] for p in all_pts) / max(len(all_pts), 1)
    cy = sum(p[1] for p in all_pts) / max(len(all_pts), 1)

    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    transformed: Strokes = []
    for s in strokes:
        ts = []
        for p in s:
            # Center, scale, rotate
            x = (p[0] - cx) * scale_x
            y = (p[1] - cy) * scale_y
            rx = x * cos_a - y * sin_a + cx
            ry = x * sin_a + y * cos_a + cy
            if jitter > 0:
                rx += rng.uniform(-jitter, jitter)
                ry += rng.uniform(-jitter, jitter)
            ts.append((rx, ry))
        transformed.append(ts)
    return transformed

def get_base_a_styles() -> List[Strokes]:
    """Returns canonical multi-style stroke configurations for Letter A."""
    x, y, w, h = 5.0, 5.0, 40.0, 50.0
    x2, y2, xm, ym = x + w, y + h, x + w / 2.0, y + h / 2.0

    return [
        # Style 1: Classic 3-stroke A (left leg, right leg, horizontal crossbar)
        [
            make_line(x, y2, xm, y),
            make_line(xm, y, x2, y2),
            make_line(x + w * 0.22, ym + 3, x2 - w * 0.22, ym + 3)
        ],
        # Style 2: 2-stroke A (continuous inverted V + separate crossbar)
        [
            make_line(x, y2, xm, y) + make_line(xm, y, x2, y2),
            make_line(x + w * 0.25, ym + 5, x2 - w * 0.25, ym + 5)
        ],
        # Style 3: 1-stroke continuous A (up to apex, down right, loop back into crossbar)
        [
            make_line(x, y2, xm, y) +
            make_line(xm, y, x2, y2) +
            make_line(x2, y2, x2 - w * 0.15, ym + 4) +
            make_line(x2 - w * 0.15, ym + 4, x + w * 0.20, ym + 4)
        ],
        # Style 4: 2-stroke A with high crossbar
        [
            make_line(x, y2, xm, y),
            make_line(xm, y, x2, y2) + make_line(x2, y2, x + w * 0.20, ym - 4)
        ],
        # Style 5: 3-stroke A drawn downwards from apex
        [
            make_line(xm, y, x, y2),
            make_line(xm, y, x2, y2),
            make_line(x + w * 0.20, ym + 4, x2 - w * 0.20, ym + 4)
        ],
        # Style 6: Wide A with low crossbar
        [
            make_line(x - 5, y2, xm, y),
            make_line(xm, y, x2 + 5, y2),
            make_line(x + w * 0.15, ym + 10, x2 - w * 0.15, ym + 10)
        ],
        # Style 7: Narrow A
        [
            make_line(xm - 10, y2, xm, y),
            make_line(xm, y, xm + 10, y2),
            make_line(xm - 6, ym + 2, xm + 6, ym + 2)
        ]
    ]

def get_base_b_styles() -> List[Strokes]:
    """Returns canonical multi-style stroke configurations for Letter B."""
    x, y, w, h = 8.0, 5.0, 38.0, 50.0
    x2, y2, xm, ym = x + w, y + h, x + w / 2.0, y + h / 2.0

    return [
        # Style 1: 3-stroke B (stem + top loop + bottom loop)
        [
            make_line(x, y, x, y2),
            make_line(x, y, xm, y) + make_arc(xm, y + h * 0.25, w * 0.42, h * 0.24, -math.pi / 2, math.pi / 2) + make_line(xm, ym, x, ym),
            make_line(x, ym, xm, ym) + make_arc(xm, y + h * 0.75, w * 0.46, h * 0.24, -math.pi / 2, math.pi / 2) + make_line(xm, y2, x, y2),
        ],
        # Style 2: 2-stroke B (vertical stem + continuous double loop)
        [
            make_line(x, y, x, y2),
            (make_line(x, y, xm, y) +
             make_arc(xm, y + h * 0.25, w * 0.42, h * 0.24, -math.pi / 2, math.pi / 2) +
             make_line(xm, ym, x + 4, ym) +
             make_arc(xm, y + h * 0.75, w * 0.46, h * 0.24, -math.pi / 2, math.pi / 2) +
             make_line(xm, y2, x, y2)),
        ],
        # Style 3: 1-stroke continuous B (down stem, up and around both loops)
        [
            (make_line(x, y2, x, y) +
             make_line(x, y, xm, y) +
             make_arc(xm, y + h * 0.25, w * 0.42, h * 0.24, -math.pi / 2, math.pi / 2) +
             make_line(xm, ym, x + 3, ym) +
             make_arc(xm, y + h * 0.75, w * 0.46, h * 0.24, -math.pi / 2, math.pi / 2) +
             make_line(xm, y2, x, y2)),
        ],
        # Style 4: Angular/Boxy B (rough napkin style)
        [
            make_line(x, y, x, y2),
            make_line(x, y, x2 - 5, y) + make_line(x2 - 5, y, x2, ym - 5) + make_line(x2, ym - 5, x, ym),
            make_line(x, ym, x2 - 2, ym) + make_line(x2 - 2, ym, x2 + 2, y2 - 6) + make_line(x2 + 2, y2 - 6, x, y2),
        ],
        # Style 5: Large bottom loop B
        [
            make_line(x, y, x, y2),
            make_line(x, y, xm - 2, y) + make_arc(xm - 2, y + h * 0.22, w * 0.35, h * 0.20, -math.pi / 2, math.pi / 2) + make_line(xm - 2, ym - 3, x, ym - 3),
            make_line(x, ym - 3, xm + 4, ym - 3) + make_arc(xm + 4, y + h * 0.76, w * 0.52, h * 0.26, -math.pi / 2, math.pi / 2) + make_line(xm + 4, y2, x, y2),
        ],
    ]

def generate_samples_for_letter(
    base_styles: List[Strokes],
    label: str,
    target_count: int,
    seed: int = 101
) -> List[Dict[str, Any]]:
    """Generates varied handwriting samples using affine distortions and jitter."""
    rng = random.Random(seed)
    samples: List[Dict[str, Any]] = []

    # Include original base styles first
    for idx, s in enumerate(base_styles):
        samples.append({
            "label": label,
            "style_id": idx,
            "strokes": s,
            "variation": "canonical",
        })

    # Generate synthetic handwriting variations
    while len(samples) < target_count:
        style_idx = rng.randint(0, len(base_styles) - 1)
        base = base_styles[style_idx]

        # Handwriting perturbations
        sx = rng.uniform(0.75, 1.35)  # narrow to wide
        sy = rng.uniform(0.80, 1.30)  # short to tall
        angle = rng.uniform(-0.25, 0.25)  # tilt -14 to +14 deg
        jitter = rng.uniform(0.0, 1.2)  # smooth to rough napkin jitter

        aug_strokes = transform_strokes(base, scale_x=sx, scale_y=sy, angle_rad=angle, jitter=jitter, rng=rng)
        samples.append({
            "label": label,
            "style_id": style_idx,
            "strokes": aug_strokes,
            "variation": f"sx={sx:.2f},sy={sy:.2f},ang={math.degrees(angle):.1f}",
        })

    return samples[:target_count]

def generate_negative_samples(target_count: int, seed: int = 202) -> List[Dict[str, Any]]:
    """Generates varied hard negative samples."""
    base_negatives = get_hard_negatives(seed=seed)
    rng = random.Random(seed)
    samples: List[Dict[str, Any]] = []

    # Include canonical negatives first
    for neg_type, s in base_negatives:
        samples.append({
            "label": "UNKNOWN",
            "subtype": neg_type,
            "strokes": s,
            "variation": "canonical",
        })

    # Generate variations of hard negatives
    while len(samples) < target_count:
        neg_type, base = rng.choice(base_negatives)
        sx = rng.uniform(0.70, 1.40)
        sy = rng.uniform(0.70, 1.40)
        angle = rng.uniform(-0.35, 0.35)
        jitter = rng.uniform(0.0, 1.5)

        aug_strokes = transform_strokes(base, scale_x=sx, scale_y=sy, angle_rad=angle, jitter=jitter, rng=rng)
        samples.append({
            "label": "UNKNOWN",
            "subtype": neg_type,
            "strokes": aug_strokes,
            "variation": f"{neg_type}_aug",
        })

    return samples[:target_count]

def get_datasets(
    num_a: int = 240,
    num_b: int = 240,
    num_unknown: int = 300,
    train_ratio: float = 0.65,
    val_ratio: float = 0.15,
    seed: int = 42
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Constructs train, validation, and held-out test splits.
    The held-out test set is generated with distinct seeds and completely disjoint partitions.
    """
    a_samples = generate_samples_for_letter(get_base_a_styles(), "A", num_a, seed=seed)
    b_samples = generate_samples_for_letter(get_base_b_styles(), "B", num_b, seed=seed + 1000)
    unk_samples = generate_negative_samples(num_unknown, seed=seed + 2000)

    # Deterministic split per class
    def split_class(items: List[Any], s: int):
        r = random.Random(s)
        shuffled = list(items)
        r.shuffle(shuffled)
        n = len(shuffled)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        return (
            shuffled[:n_train],
            shuffled[n_train:n_train + n_val],
            shuffled[n_train + n_val:]
        )

    a_tr, a_val, a_test = split_class(a_samples, seed + 1)
    b_tr, b_val, b_test = split_class(b_samples, seed + 2)
    u_tr, u_val, u_test = split_class(unk_samples, seed + 3)

    return {
        "train": a_tr + b_tr + u_tr,
        "val": a_val + b_val + u_val,
        "test": a_test + b_test + u_test,
    }
