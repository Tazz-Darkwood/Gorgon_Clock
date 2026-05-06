#!/usr/bin/env python3
"""Exhaustive hunt for monster→level and monster→zone linkage."""
import json, re
from collections import Counter, defaultdict
from pathlib import Path

SNAP = Path("/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots")

# Load all files we'll cross-reference
def load(name):
    with open(SNAP / name) as f:
        return json.load(f)

ai          = load("ai.json")
landmarks   = load("landmarks.json")
quests      = load("quests.json")
directed    = load("directedgoals.json")
itemuses    = load("itemuses.json")
adv         = load("advancementtables.json")
items       = load("items.json")
npcs        = load("npcs.json")

print("=" * 70)
print("Q1. landmarks.json — what Type values exist?  Any monster-spawn types?")
print("=" * 70)
type_counts = Counter()
all_landmarks = []
for area, lst in landmarks.items():
    for lm in (lst or []):
        type_counts[lm.get("Type")] += 1
        all_landmarks.append((area, lm))
print(f"Total landmarks across {len(landmarks)} areas: {len(all_landmarks)}")
print(f"All distinct Type values:")
for t, c in type_counts.most_common():
    print(f"  {t}: {c}")
# Show 1 example of each non-Portal type
seen = set()
print()
print("One example per landmark Type:")
for area, lm in all_landmarks:
    t = lm.get("Type")
    if t not in seen:
        seen.add(t)
        print(f"  [{t}] in {area}: {json.dumps(lm)[:200]}")

print()
print("=" * 70)
print("Q2. quests.json — do quest objectives identify monsters and/or zones?")
print("=" * 70)
print(f"Total quests: {len(quests)}")
# Field census
all_fields = Counter()
nested_fields = Counter()
for q in quests.values():
    if isinstance(q, dict):
        for k in q.keys(): all_fields[k] += 1
        for objs_field in ("Objectives", "Rewards"):
            if objs_field in q and isinstance(q[objs_field], list):
                for obj in q[objs_field]:
                    if isinstance(obj, dict):
                        for ok in obj.keys():
                            nested_fields[(objs_field, ok)] += 1
print(f"Top-level quest fields (top 25): {all_fields.most_common(25)}")
print(f"\nNested fields under Objectives/Rewards (top 25): {nested_fields.most_common(25)}")

# Find a quest with a monster-kill objective
print()
print("Searching for monster-kill objectives...")
sample_kills = []
all_creatures_referenced = Counter()
obj_types = Counter()
for qid, q in quests.items():
    for obj in (q.get("Objectives") or []):
        if not isinstance(obj, dict): continue
        obj_types[obj.get("Type")] += 1
        t = (obj.get("Type") or "")
        target = obj.get("Target")
        if target is None: continue
        # Target can be a string or a list of strings
        targets = target if isinstance(target, list) else [target]
        if "kill" in t.lower() or "monster" in t.lower() or "creature" in t.lower() or t == "InteractWith":
            for tg in targets:
                all_creatures_referenced[tg] += 1
            if len(sample_kills) < 4:
                sample_kills.append((qid, q, obj))

print(f"\nObjective Type distribution (top 20): {obj_types.most_common(20)}")
print(f"\nFirst 4 kill-style objective examples:")
for qid, q, obj in sample_kills:
    loc = q.get("DisplayedLocation", "?")
    print(f"\n  --- {qid}: {q.get('Name')} (DisplayedLocation={loc}) ---")
    print(f"  Objective: {json.dumps(obj)[:350]}")
print(f"\nDistinct monster-target identifiers referenced by quests: {len(all_creatures_referenced)}")
print(f"Top 30 referenced creatures: {all_creatures_referenced.most_common(30)}")

# How many of those targets ARE keys in ai.json?
ai_overlap = sum(1 for t in all_creatures_referenced if t in ai)
print(f"\nOf {len(all_creatures_referenced)} distinct targets, {ai_overlap} match an ai.json monster key directly")
unmatched = [t for t in all_creatures_referenced if t not in ai][:15]
print(f"Sample unmatched targets (likely keyword-tags, not direct names): {unmatched}")

