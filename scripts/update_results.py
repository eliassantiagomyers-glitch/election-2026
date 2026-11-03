import csv, io, re, sys, zipfile, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = "https://results.enr.clarityelections.com/CA/Butte/126778/"
DATA = "js/data.js"
VER_FILE = ".clarity_version"
UA = {"User-Agent": "Mozilla/5.0"}

def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode("utf-8-sig")

def norm(s):
    return set(re.sub(r"[^a-z ]", " ", s.lower()).split())

# 1. Has the county published a new upload?
ver = get(BASE + "current_ver.txt").strip()
if not ver.isdigit():
    sys.exit(f"Unexpected version string: {ver!r}")
try:
    old = open(VER_FILE).read().strip()
except FileNotFoundError:
    old = ""
if ver == old:
    print(f"No change (v{ver})")
    sys.exit(0)
print(f"New upload: v{old or 'none'} -> v{ver}")

# 2. Pull summary.csv out of reports/summary.zip
z = zipfile.ZipFile(io.BytesIO(get(BASE + ver + "/reports/summary.zip", binary=True)))
csv_name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
rows = list(csv.DictReader(io.StringIO(z.read(csv_name).decode("utf-8-sig"))))
headers = list(rows[0].keys())
choice_col = next(h for h in headers if "choice" in h.lower())
votes_col = next(h for h in headers if "total votes" in h.lower() or h.lower().strip() == "votes")
print(f"Using columns: {choice_col!r} / {votes_col!r}")

results = []
for r in rows:
    try:
        results.append((norm(r[choice_col]), r[choice_col], int(r[votes_col].replace(",", ""))))
    except (ValueError, TypeError):
        pass

# 3. Rewrite votes in data.js by candidate name
src = open(DATA, encoding="utf-8").read()
matched, total = 0, 0

def repl(m):
    global matched, total
    name = m.group(2)
    toks = norm(name)
    hits = [v for t, c, v in results if toks <= t or t <= toks]
    if not hits:
        print(f"  NO MATCH for {name!r} — leaving votes as-is")
        return m.group(0)
    matched += 1
    total += hits[0]
    print(f"  {name}: {hits[0]}")
    return f"{m.group(1)}{hits[0]}"

src = re.sub(r'(name:\s*"([^"]+)"[^}]*?votes:\s*)(\d+)', repl, src)

if matched == 0:
    sys.exit("Matched zero candidates — check the log above. Not writing anything.")

if total > 0:
    src = re.sub(r"live_election:\s*false", "live_election: true", src)

now = datetime.now(ZoneInfo("America/Los_Angeles"))
stamp = now.strftime("%b. %-d, %Y, %-I:%M %p").replace("AM", "a.m.").replace("PM", "p.m.")
src = re.sub(r'last_updated:\s*"[^"]*"', f'last_updated: "{stamp}"', src)

open(DATA, "w", encoding="utf-8").write(src)
open(VER_FILE, "w").write(ver)
print(f"Updated {matched} candidates, {total} total votes, stamped {stamp}")
