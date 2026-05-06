#!/usr/bin/env python3
"""Crack open the last small files + content-grep the big ones."""
import json, re
from collections import Counter
from pathlib import Path

SNAP = Path("/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots")

def load(name):
    with open(SNAP / name) as f: return json.load(f)

# ============================================================
# A. The 5 small files — full content
# ============================================================
print("=" * 70)
print("A. Tiny files — full content")
print("=" * 70)
for fn in ["abilitykeywords.json", "abilitydynamicdots.json",
           "abilitydynamicspecialvalues.json", "lorebookinfo.json"]:
    print(f"\n--- {fn} ---")
    d = load(fn)
    print(f"Type: {type(d).__name__}, Length: {len(d) if hasattr(d,'__len__') else 'N/A'}")
    print(json.dumps(d, indent=2)[:1800])

# Also Translation/strings_skills.json if downloaded
tss = SNAP / "Translation" / "strings_skills.json"
if tss.exists():
    print(f"\n--- Translation/strings_skills.json ---")
    with open(tss) as f: data = json.load(f)
    print(f"Length: {len(data)}")
    sample = list(data.items())[:8] if isinstance(data, dict) else list(data)[:5]
    for k, v in sample:
        print(f"  {k}: {v}")
else:
    print("\n(Translation/strings_skills.json not downloaded yet)")

# ============================================================
# B. abilities.json: dive into the PvE substructure
# ============================================================
print()
print("=" * 70)
print("B. abilities.json — PvE substructure (every ability has this)")
print("=" * 70)
ab = load("abilities.json")
pve_fields = Counter()
for v in ab.values():
    pve = v.get("PvE")
    if isinstance(pve, dict):
        for k in pve.keys(): pve_fields[k] += 1
print(f"Top 30 fields inside PvE block:")
for k, c in pve_fields.most_common(30):
    print(f"  {k}: {c}")
print()
# Sample ability entry showing PvE
for k, v in ab.items():
    if v.get("Skill") == "Archery" and v.get("Level", 0) > 0:
        print(f"\nSample Archery ability — {k} ({v.get('Name')}):")
        print(json.dumps(v, indent=2)[:2000])
        break

# ============================================================
# C. effects.json: content grep through Desc field
# ============================================================
print()
print("=" * 70)
print("C. effects.json — content patterns in Desc field")
print("=" * 70)
eff = load("effects.json")
print(f"Total: {len(eff)}")
# Patterns to find
patterns = {
    "level mention":       re.compile(r"\blevel\s+\d+", re.I),
    "zone reference":      re.compile(r"\bin\s+(Serbule|Eltibule|Rahu|Kur|Vidaria|Povus|Statehelm|Sun Vale|Fae Realm|Gazluk)", re.I),
    "creature reference":  re.compile(r"\b(monster|creature|enemy)s?\b", re.I),
    "drop reference":      re.compile(r"\b(drop|loot)s?\b", re.I),
    "moon mention":        re.compile(r"\bmoon\b", re.I),
}
counts = {p: 0 for p in patterns}
samples = {p: [] for p in patterns}
for k, v in eff.items():
    desc = v.get("Desc") or ""
    for pname, prx in patterns.items():
        if prx.search(desc):
            counts[pname] += 1
            if len(samples[pname]) < 4:
                samples[pname].append((v.get("Name"), desc[:200]))
for pname, c in counts.items():
    print(f"\nPattern '{pname}': {c} effects with this in Desc")
    for nm, txt in samples[pname][:3]:
        print(f"  [{nm}] {txt}")

# ============================================================
# D. strings_all.json: more pattern hunting
# ============================================================
print()
print("=" * 70)
print("D. strings_all.json — pattern hunt")
print("=" * 70)
text = (SNAP / "strings_all.json").read_text()
print(f"Size: {len(text):,} bytes")
patterns = {
    r"\bspawns?\s+in\s+(\w+)":        "spawns in <zone>",
    r"\bfound\s+in\s+the\s+(\w+)":     "found in the <zone>",
    r"\b(?:Level|Lv)\s*(\d+)\s+(\w+)": "level N <thing>",
    r"\bdrops\s+from":                  "drops from",
    r"\bdrop\s+rate":                   "drop rate",
    r"\bspawn\s+rate":                  "spawn rate",
    r"\b(\w+)\s+spawns?\s+(?:at|in)\s+(\w+)": "X spawns at/in Y",
    r"\b\d+%\s+chance":                 "N% chance",
    r"Lint_":                            "Lint_ tags",
}
for prx, desc in patterns.items():
    matches = re.findall(prx, text)
    if matches:
        # dedupe / cap
        sample = list(set(tuple(m) if isinstance(m, tuple) else (m,) for m in matches))[:5]
        print(f"\n'{desc}' — {len(matches)} total matches; sample:")
        for s in sample: print(f"  {s}")

# ============================================================
# E. tsysclientinfo Tiers — what specific structures?
# ============================================================
print()
print("=" * 70)
print("E. tsysclientinfo.json — does any tier reference monsters or zones?")
print("=" * 70)
tsi = load("tsysclientinfo.json")
field_counts = Counter()
slots_seen = Counter()
for k, v in tsi.items():
    for fk in v.keys(): field_counts[fk] += 1
    for s in (v.get("Slots") or []):
        slots_seen[s] += 1
    # Look at tier keys
    for tk, tv in (v.get("Tiers") or {}).items():
        for tfk in tv.keys(): field_counts[("Tier:" + tfk)] += 1
print(f"Top-level fields on tsys entries: {dict(field_counts.most_common(20))}")
print(f"\nDistinct Slots: {dict(slots_seen.most_common())}")

# ============================================================
# F. Inspect a quest Requirement entry that's NOT trivial
# ============================================================
print()
print("=" * 70)
print("F. Quest Requirements — show one rich quest's full requirements")
print("=" * 70)
quests = load("quests.json")
# Find a quest with multi-typed requirements
for qid, q in quests.items():
    reqs = q.get("Requirements")
    if isinstance(reqs, list) and len(reqs) >= 4:
        print(f"\n{qid}: {q.get('Name')}")
        print(f"  Level: {q.get('TSysLevel')}")
        print(f"  Loc: {q.get('DisplayedLocation')}")
        print(f"  Requirements: {json.dumps(reqs, indent=2)[:1200]}")
        break

# ============================================================
# G. Distinct values for Requirement T types we haven't sampled
# ============================================================
print()
print("=" * 70)
print("G. Requirement 'Rule' values — what rules can quests have?")
print("=" * 70)
rule_vals = Counter()
for q in quests.values():
    for r in (q.get("Requirements") or []):
        if isinstance(r, dict) and r.get("T") == "Rule":
            rule_vals[r.get("Rule")] += 1
    for r in (q.get("RequirementsToSustain") or []):
        if isinstance(r, dict) and r.get("T") == "Rule":
            rule_vals[r.get("Rule")] += 1
print(f"Distinct Rule values: {len(rule_vals)}")
print(f"All: {sorted(rule_vals.most_common())[:30]}")

# Look at MoonPhase requirements
moon_quests = []
for qid, q in quests.items():
    for r in (q.get("RequirementsToSustain") or []):
        if isinstance(r, dict) and r.get("T") == "MoonPhase":
            moon_quests.append((qid, q.get("Name"), r))
print(f"\nMoonPhase-restricted quests: {len(moon_quests)}")
for qid, name, r in moon_quests:
    print(f"  {qid}: {name}  ({r})")
