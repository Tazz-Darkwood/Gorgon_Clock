#!/usr/bin/env python3
"""Survey the files and quest sub-fields we never thoroughly inspected."""
import json, re
from collections import Counter, defaultdict
from pathlib import Path

SNAP = Path("/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots")

def load(name):
    with open(SNAP / name) as f: return json.load(f)

# -------------------------------------------------
print("=" * 70)
print("A. directedgoals.json — full content (we only saw 3/46 entries)")
print("=" * 70)
dg = load("directedgoals.json")
print(f"Total: {len(dg)}")
gates = [x for x in dg if x.get("IsCategoryGate")]
goals = [x for x in dg if not x.get("IsCategoryGate")]
print(f"Category gates (zone headers): {len(gates)}")
print(f"Actual goals: {len(goals)}")
print()
print("Distinct fields seen on goals:")
gf = Counter()
for g in goals:
    for k in g.keys(): gf[k] += 1
print(dict(gf.most_common()))
print()
if goals:
    print("First 3 actual goals:")
    for g in goals[:3]:
        print(json.dumps(g, indent=2)[:600])
        print("---")

# -------------------------------------------------
print()
print("=" * 70)
print("B. quests.json — Requirements, Rewards_Items, Rewards_NamedLootProfile")
print("=" * 70)
quests = load("quests.json")

# What does a Requirement look like?
print("\n--- Requirements field census ---")
req_field_count = Counter()
sample_req = None
for q in quests.values():
    r = q.get("Requirements")
    if not r: continue
    if isinstance(r, list):
        for item in r:
            if isinstance(item, dict):
                for k in item: req_field_count[k] += 1
                if not sample_req: sample_req = item
    elif isinstance(r, dict):
        for k in r: req_field_count[k] += 1
        if not sample_req: sample_req = r
print(f"Distinct Requirement field names: {dict(req_field_count.most_common(20))}")
if sample_req: print(f"Sample Requirement: {json.dumps(sample_req)[:300]}")

# Same for RequirementsToSustain
print("\n--- RequirementsToSustain ---")
rts = Counter()
for q in quests.values():
    r = q.get("RequirementsToSustain")
    if not r: continue
    if isinstance(r, list):
        for item in r:
            if isinstance(item, dict):
                for k in item: rts[k] += 1
    elif isinstance(r, dict):
        for k in r: rts[k] += 1
print(f"Distinct RequirementsToSustain fields: {dict(rts.most_common())}")

# Rewards_NamedLootProfile values
print("\n--- Rewards_NamedLootProfile values ---")
nlp_vals = Counter()
for q in quests.values():
    nlp = q.get("Rewards_NamedLootProfile")
    if nlp:
        if isinstance(nlp, list):
            for x in nlp: nlp_vals[x] += 1
        else:
            nlp_vals[nlp] += 1
print(f"Distinct named loot profiles: {len(nlp_vals)}")
print(f"Top 25: {nlp_vals.most_common(25)}")

# Rewards_Items field structure
print("\n--- Rewards_Items field structure ---")
ri_fields = Counter()
sample_ri = None
for q in quests.values():
    ri = q.get("Rewards_Items")
    if not ri: continue
    if isinstance(ri, list):
        for item in ri:
            if isinstance(item, dict):
                for k in item: ri_fields[k] += 1
                if not sample_ri: sample_ri = item
print(f"Distinct Rewards_Items entry fields: {dict(ri_fields.most_common())}")
if sample_ri: print(f"Sample: {json.dumps(sample_ri)}")

# AreaEvent values
print("\n--- AreaEvent values ---")
ae_vals = Counter()
for q in quests.values():
    if "AreaEvent" in q: ae_vals[str(q["AreaEvent"])] += 1
print(f"Distinct AreaEvent values: {len(ae_vals)}")
print(f"Top 15: {ae_vals.most_common(15)}")

