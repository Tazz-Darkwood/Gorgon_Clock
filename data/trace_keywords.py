#!/usr/bin/env python3
"""Follow keyword=N tokens through the data graph."""
import json, re
from collections import Counter
from pathlib import Path

SNAP = Path("/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots")

with open(SNAP / "items.json") as f:
    items = json.load(f)
with open(SNAP / "recipes.json") as f:
    recipes = json.load(f)
with open(SNAP / "npcs.json") as f:
    npcs = json.load(f)

print("=" * 70)
print("Q1. Do recipes ever reference CorpseLimb (or any keyword) as an ingredient?")
print("=" * 70)

# Look at one recipe full structure first
sample_recipe_keys = list(recipes.keys())[:1]
print("Sample recipe to confirm Ingredients/ResultItems schema:")
for k in sample_recipe_keys:
    print(json.dumps({k: recipes[k]}, indent=2)[:600])

# Now scan ALL recipes for any non-ItemCode ingredient field
ingredient_field_names = Counter()
example_with_keyword = None
for k, v in recipes.items():
    for ing in v.get("Ingredients", []) or []:
        for fk in ing.keys():
            ingredient_field_names[fk] += 1
        # Look for non-ItemCode references (keywords)
        if "Keyword" in str(ing) or "ItemKey" in str(ing):
            if not example_with_keyword:
                example_with_keyword = (k, v)
print(f"\nAll Ingredient field names seen across all recipes: {dict(ingredient_field_names)}")
if example_with_keyword:
    print(f"\nFirst recipe using a non-ItemCode ingredient: {example_with_keyword[0]}")
    print(json.dumps(example_with_keyword[1], indent=2)[:800])
else:
    print("\nNo recipes use ItemKey/Keyword-based ingredient matching. Only numeric ItemCode references.")

# Search for the literal string "CorpseLimb" in recipes
print()
print("Recipes that mention 'CorpseLimb' literally:")
hits = [(k, v) for k, v in recipes.items() if "CorpseLimb" in json.dumps(v)]
for k, v in hits[:5]:
    print(f"\n  {k}: {v.get('Name')}")
    print("  " + json.dumps(v, indent=2).replace("\n", "\n  ")[:700])

print()
print("=" * 70)
print("Q2. The =N parameter — semantic meaning by keyword base")
print("=" * 70)
# For each keyword that ever has =N, collect (keyword_base, N_value, item_name)
samples = {}
for ik, iv in items.items():
    if not isinstance(iv, dict): continue
    for kw in iv.get("Keywords", []) or []:
        if "=" not in kw: continue
        base, _, n = kw.partition("=")
        try:
            nval = float(n)
        except Exception:
            continue
        samples.setdefault(base, []).append((nval, iv.get("Name", "?"), iv.get("Value")))

INTERESTING = ["CorpseLimb", "Textbook", "TextbookMinLevel", "TextbookMaxLevel",
               "Seedling", "AlcoholLevel", "FlowerPower", "Plant", "Flower",
               "Snack", "MeatDish", "Mushroom", "BodyOrgan", "Skull"]
for base in INTERESTING:
    rows = sorted(samples.get(base, []))
    if not rows: continue
    print(f"\n{base}: {len(rows)} items, value range [{min(r[0] for r in rows):.0f}, {max(r[0] for r in rows):.0f}]")
    print(f"  Samples (sorted by N):")
    for n, name, gold in rows[:8]:
        print(f"    N={n!r:8s}  {name:40s}  Gold={gold}")
    if len(rows) > 8:
        print(f"    ... ({len(rows) - 8} more)")

print()
print("=" * 70)
print("Q3. Does the SpiderLeg keyword (the bare-name kind) link items to monsters?")
print("=" * 70)
# Find any monster (ai.json key) whose name implies spider, then see if any
# data file links the bare keyword 'SpiderLeg' to it
import re
spider_items = [v for v in items.values() if isinstance(v, dict) and "SpiderLeg" in (v.get("Keywords") or [])]
print(f"Items with 'SpiderLeg' keyword: {len(spider_items)}")
for v in spider_items[:5]:
    print(f"  {v.get('Name'):30s} keywords={v.get('Keywords')}")
print()
# Search every other file for the literal "SpiderLeg" string
print("Files containing literal 'SpiderLeg' string:")
for fp in sorted(SNAP.glob("*.json")):
    if fp.name == "items.json": continue
    if fp.stat().st_size > 50_000_000: continue
    n = fp.read_text().count("SpiderLeg")
    if n: print(f"  {fp.name}: {n} occurrences")

print()
print("=" * 70)
print("Q4. NPCs that prefer keyword 'SpiderLeg' or 'CorpseLimb' or 'CorpseTrophy'")
print("=" * 70)
for kw in ["SpiderLeg", "CorpseLimb", "CorpseTrophy"]:
    matches = []
    for k, v in npcs.items():
        for p in v.get("Preferences", []) or []:
            if kw in (p.get("Keywords") or []):
                matches.append((v.get("Name") or k, p))
    print(f"\n'{kw}': {len(matches)} NPC preferences")
    for name, p in matches[:8]:
        print(f"  {name:25s}  Pref={p.get('Pref')}  Desire={p.get('Desire')}  Name='{p.get('Name')}'")
