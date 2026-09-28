"""
Inference entry point for dedicated Letter 'A' recognition.
Accepts stroke inputs via Python call or command line JSON.
Outputs structured recognition dictionary.
"""

import sys
import json
import os
from typing import Any, Dict
from .model_a import LetterAModel

_GLOBAL_MODEL = None

def get_model() -> LetterAModel:
    global _GLOBAL_MODEL
    if _GLOBAL_MODEL is None:
        model = LetterAModel()
        model_path = os.path.join(os.path.dirname(__file__), "model_a.json")
        if os.path.exists(model_path):
            model.load(model_path)
        _GLOBAL_MODEL = model
    return _GLOBAL_MODEL

def recognize_a(strokes: Any) -> Dict[str, Any]:
    """
    Main inference API:
    Returns:
    {
        "prediction": "A" or None,
        "confidence": float,
        "accepted": bool,
        "reason": str,
        "bounds": {...}
    }
    """
    model = get_model()
    return model.predict(strokes)

def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if os.path.exists(arg):
            with open(arg, "r") as f:
                strokes = json.load(f)
        else:
            strokes = json.loads(arg)
    else:
        # Read from stdin
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
        strokes = json.loads(raw)
        
    result = recognize_a(strokes)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
