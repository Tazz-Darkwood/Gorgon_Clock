#!/usr/bin/env python3
"""
Introspect every CDN JSON snapshot and emit a single Markdown reference.

Usage: python3 data/introspect_schema.py
Reads:  data/cdn-snapshots/*.json
Writes: docs/data-schema.md
"""

from __future__ import annotations
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SNAP = ROOT / "data" / "cdn-snapshots"
OUT = ROOT / "docs" / "data-schema.md"
CDN_BASE = "https://cdn.projectgorgon.com/v470/data"

ENUM_THRESHOLD = 30          # if a field has <= this many distinct string values, list them all
ENUM_SAMPLE_FIELDS = 12      # max distinct values to show inline if above threshold
SAMPLE_BYTES = 1500          # bytes of sample entry to inline


def jtype(v: Any) -> str:
    if v is None: return "null"
    if isinstance(v, bool): return "bool"
    if isinstance(v, int): return "int"
    if isinstance(v, float): return "float"
    if isinstance(v, str): return "string"
    if isinstance(v, list):
        if not v: return "array<empty>"
        inner = sorted({jtype(x) for x in v})
        return f"array<{'|'.join(inner)}>"
    if isinstance(v, dict): return "object"
    return type(v).__name__


def collect_object_schema(items: list[dict]) -> dict:
    """Given a list of dicts (the entries of a top-level object-of-objects file),
    enumerate every key seen, the types observed, coverage percentage, distinct
    values (if low cardinality), and a sample value.
    """
    n = len(items)
    fields: dict[str, dict] = defaultdict(lambda: {
        "types": Counter(), "values": Counter(), "count": 0,
        "list_inner_keys": Counter(), "list_inner_types": Counter(),
        "sample": None,
    })
    for it in items:
        if not isinstance(it, dict):
            continue
        for k, v in it.items():
            f = fields[k]
            f["count"] += 1
            f["types"][jtype(v)] += 1
            if f["sample"] is None:
                f["sample"] = v
            if isinstance(v, str) and len(v) <= 80:
                f["values"][v] += 1
            if isinstance(v, list):
                for x in v:
                    if isinstance(x, dict):
                        for ik in x.keys():
                            f["list_inner_keys"][ik] += 1
                    else:
                        f["list_inner_types"][jtype(x)] += 1
    out = {}
    for k, f in fields.items():
        coverage = f["count"] / n if n else 0
        types = ", ".join(f"{t} ({c})" for t, c in f["types"].most_common())
        # Enum-like? distinct string values modest in number?
        enum = None
        if f["values"]:
            distinct = len(f["values"])
            if distinct <= ENUM_THRESHOLD:
                enum = sorted(f["values"].keys())
        # Sample formatting
        sample = f["sample"]
        sample_repr = json.dumps(sample, ensure_ascii=False)
        if len(sample_repr) > 200:
            sample_repr = sample_repr[:197] + "..."
        out[k] = {
            "coverage": coverage,
            "count": f["count"],
            "types": types,
            "enum": enum,
            "sample": sample_repr,
            "list_inner_keys": f["list_inner_keys"].most_common(20),
            "list_inner_types": dict(f["list_inner_types"]),
        }
    return out


def file_top_shape(data: Any) -> tuple[str, int, list[dict]]:
    """Identify whether the file is dict-of-dicts (the common pattern) and
    return (shape_label, entry_count, list_of_entry_dicts).
    """
    if isinstance(data, dict):
        if not data:
            return ("empty object", 0, [])
        sample_v = next(iter(data.values()))
        if isinstance(sample_v, dict):
            return ("object keyed by ID", len(data), list(data.values()))
        if isinstance(sample_v, list):
            return ("object keyed by ID (values are arrays)", len(data),
                    [{"_array": v} for v in data.values()])
        # primitive values - probably localization-style strings
        return ("object of primitives (likely localization)", len(data), [])
    if isinstance(data, list):
        return ("array", len(data), [x for x in data if isinstance(x, dict)])
    return (type(data).__name__, 1, [])


