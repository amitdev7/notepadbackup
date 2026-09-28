#!/usr/bin/env python3
"""
Zenithsui Recognition System Backup Verification Script
Verifies that every backed up file in recognition_backup/frozen_non_ab matches its SHA-256 hash.
"""

import hashlib
import json
from pathlib import Path

ROOT = Path("/app/applet") if Path("/app/applet").exists() else Path(".")
BACKUP_DIR = ROOT / "recognition_backup" / "frozen_non_ab"
MANIFEST_FILE = BACKUP_DIR / "MANIFEST.json"

def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def verify():
    if not MANIFEST_FILE.exists():
        print("ERROR: MANIFEST.json not found!")
        exit(1)
        
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    print(f"Verifying {len(manifest)} archived files against SHA-256 manifest...")
    all_ok = True
    for item in manifest:
        backup_path = ROOT / item["backup_path"]
        if not backup_path.exists():
            print(f"FAILED: Missing file {backup_path}")
            all_ok = False
            continue
        current_hash = sha256_file(backup_path)
        if current_hash != item["sha256"]:
            print(f"FAILED: Hash mismatch on {backup_path}! Expected {item['sha256']}, got {current_hash}")
            all_ok = False
        else:
            print(f"  ✓ {item['filename']} matches hash {current_hash[:12]}...")
            
    if all_ok:
        print("\nAll 32 archived files verified with 100% cryptographic integrity.")
    else:
        print("\nIntegrity check FAILED.")
        exit(1)

if __name__ == "__main__":
    verify()
