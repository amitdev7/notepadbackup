#!/usr/bin/env python3
"""
Restoration script for non-A recognition assets.
Reads MANIFEST.json from recognition_backup/non_a/ and restores original files
after verifying cryptographic hashes.
"""

import json
import os
import shutil
import hashlib
import sys

def verify_and_restore(dry_run: bool = True):
    manifest_path = "recognition_backup/non_a/MANIFEST.json"
    if not os.path.exists(manifest_path):
        print(f"Error: Manifest not found at {manifest_path}")
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    print(f"Restoration mode: {'DRY RUN' if dry_run else 'ACTIVE RESTORE'}")
    print(f"Checking {len(manifest)} tracked non-A assets...")

    restorable = 0
    for entry in manifest:
        backup = entry["backup_file"]
        orig = entry["original_file"]
        expected_hash = entry["file_hash"]

        if not os.path.exists(backup):
            print(f"FAIL: Backup file missing: {backup}")
            continue

        h = hashlib.sha256()
        with open(backup, "rb") as bf:
            while chunk := bf.read(8192):
                h.update(chunk)
        actual_hash = h.hexdigest()

        if actual_hash != expected_hash:
            print(f"FAIL: Hash mismatch for {backup}")
            continue

        if not dry_run:
            os.makedirs(os.path.dirname(orig), exist_ok=True)
            shutil.copy2(backup, orig)
            print(f"Restored: {orig}")
        else:
            print(f"Verified restorable: {orig} <- {backup}")
        restorable += 1

    print(f"\nResult: {restorable}/{len(manifest)} non-A assets verified restorable.")
    if restorable == len(manifest):
        print("Restoration integrity verification PASSED.")
    else:
        print("Restoration integrity verification FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    dry_run = "--execute" not in sys.argv
    verify_and_restore(dry_run=dry_run)
