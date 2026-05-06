#!/usr/bin/env python3
"""Trace the CorpseLimb=N keyword pattern end-to-end across CDN data."""
import json
from collections import Counter
from pathlib import Path

SNAP = Path("/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots")

with open(SNAP / "items.json") as f:
    items = json.load(f)

print("=" * 70)
print("STEP 1: Locate Giant Spider Leg and inspect its full entry")
print("=" * 70)
hits = []
for k, v in items.items():
    if not isinstance(v, dict):
        continue
    name = (v.get("Name") or "").lower()
    if "spider" in name and "leg" in name:
        hits.append((k, v))
for k, v in hits[:5]:
    print()
    print(f"{k}: {v.get('Name')}")
    print(json.dumps(v, indent=2))

print()
print("=" * 70)
print("STEP 2: All items carrying a CorpseLimb=N keyword")
print("=" * 70)
corpse = []
for k, v in items.items():
    if not isinstance(v, dict):
        continue
    for kw in v.get("Keywords", []) or []:
        if kw.startswith("CorpseLimb"):
            corpse.append((v.get("Name", "?"), kw, v.get("Value")))
            break
print(f"Total items with a CorpseLimb keyword: {len(corpse)}")
print()
n_dist = Counter(c[1] for c in corpse)
print(f"Distinct CorpseLimb=N tokens ({len(n_dist)} of them):")
for token, count in sorted(n_dist.items()):
    print(f"  {token:18s}  -> {count} items")
print()
print("Sample (sorted by Name) - first 40:")
for name, kw, val in sorted(corpse)[:40]:
    print(f"  {name:35s}  {kw:18s}  Value={val}")

print()
print("=" * 70)
print("STEP 3: All distinct =N keyword bases on items")
print("=" * 70)
bases = Counter()
for k, v in items.items():
    if not isinstance(v, dict):
        continue
    for kw in v.get("Keywords", []) or []:
        if "=" in kw:
            bases[kw.split("=")[0]] += 1
print(f"Distinct bases: {len(bases)}")
print()
print("Top 60:")
for base, c in bases.most_common(60):
    print(f"  {base:35s}  {c:5d} items")

print()
print("=" * 70)
print("STEP 4: Where else does the literal string 'CorpseLimb' appear?")
print("=" * 70)
found_in: dict[str, int] = {}
for fp in sorted(SNAP.glob("*.json")):
    if fp.name == "items.json":
        continue
    if fp.stat().st_size > 50_000_000:
        continue
    try:
        text = fp.read_text()
    except Exception:
        continue
    n = text.count("CorpseLimb")
    if n:
        found_in[fp.name] = n
print(f"Files outside items.json containing 'CorpseLimb' as a substring: {len(found_in)}")
for name, n in sorted(found_in.items()):
    print(f"  {name}: {n} occurrences")

# For files with hits show context
print()
for name in found_in:
    print(f"\n--- Context in {name} ---")
    fp = SNAP / name
    try:
        data = json.loads(fp.read_text())
    except Exception:
        continue
    # find top-level keys whose stringified value contains "CorpseLimb"
    if isinstance(data, dict):
        shown = 0
        for k, v in data.items():
            blob = json.dumps(v)
            if "CorpseLimb" in blob:
                shown += 1
                if shown <= 3:
                    print(f"  [{k}]:")
                    print("    " + json.dumps(v, indent=2)[:500].replace("\n", "\n    "))
        if shown > 3:
            print(f"  ... ({shown - 3} more entries reference 'CorpseLimb')")

print()
print("=" * 70)
print("STEP 5: Reverse — does any NPC have CorpseLimb in a Preference?")
print("=" * 70)
with open(SNAP / "npcs.json") as f:
    npcs = json.load(f)
matches = []
for k, v in npcs.items():
    for p in v.get("Preferences", []) or []:
        for kw in p.get("Keywords", []) or []:
            if kw == "CorpseLimb" or kw.startswith("CorpseLimb"):
                matches.append((k, v.get("Name"), p))
                break
print(f"NPCs with CorpseLimb in their Preferences: {len(matches)}")
for npc_id, name, p in matches[:10]:
    print(f"  {npc_id} ({name}): {p}")
