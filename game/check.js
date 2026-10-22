/* Silicon Serf: checking what the player types.
   Nothing here compares text. A Verilog answer is parsed and evaluated, then compared with a reference
   answer on many input values, so any expression that behaves the same is accepted.

   vxCheck(task, text) → {err} for a typing mistake (does not cost an attempt), {ok: true}, or {ok: false, msg} with a counterexample.
   task.sigs   {name: {w: width, vals: [values worth trying often]}}   the signals the answer may use
   task.ref    the reference answer, as Verilog
   task.w      width of the result (1 for a condition)
   task.bool   true: the result counts as true when it is not 0 (assertions, covers)
   task.lhs    name allowed before "<=" or "=" (the player may type the whole line)
   task.tweak  (env, rnd) => {}   adjust a random input vector (e.g. make PRDATA match status half the time)

   Supported: numbers (5, 8'h5A, 4'b0101, 'd3), signals, bit and part selects with constant indices,
   ~ ! & | ^ ~^ && || == != === !== < <= > >= << >> + - * / %, reduction & | ^, ?:, {a, b}, {n{a}}, and a |-> b.
   Widths follow Verilog: bitwise and arithmetic operands are extended to the width of the expression around them. */

/* ── Tokens ── */
const VX_OPS = ['|->', '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '~&', '~|', '~^', '^~',
  '~', '!', '&', '|', '^', '+', '-', '*', '/', '%', '<', '>', '?', ':', '(', ')', '[', ']', '{', '}', ','];
function vxTokens(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {i++; continue}
    const num = /^(\d+)?\s*'\s*([bBoOdDhH])\s*([0-9a-fA-F_xXzZ?]+)|^\d[\d_]*/.exec(s.slice(i));
    if (num) {
      const t = num[0];
      let v, w;
      if (num[2]) {
        const digits = num[3].replace(/_/g, '');
        if (/[xXzZ?]/.test(digits)) throw vxErr('x and z values are not supported here; use 0s and 1s', i);
        const base = {b: 2, o: 8, d: 10, h: 16}[num[2].toLowerCase()];
        if (!digits.split('').every(d => parseInt(d, 16) < base)) throw vxErr('"' + t.replace(/\s/g, '') + '" has a digit that does not fit its base', i);
        v = digits.split('').reduce((a, d) => a * BigInt(base) + BigInt(parseInt(d, 16)), 0n);
        w = num[1] ? parseInt(num[1], 10) : 32;
        if (!w) throw vxErr('a number cannot be 0 bits wide', i);
      } else {v = BigInt(t.replace(/_/g, '')); w = 32}
      out.push({t: 'num', v: v & vxMask(w), w, at: i});
      i += t.length; continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(s.slice(i));
    if (id) {out.push({t: 'id', v: id[0], at: i}); i += id[0].length; continue}
    const op = VX_OPS.find(o => s.startsWith(o, i));
    if (op) {out.push({t: 'op', v: op, at: i}); i += op.length; continue}
    throw vxErr('"' + c + '" is not part of a Verilog expression', i);
  }
  out.push({t: 'end', v: 'the end', at: s.length});
  return out;
}
const vxErr = (msg, at) => ({vx: true, msg, at});
const vxMask = w => (1n << BigInt(w)) - 1n;

