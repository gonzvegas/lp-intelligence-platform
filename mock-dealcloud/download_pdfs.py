"""
Downloads real LP document PDFs into fixtures/pdfs/ at Docker build time.
Falls back gracefully if a download fails.
"""

import os
import sys
import urllib.request

PDFS = [
    (
        "ilpa_model_lpa_whole_of_fund.pdf",
        "https://ilpa.org/wp-content/uploads/2020/07/ILPA-Model-Limited-Partnership-Agreement-WOF.pdf",
    ),
    (
        "ilpa_model_lpa_deal_by_deal.pdf",
        "https://ilpa.org/wp-content/uploads/2020/07/ILPA-Model-Limited-Parnership-Agreement-Deal-By-Deal.pdf",
    ),
]

dest_dir = os.path.join(os.path.dirname(__file__), "fixtures", "pdfs")
os.makedirs(dest_dir, exist_ok=True)

failed = []
for filename, url in PDFS:
    dest = os.path.join(dest_dir, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 10_000:
        print(f"  already exists: {filename}")
        continue
    print(f"  downloading {filename} ...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        size = os.path.getsize(dest)
        print(f"  ok: {filename} ({size:,} bytes)")
    except Exception as exc:
        print(f"  WARN: could not download {filename}: {exc}", file=sys.stderr)
        failed.append(filename)

if failed:
    print(f"\nWARN: {len(failed)} PDF(s) not downloaded — mock will fall back to generated PDFs.")
else:
    print("\nAll PDFs downloaded successfully.")
