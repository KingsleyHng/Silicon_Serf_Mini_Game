/* 多國語系：建置時把原始碼裡的中文換成別的語言（gettext 的做法：中文原文就是鍵）。
   原始碼照常用中文寫，不用替每一句取名字。建置工具會呼叫這支程式：

     node tools/i18n.js extract <game.js> <body.html> <parts.json>          → 印出所有玩家看得到的字串（JSON）
     node tools/i18n.js apply   <game.js> <body.html> <catalog.json> <out.js> <out.html>   → 套用翻譯
     node tools/i18n.js sync    <locale> [--prune]                          → 把缺的鍵補進 <ROOT>/src/lang/<locale>.json（值留空），--prune 順便刪掉過期的

   ROOT 是遊戲放 src/ 與 out/ 的資料夾：這支程式放在那個資料夾裡、或它底下的 tools/ 都找得到；也可以用環境變數 I18N_ROOT 指定。

   什麼算「字串」：
     - JS 的字串常值（'…'、"…"）：只要裡面有中日韓文字或全形標點。
     - JS 的樣板字串（`…${x}…`）：整句是一個鍵，${} 的位置在鍵裡寫成 {0}、{1}…，翻譯可以調換它們的順序。
       語序會變的句子請寫成樣板字串，不要用 + 把片段接起來。
   語系檔裡譯文留空字串代表「還沒翻」；某個片段在那個語言真的不需要字，寫 ∅。
     - body.html 的文字節點與 aria-label、placeholder、alt、title 屬性。
   註解不算。正規表示式、沒加引號的物件鍵如果有中文，會報錯（翻譯碰不到它們）。 */
const fs = require('fs'), path = require('path');
const acorn = require(process.env.ACORN || 'acorn');
const ROOT = process.env.I18N_ROOT || [__dirname, path.dirname(__dirname)].find(d => fs.existsSync(path.join(d, 'src', 'lang'))) || __dirname;

const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef\u30fb]/;
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const has = s => CJK.test(s);

/* ── JS ── */
function scanJs(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: false });
  const units = [], errors = [];
  (function walk(n, parent, key) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal') {
      if (n.regex) { if (has(n.regex.pattern)) errors.push('正規表示式裡有中文（翻譯碰不到）：' + src.slice(n.start, n.end).slice(0, 60)) }
      else if (typeof n.value === 'string' && has(n.value)) units.push({ kind: 'str', start: n.start, end: n.end, key: n.value, q: src[n.start], objKey: parent && parent.type === 'Property' && key === 'key' ? parent : null });
      return;
    }
    if (n.type === 'Identifier' && has(n.name) && parent && parent.type === 'Property' && key === 'key' && !parent.computed) errors.push('物件的鍵是沒加引號的中文：' + n.name);
    if (n.type === 'TemplateLiteral') {
      if (n.quasis.some(q => has(q.value.cooked))) {
        if (parent && parent.type === 'TaggedTemplateExpression') errors.push('標籤樣板字串裡有中文：' + src.slice(n.start, n.end).slice(0, 60));
        const key = n.quasis.map((q, i) => q.value.cooked.replace(/[{}]/g, c => c === '{' ? '{{' : '}}') + (i < n.expressions.length ? '{' + i + '}' : '')).join('');
        units.push({ kind: 'tpl', start: n.start, end: n.end, key, exprs: n.expressions.map(e => [e.start, e.end]) });
      }
      n.expressions.forEach(e => walk(e, n, 'expressions'));
      return;
    }
    for (const k in n) {
      const v = n[k];
      if (k === 'type' || k === 'start' || k === 'end' || !v || typeof v !== 'object') continue;
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, n, k));
      else if (typeof v.type === 'string') walk(v, n, k);
    }
  })(ast, null, null);
  units.sort((a, b) => a.start - b.start || b.end - a.end);
  /* 同一個物件裡，翻譯後不能有兩個鍵撞在一起：把每個物件的字串鍵記下來，apply 時檢查 */
  const groups = new Map(); units.forEach(u => { if (u.objKey) { const o = parentObject(ast, u.objKey); if (o) { if (!groups.has(o)) groups.set(o, []); groups.get(o).push(u.key) } } });
  return { units, errors, keyGroups: [...groups.values()].filter(g => g.length > 1) };
}
function parentObject(ast, prop) {
  let found = null;
  (function walk(n) {
    if (found || !n || typeof n.type !== 'string' || n.start > prop.start || n.end < prop.end) return;
    if (n.type === 'ObjectExpression' && n.properties.includes(prop)) { found = n; return }
    for (const k in n) { const v = n[k]; if (!v || typeof v !== 'object' || k === 'type') continue; if (Array.isArray(v)) v.forEach(c => c && walk(c)); else walk(v) }
  })(ast);
  return found;
}
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const esc = (s, q) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').split(LS).join('\\u2028').split(PS).join('\\u2029').split(q).join('\\' + q);
const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
/* 把 {0}{1} 的翻譯切成 [文字, 編號, 文字, …]；{{ }} 是字面上的大括號 */
function splitTpl(t) {
  const out = []; let buf = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '{' && t[i + 1] === '{') { buf += '{'; i++; continue }
    if (t[i] === '}' && t[i + 1] === '}') { buf += '}'; i++; continue }
    if (t[i] === '{') { const j = t.indexOf('}', i); const n = t.slice(i + 1, j); if (j < 0 || !/^\d+$/.test(n)) throw new Error('樣板翻譯裡的大括號不對：' + t); out.push(buf, +n); buf = ''; i = j; continue }
    buf += t[i];
  }
  out.push(buf); return out;
}
const slots = t => splitTpl(t).filter(x => typeof x === 'number').sort((a, b) => a - b).join(',');
function applyJs(src, units, tr) {
  function render(lo, hi) {
    let out = '', pos = lo;
    for (const u of units) {
      if (u.start < pos || u.end > hi || u.start < lo) continue;      // 已經被外層處理過，或不在這一段
      out += src.slice(pos, u.start);
      const t = tr(u.key, u.kind);
      if (u.kind === 'str') out += u.q + esc(t, u.q) + u.q;
      else out += '`' + splitTpl(t).map(p => typeof p === 'number' ? '${' + render(u.exprs[p][0], u.exprs[p][1]) + '}' : escTpl(p)).join('') + '`';
      pos = u.end;
    }
    return out + src.slice(pos, hi);
  }
  return render(0, src.length);
}

