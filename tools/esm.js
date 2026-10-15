// 把遊戲的原始檔變成 ES 模組（建置時產生，原始檔不用自己寫 import／export）。
//   node tools/esm.js <in.js> <outdir>
//   in.js：建置工具接好的整份程式，每個檔前面有一行 /*@@ 檔名 @@*/；最後一個檔是進入點（main.js）。
// 每個檔：
//   - 用到別的檔最上層的名字 → import（作用域分析用 eslint-scope，區域變數同名的不算）
//   - 別的檔用到的名字 → export
//   - 改別的檔的變數（x=…、x+=…、x++）→ ES 模組的 import 是唯讀的，改寫成 set$x(…)，由擁有那個變數的檔提供
// 檢查（不過就建置失敗）：
//   - 兩個檔最上層宣告同一個名字
//   - 一載入就會跑到的程式碼（最上層、立刻呼叫的函式、forEach 之類的回呼，往下追呼叫到的函式）用到別的檔的名字，
//     而那個檔也（間接）import 這個檔：兩個互相引用，ES 模組不保證誰先跑完
const fs = require('fs'), path = require('path');
const acorn = require(process.env.ACORN || 'acorn'), escope = require(process.env.ESCOPE || 'eslint-scope');

const [inFile, outDir] = process.argv.slice(2);
// LAZY=a.js,b.js：這些檔用到才載（進入點用 import() 載，不在一開始就載）；別的檔不可以直接用它們的名字
const LAZY = new Set((process.env.LAZY || '').split(',').filter(Boolean));
// 框架與內容的界線：engine/ 底下的檔是框架，只能用框架的名字，用到內容就建置失敗（內容要自己登記進來）。
//   ENGINE=world/world.js,…：還沒搬進 engine/、但要變成框架的檔。它們用到內容的名字先只寫進 <outdir>/engine-edges.json 給 build.py 報數量；
//   ENGINE_STRICT=1 時這些也一樣擋（拆完的最後一步打開）
const ENGINE = new Set((process.env.ENGINE || '').split(',').filter(Boolean)), isEngine = n => ENGINE.has(n) || n.startsWith('engine/');
const all = fs.readFileSync(inFile, 'utf8');
const parts = [];
{ const re = /\/\*@@ (\S+) @@\*\/\n/g; let m, last = null;
  while ((m = re.exec(all))) { if (last) last.src = all.slice(last.at, m.index); last = { name: m[1], at: re.lastIndex }; parts.push(last) }
  if (last) last.src = all.slice(last.at) }
const errors = [];
const P = { ecmaVersion: 2022, sourceType: 'module', ranges: true, locations: true };
const mods = parts.map(p => {
  const ast = acorn.parse(p.src, P);
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const ms = sm.scopes.find(s => s.type === 'module');
  return { name: p.name, src: p.src, ast, sm, ms, top: new Set(ms.variables.map(v => v.name)) };
});
const owner = new Map();
for (const m of mods) for (const n of m.top) { if (owner.has(n)) errors.push(`${n} 在 ${owner.get(n)} 和 ${m.name} 最上層都有宣告`); else owner.set(n, m.name) }

// 父節點（改寫指派時要知道 identifier 外面是哪一種運算式）
function parents(ast) { const P = new Map(); (function w(n, p) { if (!n || typeof n.type !== 'string') return; P.set(n, p); for (const k in n) { if (k === 'type' || k === 'loc' || k === 'range') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && w(x, n)); else if (v && typeof v.type === 'string') w(v, n) } })(ast, null); return P }

