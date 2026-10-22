#!/usr/bin/env node
/* 自動試玩：從主頁一路玩到結算卡，兩種玩家各一次。先跑 npm run build。
     node tools/test.js            電腦（1280×800、亮色、選第一個選項、打字題打對）＋電腦暗色（1440×900、選最後一個選項、打字題打錯三次再看答案）；這個遊戲只做電腦版
   每一輪最後要印 ended: true、card: true（分享圖卡畫出來了）；整份最後一行 TEST OK 或 TEST FAILED。截圖在 out/shot-*.png（-end 是圖卡、-recap 是結案報告、-wire 是第一塊接好的電路板）。
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
/* 打字題的正確答案（game/minis.js 的 codeTask，依 data-task）：故意跟標準答案寫得不一樣，順便測「等價就算對」 */
const ANSWERS = {
  ctrl: 'ctrl[7:0] <= PSTRB[0] ? PWDATA[7:0] : ctrl[7:0];',
  irq: 'irq_set | irq_reg & ~clr',
  slverr: 'PSEL && PENABLE && ((PADDR != 0 && PADDR != 4 && PADDR != 8) || (PWRITE && PADDR == 4))',
  assert: "assert property (@(posedge PCLK) PSEL && PENABLE && !PWRITE && PADDR == 8'h04 |-> PRDATA == status);",
  cover: 'PSEL && PENABLE && PWRITE && PADDR == 8 && PSTRB[0] && (PWDATA[3:0] & irq_set) != 0',
  flops: '36',
  nolatch: 'rd_status ? status : rd_ctrl ? ctrl : 0',
  clock: 'create_clock -name PCLK -period 5.0 [get_ports {PCLK}]',
  indelay: 'set_input_delay 2 -clock PCLK [get_ports PADDR]',
  setup: '-0.40',
  hold: '-0.14 ns',
  ohm: '40 kΩ',
  rise: '799 ns',
  rc: '15.9 Hz',
  gain: '20k',
  scanff: '(se & si) | (~se & d)',
  ttime: '100 ms',
  rstfix: 'rst_n & (test_mode | !soft_rst)',
  fcov: '97.0 %',
  core: '131 µm',
  skew: '0.150 ns',
  ir: '0.880 V'
};
/* 拉線題（game/circuit.js 的 wireTask）的正確接法：也故意跟標準答案接得不一樣（電阻對調、換一組值），測「接法不同但電路對就算對」。vals 是下拉選單選第幾個 */
const WIRES = {
  divider: { vals: { R1: 3, R2: 5 }, wires: [['VBAT.p', 'R2.b'], ['R2.a', 'ADC.p'], ['ADC.p', 'R1.a'], ['R1.b', 'GND.p']] },
  nand: { wires: [['P2.s', 'VDD.p'], ['P1.s', 'P2.s'], ['Y.p', 'P2.d'], ['P1.d', 'P2.d'], ['N2.d', 'P1.d'], ['N2.s', 'N1.d'], ['N1.s', 'GND.p'], ['P1.g', 'B.p'], ['N2.g', 'B.p'], ['P2.g', 'A.p'], ['N1.g', 'A.p']] },
  pullup: { vals: { R1: 2, R2: 2 }, wires: [['R2.a', 'VDD.p'], ['R1.a', 'R2.a'], ['R2.b', 'DEV.SDA'], ['DEV.SDA', 'MCU.SDA'], ['R1.b', 'DEV.SCL'], ['DEV.SCL', 'MCU.SCL']] },
  filter: { vals: { R1: 2, C1: 1 }, wires: [['BTN.p', 'R1.b'], ['R1.a', 'C1.b'], ['C1.a', 'GND.p'], ['IN.p', 'R1.a']] },
  amp: { vals: { R1: 1, R2: 2 }, wires: [['VIN.p', 'U1.p'], ['OUT.p', 'U1.o'], ['R2.b', 'U1.o'], ['R2.a', 'U1.m'], ['R1.b', 'U1.m'], ['R1.a', 'GND.p']] },
  scan: { wires: [['SCAN_IN.p', 'SFF2.SI'], ['SFF2.Q', 'SFF1.SI'], ['SFF1.Q', 'SFF4.SI'], ['SFF4.Q', 'SFF3.SI'], ['SFF3.Q', 'SCAN_OUT.p'], ['SE.p', 'SFF1.SE'], ['SE.p', 'SFF2.SE'], ['SE.p', 'SFF3.SE'], ['SE.p', 'SFF4.SE']] }
};
/* 找故障題（game/dft.js 的 atpgTask）：每個故障一組抓得到的輸入（A B C D），也跟標準答案不一樣 */
const ATPG = { atpg: ['1101', '1010'] };
/* 擺方塊題（game/layout.js 的 floorTask）：每個方塊放哪一格（欄,列），跟標準答案不一樣；找違規題（drcTask）：該標的那幾個點 */
const FLOOR = { floor: { CPU: '2,2', SRAM: '1,2', REGS: '2,1', TIMER: '3,1', ADC: '0,2' } };
const DRC = { drc: ['A', 'C', 'D'] };
/* 接一塊板子：先選值，再一根一根接（點一個腳、再點另一個腳） */
const wireUp = async (pg, w) => {
  for (const k of Object.keys(w.vals || {})) await pg.selectOption('select[data-part="' + k + '"]', String(w.vals[k]));
  for (const [a, b] of w.wires) { await pg.click('[data-pin="' + a + '"]'); await pg.click('[data-pin="' + b + '"]') }
};
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
  while (steps++ < 1500) {
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
    if (await vis('#codeIn')) {   /* 打字題：第一輪打正確答案（故意用跟標準答案不同的寫法）；第二輪打錯三次，再按「看答案」 */
      if (await vis('#next')) { await click('#next'); log.push('next'); continue }
      const task = await pg.getAttribute('.task', 'data-task');
      if (!o.last) { await pg.fill('#codeIn', ANSWERS[task] || ''); await click('#run'); log.push('code:' + task); await pg.waitForTimeout(100); if (!(await vis('#next'))) { errors.push('typed answer for ' + task + ' was not accepted: ' + (await pg.textContent('#fb')).slice(0, 160)); break } continue }
      if (await vis('#reveal')) { await click('#reveal'); log.push('reveal:' + task); continue }
      await pg.fill('#codeIn', await pg.getAttribute('.task', 'data-wrong')); await click('#run'); continue;
    }
    if (await vis('#wireRun')) {   /* 拉線題：第一輪照 WIRES 接；第二輪接 data-wrong 那塊錯的板子、跑三次，再按「看答案」 */
      if (await vis('#next')) { await click('#next'); log.push('next'); continue }
      const task = await pg.getAttribute('.task', 'data-task');
      if (!o.last) { await wireUp(pg, WIRES[task]); await click('#wireRun'); log.push('wire:' + task); await pg.waitForTimeout(100); if (!(await vis('#next'))) { errors.push('wiring for ' + task + ' was not accepted: ' + (await pg.textContent('#fb')).slice(0, 200)); break } if (!o.shot) { o.shot = 1; await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-wire.png') }) } continue }
      if (await vis('#reveal')) { await click('#reveal'); log.push('reveal:' + task); continue }
      if (!(await pg.$('.wb .wire'))) await wireUp(pg, JSON.parse(await pg.getAttribute('.task', 'data-wrong')));
      await click('#wireRun'); await pg.waitForTimeout(50);
      if (await vis('#fb .fb-err')) { errors.push('the wrong board for ' + task + ' is not complete: ' + (await pg.textContent('#fb')).slice(0, 200)); break }
      continue;
    }
    if (await vis('#atpgRun')) {   /* 找故障題：第一輪照 ATPG 設輸入；第二輪用 data-wrong 那組（抓不到）按三次，再按「看答案」 */
      if (await vis('#next')) { await click('#next'); log.push('next'); continue }
      const task = await pg.getAttribute('.task', 'data-task'), f = +(await pg.getAttribute('.task', 'data-fault'));
      if (await vis('#reveal')) { await click('#reveal'); log.push('reveal:' + task); continue }
      const want = o.last ? await pg.getAttribute('.task', 'data-wrong') : ATPG[task][f];
      for (const b of await pg.$$('.atpg-in')) { const i = await b.evaluate(e => [...e.parentNode.querySelectorAll('.atpg-in')].indexOf(e)); if ((await b.getAttribute('data-v')) !== want[i]) await b.click() }
      await click('#atpgRun'); log.push((o.last ? 'nocatch:' : 'atpg:') + task + f); await pg.waitForTimeout(50);
      if (!o.last && !(await vis('#next'))) { errors.push('inputs for ' + task + ' fault ' + f + ' were not accepted: ' + (await pg.textContent('#fb')).slice(0, 200)); break }
      continue;
    }
    if (await vis('#fpRun')) {   /* 擺方塊題：第一輪照 FLOOR 擺；第二輪擺 data-wrong 那個（犯規的）、檢查三次，再按「看答案」 */
      if (await vis('#next')) { await click('#next'); log.push('next'); continue }
      const task = await pg.getAttribute('.task', 'data-task');
      if (await vis('#reveal')) { await click('#reveal'); log.push('reveal:' + task); continue }
      const want = o.last ? JSON.parse(await pg.getAttribute('.task', 'data-wrong')) : FLOOR[task];
      for (const k of Object.keys(want)) { await pg.click('.fp-pick[data-blk="' + k + '"]'); await pg.click('[data-slot="' + want[k] + '"]') }
      await click('#fpRun'); log.push((o.last ? 'badplan:' : 'plan:') + task); await pg.waitForTimeout(50);
      if (!o.last && !(await vis('#next'))) { errors.push('floorplan for ' + task + ' was not accepted: ' + (await pg.textContent('#fb')).slice(0, 200)); break }
      continue;
    }
    if (await vis('#drcRun')) {   /* 找違規題：第一輪標 DRC 那幾個；第二輪標 data-wrong 那幾個（都沒問題的），只能檢查一次 */
      if (await vis('#next')) { await click('#next'); log.push('next'); continue }
      const task = await pg.getAttribute('.task', 'data-task'), want = o.last ? (await pg.getAttribute('.task', 'data-wrong')).split(',') : DRC[task];
      for (const k of want) await pg.click('[data-spot="' + k + '"] .ring');
      await click('#drcRun'); log.push('drc:' + task); continue;
    }
    if (await vis('#panel .qz')) {   /* 小測驗：每一題還沒選的，第一輪選第一個答案、第二輪選最後一個 */
      const picked = await pg.evaluate(last => { const g = Array.from(document.querySelectorAll('#panel .qz')).find(q => !q.querySelector('.opt.on') && q.querySelector('.opt:not([disabled])')); if (!g) return false; const os = g.querySelectorAll('.opt'); os[last ? os.length - 1 : 0].click(); return true }, !!o.last);
      if (picked) { log.push('opt'); continue }
    }
    if (await vis('#panel') && await vis('#next')) { await click('#next'); log.push('next'); continue }   /* 其他小遊戲：最後一顆是 #next */
    if (await vis('#dlg')) {
      if (!mid && log.length > 4) { mid = true; await pg.screenshot({ path: path.join(OUT, 'shot-' + o.id + '-talk.png') }) }
      const ch = await pg.$$('#dlg .choice');
      if (ch.length) { await ch[o.last ? ch.length - 1 : 0].click(); log.push('choice'); continue }
      await click('#dlgNext'); continue;
    }
    if (await vis('#gGo')) { const c = await pg.evaluate(() => window.__t.cur()); log.push('go:' + (c && c.to)); await click('#gGo'); await pg.waitForFunction(() => document.getElementById('guide').hidden || !document.getElementById('dlg').hidden, null, { timeout: 8000 }).catch(() => {});
      /* 開口的時候人要真的在旁邊（走不到的話「帶我去」也會直接開口，看不出來） */
      const far = c && c.to && await pg.evaluate(id => { const T = window.__t, s = T.snap(); if (!s || document.getElementById('dlg').hidden) return 0; const p = T.STORY.places[id], q = p ? p.at : s[id];
        return q ? Math.hypot(q[0] - s.me[0], q[1] - s.me[1], (q[2] || 0) - (s.me[2] || 0)) : 0 }, c.to);
      if (far > 3.6) { errors.push('could not walk to ' + c.to + ' (still ' + far.toFixed(1) + ' m away)'); break }
      continue }   /* 走到了才會開口 */
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
  const b = await play(br, { id: 'dark', vp: { width: 1440, height: 900 }, scheme: 'dark', name: '', last: true });
  await br.close();
  console.log(a && b ? 'TEST OK' : 'TEST FAILED');
  process.exit(a && b ? 0 : 1);
})().catch(e => { console.error(e); console.log('TEST FAILED'); process.exit(1) });
