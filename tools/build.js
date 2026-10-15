#!/usr/bin/env node
/* 建置：框架＋你的遊戲 → 一個網頁。
     node tools/build.js [遊戲的資料夾，預設 game]
   讀 <遊戲>/game.json：
     key    存在瀏覽器的鍵名前綴（每個遊戲不一樣，例如 "cafe"）
     title  網頁標題；description 搜尋與分享的說明
     lang   畫面語言："en"、"zh-Hant"（繁體中文）、"zh-Hans"（簡體中文）。遊戲的字就用這個語言寫
     src    遊戲自己的檔，照順序接在框架後面（資料、關卡、故事…）
     css    遊戲自己的樣式（可以不給），接在框架的樣式後面
   產生：
     public/index.html    上線的頁面（three.min.js 放在旁邊；直接用瀏覽器開這個檔也能玩）
     public/version.json  建置編號
     out/artifact.html    給線上預覽服務的版本（外面那層 html 由服務加上；three.js 從 cdnjs 載）
     out/test.html        測試頁：走路快 6 倍、沒有點擊保護、留 window.__t 給測試用；out/test.nd.html 不畫圖的版本
   框架的介面字以繁體中文為鍵（engine/lang/<語言>.json 是譯文）；遊戲自己寫的字照原樣（遊戲要多語言時，<遊戲>/lang/<語言>.json 放譯文）。
   訊息：中文的專案（lang 是 zh-…）印中文，其他印英文。
   原始檔不寫 import／export：tools/esm.js 用作用域分析自動產生，並檢查載入順序與「框架不准用到遊戲的名字」。 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), GDIR = path.resolve(ROOT, process.argv[2] || 'game'), OUT = path.join(ROOT, 'out'), PUB = path.join(ROOT, 'public');
const rd = f => fs.readFileSync(f, 'utf8');
let ZH = false;
const say = (en, zh) => ZH ? zh : en, die = (en, zh) => { console.error('build: ' + say(en, zh == null ? en : zh)); process.exit(1) };
let cfg;
try { cfg = JSON.parse(rd(path.join(GDIR, 'game.json'))) } catch (e) { die('cannot read ' + path.join(GDIR, 'game.json') + ' (' + e.message + ') ／ 讀不到 game.json') }
ZH = /^zh/.test(cfg.lang || '');
for (const k of ['key', 'title', 'lang', 'src']) if (!cfg[k]) die('game.json is missing "' + k + '"', 'game.json 少了 ' + k);
if (!/^[a-z][a-z0-9]{1,15}$/.test(cfg.key)) die('game.json "key" must be 2–16 lowercase letters or digits, starting with a letter', 'game.json 的 key 只能是小寫英文字母與數字（2–16 個字，字母開頭）');
const LANGS_OK = { en: 'English', 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文' };
if (!LANGS_OK[cfg.lang]) die('game.json "lang" must be one of: ' + Object.keys(LANGS_OK).join(', '), 'game.json 的 lang 只能是 ' + Object.keys(LANGS_OK).join('、'));
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PUB, { recursive: true });

/* ── 接起來：每個檔前面一行 /*@@ 名字 @@*\/，最後一個是進入點 ── */
const ENGINE = ['base.js', 'levels.js', 'quality.js', 'sfx.js', 'ui.js', 'dialog.js', 'move.js', 'share.js', 'world.js', 'story.js', 'home.js', 'end.js', 'codex.js', 'boot.js'];
const MK = n => '/*@@ ' + n + ' @@*/\n';
const GAME = { key: cfg.key };
const pieces = [['engine/config.js', '/* 建置時從 game.json 產生 */\nconst GAME=' + JSON.stringify(GAME) + ';\n']]
  .concat(ENGINE.map(f => ['engine/' + f, rd(path.join(ROOT, 'engine', f))]))
  .concat(cfg.src.map(f => ['game/' + f, rd(path.join(GDIR, f))]))
  .concat([['main.js', 'boot();\n']]);
