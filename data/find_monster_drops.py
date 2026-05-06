#!/usr/bin/env python3
"""Forensic search for monster→item drop linking across all CDN snapshots."""
from __future__ import annotations
import json, re
from collections import Counter
from pathlib import Path

SNAP = Path(__file__).resolve().parent / "cdn-snapshots"

# 1. Collect all monster names (keys of ai.json)
with open(SNAP / "ai.json") as f:
    ai = json.load(f)
monster_names = set(ai.keys())
print(f"Loaded {len(monster_names)} monster template names from ai.json")
print(f"Sample: {sorted(list(monster_names))[:10]}")
print()

# Patterns we want to find
DROP_FIELD_PATTERNS = re.compile(
    r'(drop|loot|monster|mob|kill|treasure|spawn|encounter|enemy|creature)',
    re.IGNORECASE)


def walk_collect_field_names(obj, path=("",), bag=None, paths=None):
    if bag is None:
        bag = Counter()
        paths = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            bag[k] += 1
            if k not in paths and DROP_FIELD_PATTERNS.search(k):
                paths[k] = ".".join(path[1:]) + ("." if path[1:] else "") + k
            walk_collect_field_names(v, path + (k,), bag, paths)
    elif isinstance(obj, list):
        for x in obj:
            walk_collect_field_names(x, path, bag, paths)
    return bag, paths


def walk_search_strings(obj, needle_set, found, file_label):
    if isinstance(obj, dict):
        for k, v in obj.items():
            walk_search_strings(v, needle_set, found, file_label)
    elif isinstance(obj, list):
        for x in obj:
            walk_search_strings(x, needle_set, found, file_label)
    elif isinstance(obj, str):
        if obj in needle_set:
            found.setdefault(obj, Counter())[file_label] += 1


# 2. For every CDN file: list any field name matching drop/loot/etc patterns
print("=" * 70)
print("FIELD NAME SEARCH — any field whose name suggests drops/loot/monster")
print("=" * 70)
files = sorted(SNAP.glob("*.json"))
all_suspect_fields: dict[str, dict[str, str]] = {}
for fp in files:
    if fp.stat().st_size > 50_000_000:
        continue
    try:
        with open(fp) as f:
            data = json.load(f)
    except Exception as e:
        continue
    _bag, suspect = walk_collect_field_names(data)
    if suspect:
        all_suspect_fields[fp.name] = suspect

if not all_suspect_fields:
    print("\nNo fields matching drop/loot/monster/mob/kill/treasure/spawn/encounter/enemy/creature in any file.")
else:
    for fn, fields in all_suspect_fields.items():
        print(f"\n{fn}:")
        for k, p in fields.items():
            print(f"  {k}  (path: {p or '<root>'})")

# 3. For every CDN file: search for monster-name strings (the keys from ai.json)
print()
print("=" * 70)
print("STRING REFERENCE SEARCH — any monster name appearing anywhere in any file")
print("=" * 70)
hits: dict[str, Counter] = {}
for fp in files:
    if fp.stat().st_size > 50_000_000:
        continue
    if fp.name == "ai.json":
        continue
    try:
        with open(fp) as f:
            data = json.load(f)
    except Exception:
        continue
    walk_search_strings(data, monster_names, hits, fp.name)

if not hits:
    print("\nNo monster names from ai.json appear as string values in any other CDN file.")
else:
    print(f"\n{len(hits)} monster names appear in other files:")
    for name, files_count in sorted(hits.items(), key=lambda x: -sum(x[1].values()))[:30]:
        files_str = ", ".join(f"{f}:{c}" for f, c in files_count.most_common())
        print(f"  {name}  →  {files_str}")
    if len(hits) > 30:
        print(f"  ... ({len(hits) - 30} more)")

# 4. Specific cross-reference: anywhere a known monster name appears AND
#    has nearby item references? Manual inspection of any hits found above.
print()
print("=" * 70)
print("CONTEXT SEARCH — for any monster name found, dump the containing entry")
print("=" * 70)
if hits:
    for name in list(hits.keys())[:8]:
        for fp_name in hits[name].keys():
            print(f"\n--- '{name}' in {fp_name} ---")
            with open(SNAP / fp_name) as f:
                data = json.load(f)
            # find which top-level entry contains this name
            count = 0
            for k, v in (data.items() if isinstance(data, dict) else enumerate(data)):
                blob = json.dumps(v)
                if f'"{name}"' in blob:
                    count += 1
                    if count <= 2:
                        print(f"  [{k}]: {json.dumps(v)[:400]}")
            if count > 2:
                print(f"  ... ({count - 2} more entries contain '{name}')")
            break  # first file is enough for context
else:
    print("\n(skipped — no string matches to inspect)")