/* ── HTML（body.html） ── */
const ATTRS = 'aria-label|placeholder|alt|title';
function scanHtml(html) {
  const units = [];
  const re = new RegExp('(' + ATTRS + ')="([^"]*)"|>([^<>]+)<', 'g'); let m;
  while ((m = re.exec(html))) {
    if (m[2] !== undefined) { if (has(m[2])) units.push({ kind: 'attr', start: m.index + m[1].length + 2, end: m.index + m[1].length + 2 + m[2].length, key: m[2] }) }
    else if (has(m[3])) { const lead = m[3].match(/^\s*/)[0].length, text = m[3].trim(); units.push({ kind: 'text', start: m.index + 1 + lead, end: m.index + 1 + lead + text.length, key: text }) }
    if (m[3] !== undefined) re.lastIndex = m.index + m[0].length - 1;       // 結尾的 < 要留給下一個文字節點
  }
  return units;
}
function applyHtml(html, units, tr) { let out = '', pos = 0; for (const u of units) { out += html.slice(pos, u.start) + tr(u.key, u.kind); pos = u.end } return out + html.slice(pos) }

/* ── 檢查一則翻譯 ── */
const EMPTY = String.fromCharCode(0x2205);   // 譯文刻意是空字串時寫這個符號（∅）。真的留空白代表還沒翻
/* 標籤要跟原文一樣，但 aria-label、placeholder、alt、title 的值本來就是要翻的字，不比 */
const tags = s => (s.match(/<\/?[a-zA-Z][^>]*>/g) || []).map(t => t.replace(/\s+/g, ' ').replace(/\b(aria-label|placeholder|alt|title)="[^"]*"/g, '$1=""')).sort().join('');
function checkPair(key, val, kind) {
  const errs = [];
  if (kind === 'tpl') { try { if (slots(key) !== slots(val)) errs.push('${} 的數量對不上') } catch (e) { errs.push(e.message) } }
  if (tags(key) !== tags(val)) errs.push('HTML 標籤跟原文不一樣');
  if ((kind === 'attr' || kind === 'text') && /[<>"]/.test(val)) errs.push('這是 HTML 文字或屬性，不能有 < > "');
  return errs;
}

/* ── 假語系：每個漢字後面加一個下方圓點。句子之間「誰包含誰」的關係不會變，所以遊戲邏輯照常；
      畫面上哪個中文字沒有圓點，就是沒有經過語系檔的字。 ── */
const MARK = String.fromCharCode(0x323);
const pseudo = s => s.replace(/[\u3400-\u4dbf\u4e00-\u9fff]/g, c => c + MARK);

function collect(js, html, parts) {
  const J = scanJs(js), H = scanHtml(html), seen = new Map();
  const where = pos => { if (!parts) return 'game.js'; let off = 0; for (const [name, len] of parts) { if (pos < off + len) return name + ':' + (js.slice(off, pos).split('\n').length); off += len } return 'game.js' };
  J.units.forEach(u => { if (!seen.has(u.key)) seen.set(u.key, { key: u.key, kind: u.kind, at: where(u.start) }); else if (seen.get(u.key).kind !== u.kind) seen.get(u.key).kind = 'tpl' === u.kind || seen.get(u.key).kind === 'tpl' ? 'tpl' : seen.get(u.key).kind });
  H.forEach(u => { if (!seen.has(u.key)) seen.set(u.key, { key: u.key, kind: u.kind, at: 'body.html:' + html.slice(0, u.start).split('\n').length }) });
  return { J, H, list: [...seen.values()] };
}

function main() {
  const [cmd, ...a] = process.argv.slice(2), rd = f => fs.readFileSync(f, 'utf8');
  if (cmd === 'extract') {
    const { J, list } = collect(rd(a[0]), rd(a[1]), a[2] ? JSON.parse(rd(a[2])) : null);
    process.stdout.write(JSON.stringify({ errors: J.errors, strings: list }));
  } else if (cmd === 'apply') {
    const js = rd(a[0]), html = rd(a[1]), cat = a[2] === '@pseudo' ? null : JSON.parse(rd(a[2])).strings, { J, H, list } = collect(js, html, null);
    const errs = J.errors.slice(), kinds = new Map(list.map(x => [x.key, x.kind]));
    const tr = (key, kind) => { if (!cat) return pseudo(key); const v = cat[key]; if (typeof v !== 'string' || v === '') { errs.push('沒有翻譯：' + JSON.stringify(key)); return key } return v === EMPTY ? '' : v };
    if (cat) for (const x of list) { const v = cat[x.key]; if (typeof v === 'string' && v !== '') checkPair(x.key, v, x.kind).forEach(e => errs.push(e + '：' + JSON.stringify(x.key) + ' → ' + JSON.stringify(v))) }
    for (const g of J.keyGroups) { const t = g.map(k => tr(k, 'str')), d = t.filter((x, i) => t.indexOf(x) !== i); if (d.length) errs.push('同一個物件裡，翻譯後有兩個鍵相同：' + JSON.stringify(d[0])) }
    const outJs = applyJs(js, J.units, tr), outHtml = applyHtml(html, H, tr);
    const uniq = [...new Set(errs)];
    if (uniq.length) { console.error(uniq.slice(0, 40).join('\n') + (uniq.length > 40 ? '\n…共 ' + uniq.length + ' 個問題' : '')); process.exit(1) }
    fs.writeFileSync(a[3], outJs); fs.writeFileSync(a[4], outHtml);
  } else if (cmd === 'sync') {
    const out = path.join(ROOT, 'out'), file = path.join(ROOT, 'src', 'lang', a[0] + '.json');
    const { list } = collect(rd(path.join(out, 'game.js')), rd(path.join(ROOT, 'src', 'body.html')), fs.existsSync(path.join(out, 'parts.json')) ? JSON.parse(rd(path.join(out, 'parts.json'))) : null);
    const cat = fs.existsSync(file) ? JSON.parse(rd(file)) : { meta: {}, strings: {} }, old = cat.strings || {}, next = {}, keys = new Set(list.map(x => x.key));
    let added = 0, empty = 0; const stale = Object.keys(old).filter(k => !keys.has(k));
    for (const x of list) { if (!(x.key in old)) added++; next[x.key] = old[x.key] || ''; if (!next[x.key]) empty++ }
    if (!a.includes('--prune')) stale.forEach(k => next[k] = old[k]);
    cat.strings = next; fs.writeFileSync(file, JSON.stringify(cat, null, 1) + '\n');
    console.log(a[0] + '：共 ' + list.length + ' 句，新增 ' + added + '，還沒翻 ' + empty + '，過期 ' + stale.length + (a.includes('--prune') ? '（已刪）' : stale.length ? '（加 --prune 刪掉）' : ''));
  } else if (cmd === 'checkpart') {
    /* 翻譯分段作業用：node tools/i18n.js checkpart <part.json> <part.out.json>。part 是 [{key,kind,at}]，out 是 {strings:{原文:譯文}, notes:[]} */
    const part = JSON.parse(rd(a[0])), out = JSON.parse(rd(a[1])).strings || {}, errs = [];
    for (const x of part) { const v = out[x.key]; if (typeof v !== 'string' || v === '') { errs.push('沒有翻譯：' + JSON.stringify(x.key)); continue } if (HAN.test(v)) errs.push('譯文裡還有中文：' + JSON.stringify(x.key) + ' → ' + JSON.stringify(v)); if (v !== EMPTY) checkPair(x.key, v, x.kind).forEach(e => errs.push(e + '：' + JSON.stringify(x.key) + ' → ' + JSON.stringify(v))) }
    Object.keys(out).forEach(k => { if (!part.some(x => x.key === k)) errs.push('多出來的鍵（原文對不上，可能被改到了）：' + JSON.stringify(k)) });
    console.log(errs.length ? errs.join('\n') + '\n' + errs.length + ' 個問題' : 'PART OK ' + part.length);
    process.exit(errs.length ? 1 : 0);
  } else { console.error('用法見檔頭'); process.exit(2) }
}
if (require.main === module) main();
module.exports = { scanJs, applyJs, scanHtml, applyHtml, splitTpl, pseudo, MARK, HAN, checkPair };