# -------------------------------------------------
print()
print("=" * 70)
print("C. playertitles.json — what unlocks titles?")
print("=" * 70)
pt = load("playertitles.json")
print(f"Total titles: {len(pt)}")
sample = list(pt.keys())[:3]
for k in sample:
    print(f"\n{k}:")
    print(json.dumps(pt[k], indent=2)[:500])
# census fields
fc = Counter()
for v in pt.values():
    if isinstance(v, dict):
        for k in v: fc[k] += 1
print(f"\nDistinct fields across all titles: {dict(fc.most_common(20))}")

# -------------------------------------------------
print()
print("=" * 70)
print("D. effects.json — schema and any zone/monster references")
print("=" * 70)
eff = load("effects.json")
print(f"Total effect entries: {len(eff)}")
sample_keys = list(eff.keys())[:3]
for k in sample_keys:
    print(f"\n{k}:")
    print(json.dumps(eff[k], indent=2)[:400])
# census
ef = Counter()
for v in eff.values():
    if isinstance(v, dict):
        for k in v: ef[k] += 1
print(f"\nTop 20 distinct fields across all effects: {dict(ef.most_common(20))}")
# Search for any field with monster/zone/area/level signal
hot = [k for k in ef if re.search(r"(monster|creature|zone|area|spawn|level)", k, re.I)]
print(f"\nHot field names in effects.json: {hot}")

# -------------------------------------------------
print()
print("=" * 70)
print("E. abilities.json — full schema + signal scan")
print("=" * 70)
ab = load("abilities.json")
print(f"Total: {len(ab)}")
af = Counter()
for v in ab.values():
    if isinstance(v, dict):
        for k in v: af[k] += 1
print(f"Top 30 fields across abilities: {dict(af.most_common(30))}")
hot = [k for k in af if re.search(r"(monster|creature|zone|area|spawn|drop|loot)", k, re.I)]
print(f"Hot field names: {hot}")

# -------------------------------------------------
print()
print("=" * 70)
print("F. skills.json + xptables.json + attributes.json")
print("=" * 70)
sk = load("skills.json")
print(f"\nskills.json: {len(sk)} entries")
sample_k = list(sk.keys())[:1]
for k in sample_k:
    print(f"\n{k}:")
    print(json.dumps(sk[k], indent=2)[:1500])

xt = load("xptables.json")
print(f"\nxptables.json: {len(xt)} entries")
sample_k = list(xt.keys())[:2]
for k in sample_k:
    print(f"\n{k}:")
    print(json.dumps(xt[k], indent=2)[:600])

at = load("attributes.json")
print(f"\nattributes.json: {len(at)} entries")
sample_k = list(at.keys())[:2]
for k in sample_k:
    print(f"\n{k}:")
    print(json.dumps(at[k], indent=2)[:400])

# -------------------------------------------------
print()
print("=" * 70)
print("G. lorebooks.json — does it have monster/zone lore?")
print("=" * 70)
lb = load("lorebooks.json")
print(f"Total lore books: {len(lb)}")
sample_k = list(lb.keys())[:1]
for k in sample_k:
    print(f"\n{k}:")
    print(json.dumps(lb[k], indent=2)[:600])

# -------------------------------------------------
print()
print("=" * 70)
print("H. strings_all.json — grep for monster level patterns")
print("=" * 70)
# Read raw to grep efficiently
text = (SNAP / "strings_all.json").read_text()
print(f"File size: {len(text):,} bytes")
# Look for "Level N" patterns near common monster names
patterns = [
    r"(Skeleton|Goblin|Werewolf|Orc|Wolf|Spider|Bear|Fey|Mantis)\s+(Level\s*\d+|level\s*\d+)",
    r"\b(\w+)\s+\(Level\s*(\d+)\)",
    r"\bLevel\s+(\d+)\s+(\w+)",
]
for p in patterns:
    matches = re.findall(p, text)
    if matches:
        print(f"\nPattern {p!r}: {len(matches)} matches")
        for m in list(set(tuple(m) if isinstance(m, tuple) else (m,) for m in matches))[:10]:
            print(f"  {m}")