const needs = new Map(mods.map(m => [m.name, new Set()]));   // 別人要從這個檔拿的名字
const setters = new Map(mods.map(m => [m.name, new Set()]));
for (const m of mods) {
  m.imports = new Map();   // 檔名 → Set(名字)
  m.edits = [];            // [start, end, 新文字]
  const par = parents(m.ast);
  for (const r of m.ms.through) {
    const n = r.identifier.name, o = owner.get(n);
    if (!o || o === m.name) continue;
    let name = n;
    if (r.isWrite()) {
      const id = r.identifier, p = par.get(id);
      if (p && p.type === 'AssignmentExpression' && p.left === id) {
        const rhs = m.src.slice(p.right.range[0], p.right.range[1]);
        const val = p.operator === '=' ? rhs : `${n}${p.operator.slice(0, -1)}(${rhs})`;
        m.edits.push([p.range[0], p.range[1], `set$${n}(${val})`]);
      } else if (p && p.type === 'UpdateExpression') {
        const gp = par.get(p);
        if (!p.prefix && !(gp && gp.type === 'ExpressionStatement') && !(gp && gp.type === 'SequenceExpression' && par.get(gp) && par.get(gp).type === 'ExpressionStatement'))
          errors.push(`${m.name}:${id.loc.start.line} ${n}${p.operator} 的值被拿去用了，改寫會變；請改成先用再加`);
        m.edits.push([p.range[0], p.range[1], `set$${n}(${n}${p.operator[0]}1)`]);
      } else { errors.push(`${m.name}:${id.loc.start.line} 改了 ${o} 的 ${n}（解構或其他寫法），請改成呼叫 ${o} 裡的函式`); continue }
      setters.get(o).add(n);
      if (!m.imports.has(o)) m.imports.set(o, new Set());
      m.imports.get(o).add('set$' + n);
    }
    if (!m.imports.has(o)) m.imports.set(o, new Set());
    m.imports.get(o).add(name); needs.get(o).add(name);
  }
}
for (const [o, s] of setters) for (const n of s) needs.get(o).add('set$' + n);
// 用到才載的關卡檔：build 開頭的函式要 export（進入點用 import() 拿到之後才登記）
for (const m of mods) if (LAZY.has(m.name)) for (const s of m.ast.body) if (s.type === 'FunctionDeclaration' && /^build[A-Z]/.test(s.id.name)) needs.get(m.name).add(s.id.name);

// a 會不會（直接或間接）import 到 b：會的話兩個檔互相引用，誰先跑完不一定
const reach = new Map();
function reaches(a, b) { if (!reach.has(a)) { const seen = new Set(), st = [a]; while (st.length) { const x = st.pop(); for (const o of (mods.find(m => m.name === x).imports || new Map()).keys()) if (!seen.has(o)) { seen.add(o); st.push(o) } } reach.set(a, seen) } return reach.get(a).has(b) }

// 一載入就會跑到的程式碼用到別的檔的名字（往下追同一個檔與別的檔裡被呼叫的函式）
{ const fnBody = new Map();
  const isFn = n => n && /^(FunctionExpression|ArrowFunctionExpression)$/.test(n.type);
  for (const m of mods) for (const s of m.ast.body) {
    if (s.type === 'FunctionDeclaration') fnBody.set(s.id.name, { body: s.body, mod: m });
    if (s.type === 'VariableDeclaration') for (const d of s.declarations) if (d.id.type === 'Identifier' && isFn(d.init)) fnBody.set(d.id.name, { body: d.init.body, mod: m }) }
  for (const m of mods) {
    if (m === mods[mods.length - 1]) continue;   // 進入點：全部載完才跑
    const q = [], seen = new Set();
    for (const s of m.ast.body) { if (s.type === 'FunctionDeclaration') continue; if (s.type === 'VariableDeclaration') { for (const d of s.declarations) if (d.init && !isFn(d.init)) q.push([d.init, m, '']) } else q.push([s, m, '']) }
    const scan = (n, cb, p, k) => { if (!n || typeof n.type !== 'string') return; if (isFn(n) || n.type === 'FunctionDeclaration') return;
      if (n.type === 'CallExpression' && isFn(n.callee)) { scan(n.callee.body, cb); n.arguments.forEach(a => scan(a, cb)); return }
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && /^(forEach|map|filter|some|every|find|findIndex|reduce|sort|flatMap)$/.test((n.callee.property || {}).name)) { scan(n.callee.object, cb); n.arguments.forEach(a => isFn(a) ? scan(a.body, cb) : scan(a, cb)); return }
      if (n.type === 'Identifier' && !(p && ((p.type === 'MemberExpression' && k === 'property' && !p.computed) || (p.type === 'Property' && k === 'key' && !p.computed)))) cb(n, p, k);
      for (const kk in n) { if (kk === 'type' || kk === 'loc' || kk === 'range') continue; const v = n[kk]; if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && scan(x, cb, n, kk)); else if (v && typeof v.type === 'string') scan(v, cb, n, kk) } };
    while (q.length) { const [n, mm, via] = q.shift();
      scan(n, (id, p, k) => { const o = owner.get(id.name); if (!o) return;
        if (o !== m.name && reaches(o, m.name)) errors.push(`${m.name} 一載入就用到 ${o} 的 ${id.name}${via ? '（經過 ' + via + '）' : ''}，可是 ${o} 也（間接）用到 ${m.name}，誰先跑完不一定：搬到 base.js，或包進函式由進入點呼叫`);
        if (p && p.type === 'CallExpression' && k === 'callee' && fnBody.has(id.name) && !seen.has(id.name)) { seen.add(id.name); const f = fnBody.get(id.name); q.push([f.body, f.mod, id.name]) } }) } } }

