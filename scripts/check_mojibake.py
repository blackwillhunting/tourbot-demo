from pathlib import Path
import sys

ROOT = Path("src")
EXTS = {".ts", ".tsx", ".css", ".html", ".json"}

# These are the usual visible mojibake markers:
# U+00C2 = stray "Â"
# U+00E2 = stray "â"
BAD_CHARS = {
    "\u00c2": "stray C2 mojibake marker",
    "\u00e2": "stray E2 mojibake marker",
}

found = 0

for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix.lower() not in EXTS:
        continue
    if "assets" in path.parts:
        continue

    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        print(f"{path}:0: invalid UTF-8: {exc}")
        found += 1
        continue

    for line_no, line in enumerate(text.splitlines(), 1):
        hits = [name for ch, name in BAD_CHARS.items() if ch in line]
        if hits:
            found += 1
            escaped = line.encode("unicode_escape").decode("ascii")
            print(f"{path}:{line_no}: mojibake found: {', '.join(hits)}")
            print(f"  {escaped}")

if found:
    print("")
    print(f"FAIL: {found} suspicious mojibake line(s) found.")
    sys.exit(1)

print("OK: no mojibake markers found.")
