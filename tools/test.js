#!/usr/bin/env node
/* 自動試玩：從主頁一路玩到結算卡，兩種玩家各一次。先跑 npm run build。
     node tools/test.js            電腦（1280×800、亮色、選第一個選項、把咖啡磨對）＋手機（390×844、暗色、選最後一個選項、不調磨豆機）
   每一輪最後要印 ended: true、card: true（分享圖卡畫出來了）；整份最後一行 TEST OK 或 TEST FAILED。截圖在 out/shot-*.png（-end 是圖卡、-recap 是結案報告）。
   用到 playwright-core 與一個 Chromium 系的瀏覽器，依序找：環境變數 CHROMIUM 指到的執行檔（或 PLAYWRIGHT_BROWSERS_PATH 底下的 chromium）、
   npx playwright-core install chromium 裝的那一個、電腦上已經裝好的瀏覽器（channel）。都找不到就印出要跑哪一行指令，不丟一大段錯誤。
   也檢查授權（LICENSE）的兩個條件：public/index.html 開頭有框架的授權聲明（建置自動加的那一行 /*! Made with the fab24hr engine … *\/），
   以及主頁與結算畫面都有出處那一行（「Powered by fab24hr」「☕ 贊助 fab24hr」）：看得到、沒被蓋住、字不會太小、網址跟 engine/home.js 一樣。 */
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const { chromium } = require('playwright-core');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'out'), PAGE = pathToFileURL(path.join(OUT, 'test.html')).href;   /* 磁碟代號開頭的路徑也對 */
const BR = process.env.PLAYWRIGHT_BROWSERS_PATH, CHROME = process.env.CHROMIUM || (BR && [path.join(BR, 'chromium')].find(f => fs.existsSync(f) && fs.statSync(f).isFile()));
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const HOMEJS = fs.readFileSync(path.join(ROOT, 'engine', 'home.js'), 'utf8'), urlOf = k => (HOMEJS.match(new RegExp('const ' + k + "='([^']+)'")) || [])[1];
const CREDIT = [['Credit', urlOf('CREDIT_URL')], ['Coffee', urlOf('COFFEE_URL')]];

/* 出處那一行（授權的條件）：pre 是 'h'（主頁）或 'end'（結算）。回傳有問題的地方，沒問題是空的 */
const creditLine = (pg, pre) => pg.evaluate(([pre, want]) => want.map(([id, url]) => {
  const e = document.getElementById(pre + id); if (!e) return pre + id + ' missing';
  const r = e.getBoundingClientRect(), c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true }) || r.width < 20 || r.height < 10) return pre + id + ' not visible';
  if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return pre + id + ' off screen';
  if (!c || !(c === e || e.contains(c))) return pre + id + ' covered';
  if (parseFloat(getComputedStyle(e).fontSize) < 11) return pre + id + ' text too small';
  return e.href === url ? '' : pre + id + ' points to ' + e.href;
}).filter(Boolean), [pre, CREDIT]);
const creditErr = (where, bad) => 'credit line on the ' + where + ' screen (required by LICENSE) ／ 出處那一行（授權的條件）：' + bad.join(', ');

