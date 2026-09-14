from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":800})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
    pg.goto("file:///home/claude/circa-survivor/dist/index.html"); pg.wait_for_timeout(500)
    print("before:", pg.inner_text(".stamp"))
    pg.click("button.btn"); pg.wait_for_timeout(800)
    print("status:", pg.inner_text(".status")); print("after:", pg.inner_text(".stamp"))
    rows=pg.eval_on_selector_all("tbody:nth-of-type(2) tr", "rs=>rs.slice(0,4).map(r=>[...r.querySelectorAll('td')].slice(0,4).map(td=>td.innerText.trim()).join('|'))")
    print("top rows:", rows)
    # sort by week 3 spread
    pg.click("thead th:nth-child(7)"); pg.wait_for_timeout(200)
    print("sorted by wk3:", pg.eval_on_selector_all("tbody:nth-of-type(2) tr", "rs=>rs.slice(0,3).map(r=>r.querySelectorAll('td')[3].innerText.trim()+' '+r.querySelectorAll('td')[6].innerText.trim().replace(/\\n/g,' '))"))
    # switch leg to Week 2 and check stamp
    pg.select_option("select", "W2"); pg.wait_for_timeout(200); print("W2 stamp:", pg.inner_text(".stamp"))
    pg.select_option("select", "W1"); pg.wait_for_timeout(200)
    pg.screenshot(path="/home/claude/circa-survivor/test/e2e.png")
    print("errors:", errs)
    b.close()
