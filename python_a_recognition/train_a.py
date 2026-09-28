"""
Training script for the dedicated Letter 'A' recognition model.
Generates isolated Train and Validation splits with augmentation and hard negatives.
Trains raster neural weights and tunes calibrated confidence thresholds.
Saves model to model_a.json.
"""

import os
import random
import time
import math
from typing import List, Dict, Any, Tuple
from .dataset_a import create_letter_a_dataset
from .hard_negatives import create_hard_negatives_dataset
from .augment_a import augment_strokes
from .preprocess_a import rasterize_strokes, validate_and_clean_strokes
from .model_a import LetterAModel
from .metrics_a import compute_recognition_metrics

def prepare_data(num_pos: int, num_neg: int, seed: int, augment: bool = True) -> List[Dict[str, Any]]:
    pos_samples = create_letter_a_dataset(num_samples=num_pos, seed=seed)
    neg_samples = create_hard_negatives_dataset(num_samples=num_neg, seed=seed + 1000)
    
    dataset: List[Dict[str, Any]] = []
    for s in pos_samples:
        strokes = s["strokes"]
        if augment and random.random() < 0.7:
            strokes = augment_strokes(strokes)
        dataset.append({
            "strokes": strokes,
            "is_a": True,
            "label": "A"
        })
        
    for s in neg_samples:
        dataset.append({
            "strokes": s["strokes"],
            "is_a": False,
            "label": "NOT_A"
        })
        
    random.seed(seed)
    random.shuffle(dataset)
    return dataset

def train(epochs: int = 15, lr: float = 0.05, l2_reg: float = 0.001) -> LetterAModel:
    print("==================================================")
    print("  TRAINING DEDICATED LETTER 'A' RECOGNITION MODEL ")
    print("==================================================")
    
    # 1. Generate strictly partitioned Train and Validation sets
    print("[1/4] Generating training and validation corpora...")
    train_data = prepare_data(num_pos=600, num_neg=600, seed=101, augment=True)
    val_data = prepare_data(num_pos=250, num_neg=250, seed=202, augment=False)
    print(f"       Train samples: {len(train_data)} (50% A, 50% Hard Negatives)")
    print(f"       Validation samples: {len(val_data)} (50% A, 50% Hard Negatives)")
    
    # 2. Extract raster feature vectors for training
    print("[2/4] Preprocessing and rasterizing training samples (28x28)...")
    X_train: List[List[float]] = []
    y_train: List[float] = []
    
    for sample in train_data:
        cleaned = validate_and_clean_strokes(sample["strokes"])
        grid = rasterize_strokes(cleaned, grid_size=28)
        flat = [v for row in grid for v in row]
        X_train.append(flat)
        y_train.append(1.0 if sample["is_a"] else 0.0)
        
    dim = 28 * 28
    weights = [random.uniform(-0.01, 0.01) for _ in range(dim)]
    bias = 0.0
    
    print(f"[3/4] Optimizing neural weights over {epochs} epochs...")
    n_train = len(X_train)
    batch_size = 32
    
    for epoch in range(epochs):
        # Shuffle batch indices
        indices = list(range(n_train))
        random.shuffle(indices)
        
        total_loss = 0.0
        for b_start in range(0, n_train, batch_size):
            b_indices = indices[b_start:b_start + batch_size]
            grad_w = [0.0] * dim
            grad_b = 0.0
            
            for idx in b_indices:
                x = X_train[idx]
                target = y_train[idx]
                
                # Forward logit
                z = bias
                for j in range(dim):
                    z += x[j] * weights[j]
                
                pred = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, z))))
                err = pred - target
                
                # Log loss
                loss = -(target * math.log(max(1e-7, pred)) + (1.0 - target) * math.log(max(1e-7, 1.0 - pred)))
                total_loss += loss
                
                # Gradients
                for j in range(dim):
                    grad_w[j] += err * x[j]
                grad_b += err
                
            m = len(b_indices)
            for j in range(dim):
                weights[j] -= lr * (grad_w[j] / m + l2_reg * weights[j])
            bias -= lr * (grad_b / m)
            
        avg_loss = total_loss / n_train
        if (epoch + 1) % 5 == 0 or epoch == epochs - 1:
            print(f"       Epoch {epoch + 1:02d}/{epochs} - Binary Cross-Entropy Loss: {avg_loss:.4f}")

    # 3. Model construction & threshold calibration on Validation set
    print("[4/4] Calibrating abstention threshold on validation set...")
    model = LetterAModel(acceptance_threshold=0.82)
    model.raster_weights = weights
    model.raster_bias = bias
    model.trained = True
    
    best_threshold = 0.82
    val_gt = [s["is_a"] for s in val_data]
    
    for thresh in [0.75, 0.78, 0.80, 0.82, 0.85, 0.88]:
        model.acceptance_threshold = thresh
        val_preds = [model.predict(s["strokes"])["accepted"] for s in val_data]
        val_confs = [model.predict(s["strokes"])["confidence"] for s in val_data]
        metrics = compute_recognition_metrics(val_gt, val_preds, val_confs)
        
        # We require ZERO false positives (FPR == 0) and maximal recall
        if metrics["false_positives"] == 0 and metrics["recall"] >= 0.98:
            best_threshold = thresh
            print(f"       Threshold {thresh:.2f} -> Accuracy: {metrics['accuracy'] * 100:.1f}%, FP: {metrics['false_positives']}, FN: {metrics['false_negatives']}")
            break
            
    model.acceptance_threshold = best_threshold
    print(f"       Selected optimal calibrated threshold: {best_threshold:.2f}")
    
    # Save model
    output_path = os.path.join(os.path.dirname(__file__), "model_a.json")
    model.save(output_path)
    print(f"Model successfully saved to {output_path}")
    return model

if __name__ == "__main__":
    train()