async function play(br, o) {
  const ctx = await br.newContext({ viewport: o.vp, colorScheme: o.scheme, hasTouch: !!o.touch, isMobile: !!o.touch, deviceScaleFactor: o.touch ? 2 : 1 });
  const pg = await ctx.newPage(), errors = [], log = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error' && !/WebGL|GPU|GL_/.test(m.text())) errors.push(m.text()) });
  await pg.goto(PAGE);
  await pg.waitForFunction(() => window.__t && !document.getElementById('home').hidden);
  await pg.waitForTimeout(800); await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-home.png') });
  const ch = await creditLine(pg, 'h'); if (ch.length) errors.push(creditErr('home', ch));
  await pg.fill('#pname', o.name);
  await pg.click('#go');
  let ended = false, steps = 0, mid = false;
  /* 看得到：有畫出來的方框（畫面上的東西多半是 position:fixed，offsetParent 永遠是 null，不能用它判斷） */
  const vis = s => pg.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' }, s);
  const click = async s => { try { await pg.click(s, { timeout: 5000 }); return true } catch (e) { log.push('miss:' + s); return false } };
  while (steps++ < 400) {
    if (await vis('#end')) { ended = true; break }
    if (await vis('#tcard')) { await click('#tcGo'); log.push('card'); await pg.waitForTimeout(350); continue }   /* 字卡淡出的 240 毫秒還看得到、但按不到 */
    if (await vis('#toastGo')) { await click('#toastGo'); log.push('answer'); continue }
    if (await vis('#pull')) {   /* 小遊戲：磨豆機 */
      const want = o.dial ? 5 : null;
      let g = +(await pg.textContent('#panelBody b.mono'));
      if (want != null && g !== want) { await click(g > want ? '#finer' : '#coarser'); continue }
      if (await vis('#next')) { await click('#next'); log.push('mini:' + g); continue }
      await click('#pull'); continue;
    }
    if (await vis('#panel') && await vis('#next')) { await click('#next'); log.push('next'); continue }   /* 其他小遊戲：最後一顆是 #next */
    if (await vis('#dlg')) {
      if (!mid && log.length > 4) { mid = true; await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-talk.png') }) }
      const ch = await pg.$$('#dlg .choice');
      if (ch.length) { await ch[o.last ? ch.length - 1 : 0].click(); log.push('choice'); continue }
      await click('#dlgNext'); continue;
    }
    if (await vis('#gGo')) { const c = await pg.evaluate(() => window.__t.cur()); log.push('go:' + (c && c.to)); await click('#gGo'); await pg.waitForFunction(() => document.getElementById('guide').hidden || !document.getElementById('dlg').hidden, null, { timeout: 8000 }).catch(() => {}); continue }   /* 走到了才會開口 */
    await pg.waitForTimeout(150);
  }
  let card = false;
  if (ended) {   /* 結算先是 9:16 的圖卡（畫好要一兩秒），再按「看結案報告」 */
    card = await pg.waitForFunction(() => !document.getElementById('endImg').hidden, null, { timeout: 8000 }).then(() => true, () => false);
    await pg.waitForTimeout(300); await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-end.png') });
    const ce = await creditLine(pg, 'end'); if (ce.length) errors.push(creditErr('ending', ce));
    await click('#endRep'); await pg.waitForTimeout(300); await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-recap.png') });
  } else await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-end.png') });
  const end = ended ? await pg.textContent('#endRpt') : '';
  console.log(o.id + '：ended: ' + ended + '，card: ' + card + '｜' + log.join(' ') + '\n  ' + end.replace(/\s+/g, ' ').slice(0, 200) + '\n  ERRORS ' + errors.length + (errors.length ? '\n  ' + errors.slice(0, 5).join('\n  ') : ''));
  await ctx.close();
  return ended && card && !errors.length;
}

/* 瀏覽器：CHROMIUM 指定的 → playwright-core 自己下載的 → 電腦上裝好的（兩種常見的 channel）。都不行就告訴使用者怎麼裝 */
async function browser() {
  const tries = CHROME ? [{ executablePath: CHROME }] : [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  let err;
  for (const o of tries) try { return await chromium.launch(Object.assign({ args: ARGS }, o)) } catch (e) { err = e }
  console.error((CHROME ? 'cannot start the browser at ' + CHROME + ' ／ 開不了 ' + CHROME + '：\n  ' + String(err && err.message || err).split('\n')[0] + '\n'
    : 'No browser found for the test. Run this once, then npm test again:\n  npx playwright-core install chromium\n(or set CHROMIUM to the path of a Chromium-based browser)\n'
    + '找不到測試用的瀏覽器。先跑一次下面這行，再 npm test：\n  npx playwright-core install chromium\n（或用環境變數 CHROMIUM 指到一個 Chromium 系瀏覽器的執行檔）'));
  console.log('TEST FAILED'); process.exit(1);
}

(async () => {
  if (!fs.existsSync(path.join(OUT, 'test.html'))) { console.error('run npm run build first ／ 先跑 npm run build'); process.exit(1) }
  const pub = path.join(ROOT, 'public', 'index.html');
  if (!/\/\*! Made with the fab24hr engine .*fab24hr engine License/.test(fs.existsSync(pub) ? fs.readFileSync(pub, 'utf8') : '')) { console.error('public/index.html has lost the engine license notice (/*! Made with the fab24hr engine … */); run npm run build ／ public/index.html 少了框架的授權聲明，重新 npm run build'); console.log('TEST FAILED'); process.exit(1) }
  if (CREDIT.some(c => !c[1])) { console.error('engine/home.js must define CREDIT_URL and COFFEE_URL ／ engine/home.js 要有 CREDIT_URL 與 COFFEE_URL'); console.log('TEST FAILED'); process.exit(1) }
  const br = await browser();
  const a = await play(br, { id: 'desktop', vp: { width: 1280, height: 800 }, scheme: 'light', name: 'Alex', dial: true });
  const b = await play(br, { id: 'phone', vp: { width: 390, height: 844 }, scheme: 'dark', name: '', touch: true, last: true });
  await br.close();
  console.log(a && b ? 'TEST OK' : 'TEST FAILED');
  process.exit(a && b ? 0 : 1);
})().catch(e => { console.error(e); console.log('TEST FAILED'); process.exit(1) });
