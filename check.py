import sys, asyncio, re
from playwright.async_api import async_playwright
# usage: python3 check.py [file] [shot spec file:idx ...]
PAGES = {"p-ol1-checkout.html": "p1.js", "p-ol2-order-pages.html": "p2.js", "p-ol3-admin.html": "p3.js"}
args = sys.argv[1:]
only = [a for a in args if ":" not in a]
SHOTS = [a for a in args if ":" in a]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        for f, js in PAGES.items():
            if only and f not in only: continue
            try: n = open("/home/claude/ol-proto/src/" + js).read().count("{ label:")
            except FileNotFoundError: continue
            for mob in (False,):
                pg = await b.new_page(viewport={"width": 1366, "height": 900})
                pg.on("pageerror", lambda e, f=f: errs.append(f"{f}: {e}"))
                for i in range(n):
                    await pg.goto(f"file:///home/claude/ol-proto/{f}?s={i}")
                    await pg.wait_for_timeout(150)
                    txt = await pg.inner_text("#app")
                    if len(txt) < 30: errs.append(f"{f} s={i}: almost empty")
                    if f"{f}:{i}" in SHOTS:
                        await pg.screenshot(path=f"/home/claude/ol-proto/shot_{f[:6]}_{i}.png", full_page=True)
                await pg.close()
        print("errors:", errs or "none")
        await b.close()
asyncio.run(main())
