import glob, os
SRC = "/home/claude/ol-proto/src/"
OUT = "/home/claude/ol-proto/"
css = "".join(open(f).read() for f in [SRC + "base.css", SRC + "sd.css", SRC + "pu.css"] + sorted(glob.glob(SRC + "ol*.css")))
harness = open(SRC + "harness.js").read()
FOOT = '<p style="text-align:center;color:#8b9189;font-size:11.5px;margin:18px 0 28px">Optom.uz · clickable prototype for the order lifecycle user stories (epic US-BF-6.5) · requirements: Order lifecycle PRD · example data only. Where a prototype differs from the acceptance criteria in Confluence, the acceptance criteria win.</p>'
PAGES = [("p-ol1-checkout.html", "P-OL1 Cart and checkout: branch, method, price", "p1.js", "US-BF-5.1-02, US-BF-5.3-01, US-BF-5.3-02", "ol1"),
         ("p-ol2-order-pages.html", "P-OL2 Order pages: buyer and seller", "p2.js", "US-BF-6.5-04, US-BF-6.5-05, US-BF-6.6-01, US-SF-5.7-01, US-SF-5.10-01, US-BF-6.8-01, US-BF-6.8-02", "ol2"),
         ("p-ol3-admin.html", "P-OL3 Admin: orders, problems and actions", "p3.js", "US-AF-2.1-03, US-BF-6.5-04, US-BF-6.5-05", "ol3")]
def nscen(js):
    t = open(SRC + js).read() if os.path.exists(SRC + js) else ""
    return t.count("{ label:")
for fn, title, js, st, _ in PAGES:
    if not os.path.exists(SRC + js): continue
    open(OUT + fn, "w").write(f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>
<div id="app"></div>{FOOT}
<script>{harness}
{open(SRC + js).read()}
</script></body></html>''')
lis = "".join(f'<li><a href="{fn}">{t}</a> <small>{st} · {nscen(js)} scenarios</small></li>' for fn, t, js, st, _ in PAGES)
open(OUT + "index.html", "w").write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Optom.uz order lifecycle prototypes</title>
<style>body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1b1c1f}}a{{color:#00a028}}li{{margin:8px 0}}small{{color:#667}}</style></head><body>
<h1>Optom.uz · Order lifecycle prototypes v1.0</h1><p>Clickable prototypes for the user stories of epic US-BF-6.5 (Order lifecycle). Screens in Russian, notes in English. Pick a state in the <b>Scenario</b> list at the top, or open a scenario with <code>?s=N</code> (N starts at 0).</p>
<ul>{lis}</ul><p><small>Example data only. The acceptance criteria in Confluence are the source of truth.</small></p></body></html>''')
open(OUT + "README.md", "w").write("# Optom.uz order lifecycle prototypes\n\nClickable HTML prototypes P-OL1 – P-OL3 for the user stories of epic US-BF-6.5 (Order lifecycle), published with GitHub Pages and embedded in the Confluence user story pages.\n\nRequirements: Order lifecycle PRD. Source of truth: the Confluence story pages. Example data only, no real customer data.\n\nBuilt from `src/` with `build.py`.\n")
open(OUT + "robots.txt", "w").write("User-agent: *\nDisallow: /\n")
open(OUT + ".nojekyll", "w").write("")
print("built")
