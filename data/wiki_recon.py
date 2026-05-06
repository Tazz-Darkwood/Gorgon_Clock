#!/usr/bin/env python3
"""Wiki feasibility recon: monster category, multi-monster sampling, NPC barter, plants, casino."""
import json, urllib.request, urllib.parse, time, re

API = "https://wiki.projectgorgon.com/w/api.php"
UA = "GorgonClock-Discovery/0.1 (research; spearw@gmail.com)"
DELAY = 1.0  # be polite

def api(params):
    params.setdefault("format", "json")
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

def get_wikitext(page):
    try:
        d = api({"action": "parse", "page": page, "prop": "wikitext", "redirects": 1})
        return d.get("parse", {}).get("wikitext", {}).get("*", "") or ""
    except Exception as e:
        return f"<<error: {e}>>"

# 1. Discover all monster pages via Category:Monsters
print("=" * 70)
print("1. Category:Monsters — full discovery")
print("=" * 70)
all_monsters = []
cont = None
while True:
    params = {"action": "query", "list": "categorymembers",
              "cmtitle": "Category:Monsters", "cmlimit": "500"}
    if cont: params["cmcontinue"] = cont
    d = api(params)
    members = d.get("query", {}).get("categorymembers", []) or []
    all_monsters.extend(members)
    cont = d.get("continue", {}).get("cmcontinue")
    time.sleep(DELAY)
    if not cont: break
print(f"Total members in Category:Monsters: {len(all_monsters)}")
print("First 25 page titles:")
for m in all_monsters[:25]:
    print(f"  - {m.get('title')}")
print("...")
print("Last 10 page titles:")
for m in all_monsters[-10:]:
    print(f"  - {m.get('title')}")

# 2. Sample 6 monster pages spanning easy/hard zones
print()
print("=" * 70)
print("2. Sample 6 monsters — template consistency check")
print("=" * 70)
SAMPLES = ["Skeleton", "Goblin_Shaman", "Bear", "Werewolf",
           "Yeti", "Ranalon"]
for page in SAMPLES:
    time.sleep(DELAY)
    print(f"\n--- {page} ---")
    wt = get_wikitext(page)
    print(f"length: {len(wt)} chars")
    # extract MOB infobox + locations
    infobox = re.search(r"\{\{MOB infobox\s*\|(.+?)\}\}", wt, re.DOTALL)
    if infobox:
        body = infobox.group(1)
        fields = re.findall(r"\|\s*(\w+)\s*=\s*([^|}\n]+)", "|" + body)
        print(f"  MOB infobox fields: {dict(fields)}")
    else:
        print(f"  NO MOB infobox found")
    locs = re.findall(r"\{\{MOB Location\s*\|(.+?)\}\}", wt, re.DOTALL)
    print(f"  MOB Locations: {len(locs)}")
    for loc in locs[:2]:
        f = dict(re.findall(r"\|\s*(\w+)\s*=\s*([^|}\n]+)", "|" + loc))
        print(f"    -> area={f.get('area','?')}  hp={f.get('health','?')}  level_field={f.get('level','MISSING')}")
    # Drop sections
    drop_sections = re.findall(r"====\s*\[?\[?([^\]=]+?)\]?\]?\s*Loot\s*====", wt)
    print(f"  Drop section labels: {drop_sections}")
    drops = re.findall(r"\{\{Loot\|([^}|]+)(?:\|[^}]*)?}}\s*(?:x([0-9-]+))?", wt)
    print(f"  Drops: {len(drops)}")
    for item, qty in drops[:6]:
        print(f"    - {item.strip()}  qty={qty or '?'}")

# 3. Populated NPC barter pages
print()
print("=" * 70)
print("3. Populated NPC pages — barter table presence")
print("=" * 70)
NPCS = ["Cassidy", "Yetta", "Joeh", "Therese", "Marna"]
for page in NPCS:
    time.sleep(DELAY)
    print(f"\n--- {page} ---")
    wt = get_wikitext(page)
    print(f"length: {len(wt)} chars")
    # Look for barter table headers
    has_barter = bool(re.search(r"==\s*Barter", wt, re.I))
    has_shopkeeper = bool(re.search(r"==\s*Shopkeeper", wt, re.I))
    has_gifts = bool(re.search(r"==\s*Gifts?", wt, re.I) or re.search(r"==\s*Favor", wt, re.I))
    print(f"  Has Barter section: {has_barter}")
    print(f"  Has Shopkeeper section: {has_shopkeeper}")
    print(f"  Has Gifts/Favor section: {has_gifts}")
    # Look for the key signal: a table with arrow/=> patterns
    # In MediaWiki barter tables typically use templates or wiki tables
    if has_barter or has_shopkeeper:
        # find the section content
        section_match = re.search(r"==\s*(?:Barter|Shopkeeper)[^=]*==(.*?)(?=^==|\Z)", wt, re.MULTILINE | re.DOTALL)
        if section_match:
            content = section_match.group(1).strip()
            print(f"  Section preview (first 600 chars):")
            print("    " + content[:600].replace("\n", "\n    "))

# 4. Gardening/plant page
print()
print("=" * 70)
print("4. Gardening / plant page — grow time data")
print("=" * 70)
PLANTS = ["Onion", "Carrot", "Strawberry", "Potato", "Mushroom_Substrate"]
for page in PLANTS:
    time.sleep(DELAY)
    print(f"\n--- {page} ---")
    wt = get_wikitext(page)
    print(f"length: {len(wt)} chars")
    # Patterns: "Grow Time", "Growth Time", "matures in", etc.
    matches = re.findall(r"(grow\s*time|growth\s*time|matures?|harvest\s*time)[^.\n]*", wt, re.I)
    print(f"  Time-pattern hits: {matches[:6]}")
    # Look for Plant/Seed templates
    template_uses = re.findall(r"\{\{(Plant|Seed|Garden|Crop)[^}]*\}\}", wt, re.I)
    print(f"  Plant/Seed/Garden templates: {len(template_uses)}")
    if template_uses[:1]:
        print(f"    First: {template_uses[0][:200]}")

# 5. Casino Arena
print()
print("=" * 70)
print("5. Casino Arena — what's the wiki's coverage?")
print("=" * 70)
# Search for related pages
d = api({"action": "query", "list": "search", "srsearch": "casino arena", "srlimit": "20"})
hits = d.get("query", {}).get("search", []) or []
print(f"Search hits for 'casino arena' ({len(hits)}):")
for h in hits[:15]:
    print(f"  - {h.get('title'):40s}  snippet: {re.sub(r'<[^>]+>','',h.get('snippet',''))[:80]}")

# Try Red Wing Casino as a known anchor
time.sleep(DELAY)
print()
print("--- Red_Wing_Casino page preview ---")
wt = get_wikitext("Red_Wing_Casino")
print(f"length: {len(wt)} chars")
# Find arena-relevant section
arena_section = re.search(r"==\s*[^=]*[Aa]rena[^=]*==(.*?)(?=^==[^=]|\Z)", wt, re.MULTILINE | re.DOTALL)
if arena_section:
    print(f"Arena section preview ({len(arena_section.group(1))} chars):")
    print(arena_section.group(1)[:1200])
else:
    # Print first 1500 chars of the page anyway
    print("No 'Arena' section; first 1500 chars of page:")
    print(wt[:1500])