def per_file_extras(name: str, data: Any) -> list[str]:
    """File-specific signal extraction. Returns markdown bullets to append."""
    extras = []
    try:
        if name == "sources_items.json":
            n_total = len(data)
            n_with = sum(1 for v in data.values() if v.get("entries"))
            type_counter: Counter = Counter()
            for v in data.values():
                for e in v.get("entries", []) or []:
                    type_counter[e.get("type")] += 1
            extras.append(f"**Items in file:** {n_total}")
            extras.append(f"**Items with at least one source entry:** {n_with} ({n_with/n_total:.0%})")
            extras.append("")
            extras.append("**Distinct entry `type` values across all items (descending):**")
            extras.append("")
            extras.append("| type | count |")
            extras.append("|---|---|")
            for t, c in type_counter.most_common():
                extras.append(f"| `{t}` | {c} |")
        elif name == "npcs.json":
            n = len(data)
            desires = Counter()
            prefs_seen = []
            services_types = Counter()
            for v in data.values():
                for p in v.get("Preferences", []) or []:
                    desires[p.get("Desire")] += 1
                    if isinstance(p.get("Pref"), (int, float)):
                        prefs_seen.append(p["Pref"])
                for s in v.get("Services", []) or []:
                    services_types[s.get("Type")] += 1
            neg = sum(1 for x in prefs_seen if x < 0)
            pos = sum(1 for x in prefs_seen if x > 0)
            extras.append(f"**Total NPCs:** {n}")
            extras.append(f"**Total Preferences entries:** {len(prefs_seen)} (positive: {pos}, negative: {neg})")
            extras.append(f"**Pref value range:** [{min(prefs_seen):.2f}, {max(prefs_seen):.2f}]")
            extras.append("")
            extras.append("**Desire enum and counts:**")
            for d, c in desires.most_common():
                extras.append(f"- `{d}`: {c}")
            extras.append("")
            extras.append("**Distinct `Services.Type` values:**")
            for t, c in services_types.most_common():
                extras.append(f"- `{t}`: {c}")
        elif name == "recipes.json":
            n = len(data)
            skills = Counter()
            for v in data.values():
                if isinstance(v, dict):
                    skills[v.get("Skill")] += 1
            extras.append(f"**Total recipes:** {n}")
            extras.append("")
            extras.append("**Distinct `Skill` values (top 30):**")
            extras.append("")
            extras.append("| skill | recipes |")
            extras.append("|---|---|")
            for s, c in skills.most_common(30):
                extras.append(f"| `{s}` | {c} |")
        elif name == "items.json" or name == "items_raw.json":
            n = len(data)
            kw_counter: Counter = Counter()
            for v in data.values():
                if isinstance(v, dict):
                    for kw in v.get("Keywords", []) or []:
                        # Strip "=N" suffix to get the bare keyword
                        bare = kw.split("=")[0] if "=" in kw else kw
                        kw_counter[bare] += 1
            extras.append(f"**Total items:** {n}")
            extras.append(f"**Distinct keywords (top 25 by frequency):**")
            extras.append("")
            extras.append("| keyword | items |")
            extras.append("|---|---|")
            for kw, c in kw_counter.most_common(25):
                extras.append(f"| `{kw}` | {c} |")
        elif name == "areas.json":
            extras.append(f"**Total areas:** {len(data)}")
            extras.append("")
            extras.append("**Full area list:**")
            extras.append("")
            extras.append("| key | FriendlyName | Short |")
            extras.append("|---|---|---|")
            for k, v in sorted(data.items()):
                if isinstance(v, dict):
                    extras.append(f"| `{k}` | {v.get('FriendlyName','')} | {v.get('ShortFriendlyName','')} |")
        elif name == "skills.json":
            n = len(data)
            extras.append(f"**Total skills:** {n}")
            extras.append("")
            extras.append("**All skill keys:**")
            extras.append("")
            extras.append(", ".join(f"`{k}`" for k in sorted(data.keys())))
        elif name == "ai.json":
            n = len(data)
            strats = Counter()
            for v in data.values():
                if isinstance(v, dict):
                    strats[v.get("Strategy")] += 1
            extras.append(f"**Total monster templates:** {n}")
            extras.append("")
            extras.append("**Strategy distribution:**")
            for s, c in strats.most_common():
                extras.append(f"- `{s}`: {c}")
        elif name == "storagevaults.json":
            n = len(data)
            extras.append(f"**Total vaults:** {n}")
        elif name == "quests.json":
            n = len(data)
            extras.append(f"**Total quests:** {n}")
    except Exception as e:
        extras.append(f"_extras failed: {e}_")
    return extras


