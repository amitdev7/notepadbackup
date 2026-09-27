"""
Data augmentation module for handwritten Letter 'A' stroke coordinates.
Applies realistic physical writing variations:
- Translation
- Scale variation
- Small rotation (-15° to +15°)
- Horizontal shear
- Mild point jitter
- Non-uniform stroke velocity / resampling perturbation
"""

import math
import random
from typing import List, Tuple
from .dataset_a import Stroke, Point, apply_tilt
from .preprocess_a import compute_bounds

def augment_strokes(
    strokes: List[Stroke],
    scale_range: Tuple[float, float] = (0.85, 1.15),
    rotation_range_deg: Tuple[float, float] = (-15.0, 15.0),
    shear_range: Tuple[float, float] = (-0.15, 0.15),
    translation_range: Tuple[float, float] = (-20.0, 20.0),
    jitter_std: float = 0.5
) -> List[Stroke]:
    """Applies a composite random augmentation pipeline to stroke points."""
    if not strokes:
        return []
        
    bounds = compute_bounds(strokes)
    cx, cy = bounds["cx"], bounds["cy"]
    
    # 1. Scale
    scale = random.uniform(scale_range[0], scale_range[1])
    
    # 2. Rotation
    angle_rad = math.radians(random.uniform(rotation_range_deg[0], rotation_range_deg[1]))
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    
    # 3. Shear
    shear_x = random.uniform(shear_range[0], shear_range[1])
    
    # 4. Translation
    dx = random.uniform(translation_range[0], translation_range[1])
    dy = random.uniform(translation_range[0], translation_range[1])
    
    augmented: List[Stroke] = []
    for stroke in strokes:
        aug_stroke: Stroke = []
        for x, y in stroke:
            # Center
            ox = x - cx
            oy = y - cy
            
            # Scale
            sx = ox * scale
            sy = oy * scale
            
            # Shear
            shx = sx + shear_x * sy
            shy = sy
            
            # Rotate
            rx = shx * cos_a - shy * sin_a
            ry = shx * sin_a + shy * cos_a
            
            # Translate back + shift
            fx = cx + rx + dx
            fy = cy + ry + dy
            
            # Point jitter
            if jitter_std > 0:
                fx += random.gauss(0, jitter_std)
                fy += random.gauss(0, jitter_std)
                
            aug_stroke.append((fx, fy))
        augmented.append(aug_stroke)
        
    return augmented