/* ── Parser: precedence from lowest to highest, as in Verilog ── */
function vxParse(text) {
  const T = vxTokens(text);
  let k = 0;
  const peek = () => T[k], take = () => T[k++];
  const is = v => T[k].t === 'op' && T[k].v === v;
  const want = v => {if (!is(v)) throw vxErr('expected "' + v + '" but found "' + T[k].v + '"', T[k].at); k++};
  const LEVELS = [['||'], ['&&'], ['|', '~|'], ['^', '~^', '^~'], ['&', '~&'], ['==', '!=', '===', '!=='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];
  function imp() {const a = cond(); if (is('|->')) {take(); return {n: 'imp', a, b: imp()}} return a}
  function cond() {const c = bin(0); if (is('?')) {take(); const t = cond(); want(':'); return {n: 'cond', c, t, f: cond()}} return c}
  function bin(l) {
    if (l === LEVELS.length) return unary();
    let a = bin(l + 1);
    while (T[k].t === 'op' && LEVELS[l].indexOf(T[k].v) >= 0) {const op = take().v; a = {n: 'bin', op, a, b: bin(l + 1)}}
    return a;
  }
  function unary() {
    if (T[k].t === 'op' && ['!', '~', '&', '|', '^', '~&', '~|', '~^', '^~', '-', '+'].indexOf(T[k].v) >= 0) {const op = take().v; return {n: 'un', op, a: unary()}}
    return postfix();
  }
  function postfix() {
    const p = primary();
    if (!is('[')) return p;
    if (p.n !== 'id') throw vxErr('bit selects only work on a signal name', peek().at);
    take();
    const hi = constant(cond());
    let lo = hi;
    if (is(':')) {take(); lo = constant(cond())}
    want(']');
    if (is('[')) throw vxErr('one bit select per signal is enough here', peek().at);
    return {n: 'sel', id: p.v, hi, lo, at: p.at};
  }
  function primary() {
    const t = take();
    if (t.t === 'num') return {n: 'num', v: t.v, w: t.w};
    if (t.t === 'id') return {n: 'id', v: t.v, at: t.at};
    if (t.t === 'op' && t.v === '(') {const e = imp(); want(')'); return e}
    if (t.t === 'op' && t.v === '{') {
      const first = cond();
      if (is('{')) {take(); const items = list(); want('}'); want('}'); return {n: 'rep', k: constant(first), items}}
      const items = [first];
      while (is(',')) {take(); items.push(cond())}
      want('}');
      return {n: 'cat', items};
    }
    throw vxErr(t.t === 'end' ? 'the expression ends too early' : 'did not expect "' + t.v + '" here', t.at);
  }
  function list() {const items = [cond()]; while (is(',')) {take(); items.push(cond())} return items}
  function constant(node) {
    const used = vxIds(node);
    if (used.length) throw vxErr('bit selects need a constant number here, not ' + used[0], 0);
    return Number(vxEval(node, {}, {}, 0));
  }
  const tree = imp();
  if (T[k].t !== 'end') throw vxErr('did not expect "' + T[k].v + '" here', T[k].at);
  return tree;
}
function vxIds(n) {
  if (!n) return [];
  if (n.n === 'id') return [n.v];
  if (n.n === 'sel') return [n.id];
  return [].concat(...[n.a, n.b, n.c, n.t, n.f].filter(Boolean).map(vxIds), ...(n.items || []).map(vxIds));
}

/* ── Widths and evaluation ── */
const VX_CTX = ['+', '-', '*', '/', '%', '&', '|', '^', '~^', '^~', '~&', '~|'];
function vxWidth(n, S) {
  switch (n.n) {
    case 'num': return n.w;
    case 'id': return S[n.v].w;
    case 'sel': return n.hi - n.lo + 1;
    case 'un': return ['~', '-', '+'].indexOf(n.op) >= 0 ? vxWidth(n.a, S) : 1;
    case 'bin': return VX_CTX.indexOf(n.op) >= 0 ? Math.max(vxWidth(n.a, S), vxWidth(n.b, S)) : ['<<', '>>'].indexOf(n.op) >= 0 ? vxWidth(n.a, S) : 1;
    case 'cond': return Math.max(vxWidth(n.t, S), vxWidth(n.f, S));
    case 'cat': return n.items.reduce((s, x) => s + vxWidth(x, S), 0);
    case 'rep': return n.k * n.items.reduce((s, x) => s + vxWidth(x, S), 0);
    case 'imp': return 1;
  }
}
function vxEval(n, env, S, ctx) {
  const W = Math.max(vxWidth(n, S), ctx), m = vxMask(W), B = x => x ? 1n : 0n;
  switch (n.n) {
    case 'num': return n.v & m;
    case 'id': return env[n.v];
    case 'sel': return (env[n.id] >> BigInt(n.lo)) & vxMask(n.hi - n.lo + 1);
    case 'un': {
      if (n.op === '~') return ~vxEval(n.a, env, S, W) & m;
      if (n.op === '-') return -vxEval(n.a, env, S, W) & m;
      if (n.op === '+') return vxEval(n.a, env, S, W);
      if (n.op === '!') return B(vxEval(n.a, env, S, 0) === 0n);
      const a = vxEval(n.a, env, S, 0), aw = vxWidth(n.a, S);
      let ones = 0; for (let x = a; x; x >>= 1n) ones += Number(x & 1n);
      const r = {'&': a === vxMask(aw), '~&': a !== vxMask(aw), '|': a !== 0n, '~|': a === 0n, '^': ones % 2 === 1, '~^': ones % 2 === 0, '^~': ones % 2 === 0}[n.op];
      return B(r);
    }
    case 'bin': {
      const op = n.op;
      if (VX_CTX.indexOf(op) >= 0) {
        const a = vxEval(n.a, env, S, W), b = vxEval(n.b, env, S, W);
        const r = {'+': a + b, '-': a - b, '*': a * b, '/': b ? a / b : 0n, '%': b ? a % b : 0n, '&': a & b, '|': a | b, '^': a ^ b, '~^': ~(a ^ b), '^~': ~(a ^ b), '~&': ~(a & b), '~|': ~(a | b)}[op];
        return r & m;
      }
      if (op === '<<' || op === '>>') {const a = vxEval(n.a, env, S, W), b = vxEval(n.b, env, S, 0); return b >= BigInt(W) ? 0n : (op === '<<' ? a << b : a >> b) & m}
      if (op === '&&') return B(vxEval(n.a, env, S, 0) !== 0n && vxEval(n.b, env, S, 0) !== 0n);
      if (op === '||') return B(vxEval(n.a, env, S, 0) !== 0n || vxEval(n.b, env, S, 0) !== 0n);
      const cw = Math.max(vxWidth(n.a, S), vxWidth(n.b, S)), a = vxEval(n.a, env, S, cw), b = vxEval(n.b, env, S, cw);
      return B({'==': a === b, '===': a === b, '!=': a !== b, '!==': a !== b, '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b}[op]);
    }
    case 'cond': return vxEval(n.c, env, S, 0) !== 0n ? vxEval(n.t, env, S, W) : vxEval(n.f, env, S, W);
    case 'cat': return n.items.reduce((acc, x) => (acc << BigInt(vxWidth(x, S))) | vxEval(x, env, S, 0), 0n);
    case 'rep': {const one = vxEval({n: 'cat', items: n.items}, env, S, 0), w = vxWidth({n: 'cat', items: n.items}, S); let r = 0n; for (let i = 0; i < n.k; i++) r = (r << BigInt(w)) | one; return r}
    case 'imp': return B(vxEval(n.a, env, S, 0) === 0n || vxEval(n.b, env, S, 0) !== 0n);
  }
}

/* Names the player used that are not signals of this task; bit ranges outside the signal */
function vxNames(tree, S) {
  const bad = (function walk(n) {
    if (!n) return null;
    if (n.n === 'id' || n.n === 'sel') {
      const name = n.n === 'id' ? n.v : n.id;
      if (!S[name]) {
        const same = Object.keys(S).find(s => s.toLowerCase() === name.toLowerCase());
        const close = Object.keys(S).find(s => vxDist(s, name) <= 2);
        return same ? 'Verilog is case-sensitive: write ' + same + ', not ' + name
          : 'there is no signal called ' + name + (close ? '. Did you mean ' + close + '?' : '. You can use: ' + Object.keys(S).join(', '));
      }
      if (n.n === 'sel' && (n.hi < n.lo || n.hi >= S[name].w)) return name + ' has bits ' + (S[name].w - 1) + ' down to 0' + (n.hi < n.lo ? ', and the high bit comes first: [hi:lo]' : '');
    }
    for (const c of [n.a, n.b, n.c, n.t, n.f].concat(n.items || [])) {const r = walk(c); if (r) return r}
    return null;
  })(tree);
  return bad;
}
function vxDist(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i].concat(Array(b.length).fill(0)));
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* Strip what may surround the expression: "lhs <=", "assign lhs =", "assert property (@(posedge clk) …);", a final ";" */
function vxBare(text, task) {
  let s = text.trim().replace(/;\s*$/, '').trim();
  const wrap = /^(assert|cover|assume)\s+property\s*\(([\s\S]*)\)$/.exec(s);
  if (wrap) s = wrap[2].trim();
  s = s.replace(/^@\s*\(\s*(posedge|negedge)\s+\w+\s*\)\s*/, '');
  const lhs = /^(assign\s+)?([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*(<=|=)(?!=)/.exec(s);
  if (lhs) {
    if (!task.lhs || lhs[2] !== task.lhs) return {err: task.lhs ? 'this line assigns ' + task.lhs + ', not ' + lhs[2] : 'type only the expression, without an assignment'};
    s = s.slice(lhs[0].length).trim();
  }
  if (!s) return {err: 'type an expression first'};
  return {s};
}

/* Input vectors: every combination when there are few input bits, otherwise seeded random values that favour task.vals */
function vxVectors(task) {
  const names = Object.keys(task.sigs), bits = names.reduce((s, n) => s + task.sigs[n].w, 0), out = [];
  if (bits <= 14) {
    for (let i = 0; i < 1 << bits; i++) {let r = BigInt(i); const env = {}; names.forEach(n => {const w = task.sigs[n].w; env[n] = r & vxMask(w); r >>= BigInt(w)}); out.push(env)}
    return out;
  }
  let seed = 12345;
  const rnd = () => {seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff};
  const any = w => {let v = 0n; for (let b = 0; b < w; b += 16) v = (v << 16n) | BigInt(Math.floor(rnd() * 65536)); return v & vxMask(w)};
  for (let i = 0; i < 1500; i++) {
    const env = {};
    names.forEach(n => {const s = task.sigs[n]; env[n] = s.vals && rnd() < .7 ? BigInt(s.vals[Math.floor(rnd() * s.vals.length)]) & vxMask(s.w) : any(s.w)});
    if (task.tweak) task.tweak(env, rnd);
    out.push(env);
  }
  return out;
}

const vxFmt = (v, w) => w === 1 ? String(v) : w <= 4 ? w + "'b" + v.toString(2).padStart(w, '0') : w + "'h" + v.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0');

function vxCheck(task, text) {
  const b = vxBare(text, task);
  if (b.err) return {err: b.err};
  let tree;
  try {tree = vxParse(b.s)} catch (e) {if (e && e.vx) return {err: e.msg}; throw e}
  const bad = vxNames(tree, task.sigs);
  if (bad) return {err: bad};
  if (tree.n === 'imp' && !task.bool) return {err: '|-> belongs in assertions, not here'};
  const ref = task.refTree || (task.refTree = vxParse(task.ref));
  const out = v => task.bool ? (v !== 0n ? 1n : 0n) : v & vxMask(task.w);
  for (const env of vxVectors(task)) {
    const want = out(vxEval(ref, env, task.sigs, task.bool ? 0 : task.w)), got = out(vxEval(tree, env, task.sigs, task.bool ? 0 : task.w));
    if (want !== got) return {ok: false, env, want, got};
  }
  return {ok: true};
}

/* ── SDC: one command, Tcl-like words. [get_ports X] is a list ['get_ports', 'X'] ── */
function sdcWords(line) {
  const s = line.trim().replace(/;\s*$/, ''), top = [], stack = [top];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c) || c === '\\') {i++; continue}
    if (c === '[') {const l = []; stack[stack.length - 1].push(l); stack.push(l); i++; continue}
    if (c === ']') {if (stack.length < 2) return {err: 'there is a "]" without a matching "["'}; stack.pop(); i++; continue}
    if (c === '{') {const e = s.indexOf('}', i); if (e < 0) return {err: 'there is a "{" without a matching "}"'}; stack[stack.length - 1].push(...s.slice(i + 1, e).trim().split(/\s+/).filter(Boolean)); i = e + 1; continue}
    if (c === '"') {const e = s.indexOf('"', i + 1); if (e < 0) return {err: 'a quote is not closed'}; stack[stack.length - 1].push(s.slice(i + 1, e)); i = e + 1; continue}
    const w = /^[^\s\[\]{}"]+/.exec(s.slice(i))[0];
    stack[stack.length - 1].push(w); i += w.length;
  }
  if (stack.length > 1) return {err: 'a "[" is not closed'};
  return {w: top};
}
/* task.cmd, task.value (the number that matters: -period for create_clock, the delay for set_input_delay),
   task.clock (-clock that must be given), task.port (what get_ports must name), task.unitHint(value) → message or null */
function sdcCheck(task, text) {
  if (!text.trim()) return {err: 'type a command first'};
  const p = sdcWords(text);
  if (p.err) return {err: p.err};
  const w = p.w;
  if (w[0] !== task.cmd) return {err: typeof w[0] === 'string' && w[0].toLowerCase() === task.cmd ? 'SDC commands are lower case: ' + task.cmd : 'this constraint is written with ' + task.cmd};
  const flags = {}, pos = [];
  for (let i = 1; i < w.length; i++) {
    const x = w[i];
    if (typeof x === 'string' && /^-[a-z_]+$/.test(x)) {
      if (['-max', '-min', '-add_delay', '-add', '-rise', '-fall'].indexOf(x) >= 0) {flags[x] = true; continue}
      if (i + 1 >= w.length) return {err: x + ' needs a value after it'};
      flags[x] = w[++i];
    } else pos.push(x);
  }
  const known = task.cmd === 'create_clock' ? ['-period', '-name', '-waveform', '-add'] : ['-clock', '-max', '-min', '-add_delay', '-rise', '-fall', '-clock_fall'];
  const odd = Object.keys(flags).find(f => known.indexOf(f) < 0);
  if (odd) return {err: task.cmd + ' has no option ' + odd};
  const target = pos.find(x => Array.isArray(x)), nums = pos.filter(x => typeof x === 'string');
  const valStr = task.cmd === 'create_clock' ? flags['-period'] : nums[0];
  if (valStr == null) return {ok: false, msg: task.cmd === 'create_clock' ? 'A clock needs a period: add -period followed by the number of nanoseconds.' : 'Give the delay as a number, in nanoseconds.'};
  if (typeof valStr !== 'string' || !/^-?\d+(\.\d+)?$/.test(valStr)) return {err: '"' + (Array.isArray(valStr) ? '[…]' : valStr) + '" is not a number. Write just the number of nanoseconds, like 2.5'};
  const val = parseFloat(valStr);
  if (task.cmd !== 'create_clock' && nums.length > 1) return {err: 'only one number is needed: the delay'};
  if (task.clock && flags['-clock'] == null) return {ok: false, msg: 'An input delay is measured from a clock edge. Say which clock with -clock ' + task.clock + '.'};
  if (task.clock && flags['-clock'] !== task.clock) return {ok: false, msg: 'There is no clock called ' + (Array.isArray(flags['-clock']) ? '[…]' : flags['-clock']) + '. Without -name, create_clock names the clock after its port: ' + task.clock + '.'};
  if (!target) return {ok: false, msg: 'Say where it applies: [get_ports ' + task.port + '] at the end.'};
  if (target[0] !== 'get_ports') return {ok: false, msg: task.port + ' is a port of the block, so find it with get_ports, not ' + target[0] + '.'};
  const port = target[1];
  if (port == null) return {ok: false, msg: 'get_ports needs a name: [get_ports ' + task.port + '].'};
  const portOk = (task.ports || [task.port]).indexOf(port) >= 0;
  if (!portOk) return {ok: false, msg: port.toLowerCase() === task.port.toLowerCase() ? 'Port names are case-sensitive: ' + task.port + '.' : 'This constraint belongs on ' + task.port + ', not ' + port + '.'};
  if (Math.abs(val - task.value) > 1e-6) return {ok: false, msg: (task.unitHint && task.unitHint(val)) || 'The number is not right yet: ' + val + ' ns.'};
  return {ok: true};
}

/* ── Numbers: within a small tolerance. task.near = [[value, message], …] for common slips ── */
function numCheck(task, text) {
  const t = text.trim().replace(/\s*[A-Za-zΩµμ]+$/, '').replace(/−/g, '-');   // a unit after the number is fine: 0.40 ns, 40 kΩ, 15.9 Hz
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return {err: 'type a number' + (task.unit ? ' (in ' + task.unit + ')' : '')};
  const v = parseFloat(t), tol = task.tol || 1e-6;
  if (Math.abs(v - task.value) <= tol) return {ok: true};
  const n = (task.near || []).find(x => Math.abs(v - x[0]) <= tol);
  return {ok: false, msg: n ? n[1] : 'Not ' + v + '. Go through it step by step.'};
}
