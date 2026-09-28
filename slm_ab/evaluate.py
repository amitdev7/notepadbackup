"""
Zenithsui A/B SLM — Evaluation & Benchmarking Suite
Computes multi-class confusion matrix, precision, recall, F1, rejection rates, and latency.
"""

import time
from typing import List, Dict, Any, Tuple
from .model import DedicatedABModel, CLASS_A, CLASS_B, CLASS_UNKNOWN, CLASS_NAMES

def evaluate_model(
    model: DedicatedABModel,
    test_samples: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates model on test_samples and computes comprehensive performance metrics.
    """
    # Confusion matrix: matrix[actual][predicted]
    # 0: A, 1: B, 2: UNKNOWN
    matrix = {
        0: {0: 0, 1: 0, 2: 0},
        1: {0: 0, 1: 0, 2: 0},
        2: {0: 0, 1: 0, 2: 0},
    }

    latencies_ms = []

    for s in test_samples:
        lbl = s["label"]
        actual = CLASS_A if lbl == "A" else (CLASS_B if lbl == "B" else CLASS_UNKNOWN)

        t0 = time.perf_counter()
        pred, conf, reason, _ = model.predict(s["strokes"])
        lat = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(lat)

        matrix[actual][pred] += 1

    # Class-specific counts
    tp_a = matrix[CLASS_A][CLASS_A]
    fp_a = matrix[CLASS_B][CLASS_A] + matrix[CLASS_UNKNOWN][CLASS_A]
    fn_a = matrix[CLASS_A][CLASS_B] + matrix[CLASS_A][CLASS_UNKNOWN]
    total_a = sum(matrix[CLASS_A].values())

    tp_b = matrix[CLASS_B][CLASS_B]
    fp_b = matrix[CLASS_A][CLASS_B] + matrix[CLASS_UNKNOWN][CLASS_B]
    fn_b = matrix[CLASS_B][CLASS_A] + matrix[CLASS_B][CLASS_UNKNOWN]
    total_b = sum(matrix[CLASS_B].values())

    total_unk = sum(matrix[CLASS_UNKNOWN].values())
    correct_unk = matrix[CLASS_UNKNOWN][CLASS_UNKNOWN]

    # Rates
    prec_a = tp_a / max(tp_a + fp_a, 1)
    rec_a = tp_a / max(total_a, 1)
    f1_a = 2 * (prec_a * rec_a) / max(prec_a + rec_a, 1e-9)

    prec_b = tp_b / max(tp_b + fp_b, 1)
    rec_b = tp_b / max(total_b, 1)
    f1_b = 2 * (prec_b * rec_b) / max(prec_b + rec_b, 1e-9)

    unk_rejection_rate = correct_unk / max(total_unk, 1)
    false_a_on_neg = matrix[CLASS_UNKNOWN][CLASS_A] / max(total_unk, 1)
    false_b_on_neg = matrix[CLASS_UNKNOWN][CLASS_B] / max(total_unk, 1)

    total_samples = len(test_samples)
    total_correct = tp_a + tp_b + correct_unk
    overall_accuracy = total_correct / max(total_samples, 1)

    mean_latency = sum(latencies_ms) / max(len(latencies_ms), 1)

    return {
        "overall_accuracy": round(overall_accuracy, 4),
        "total_samples": total_samples,
        "mean_latency_ms": round(mean_latency, 3),
        "letter_a": {
            "total": total_a,
            "correct": tp_a,
            "precision": round(prec_a, 4),
            "recall": round(rec_a, 4),
            "f1": round(f1_a, 4),
        },
        "letter_b": {
            "total": total_b,
            "correct": tp_b,
            "precision": round(prec_b, 4),
            "recall": round(rec_b, 4),
            "f1": round(f1_b, 4),
        },
        "unknown_rejection": {
            "total_negatives": total_unk,
            "correctly_rejected": correct_unk,
            "rejection_rate": round(unk_rejection_rate, 4),
            "false_a_rate": round(false_a_on_neg, 4),
            "false_b_rate": round(false_b_on_neg, 4),
        },
        "confusion_matrix": {
            "actual_A": matrix[CLASS_A],
            "actual_B": matrix[CLASS_B],
            "actual_UNKNOWN": matrix[CLASS_UNKNOWN],
        }
    }

def print_evaluation_report(metrics: Dict[str, Any]):
    """Pretty-prints evaluation metrics and confusion matrix."""
    print("=" * 60)
    print(f"ZENITHSUI A/B SLM EVALUATION REPORT (Accuracy: {metrics['overall_accuracy']*100:.1f}%)")
    print("=" * 60)
    print(f"Total Test Samples: {metrics['total_samples']} | Mean Latency: {metrics['mean_latency_ms']} ms")
    print("-" * 60)
    print(f"LETTER A:  Precision={metrics['letter_a']['precision']:.3f} | Recall={metrics['letter_a']['recall']:.3f} | F1={metrics['letter_a']['f1']:.3f}")
    print(f"LETTER B:  Precision={metrics['letter_b']['precision']:.3f} | Recall={metrics['letter_b']['recall']:.3f} | F1={metrics['letter_b']['f1']:.3f}")
    print(f"UNKNOWN:   Rejection Rate={metrics['unknown_rejection']['rejection_rate']*100:.1f}% | False A={metrics['unknown_rejection']['false_a_rate']*100:.2f}% | False B={metrics['unknown_rejection']['false_b_rate']*100:.2f}%")
    print("-" * 60)
    print("CONFUSION MATRIX:")
    print("                 Pred A      Pred B      Pred UNKNOWN")
    cm = metrics["confusion_matrix"]
    print(f"Actual A:        {cm['actual_A'][0]:<11} {cm['actual_A'][1]:<11} {cm['actual_A'][2]:<11}")
    print(f"Actual B:        {cm['actual_B'][0]:<11} {cm['actual_B'][1]:<11} {cm['actual_B'][2]:<11}")
    print(f"Actual UNKNOWN:  {cm['actual_UNKNOWN'][0]:<11} {cm['actual_UNKNOWN'][1]:<11} {cm['actual_UNKNOWN'][2]:<11}")
    print("=" * 60)