for (const m of mods) if (!LAZY.has(m.name)) for (const o of m.imports.keys()) if (LAZY.has(o)) errors.push(`${m.name} 用到 ${o} 的 ${[...m.imports.get(o)].join('、')}，可是 ${o} 是用到才載的檔：搬到一開始就載的檔`);
const edges = {};
for (const m of mods) if (isEngine(m.name)) for (const [o, ns] of m.imports) if (!isEngine(o)) (edges[m.name] = edges[m.name] || {})[o] = [...ns].sort();
for (const m in edges) if (m.startsWith('engine/') || process.env.ENGINE_STRICT) for (const o in edges[m]) errors.push(`${m} 是框架的檔，不可以用到 ${o} 的 ${edges[m][o].join('、')}：改成由內容登記（register*）或從進入點傳進來`);
if (errors.length) { console.error('esm：\n  ' + [...new Set(errors)].join('\n  ')); process.exit(1) }

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'engine-edges.json'), JSON.stringify(edges, null, 1) + '\n');
const order = mods.map(m => m.name);
for (const m of mods) {
  let s = m.src, lastA = Infinity; for (const [a, b, t] of m.edits.sort((x, y) => y[0] - x[0])) { if (b > lastA) { console.error('esm：' + m.name + ' 有兩個跨檔改值疊在一起，請拆開寫'); process.exit(1) } s = s.slice(0, a) + t + s.slice(b); lastA = a }
  const rel = o => { let r = path.relative(path.dirname(m.name), o).split(path.sep).join('/'); return r.startsWith('.') ? r : './' + r };
  const imp = [...m.imports].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([o, ns]) => `import {${[...ns].sort().join(',')}} from '${rel(o)}';\n`).join('');
  const set = [...setters.get(m.name)].map(n => `function set$${n}(v){return ${n}=v}\n`).join('');
  const ex = needs.get(m.name).size ? `export {${[...needs.get(m.name)].sort().join(',')}};\n` : '';
  const side = m === mods[mods.length - 1] ? order.slice(0, -1).filter(o => !LAZY.has(o)).map(o => `import '${rel(o)}';\n`).join('') : '';   // 進入點：照原本的順序把每個檔都載入
  const out = path.join(outDir, m.name); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, side + imp + s + (s.endsWith('\n') ? '' : '\n') + set + ex);
}
const nImp = mods.reduce((a, m) => a + [...m.imports.values()].reduce((x, s) => x + s.size, 0), 0);
console.log(`esm：${mods.length} 個檔、${nImp} 個 import、${[...setters.values()].reduce((a, s) => a + s.size, 0)} 個跨檔改寫的變數（${[...setters].flatMap(([o, s]) => [...s].map(n => n + '←' + o)).join(' ')}）`);
