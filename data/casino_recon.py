#!/usr/bin/env python3
"""Probe local CDN data for casino-arena content."""
import json
SNAP = "/Users/williamspear/projects/personal/steve/Gorgon_Clock/data/cdn-snapshots"

with open(f"{SNAP}/npcs.json") as f: npcs = json.load(f)
with open(f"{SNAP}/quests.json") as f: quests = json.load(f)
with open(f"{SNAP}/items.json") as f: items = json.load(f)
with open(f"{SNAP}/ai.json") as f: ai = json.load(f)
with open(f"{SNAP}/recipes.json") as f: recipes = json.load(f)

# 1. The named tip-giving NPCs from the wiki
names = ["Irkima", "Qatik", "Mandibles", "Eveline Rastin", "Arianna"]
print("=" * 70)
print("Tip-giving NPCs in npcs.json")
print("=" * 70)
for needle in names:
    for k, v in npcs.items():
        if isinstance(v, dict) and needle in (v.get("Name") or ""):
            services = [s.get("Type") for s in (v.get("Services") or [])]
            prefs = len(v.get("Preferences") or [])
            loc = v.get("AreaFriendlyName", "?")
            print(f"  {k:30s} Name={v.get('Name'):25s} area={loc:20s} prefs={prefs} services={services}")

# 2. ALL NPCs in AreaCasino
print()
print("=" * 70)
print("All NPCs at AreaCasino (the Red Wing Casino zone)")
print("=" * 70)
casino_npcs = [(k, v) for k, v in npcs.items()
               if isinstance(v, dict) and v.get("AreaName") == "AreaCasino"]
print(f"Total: {len(casino_npcs)}")
for k, v in casino_npcs:
    services = [s.get("Type") for s in (v.get("Services") or [])]
    print(f"  {v.get('Name', '?'):28s}  services={services}")

# 3. Quests mentioning Arena
print()
print("=" * 70)
print("Quests referencing arena content")
print("=" * 70)
arena_quests = []
for qid, q in quests.items():
    blob = json.dumps(q)
    if "Arena" in blob or "RedWingArena" in blob or "Wager" in blob or "Bet" in blob:
        arena_quests.append((qid, q))
print(f"Quests mentioning Arena/Wager/Bet: {len(arena_quests)}")
for qid, q in arena_quests[:12]:
    print(f"  {qid:14s}: {q.get('Name'):45s} Loc={q.get('DisplayedLocation','?')}")

# Show one in full
if arena_quests:
    qid, q = arena_quests[0]
    print(f"\nFull sample - {qid}:")
    print(json.dumps({qid: q}, indent=2)[:1200])

# 4. Items related to Arena / Red Wing / Wager / Bet
print()
print("=" * 70)
print("Items related to Arena / Red Wing / Wager / Bet")
print("=" * 70)
arena_items = []
for k, v in items.items():
    if not isinstance(v, dict): continue
    name = v.get("Name") or ""
    desc = v.get("Description") or ""
    iname = v.get("InternalName") or ""
    if any(needle in name + desc + iname for needle in ["Arena", "RedWing", "Red Wing", "Wager", "Bet", "Casino"]):
        arena_items.append((k, v))
print(f"Total: {len(arena_items)}")
for k, v in arena_items[:25]:
    print(f"  {v.get('Name','?'):40s}  desc={(v.get('Description','') or '')[:90]}")

# 5. Are there ai.json entries for the arena fighters?
# The wiki mentioned NPC vs NPC fights. The CASTERS would be in npcs.json (talking NPCs)
# but they need ai.json combat profiles to actually fight. Cross-reference.
print()
print("=" * 70)
print("ai.json entries that might be the casino arena fighters")
print("=" * 70)
# common arena-fighter naming hints
candidates = [k for k in ai.keys() if "Casino" in k or "Arena" in k or "WingFighter" in k or "RedWing" in k]
print(f"AI entries with Casino/Arena/RedWing in key: {len(candidates)}")
for c in candidates[:15]:
    print(f"  {c}: {json.dumps(ai[c])[:200]}")

# 6. Recipes/items that consume arena tokens
print()
print("=" * 70)
print("Recipes that involve Red Wing tokens or arena rewards")
print("=" * 70)
rt_recipes = []
for k, v in recipes.items():
    blob = json.dumps(v)
    if "RedWing" in blob or "Casino" in blob or "Arena" in blob:
        rt_recipes.append((k, v))
print(f"Recipes mentioning these: {len(rt_recipes)}")
for k, v in rt_recipes[:8]:
    print(f"  {k}: {v.get('Name','?')}")
