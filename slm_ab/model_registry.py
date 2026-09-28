"""
Zenithsui A/B SLM — Model Registry & Version Manager
Stores versioned models, promotes candidates, maintains history, and supports rollback.
"""

import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from .model import DedicatedABModel

REGISTRY_DIR = Path("slm_ab/registry_artifacts")

class ModelRegistry:
    """Manages versioned models, rollback capabilities, and active model selection."""

    def __init__(self, registry_dir: Optional[Path] = None):
        self.registry_dir = registry_dir or REGISTRY_DIR
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.meta_file = self.registry_dir / "registry_index.json"
        self.history: List[Dict[str, Any]] = []
        self.active_version: Optional[str] = None
        self._load_index()

    def _load_index(self):
        if self.meta_file.exists():
            try:
                with open(self.meta_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.history = data.get("history", [])
                    self.active_version = data.get("active_version")
            except Exception:
                self.history = []
                self.active_version = None

    def _save_index(self):
        with open(self.meta_file, "w", encoding="utf-8") as f:
            json.dump({
                "active_version": self.active_version,
                "updated_at": time.time(),
                "history": self.history
            }, f, indent=2)

    def register_model(
        self,
        model: DedicatedABModel,
        parent_version: Optional[str] = None,
        notes: str = ""
    ) -> str:
        """Saves and registers a model version."""
        version = model.version
        filename = f"{version}.json"
        artifact_path = self.registry_dir / filename
        model.save_json(str(artifact_path))

        entry = {
            "version": version,
            "filename": filename,
            "created_at": time.time(),
            "parent_version": parent_version,
            "samples_count": model.trained_samples_count,
            "metrics": model.validation_metrics,
            "notes": notes
        }
        self.history.append(entry)
        self.active_version = version
        self._save_index()
        return version

    def get_active_model(self) -> Optional[DedicatedABModel]:
        """Loads and returns the current active model."""
        if not self.active_version:
            return None
        filepath = self.registry_dir / f"{self.active_version}.json"
        if not filepath.exists():
            return None
        return DedicatedABModel.from_json(str(filepath))

    def rollback(self) -> Optional[str]:
        """Rolls back to previous model version if available."""
        if len(self.history) < 2:
            return None
        # Remove currently active
        self.history.pop()
        prev = self.history[-1]
        self.active_version = prev["version"]
        self._save_index()
        return self.active_version
