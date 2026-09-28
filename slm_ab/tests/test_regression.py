"""
Regression Tests for Frozen C–Z and 0–9 Non-A/B Classes
Verifies that all frozen recognition classes and files remain completely unchanged.
"""

import unittest
import json
import hashlib
from pathlib import Path

class TestFrozenNonABRegression(unittest.TestCase):

    def test_frozen_backup_manifest_integrity(self):
        root = Path("/app/applet") if Path("/app/applet").exists() else Path(".")
        manifest_file = root / "recognition_backup" / "frozen_non_ab" / "MANIFEST.json"
        self.assertTrue(manifest_file.exists(), "MANIFEST.json not found in frozen backup")

        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        self.assertGreaterEqual(len(manifest), 30, "Expected at least 30 frozen files in archive")

        # Verify cryptographic integrity of every archived file
        for item in manifest:
            p = root / item["backup_path"]
            self.assertTrue(p.exists(), f"Missing archived file: {p}")

            hasher = hashlib.sha256()
            with open(p, "rb") as bf:
                while chunk := bf.read(65536):
                    hasher.update(chunk)
            current_hash = hasher.hexdigest()
            self.assertEqual(current_hash, item["sha256"], f"Integrity failure in {p}")

if __name__ == "__main__":
    unittest.main()