def render_field_table(fields: dict, file_total: int) -> list[str]:
    rows = ["| field | coverage | types | sample | enum / list-inner |", "|---|---|---|---|---|"]
    for k in sorted(fields.keys(), key=lambda x: (-fields[x]["coverage"], x)):
        f = fields[k]
        coverage_pct = f"{f['coverage']:.0%}"
        sample = (f["sample"] or "").replace("|", "\\|").replace("\n", " ")
        sample = sample if len(sample) < 100 else sample[:97] + "..."
        extra = ""
        if f["enum"]:
            vals = f["enum"][:ENUM_SAMPLE_FIELDS]
            extra = "enum: " + ", ".join(f"`{v}`" for v in vals)
            if len(f["enum"]) > ENUM_SAMPLE_FIELDS:
                extra += f" *(+{len(f['enum'])-ENUM_SAMPLE_FIELDS} more)*"
        elif f["list_inner_keys"]:
            top = ", ".join(f"`{k}`" for k, _ in f["list_inner_keys"][:8])
            extra = f"inner keys: {top}"
        elif f["list_inner_types"]:
            extra = f"inner types: {f['list_inner_types']}"
        rows.append(f"| `{k}` | {coverage_pct} | {f['types']} | `{sample}` | {extra} |")
    return rows


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(SNAP.glob("*.json"))
    out: list[str] = []
    out.append("# Project Gorgon CDN Data Schema")
    out.append("")
    out.append(f"**Source:** `{CDN_BASE}/`  (version 470)")
    out.append("")
    out.append(
        "**Generated by** `data/introspect_schema.py` against snapshots in `data/cdn-snapshots/` "
        "(gitignored). Re-run after re-downloading to refresh.")
    out.append("")
    out.append("**Method:** every field's coverage, observed types, sample value, and enum-like "
               "distinct values are *measured* by walking the JSON, not summarised by a model.")
    out.append("")

    # Index
    out.append("## Index")
    out.append("")
    out.append("| File | Top-level shape | Entries | Size |")
    out.append("|---|---|---|---|")
    file_meta = []
    for fp in files:
        size = fp.stat().st_size
        try:
            data = json.loads(fp.read_text())
        except Exception as e:
            file_meta.append((fp.name, "INVALID JSON", 0, size, None, [], None))
            continue
        shape, count, items = file_top_shape(data)
        file_meta.append((fp.name, shape, count, size, data, items, None))
        size_disp = f"{size/1_048_576:.1f} MB" if size > 1_048_576 else f"{size/1024:.0f} KB"
        anchor = fp.name.replace(".", "").replace("_", "")
        out.append(f"| [`{fp.name}`](#{anchor}) | {shape} | {count:,} | {size_disp} |")
    out.append("")

    # Detail per file
    for name, shape, count, size, data, items, _ in file_meta:
        anchor = name.replace(".", "").replace("_", "")
        out.append(f"## {name}")
        out.append("")
        out.append(f"**URL:** `{CDN_BASE}/{name}`")
        out.append(f"**Top-level shape:** {shape}")
        out.append(f"**Entry count:** {count:,}")
        out.append(f"**File size:** {size:,} bytes")
        out.append("")

        extras = per_file_extras(name, data) if data is not None else []
        if extras:
            out.append("### Notes")
            out.append("")
            out.extend(extras)
            out.append("")

        if items and isinstance(items[0], dict) and "_array" not in items[0]:
            schema = collect_object_schema(items)
            if schema:
                out.append("### Field schema")
                out.append("")
                out.extend(render_field_table(schema, len(items)))
                out.append("")
                # one sample
                try:
                    if isinstance(data, dict):
                        first_k = next(iter(data.keys()))
                        first_v = data[first_k]
                        sample = json.dumps({first_k: first_v}, indent=2, ensure_ascii=False)
                        if len(sample) > SAMPLE_BYTES:
                            sample = sample[:SAMPLE_BYTES] + "\n  ... (truncated)\n}"
                        out.append("### Sample entry")
                        out.append("")
                        out.append("```json")
                        out.append(sample)
                        out.append("```")
                        out.append("")
                except Exception:
                    pass
        elif items and isinstance(items[0], dict) and "_array" in items[0]:
            # object-of-arrays: peek at one
            try:
                if isinstance(data, dict):
                    first_k = next(iter(data.keys()))
                    first_v = data[first_k]
                    sample = json.dumps({first_k: first_v[:3] if isinstance(first_v, list) else first_v}, indent=2, ensure_ascii=False)
                    if len(sample) > SAMPLE_BYTES:
                        sample = sample[:SAMPLE_BYTES] + "\n  ... (truncated)"
                    out.append("### Sample entry")
                    out.append("")
                    out.append("```json")
                    out.append(sample)
                    out.append("```")
                    out.append("")
            except Exception:
                pass
        else:
            # primitive/localization
            try:
                if isinstance(data, dict) and data:
                    pairs = list(data.items())[:5]
                    out.append("### Sample entries")
                    out.append("")
                    out.append("```json")
                    out.append(json.dumps(dict(pairs), indent=2, ensure_ascii=False)[:600])
                    out.append("```")
                    out.append("")
            except Exception:
                pass

    OUT.write_text("\n".join(out))
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