/* 出處那一行是授權（LICENSE）的條件，沒有關掉的設定：遊戲寫了 HOME.credit 就停下來說清楚 */
for (const [n, t] of pieces) if (n.startsWith('game/') && /\bHOME\.credit\b/.test(t)) die(n + ': HOME.credit is gone. The credit line (the links "Powered by fab24hr" and "Support fab24hr") always shows on the home screen and the ending screen, because the engine\'s license (LICENSE) requires it. Remove HOME.credit from ' + n + '.', n + '：沒有 HOME.credit 了。主頁與結算畫面的出處那一行（「Powered by fab24hr」「贊助 fab24hr」兩個連結）一定會顯示，因為框架的授權（LICENSE）要求保留。把 ' + n + ' 裡的 HOME.credit 拿掉。');
const js0 = pieces.map(([n, t]) => MK(n) + t + (t.endsWith('\n') ? '' : '\n')).join('');
fs.writeFileSync(path.join(OUT, 'game.js'), js0);
fs.writeFileSync(path.join(OUT, 'parts.json'), JSON.stringify(pieces.map(([n, t]) => [n, (MK(n) + t + (t.endsWith('\n') ? '' : '\n')).length])));
try { execFileSync(process.execPath, ['--check', path.join(OUT, 'game.js')], { stdio: 'pipe' }) } catch (e) { die('syntax error (the file name is in the /*@@ … @@*/ line above the reported line in out/game.js):\n' + e.stderr.toString(), '語法錯誤（是哪個檔：out/game.js 裡那一行往上找 /*@@ 檔名 @@*/）：\n' + e.stderr.toString()) }
const css = '<style>' + (rd(path.join(ROOT, 'engine', 'style.css')) + (cfg.css ? '\n' + rd(path.join(GDIR, cfg.css)) : '')).replace(/\/\*[\s\S]*?\*\//g, '') + '</style>';
const body0 = rd(path.join(ROOT, 'engine', 'body.html'));

/* ── 語言：框架的介面字（繁體中文寫的）套 engine/lang/<語言>.json；遊戲自己的字本來就是 lang 那個語言，照原樣（有 <遊戲>/lang/<語言>.json 就套） ── */
const node = (args, input) => execFileSync(process.execPath, [path.join(ROOT, 'tools', 'i18n.js')].concat(args), { input, maxBuffer: 1 << 28 }).toString();
const ex = JSON.parse(node(['extract', path.join(OUT, 'game.js'), path.join(ROOT, 'engine', 'body.html'), path.join(OUT, 'parts.json')]));
if (ex.errors.length) die('text that cannot be translated:\n  ' + ex.errors.join('\n  '), 'i18n：\n  ' + ex.errors.join('\n  '));
let js = js0, body = body0;
if (cfg.lang !== 'zh-Hant') {
  const cat = f => fs.existsSync(f) ? JSON.parse(rd(f)).strings || {} : {};
  const E = cat(path.join(ROOT, 'engine', 'lang', cfg.lang + '.json')), G = cat(path.join(GDIR, 'lang', cfg.lang + '.json')), strings = {}, miss = [];
  const fromEngine = x => /^(engine\/|body\.html)/.test(x.at);
  for (const x of ex.strings) { const v = G[x.key] || E[x.key]; if (v) strings[x.key] = v; else if (!fromEngine(x)) strings[x.key] = x.key; else miss.push(x.key + ' (' + x.at + ')') }
  if (miss.length) die('engine text with no ' + cfg.lang + ' translation; add it to engine/lang/' + cfg.lang + '.json:\n  ' + miss.slice(0, 30).join('\n  '), '框架的介面字沒有 ' + cfg.lang + ' 的譯文，補在 engine/lang/' + cfg.lang + '.json：\n  ' + miss.slice(0, 30).join('\n  '));
  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify({ strings }));
  node(['apply', path.join(OUT, 'game.js'), path.join(ROOT, 'engine', 'body.html'), path.join(OUT, 'catalog.json'), path.join(OUT, 'game.' + cfg.lang + '.js'), path.join(OUT, 'body.' + cfg.lang + '.html')]);
  js = rd(path.join(OUT, 'game.' + cfg.lang + '.js')); body = rd(path.join(OUT, 'body.' + cfg.lang + '.html'));
}
const LANGLINE = "const LANG='zh-Hant',LANGS=[];";
if (js.split(LANGLINE).length !== 2) die('engine/base.js must contain exactly one line ' + LANGLINE, 'engine/base.js 的 ' + LANGLINE + ' 必須剛好一行');
js = js.replace(LANGLINE, 'const LANG=' + JSON.stringify(cfg.lang) + ',LANGS=[];');

