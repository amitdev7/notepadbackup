"""
Automated Python Test Suite for Dedicated Letter 'A' Recognition.
Verifies all test cases specified in Phase 13:
- empty input -> NOT A
- malformed input -> NOT A
- one-point stroke -> NOT A
- zero-length stroke -> NOT A
- clean A -> A
- rough A -> A
- noisy A -> A
- rotated A -> A
- scaled A -> A
- one-stroke A -> A
- multi-stroke A -> A
- V -> NOT A
- triangle -> NOT A
- X -> NOT A
- H -> NOT A
- 4 -> NOT A
- scribble -> NOT A
- ambiguous input -> NOT A
"""

import sys
import os
import math

# Allow module import from parent
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from python_a_recognition.model_a import LetterAModel
from python_a_recognition.dataset_a import (
    generate_letter_a_classic_3stroke,
    generate_letter_a_2stroke,
    generate_letter_a_1stroke,
    apply_tilt
)
from python_a_recognition.hard_negatives import (
    generate_triangle_1stroke,
    generate_triangle_3stroke,
    generate_caret_inverted_v,
    generate_letter_v,
    generate_letter_h,
    generate_digit_4,
    generate_letter_x,
    generate_scribble
)

def run_suite():
    print("================================================================")
    print("      ZENITHSUI LETTER 'A' AUTOMATED PYTHON TEST SUITE          ")
    print("================================================================")
    
    model = LetterAModel()
    model_path = os.path.join(os.path.dirname(__file__), "..", "model_a.json")
    if os.path.exists(model_path):
        model.load(model_path)
    else:
        from python_a_recognition.train_a import train
        model = train()
        
    tests = [
        # --- Category 1: Degenerate, Malformed & Edge Inputs ---
        {
            "name": "Empty input (None)",
            "input": None,
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Empty list of strokes",
            "input": [],
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Malformed stroke coordinates (strings, None)",
            "input": [[["invalid", 10], [None, 20]]],
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "One-point stroke",
            "input": [[(100.0, 100.0)]],
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Zero-length stroke (duplicate points)",
            "input": [[(50.0, 50.0), (50.0, 50.0), (50.0, 50.0)]],
            "expected_prediction": None,
            "expected_accepted": False
        },
        
        # --- Category 2: Valid Letter A Variations ---
        {
            "name": "Clean 3-stroke A",
            "input": generate_letter_a_classic_3stroke(150, 150, 80, 120, jitter=0.1),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Rough handwritten A (with natural jitter)",
            "input": generate_letter_a_classic_3stroke(150, 150, 80, 120, jitter=1.2),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Noisy 3-stroke A",
            "input": generate_letter_a_classic_3stroke(150, 150, 85, 125, bar_y_ratio=0.58, jitter=1.5),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Rotated / tilted A (+12 deg slant)",
            "input": generate_letter_a_classic_3stroke(150, 150, 80, 120, tilt=math.radians(12), jitter=0.4),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Scaled small A (height 50px)",
            "input": generate_letter_a_classic_3stroke(150, 150, 32, 50, jitter=0.2),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Scaled large A (height 260px)",
            "input": generate_letter_a_classic_3stroke(200, 200, 160, 260, jitter=0.5),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "One-stroke continuous A",
            "input": generate_letter_a_1stroke(150, 150, 80, 120, jitter=0.3),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Two-stroke A (inverted V + crossbar)",
            "input": generate_letter_a_2stroke(150, 150, 80, 120, style="inverted_v_plus_bar", jitter=0.3),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        {
            "name": "Two-stroke A (left leg + right leg/bar)",
            "input": generate_letter_a_2stroke(150, 150, 80, 120, style="leg_plus_continuous_bar", jitter=0.3),
            "expected_prediction": "A",
            "expected_accepted": True
        },
        
        # --- Category 3: Hard Negatives (Must NEVER be classified as A) ---
        {
            "name": "Letter V (apex at bottom, open at top)",
            "input": generate_letter_v(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Triangle (1-stroke closed bottom)",
            "input": generate_triangle_1stroke(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Triangle (3-stroke with bottom base)",
            "input": generate_triangle_3stroke(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Caret / Inverted V (no crossbar)",
            "input": generate_caret_inverted_v(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Letter X (crossing diagonal strokes)",
            "input": generate_letter_x(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Letter H (parallel vertical legs + crossbar)",
            "input": generate_letter_h(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Digit 4 (vertical and horizontal stem)",
            "input": generate_digit_4(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Chaotic scribble",
            "input": generate_scribble(150, 150, 80, 120),
            "expected_prediction": None,
            "expected_accepted": False
        },
        {
            "name": "Ambiguous input (two disconnected vertical lines)",
            "input": [
                [(100.0, 100.0), (100.0, 200.0)],
                [(150.0, 100.0), (150.0, 200.0)]
            ],
            "expected_prediction": None,
            "expected_accepted": False
        }
    ]
    
    passed = 0
    failed = 0
    
    for tc in tests:
        res = model.predict(tc["input"])
        pred = res["prediction"]
        acc = res["accepted"]
        
        ok = (pred == tc["expected_prediction"] and acc == tc["expected_accepted"])
        if ok:
            passed += 1
            print(f"  ✓ {tc['name']} -> {pred if pred else 'REJECTED (NOT A)'} [OK]")
        else:
            failed += 1
            print(f"  ✗ {tc['name']} FAILED: Expected ({tc['expected_prediction']}, {tc['expected_accepted']}), Got ({pred}, {acc}). Reason: {res.get('reason')}")
            
    print("\n----------------------------------------------------------------")
    print(f"Test Suite Summary: {passed} passed, {failed} failed (Total: {len(tests)})")
    print("----------------------------------------------------------------")
    
    if failed == 0:
        print(">>> ALL AUTOMATED PYTHON LETTER 'A' TESTS PASSED CLEANLY! <<<\n")
        return True
    else:
        print(">>> SOME TESTS FAILED! <<<\n")
        sys.exit(1)

if __name__ == "__main__":
    run_suite()
