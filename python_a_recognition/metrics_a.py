"""
Metrics calculation module for binary Letter 'A' recognition.
Computes precision, recall, F1, specificity, false positive rate,
false rejection rate, confusion matrix, and latency statistics.
"""

from typing import List, Dict, Any

def compute_recognition_metrics(
    ground_truth: List[bool],
    predictions: List[bool],
    confidences: List[float],
    latencies_ms: List[float] = None
) -> Dict[str, Any]:
    """
    Computes comprehensive binary classification metrics.
    ground_truth: True if actually Letter A, False if NOT_A / Hard Negative.
    predictions: True if model predicted and accepted 'A', False if rejected.
    """
    n = len(ground_truth)
    if n == 0 or len(predictions) != n:
        return {"error": "Invalid input lengths"}
        
    tp = 0
    fp = 0
    tn = 0
    fn = 0
    
    for gt, pred in zip(ground_truth, predictions):
        if gt and pred:
            tp += 1
        elif not gt and pred:
            fp += 1
        elif not gt and not pred:
            tn += 1
        elif gt and not pred:
            fn += 1
            
    total_pos = tp + fn
    total_neg = tn + fp
    
    accuracy = (tp + tn) / n if n > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / total_pos if total_pos > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    specificity = tn / total_neg if total_neg > 0 else 1.0
    fpr = fp / total_neg if total_neg > 0 else 0.0
    frr = fn / total_pos if total_pos > 0 else 0.0
    
    avg_latency = (sum(latencies_ms) / len(latencies_ms)) if latencies_ms else 0.0
    max_latency = max(latencies_ms) if latencies_ms else 0.0
    
    return {
        "total_samples": n,
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "specificity": round(specificity, 4),
        "false_positive_rate": round(fpr, 4),
        "false_rejection_rate": round(frr, 4),
        "average_latency_ms": round(avg_latency, 3),
        "max_latency_ms": round(max_latency, 3),
        "zero_false_positives": fp == 0,
        "zero_false_negatives": fn == 0
    }
