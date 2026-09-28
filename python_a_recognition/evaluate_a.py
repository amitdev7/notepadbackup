"""
Evaluation benchmark for the dedicated Letter 'A' recognition model.
Evaluates on strictly unseen held-out positive 'A' variations and hard negatives.
Verifies the Phase 12 acceptance criteria:
- 100% accuracy on defined held-out corpus
- 0 false positives on hard negatives
- 0 false negatives
"""

import os
import time
from typing import List, Dict, Any
from .model_a import LetterAModel
from .dataset_a import create_letter_a_dataset
from .hard_negatives import create_hard_negatives_dataset
from .metrics_a import compute_recognition_metrics

def run_evaluation() -> Dict[str, Any]:
    print("================================================================")
    print("   EVALUATING DEDICATED LETTER 'A' HELD-OUT TEST BENCHMARK      ")
    print("================================================================")
    
    model_path = os.path.join(os.path.dirname(__file__), "model_a.json")
    model = LetterAModel()
    if os.path.exists(model_path):
        model.load(model_path)
        print(f"Loaded trained model from {model_path} (Threshold: {model.acceptance_threshold})")
    else:
        print("Model file not found. Running training first...")
        from .train_a import train
        model = train()

    # Generate held-out test sets with distinct unseen seeds
    # Positive test seed: 9999
    # Negative test seed: 8888
    pos_test = create_letter_a_dataset(num_samples=250, seed=9999)
    neg_test = create_hard_negatives_dataset(num_samples=250, seed=8888)
    
    print(f"Evaluating {len(pos_test)} unseen held-out positive 'A' variations...")
    pos_preds = []
    pos_confs = []
    pos_latencies = []
    
    for s in pos_test:
        t0 = time.perf_counter()
        res = model.predict(s["strokes"])
        lat = (time.perf_counter() - t0) * 1000.0
        pos_latencies.append(lat)
        pos_preds.append(res["accepted"])
        pos_confs.append(res["confidence"])
        
    pos_metrics = compute_recognition_metrics(
        ground_truth=[True] * len(pos_test),
        predictions=pos_preds,
        confidences=pos_confs,
        latencies_ms=pos_latencies
    )
    
    print(f"Evaluating {len(neg_test)} unseen hard-negative samples...")
    neg_preds = []
    neg_confs = []
    neg_latencies = []
    
    for s in neg_test:
        t0 = time.perf_counter()
        res = model.predict(s["strokes"])
        lat = (time.perf_counter() - t0) * 1000.0
        neg_latencies.append(lat)
        neg_preds.append(res["accepted"])
        neg_confs.append(res["confidence"])
        
    neg_metrics = compute_recognition_metrics(
        ground_truth=[False] * len(neg_test),
        predictions=neg_preds,
        confidences=neg_confs,
        latencies_ms=neg_latencies
    )
    
    # Combined metrics
    combined_gt = [True] * len(pos_test) + [False] * len(neg_test)
    combined_preds = pos_preds + neg_preds
    combined_confs = pos_confs + neg_confs
    combined_latencies = pos_latencies + neg_latencies
    
    combined_metrics = compute_recognition_metrics(
        ground_truth=combined_gt,
        predictions=combined_preds,
        confidences=combined_confs,
        latencies_ms=combined_latencies
    )
    
    print("\n------------------ BENCHMARK RESULTS TABLE ------------------")
    print(f"| Dataset        | Samples | Correct | Incorrect | Accuracy |")
    print(f"| -------------- | ------: | ------: | --------: | -------: |")
    print(f"| Held-out A     | {len(pos_test):>7} | {pos_metrics['true_positives']:>7} | {pos_metrics['false_negatives']:>9} | {pos_metrics['accuracy'] * 100:>7.1f}% |")
    print(f"| Hard negatives | {len(neg_test):>7} | {neg_metrics['true_negatives']:>7} | {neg_metrics['false_positives']:>9} | {neg_metrics['accuracy'] * 100:>7.1f}% |")
    print(f"| Combined test  | {len(combined_gt):>7} | {combined_metrics['true_positives'] + combined_metrics['true_negatives']:>7} | {combined_metrics['false_positives'] + combined_metrics['false_negatives']:>9} | {combined_metrics['accuracy'] * 100:>7.1f}% |")
    print("-------------------------------------------------------------")
    print(f"Average Inference Latency: {combined_metrics['average_latency_ms']} ms/sample")
    print(f"False Positives: {combined_metrics['false_positives']}")
    print(f"False Negatives: {combined_metrics['false_negatives']}")
    
    if combined_metrics["accuracy"] == 1.0 and combined_metrics["false_positives"] == 0:
        print("\n>>> CRITERIA MET: 100% ACCURACY & ZERO FALSE POSITIVES ON TEST CORPUS! <<<")
    else:
        print(f"\n>>> CRITERIA NOT MET: Accuracy={combined_metrics['accuracy'] * 100}%, FP={combined_metrics['false_positives']}, FN={combined_metrics['false_negatives']}")
        
    return {
        "pos_metrics": pos_metrics,
        "neg_metrics": neg_metrics,
        "combined_metrics": combined_metrics
    }

if __name__ == "__main__":
    run_evaluation()