print()
print("=" * 70)
print("Q3. directedgoals.json — what's actually in the 'Stuff To Do' pane?")
print("=" * 70)
print(f"Total entries: {len(directed)}")
print("First 3 entries verbatim:")
for x in directed[:3]:
    print(json.dumps(x, indent=2)[:800])
    print("---")

print()
print("=" * 70)
print("Q4. itemuses.json — was it really 'redundant'?")
print("=" * 70)
print(f"Total entries: {len(itemuses)}")
print("First 3 keys:", list(itemuses.keys())[:3])
sample_keys = list(itemuses.keys())[:3]
for k in sample_keys:
    print(f"\n{k}:")
    print(json.dumps(itemuses[k], indent=2)[:600])

print()
print("=" * 70)
print("Q5. advancementtables monster tier — what's the level cap signal?")
print("=" * 70)
mons_keys = sorted([k for k in adv.keys() if k[0].isdigit() and not any(x in k for x in
    ["Loot", "Elite", "Defense", "Foretold", "Foraging", "Treasure"])])
print(f"Monster-type advancement tables: {len(mons_keys)}")
level_breakpoints = Counter()
max_level_per_monster = {}
for k in mons_keys:
    levels = [int(re.match(r"Level_(\d+)", lk).group(1))
              for lk in adv[k].keys() if re.match(r"Level_\d+", lk)]
    if levels:
        max_level_per_monster[k] = max(levels)
        level_breakpoints[max(levels)] += 1
print(f"\nDistribution of MAX level breakpoint defined per monster:")
for lv, c in sorted(level_breakpoints.items()):
    print(f"  Level_{lv:02d}: {c} monsters")
print()
print("Sample: monsters with the HIGHEST level breakpoint defined:")
for k in sorted(max_level_per_monster, key=lambda x: -max_level_per_monster[x])[:10]:
    print(f"  {k}: max defined Level_{max_level_per_monster[k]:02d}")

print()
print("=" * 70)
print("Q6. Cross-ref: do quests mention zone names from areas.json?")
print("=" * 70)
areas = load("areas.json")
area_names = set(areas.keys())
area_friendly = {areas[k].get("FriendlyName"): k for k in areas if isinstance(areas[k], dict)}
quest_area_refs = Counter()
for q in quests.values():
    blob = json.dumps(q)
    for an in area_names:
        if an in blob: quest_area_refs[an] += 1
    for fn in area_friendly:
        if fn and fn in blob: quest_area_refs[area_friendly[fn]] += 1
print(f"Quests referencing each area (top 20):")
for an, c in quest_area_refs.most_common(20):
    print(f"  {an} ({areas[an].get('FriendlyName','?')}): {c} quests reference it")

print()
print("=" * 70)
print("Q7. Field name census — anything we missed with level/zone/monster signal")
print("=" * 70)
KEYS_OF_INTEREST = re.compile(
    r"(level|min|max|tier|area|zone|region|spawn|encounter|monstertype|creaturetype|hostile|combat|requir)",
    re.IGNORECASE)

def walk_keys(obj, bag, path=()):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if KEYS_OF_INTEREST.search(k):
                bag[k] += 1
            walk_keys(v, bag, path + (k,))
    elif isinstance(obj, list):
        for x in obj:
            walk_keys(x, bag, path)

per_file: dict[str, Counter] = {}
for fp in sorted(SNAP.glob("*.json")):
    if fp.stat().st_size > 25_000_000:
        continue
    try:
        d = json.loads(fp.read_text())
    except Exception:
        continue
    bag = Counter()
    walk_keys(d, bag)
    if bag:
        per_file[fp.name] = bag

for fn, bag in per_file.items():
    if any(re.search(r"(zone|area|spawn|encounter|monstertype|creaturetype|hostile)", k, re.I) for k in bag):
        print(f"\n{fn}: matches with high-signal substrings")
        for k, c in bag.most_common(20):
            if re.search(r"(zone|area|spawn|encounter|monstertype|creaturetype|hostile)", k, re.I):
                print(f"  {k}: {c}")