/* ── 模組＋打包：tools/esm.js 切成 ES 模組，esbuild 打成一個立即執行的函式（拿掉註解與空白，不改名字） ── */
const esbuild = require('esbuild');
function bundle(j, tag, hook) {
  if (hook) { const k = j.lastIndexOf(MK('main.js')); j = j.slice(0, k) + MK('testhook.js') + hook + '\n' + j.slice(k) }
  const src = path.join(OUT, 'esm-in.' + tag + '.js'), mod = path.join(OUT, 'mod.' + tag);
  fs.writeFileSync(src, j); fs.rmSync(mod, { recursive: true, force: true });
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'esm.js'), src, mod], { stdio: 'pipe' }) } catch (e) { die('modules (tools/esm.js; the message is in Chinese, the file names and variable names in it are what matter):\n' + e.stderr.toString(), e.stderr.toString()) }
  const r = esbuild.buildSync({ entryPoints: [path.join(mod, 'main.js')], bundle: true, format: 'iife', charset: 'utf8', minifyWhitespace: true, minifySyntax: true, write: false, logLevel: 'warning' });
  return r.outputFiles[0].text;
}
const sub = (s, a, b) => { if (s.split(a).length !== 2) die('the test page needs exactly one occurrence of: ' + a, '測試頁要替換的字不是剛好一處：' + a); return s.replace(a, b) };
const head = (title, extra) => '<!doctype html>\n<html lang="' + cfg.lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">'
  + '<title>' + title + '</title>' + (cfg.description ? '<meta name="description" content="' + cfg.description.replace(/"/g, '&quot;') + '">' : '') + (extra || '') + css + '</head>\n<body>\n';
const three = path.join(ROOT, 'vendor', 'three.min.js');
const site = bundle(js, 'site');
const VER = crypto.createHash('sha1').update(css + body + site).digest('hex').slice(0, 10);
/* 授權聲明：授權（LICENSE：非商用、要有出處那一行）要保留版權與授權聲明，但打包會拿掉所有註解，所以在遊戲的程式最前面補一行
   （版權行跟 LICENSE 寫的一樣，改一邊就要改另一邊，只有聯絡信箱不放進每個遊戲；網址跟畫面上的出處連結同一個）。畫面上的出處那一行是另一個條件（engine/home.js）。
   npm test 兩個都檢查。 */
const CREDIT = (rd(path.join(ROOT, 'engine', 'home.js')).match(/const CREDIT_URL='([^']+)'/) || [])[1];
if (!CREDIT) die('engine/home.js must define CREDIT_URL', 'engine/home.js 要有 CREDIT_URL');
const NOTICE = '/*! Made with the fab24hr engine (' + CREDIT + ') | fab24hr engine License (noncommercial; keep the on-screen credit line) | Copyright (c) 2026 mcltyl */\n';
fs.writeFileSync(path.join(PUB, 'index.html'), head(cfg.title, '<meta name="build" content="' + VER + '">') + body + '\n<script src="three.min.js"></script>\n<script>\n' + NOTICE + site + '</script>\n</body>\n</html>\n');
fs.copyFileSync(three, path.join(PUB, 'three.min.js'));
/* 線上預覽服務的版本（out/artifact.html）：服務發布時會自己包一層 <html><head><body>，所以這裡只有 <title>、樣式、畫面與程式；three.js 從 cdnjs 載（r128） */
fs.writeFileSync(path.join(OUT, 'artifact.html'), '<title>' + cfg.title + '</title>\n' + css + '\n' + body + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n' + NOTICE + site + '</script>\n');
fs.writeFileSync(path.join(PUB, 'version.json'), JSON.stringify({ build: VER, date: new Date().toISOString().slice(0, 10) }) + '\n');

/* ── 測試頁：走路快 6 倍、點擊保護 0、window.__t ── */
const HOOK = "window.__t={ST:()=>ST,STORY,W:()=>W,cur:()=>{const b=curBeat();return b?{seg:b.seg,to:b.to,q:ST.q}:null},goTo,interact,busy:()=>busy,start:nm=>{hideHome();clearSave();startStory(nm==null?'T':nm)},resume:o=>{hideHome();resumeStory(o)},readSave,snap:()=>W?W.snap():null,"
  + "ui:{say:(l,o)=>{busy=false;say(l,()=>{},o||{})},ring:(a,b,c)=>ring(a,b,c,()=>{}),toast:(a,b,c)=>toast(a,b,c),title:g=>titleCard(g,()=>{}),codex:t=>openCodex(t),guide:()=>showGuide(),end:()=>ending()},data:()=>({segs:STORY.segs,beats:STORY.beats.map(b=>({seg:b.seg,to:b.to})),cast:STORY.cast,places:STORY.places,terms:TERM.G})};";
let t = sub(js, 's=ch.speed*dt;', 's=ch.speed*dt*6;'); t = sub(t, 'const TAP=400;', 'const TAP=0;');
const test = bundle(t, 'test', HOOK);
fs.copyFileSync(three, path.join(OUT, 'three.min.js'));
fs.writeFileSync(path.join(OUT, 'test.html'), head(cfg.title + ' (test)') + body + '\n<script src="three.min.js"></script>\n<script>\n' + test + '</script>\n</body>\n</html>\n');
fs.writeFileSync(path.join(OUT, 'test.nd.html'), head(cfg.title + ' (test)') + body + '\n<script src="three.min.js"></script>\n<script>\n' + bundle(sub(t, 'const NODRAW=false;', 'const NODRAW=true;'), 'test.nd', HOOK) + '</script>\n</body>\n</html>\n');
console.log('build ' + VER + ' | ' + cfg.title + ' | ' + cfg.lang + ' | ' + Math.round(fs.statSync(path.join(PUB, 'index.html')).size / 1024) + ' KB → ' + path.relative(process.cwd(), path.join(PUB, 'index.html')));
