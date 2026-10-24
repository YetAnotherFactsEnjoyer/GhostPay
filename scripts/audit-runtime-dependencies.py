#!/usr/bin/env python3
"""Query OSV for Gradle's resolved Maven runtime coordinates (no extra packages)."""
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

source = Path(__file__).resolve().parents[1] / "backend/build/reports/runtime-dependencies-osv.json"
if not source.exists():
    sys.exit("Run ./gradlew exportRuntimeDependencies from backend first.")
try:
    request = urllib.request.Request(
        "https://api.osv.dev/v1/querybatch", data=source.read_bytes(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.load(response)
except (urllib.error.URLError, TimeoutError) as error:
    sys.exit(f"BLOCKED: OSV query failed: {error}")
queries = json.loads(source.read_text())["queries"]
if len(result.get("results", [])) != len(queries):
    sys.exit("BLOCKED: OSV returned an incomplete result.")
target = source.with_name("runtime-dependency-audit.json")
target.write_text(json.dumps({"queries": queries, **result}, indent=2) + "\n")
findings = 0
for query, row in zip(queries, result["results"]):
    for vulnerability in row.get("vulns", []):
        findings += 1
        print(query["package"]["name"], query["version"], vulnerability["id"])
print(f"Scanned {len(queries)} runtime coordinates; {findings} advisory matches. Report: {target}")
sys.exit(1 if findings else 0)
