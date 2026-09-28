"""
Model export utility for Letter 'A' recognition.
Exports model weights, acceptance threshold, and geometric hyperparameters
to a clean JSON artifact for deployment into Zenithsui's browser engine.
"""

import os
import json
from .model_a import LetterAModel

def export_model(output_path: str = None) -> str:
    if output_path is None:
        # Default destination in lib/sketch-recognition/
        output_path = os.path.join(os.path.dirname(__file__), "..", "lib", "sketch-recognition", "letter-a-model-weights.json")
        
    model_path = os.path.join(os.path.dirname(__file__), "model_a.json")
    model = LetterAModel()
    if os.path.exists(model_path):
        model.load(model_path)
    else:
        from .train_a import train
        model = train()
        
    export_payload = {
        "model_name": "ZenithsuiDedicatedLetterA",
        "target_class": "A",
        "version": "1.0.0",
        "acceptance_threshold": model.acceptance_threshold,
        "raster_dim": 28,
        "raster_bias": model.raster_bias,
        "raster_weights": model.raster_weights,
        "topological_invariants": {
            "min_aspect_ratio": 0.35,
            "max_aspect_ratio": 1.25,
            "max_apex_convergence_ratio": 0.48,
            "min_bottom_span_ratio": 0.45,
            "min_crossbar_y_ratio": 0.25,
            "max_crossbar_y_ratio": 0.82,
            "reject_bottom_closure_without_midbar": True
        }
    }
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)
        
    print(f"Exported Letter 'A' model payload to: {output_path}")
    return output_path

if __name__ == "__main__":
    export_model()
