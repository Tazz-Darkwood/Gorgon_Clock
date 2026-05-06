#!/usr/bin/env python3
"""Probe the PG wiki API: extensions, license, and sample one monster page raw."""
import json
import urllib.request
import urllib.parse

API = "https://wiki.projectgorgon.com/w/api.php"

def api(params):
    params.setdefault("format", "json")
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "GorgonClock-Discovery/0.1 (research)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)

# 1. Site info
print("=" * 60)
print("WIKI API access — basic confirmation")
print("=" * 60)
data = api({"action": "query", "meta": "siteinfo",
            "siprop": "extensions|namespaces|general"})
gen = data.get("query", {}).get("general", {})
print(f"Sitename:       {gen.get('sitename')}")
print(f"Generator:      {gen.get('generator')}")
print(f"Main page:      {gen.get('mainpage')}")
print(f"License code:   {gen.get('rightscode')}")
print(f"License text:   {gen.get('rights')}")
print(f"Article path:   {gen.get('articlepath')}")
print()

exts = data.get("query", {}).get("extensions", [])
print(f"Installed extensions: {len(exts)}")
key_exts = ["cargo", "semantic", "templatedata", "scribunto", "parserfunctions", "lua"]
print("\n★ KEY extensions for our purposes:")
for e in exts:
    nm = e.get("name", "")
    if any(k in nm.lower() for k in key_exts):
        v = e.get('version', '?')
        d = e.get('description', '')[:90]
        print(f"  ★ {nm}: v{v} — {d}")

print("\nAll extensions:")
for e in exts:
    print(f"  - {e.get('name', '?')}")

# 2. Fire Spider page — fetch raw wikitext
print()
print("=" * 60)
print("Fire_Spider — raw wikitext")
print("=" * 60)
data = api({"action": "parse", "page": "Fire_Spider", "prop": "wikitext"})
wt = data.get("parse", {}).get("wikitext", {}).get("*", "")
print(f"Wikitext length: {len(wt):,} chars")
print()
print("First 3500 chars verbatim:")
print(wt[:3500])
