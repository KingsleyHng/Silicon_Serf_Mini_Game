/* Silicon Serf: the analog bench. A third kind of mini-game, in the bottom panel: wire up a schematic, then run it.

   wireTask(t, done)                        click a pin, then another pin, to draw a wire; click a wire to remove it
     t.id     name of the task (points go to ST.d.p[t.id]; tools/test.js wires its answer)
     t.title, t.intro (HTML above the board), t.ask (what to do), t.h (board height; the board is 760 wide)
     t.parts  [{id, type, x, y, rot, …}, …]: what is on the board (PARTS has the types; rot turns a part by 90° steps)
              v = a fixed value; vals = [[value, label], …] lets the player pick one (pick = the one it starts on, 0 if not given)
              port: name (on its tag), sub (small text under it), side (where its wire leaves: 'l' or 'r'), src (a voltage source: its volts), in (a logic input)
              box: name, w, h, pins [[name, side, dy], …]; od lists its open-drain pins (they pull low or let go)
     t.check(c)  judges the circuit (c: see circuitOf) and returns
              {ok: true} or {msg: what is wrong} (a run), or {err: why the board is not finished} (not a run); rows = a table of what was measured
     t.answer {wires: [[pin, pin], …], vals: {part: index}}: shown by "Show answer"; t.wrong a complete but wrong board (tools/test.js runs it)
     t.hint   shown after the first wrong run; t.explain shown when it is right
     Pins are named part.pin: R1.a, U1.o, VDD.p, MCU.SDA. A run only counts once every pin has a wire.
     Points like codeTask: 2 when right on the first run, 1 on the second or third, 0 after that or after "Show answer". */

/* ═════════ Parts: pins [x, y, the way the wire leaves] in the part's own coordinates, and the symbol ═════════ */
const DIRV = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]}, TURN = {l: 'u', u: 'r', r: 'd', d: 'l'};
const PARTS = {
  R: {pins: {a: [-40, 0, 'l'], b: [40, 0, 'r']}, lbl: 16, sym: '<path d="M-40 0H-24L-20-9L-12 9L-4-9L4 9L12-9L20 9L24 0H40"/>'},
  C: {pins: {a: [-30, 0, 'l'], b: [30, 0, 'r']}, lbl: 22, sym: '<path d="M-30 0H-5M5 0H30M-5-15V15M5-15V15"/>'},
  vdd: {pins: {p: [0, 20, 'd']}, sym: '<path d="M0 20V0M-16 0H16"/>'},
  gnd: {pins: {p: [0, -20, 'u']}, sym: '<path d="M0-20V0M-16 0H16M-10 6H10M-4 12H4"/>'},
  opamp: {pins: {m: [-56, -20, 'l'], p: [-56, 20, 'l'], o: [60, 0, 'r']},
    sym: '<path class="fill" d="M-34-42V42L42 0Z"/><path d="M-56-20H-34M-56 20H-34M42 0H60M-28-20H-19M-28 20H-19M-23.5 15.5V24.5"/>'},
  nmos: {pins: {g: [-32, 0, 'l'], d: [18, -40, 'u'], s: [18, 40, 'd']},
    sym: '<path d="M-32 0H-9M-9-17V17M0-22V-11M0-5V5M0 11V22M0-16H18V-40M0 16H18V40M7 11L13 16L7 21"/>'},
  pmos: {pins: {g: [-32, 0, 'l'], s: [18, -40, 'u'], d: [18, 40, 'd']},
    sym: '<path d="M-32 0H-17M-9-17V17M0-22V-11M0-5V5M0 11V22M0-16H18V-40M0 16H18V40M12-21L6-16L12-11"/><circle cx="-13" cy="0" r="4"/>'}
};
const rotP = (x, y, d, r) => {for (let k = 0; k < (r || 0) / 90; k++) {[x, y] = [-y, x]; d = d && TURN[d]} return [x, y, d]};
const tagW = s => s.length * 7.9 + 16;
/* Every pin of a part, on the board: {name: [x, y, dir]} */
function pinsOf(p) {
  let L = {};
  if (p.type === 'port') L.p = [0, 0, p.side || 'r'];
  else if (p.type === 'box') p.pins.forEach(([n, side, dy]) => {L[n] = [(side === 'l' ? -1 : 1) * (p.w / 2 + 20), dy, side]});
  else L = Object.assign({}, PARTS[p.type].pins);
  const out = {};
  Object.keys(L).forEach(n => {const [x, y, d] = rotP(L[n][0], L[n][1], L[n][2], p.rot); out[n] = [p.x + x, p.y + y, d]});
  return out;
}
/* How a pin is called in messages */
function pinSay(c, pin) {
  const [id, n] = pin.split('.'), p = c.part(id);
  if (p.type === 'R' || p.type === 'C') return 'one end of ' + id;
  if (p.type === 'opamp') return {m: 'the − input of ', p: 'the + input of ', o: 'the output of '}[n] + id;
  if (p.type === 'nmos' || p.type === 'pmos') return {g: 'the gate of ', d: 'the drain of ', s: 'the source of '}[n] + id;
  if (p.type === 'box') return n + ' on the ' + p.name;
  return p.type === 'gnd' ? 'GND' : p.type === 'vdd' ? 'VDD' : p.name;
}
const fmtV = v => (Math.abs(v) < .0005 ? 0 : v).toFixed(2) + ' V';
const fmtSI = (x, u) => {
  const a = Math.abs(x), s = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']].find(q => a >= q[0] * .9995) || [1e-12, 'p'];
  const n = x / s[0];
  return (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, '') + ' ' + s[1] + u;
};

/* ═════════ The circuit behind a board ═════════
   c.net(pin), c.same(a, b)     which node a pin is on (every GND symbol is one node, and so is every VDD symbol)
   c.val(id), c.part(id)        a part's value (picked or fixed), and the part itself
   c.unwired()                  the first pin with no wire, or null
   c.short()                    two things that each set a voltage, wired together (VDD to GND, a source to ground, an op-amp output to a supply), or ''
   c.dc(src, o)                 solve it: src {port: volts} overrides a source; o.on [open-drain pins pulling low], o.force {op-amp: volts drives its output},
                                o.zero (every source not in src is 0 V). Returns {v(pin): volts, supply(id): amps out of that source}
   c.ac(f, port)                a 1 V sine at f Hz on that port, every other source 0: {v(pin): the size of the sine there}
   c.logic(ins)                 transistors as switches, ins {port: 0 or 1}: {v(pin): 0, 1, 'Z' (nothing drives it) or 'X' (a short), short} */
function circuitOf(t, wires, pick) {
  const P = {}, pins = [];
  t.parts.forEach(p => {P[p.id] = p; Object.keys(pinsOf(p)).forEach(n => pins.push(p.id + '.' + n))});
  const up = {};
  pins.forEach(x => up[x] = x);
  const find = x => up[x] === x ? x : (up[x] = find(up[x])), join = (a, b) => {a = find(a); b = find(b); if (a !== b) up[a] = b};
  wires.forEach(w => join(w[0], w[1]));
  const ofType = ty => t.parts.filter(p => p.type === ty);
  ['gnd', 'vdd'].forEach(ty => ofType(ty).forEach(p => join(p.id + '.p', ofType(ty)[0].id + '.p')));
  const net = x => find(x), gnd = ofType('gnd').length ? net(ofType('gnd')[0].id + '.p') : '#gnd';
  const val = id => P[id].vals ? P[id].vals[pick[id]][0] : P[id].v;
  /* What sets a voltage: [pin, what to call it] */
  const fixed = [];
  t.parts.forEach(p => {
    if (p.type === 'vdd' || p.type === 'gnd') fixed.push([p.id + '.p', p.type.toUpperCase()]);
    if (p.type === 'port' && (p.src != null || p.in)) fixed.push([p.id + '.p', p.name]);
    if (p.type === 'opamp') fixed.push([p.id + '.o', 'the output of ' + p.id]);
  });
  const c = {
    net, part: id => P[id], val,
    same: (a, b) => net(a) === net(b),
    unwired() {const on = new Set([].concat(...wires)); return pins.find(x => !on.has(x)) || null},
    short() {
      for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
        const [a, an] = fixed[i], [b, bn] = fixed[j];
        if (an !== bn && net(a) === net(b)) return an + ' is wired straight to ' + bn + ': a short circuit. Something would burn.';
      }
      return '';
    },
    dc: (src, o) => mna(0, src || {}, o || {}),
    ac: (f, port) => mna(f, {[port]: 1}, {zero: true}),
    logic(ins) {
      const nets = [...new Set(pins.map(net))], drv = {};
      const put = (n, v) => (drv[n] = drv[n] || new Set()).add(v);
      t.parts.forEach(p => {
        if (p.type === 'vdd') put(net(p.id + '.p'), 1);
        if (p.type === 'gnd') put(net(p.id + '.p'), 0);
        if (p.type === 'port' && p.in) put(net(p.id + '.p'), ins[p.id]);
      });
      let v = {};
      for (let pass = 0; pass < 8; pass++) {
        const u2 = {};
        nets.forEach(n => u2[n] = n);
        const f2 = x => u2[x] === x ? x : (u2[x] = f2(u2[x]));
        t.parts.forEach(p => {
          if (p.type !== 'nmos' && p.type !== 'pmos') return;
          const g = v[net(p.id + '.g')];
          if (p.type === 'nmos' ? g === 1 : g === 0) {const a = f2(net(p.id + '.d')), b = f2(net(p.id + '.s')); if (a !== b) u2[a] = b}
        });
        const grp = {};
        nets.forEach(n => {const r = f2(n); grp[r] = grp[r] || new Set(); (drv[n] || []).forEach(x => grp[r].add(x))});
        const nv = {};
        nets.forEach(n => {const s = grp[f2(n)]; nv[n] = s.size > 1 ? 'X' : s.size ? [...s][0] : 'Z'});
        const same = nets.every(n => nv[n] === v[n]);
        v = nv;
        if (same) break;
      }
      return {v: pin => v[net(pin)], short: nets.some(n => v[n] === 'X')};
    }
  };
  /* Modified nodal analysis with complex numbers (a capacitor is 1/(j·2πf·C); at f = 0 it is open). Every node also leaks 1 pS to ground,
     so a node nothing connects to still has an answer (0 V) instead of breaking the solve. The op-amp is ideal: a gain of 100 000, no limits. */
  function mna(f, src, o) {
    const nets = [...new Set(pins.map(net))].filter(n => n !== gnd), ix = {};
    nets.forEach((n, i) => ix[n] = i);
    const I = n => n === gnd || n === '#gnd' ? -1 : ix[n], N = nets.length, S = [], seen = {};
    const source = (id, n, v, op) => {if (seen[n] && !op) {S.push(null); return} seen[n] = 1; S.push({id, n: I(n), v, op})};
    t.parts.forEach(p => {
      const live = v => p.id in src ? src[p.id] : o.zero ? 0 : v;
      if (p.type === 'vdd') source(p.id, net(p.id + '.p'), live(p.v));
      if (p.type === 'port' && p.src != null) source(p.id, net(p.id + '.p'), live(p.src));
      if (p.type === 'opamp') {
        if (o.force && p.id in o.force) source(p.id, net(p.id + '.o'), o.force[p.id]);
        else source(p.id, net(p.id + '.o'), 0, [I(net(p.id + '.p')), I(net(p.id + '.m'))]);
      }
    });
    const live = S.filter(Boolean), M = N + live.length;
    const A = Array.from({length: M}, () => Array.from({length: M}, () => [0, 0])), b = Array.from({length: M}, () => [0, 0]);
    const add = (r, k, y) => {if (r >= 0 && k >= 0) {A[r][k][0] += y[0]; A[r][k][1] += y[1]}};
    const Y = (a, c2, y) => {const i = I(a), j = I(c2); add(i, i, y); add(j, j, y); add(i, j, [-y[0], -y[1]]); add(j, i, [-y[0], -y[1]])};
    for (let i = 0; i < N; i++) add(i, i, [1e-12, 0]);
    t.parts.forEach(p => {
      if (p.type === 'R') Y(net(p.id + '.a'), net(p.id + '.b'), [1 / val(p.id), 0]);
      if (p.type === 'C') Y(net(p.id + '.a'), net(p.id + '.b'), [0, 2 * Math.PI * f * val(p.id)]);
      if (p.type === 'box') (p.od || []).forEach(n => {if ((o.on || []).indexOf(p.id + '.' + n) >= 0) Y(net(p.id + '.' + n), '#gnd', [1, 0])});
    });
    live.forEach((s, k) => {
      const r = N + k;
      add(s.n, r, [1, 0]); add(r, s.n, [1, 0]); b[r] = [s.v, 0];
      if (s.op) {add(r, s.op[0], [-1e5, 0]); add(r, s.op[1], [1e5, 0])}
    });
    const x = csolve(A, b) || Array.from({length: M}, () => [0, 0]);
    const at = pin => {const i = I(net(pin)); return i < 0 ? [0, 0] : x[i]};
    return {
      v: pin => f ? Math.hypot(...at(pin)) : at(pin)[0],
      supply: id => {const k = live.findIndex(s => s.id === id); return k < 0 ? 0 : -x[N + k][0]}
    };
  }
  return c;
}
/* Gaussian elimination with partial pivoting, on complex numbers [re, im]; null if the circuit has no single answer */
function csolve(A, b) {
  const n = b.length, abs = z => Math.hypot(z[0], z[1]);
  const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  const div = (p, q) => {const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]};
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (abs(A[r][c]) > abs(A[p][c])) p = r;
    if (abs(A[p][c]) < 1e-18) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const k = div(A[r][c], A[c][c]);
      if (!k[0] && !k[1]) continue;
      for (let j = c; j < n; j++) {const m = mul(k, A[c][j]); A[r][j] = [A[r][j][0] - m[0], A[r][j][1] - m[1]]}
      const m = mul(k, b[c]); b[r] = [b[r][0] - m[0], b[r][1] - m[1]];
    }
  }
  const x = Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let j = r + 1; j < n; j++) {const m = mul(A[r][j], x[j]); s = [s[0] - m[0], s[1] - m[1]]}
    x[r] = div(s, A[r][r]);
  }
  return x;
}

/* ═════════ The board ═════════ */
const NET_COLORS = ['#4fc1ff', '#f5c26b', '#e17cf0', '#7fe3a8', '#ff9e64', '#a9b8ff', '#5ee0d0', '#ffd166'];
const tableOf = rows => '<div class="wave-wrap"><table class="wave kv">' + rows.map((r, i) => '<tr>' + r.map(x => i ? '<td>' + x + '</td>' : '<th>' + x + '</th>').join('') + '</tr>').join('') + '</table></div>';

function wireTask(t, done) {
  let wires = [], sel = null, runs = 0, over = false;
  const pick = {};
  t.parts.forEach(p => {if (p.vals) pick[p.id] = p.pick || 0});
  const pinAt = {};
  t.parts.forEach(p => {const L = pinsOf(p); Object.keys(L).forEach(n => pinAt[p.id + '.' + n] = L[n])});
  const valued = t.parts.filter(p => p.vals);
  setPanel('<div class="task wire-task" data-task="' + t.id + '" data-wrong="' + esc(JSON.stringify(t.wrong)).replace(/"/g, '&quot;') + '">'
    + (t.intro || '') + '<p>' + t.ask + '</p>'
    + '<div class="wb"><div class="ed-bar"><span>' + t.file + '</span><span>Click a pin, then another pin · click a wire to remove it</span></div>'
    + '<div class="wb-box"></div></div>'
    + (valued.length ? '<div class="vals">' + valued.map(p => '<label>' + p.id + ' <select data-part="' + p.id + '">'
      + p.vals.map((v, i) => '<option value="' + i + '">' + v[1] + '</option>').join('') + '</select></label>').join('') + '</div>' : '')
    + '<div class="row"><button class="btn btn-primary" id="wireRun" type="button">Run</button><button class="btn" id="wireUndo" type="button">Undo</button>'
    + '<button class="btn" id="wireClear" type="button">Clear</button><span class="fine" id="runs"></span></div>'
    + '<div id="fb" class="fb" aria-live="polite"></div><div id="taskEnd"></div></div>', t.title);
  const box = $('.wb-box'), fb = $('#fb');
  $$('.vals select').forEach(s => {s.value = pick[s.dataset.part]; s.onchange = () => {pick[s.dataset.part] = +s.value; draw()}});

  /* Where the parts' bodies are, so wires go round them: [x0, y0, x1, y1] on the board */
  const BODY = {R: [-26, -10, 26, 10], C: [-7, -16, 7, 16], opamp: [-36, -44, 44, 44], nmos: [-13, -26, 21, 26], pmos: [-18, -26, 21, 26], vdd: [-17, -4, 17, 4], gnd: [-17, -2, 17, 14]};
  const bodies = t.parts.map(p => {
    if (p.type === 'box') return [p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2];
    if (p.type === 'port') {const w = tagW(p.name); return p.side === 'l' ? [p.x + 8, p.y - 13, p.x + 8 + w, p.y + 13] : [p.x - 8 - w, p.y - 13, p.x - 8, p.y + 13]}
    const b = BODY[p.type], q = rotP(b[0], b[1], null, p.rot), r = rotP(b[2], b[3], null, p.rot);
    return [p.x + Math.min(q[0], r[0]), p.y + Math.min(q[1], r[1]), p.x + Math.max(q[0], r[0]), p.y + Math.max(q[1], r[1])];
  });
  /* A wire leaves each pin by a short stub, then runs square with one corner (an L) or two (a Z). Of all the ways, it takes the one that
     does not double back over a stub, does not cut through a part, does not run along another node's wire, and is short.
     segs = what is already drawn this time round: [x0, y0, x1, y1, node] */
  let segs = [];
  const route = (a, b, net) => {
    const A = pinAt[a], B = pinAt[b], s = 14, dA = DIRV[A[2]], dB = DIRV[B[2]];
    const a1 = [A[0] + dA[0] * s, A[1] + dA[1] * s], b1 = [B[0] + dB[0] * s, B[1] + dB[1] * s], mx = (a1[0] + b1[0]) / 2, my = (a1[1] + b1[1]) / 2;
    const lo = Math.min, hi = Math.max;
    const along = (p, q) => segs.reduce((n, g) => {
      if (g[4] === net) return n;
      if (Math.abs(p[1] - q[1]) < 1 && Math.abs(g[1] - g[3]) < 1 && Math.abs(p[1] - g[1]) < 4) return n + hi(0, lo(hi(p[0], q[0]), hi(g[0], g[2])) - hi(lo(p[0], q[0]), lo(g[0], g[2])));
      if (Math.abs(p[0] - q[0]) < 1 && Math.abs(g[0] - g[2]) < 1 && Math.abs(p[0] - g[0]) < 4) return n + hi(0, lo(hi(p[1], q[1]), hi(g[1], g[3])) - hi(lo(p[1], q[1]), lo(g[1], g[3])));
      return n;
    }, 0);
    const cuts = (p, q) => bodies.filter(r => hi(p[0], q[0]) > r[0] + 1 && lo(p[0], q[0]) < r[2] - 1 && hi(p[1], q[1]) > r[1] + 1 && lo(p[1], q[1]) < r[3] - 1).length;
    const cost = mid => {
      const pts = [a1].concat(mid, [b1]), dir = [];
      let len = 0, over = 0, hit = 0;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], dx = q[0] - p[0], dy = q[1] - p[1];
        if (!dx && !dy) continue;
        dir.push([Math.sign(dx), Math.sign(dy)]); len += Math.abs(dx) + Math.abs(dy); over += along(p, q); hit += cuts(p, q);
      }
      const back = dir.length && ((dir[0][0] === -dA[0] && dir[0][1] === -dA[1]) ? 1 : 0) + ((dir[dir.length - 1][0] === dB[0] && dir[dir.length - 1][1] === dB[1]) ? 1 : 0);
      return back * 1e4 + hit * 400 + over * 30 + len + dir.length * 20;
    };
    const xs = [mx, mx - 20, mx + 20, mx - 40, mx + 40, hi(a1[0], b1[0]) + 24, lo(a1[0], b1[0]) - 24], ys = [my, my - 20, my + 20, my - 40, my + 40, hi(a1[1], b1[1]) + 24, lo(a1[1], b1[1]) - 24];
    const ways = [[[b1[0], a1[1]]], [[a1[0], b1[1]]]].concat(xs.map(x => [[x, a1[1]], [x, b1[1]]]), ys.map(y => [[a1[0], y], [b1[0], y]]));
    const mid = ways.reduce((m, q) => cost(q) < cost(m) ? q : m);
    const pts = [[A[0], A[1]], a1].concat(mid, [b1, [B[0], B[1]]]);
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], net]);
    return 'M' + pts.map(q => q[0] + ' ' + q[1]).join('L');
  };
  const text = (x, y, s, cls, anchor) => '<text x="' + x + '" y="' + y + '" class="' + (cls || '') + '" text-anchor="' + (anchor || 'middle') + '">' + esc(s) + '</text>';
  const partSvg = p => {
    const tr = 'translate(' + p.x + ' ' + p.y + ')' + (p.rot ? ' rotate(' + p.rot + ')' : '');
    if (p.type === 'port') {
      const w = tagW(p.name), sx = p.side === 'l' ? 1 : -1, x0 = sx > 0 ? 8 : -8 - w;
      return '<g class="sym" transform="' + tr + '"><path d="M0 0H' + 8 * sx + '"/><rect class="fill" x="' + x0 + '" y="-13" width="' + w + '" height="26" rx="4"/></g>'
        + text(p.x + sx * (8 + w / 2), p.y + 5, p.name, 'lbl') + (p.sub ? text(p.x + sx * (8 + w / 2), p.y + 30, p.sub, 'sub') : '');
    }
    if (p.type === 'box') {
      const hw = p.w / 2, hh = p.h / 2;
      return '<g class="sym" transform="' + tr + '"><rect class="fill" x="' + -hw + '" y="' + -hh + '" width="' + p.w + '" height="' + p.h + '" rx="6"/>'
        + p.pins.map(([n, side, dy]) => '<path d="M' + (side === 'l' ? -hw : hw) + ' ' + dy + 'H' + (side === 'l' ? -hw - 20 : hw + 20) + '"/>').join('') + '</g>'
        + text(p.x, p.y - hh + 20, p.name, 'lbl') + (p.sub ? text(p.x, p.y + hh - 10, p.sub, 'sub') : '')
        + p.pins.map(([n, side, dy]) => text(p.x + (side === 'l' ? -hw + 8 : hw - 8), p.y + dy + 4, n, 'pinname', side === 'l' ? 'start' : 'end')).join('');
    }
    let s = '<g class="sym" transform="' + tr + '">' + PARTS[p.type].sym + '</g>';
    if (p.type === 'vdd') s += text(p.x, p.y - 8, 'VDD ' + p.v + ' V', 'lbl');
    else if (p.type === 'R' || p.type === 'C') {
      const d = PARTS[p.type].lbl, v = p.vals ? p.vals[pick[p.id]][1] : p.label || '';
      s += p.rot ? text(p.x + d, p.y - 3, p.id, 'lbl', 'start') + text(p.x + d, p.y + 14, v, 'val', 'start')
        : text(p.x, p.y - d, p.id, 'lbl') + text(p.x, p.y + d + 12, v, 'val');
    }
    else if (p.type === 'opamp') s += text(p.x - 4, p.y - 50, p.id, 'lbl');
    else if (p.type === 'nmos' || p.type === 'pmos') s += text(p.x + 28, p.y + 5, p.id, 'lbl', 'start');
    return s;
  };
  const draw = () => {
    const c = circuitOf(t, wires, pick), color = {};
    let k = 0;
    const colorOf = n => color[n] || (color[n] = c.same(n, (t.parts.find(p => p.type === 'gnd') || {id: '?'}).id + '.p') ? '#9aa9b4'
      : t.parts.some(p => p.type === 'vdd' && c.same(n, p.id + '.p')) ? '#ff6b6b' : NET_COLORS[k++ % NET_COLORS.length]);
    const used = new Set([].concat(...wires));
    segs = [];
    box.innerHTML = '<svg viewBox="0 0 760 ' + t.h + '" role="img" aria-label="Schematic: ' + esc(t.title) + '">'
      + '<defs><pattern id="wbDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.1" fill="#1d3240"/></pattern></defs>'
      + '<rect width="760" height="' + t.h + '" fill="url(#wbDots)"/>'
      + t.parts.map(partSvg).join('')
      + wires.map((w, i) => {const n = c.net(w[0]), d = route(w[0], w[1], n); return '<path class="wire-hit" data-w="' + i + '" d="' + d + '"><title>Remove this wire</title></path>'
        + '<path class="wire" data-net="' + esc(n) + '" stroke="' + colorOf(n) + '" d="' + d + '"/>'}).join('')
      + Object.keys(pinAt).map(id => {const [x, y] = pinAt[id], on = used.has(id);
        return '<g class="pin' + (on ? ' on' : '') + (sel === id ? ' sel' : '') + '" data-pin="' + id + '" data-net="' + esc(c.net(id)) + '" tabindex="0" role="button" aria-label="' + esc(pinSay(c, id)) + '">'
          + '<circle class="hit" cx="' + x + '" cy="' + y + '" r="13"/><circle class="dot" cx="' + x + '" cy="' + y + '" r="5.5"' + (on && sel !== id ? ' fill="' + colorOf(c.net(id)) + '"' : '') + '/></g>'}).join('')
      + '<line class="rub" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/></svg>';
  };
  const svgPt = e => {const s = $('svg', box), m = s.getScreenCTM().inverse(), q = s.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; return q.matrixTransform(m)};
  const pinClick = id => {
    if (over) return;
    if (!sel) sel = id;
    else if (sel === id) sel = null;
    else {
      if (!wires.some(w => (w[0] === sel && w[1] === id) || (w[0] === id && w[1] === sel))) wires.push([sel, id]);
      sel = null; SFX.blip();
    }
    draw();
    if (sel) {const g = $('[data-pin="' + sel + '"]', box); if (g) g.focus({preventScroll: true})}
  };
  box.addEventListener('click', e => {
    const g = e.target.closest('.pin'), w = e.target.closest('.wire-hit');
    if (g) pinClick(g.dataset.pin);
    else if (w && !over) {wires.splice(+w.dataset.w, 1); sel = null; draw()}
    else if (sel) {sel = null; draw()}
  });
  box.addEventListener('keydown', e => {
    const g = e.target.closest && e.target.closest('.pin');
    if (g && (e.key === 'Enter' || e.key === ' ')) {e.preventDefault(); pinClick(g.dataset.pin)}
    if (e.key === 'Escape' && sel) {e.stopPropagation(); sel = null; draw()}
  });
  box.addEventListener('pointermove', e => {
    const r = $('.rub', box);
    if (!r || !sel) return;
    const q = svgPt(e), [x, y] = pinAt[sel];
    r.setAttribute('x1', x); r.setAttribute('y1', y); r.setAttribute('x2', q.x); r.setAttribute('y2', q.y); r.setAttribute('visibility', 'visible');
  });
  /* Hovering a pin lights up every wire on its node */
  box.addEventListener('pointerover', e => {
    const g = e.target.closest('.pin');
    $$('.wire', box).forEach(w => w.classList.toggle('hl', !!g && w.dataset.net === g.dataset.net));
  });
  $('#wireUndo').onclick = () => {if (!over && wires.length) {wires.pop(); sel = null; draw()}};
  $('#wireClear').onclick = () => {if (!over) {wires = []; sel = null; draw()}};
  draw();

  const finish = () => {
    over = true; sel = null; draw();
    ['#wireRun', '#wireUndo', '#wireClear'].forEach(s => $(s).disabled = true);
    $$('.vals select').forEach(s => s.disabled = true);
    $('#taskEnd').innerHTML = nextBtn('Done');
    $('#next').onclick = () => {hidePanel(); done()};
  };
  const judge = () => {
    const c = circuitOf(t, wires, pick), u = c.unwired();
    if (u) return {err: 'Not finished: ' + pinSay(c, u) + ' has no wire yet.'};
    const s = c.short();
    return s ? {msg: s} : t.check(c);
  };
  const showAnswer = () => {
    PTS()[t.id] = 0;
    wires = t.answer.wires.map(w => w.slice());
    Object.assign(pick, t.answer.vals || {});
    $$('.vals select').forEach(s => s.value = pick[s.dataset.part]);
    const r = judge();
    fb.innerHTML = '<p class="fb-ans">One correct circuit is on the board now.</p>' + (r.rows ? tableOf(r.rows) : '') + (t.explain ? '<p class="fine">' + t.explain + '</p>' : '');
    finish();
  };
  $('#wireRun').onclick = () => {
    if (over) return;
    const r = judge();
    if (r.err) {fb.innerHTML = '<p class="fb-err">⚠ ' + esc(r.err) + '</p><p class="fine">An unfinished board does not count as a run.</p>'; SFX.blip(); return}
    runs++;
    const rows = r.rows ? tableOf(r.rows) : '';
    if (r.ok) {
      PTS()[t.id] = runs === 1 ? 2 : runs <= 3 ? 1 : 0; SFX.ok();
      fb.innerHTML = '<p class="fb-ok">✓ It works.' + (runs > 1 ? ' (run ' + runs + ')' : '') + '</p>' + rows + (t.explain ? '<p class="fine">' + t.explain + '</p>' : '');
      finish(); return;
    }
    SFX.blip();
    fb.innerHTML = '<p class="fb-bad">✗ ' + r.msg + '</p>' + rows + (t.hint ? '<p class="fine"><b>Hint:</b> ' + t.hint + '</p>' : '');
    $('#runs').textContent = runs < 3 ? (3 - runs) + ' more run' + (runs === 2 ? '' : 's') + ' for points' : 'No points left, but keep trying';
    if (runs >= 3 && !$('#reveal')) {
      $('#taskEnd').innerHTML = '<div class="row end"><button class="btn" id="reveal" type="button">Show answer</button></div>';
      $('#reveal').onclick = showAnswer;
    }
    fb.scrollIntoView({block: 'nearest'});
  };
}

/* ═════════ Week 3 · The analog side ═════════ */
const OHMS = [[470, '470 Ω'], [1e3, '1 kΩ'], [2.2e3, '2.2 kΩ'], [4.7e3, '4.7 kΩ'], [10e3, '10 kΩ'], [20e3, '20 kΩ'], [33e3, '33 kΩ'], [47e3, '47 kΩ'], [100e3, '100 kΩ'], [220e3, '220 kΩ'], [330e3, '330 kΩ'], [1e6, '1 MΩ']];
const ohms = (...ks) => OHMS.filter(o => ks.indexOf(o[0]) >= 0);

/* Monday: the battery monitor. Paper first, then real resistors */
const T_OHM = {id: 'ohm', kind: 'num', unit: 'kΩ', file: 'battery_monitor.txt', title: 'Divide the battery down',
  intro: '<p>Two resistors in series from VBAT to ground; the ADC reads the point between them. The same current flows through both, so the voltage splits in proportion to the resistances: V<sub>ADC</sub> = VBAT · R2 / (R1 + R2).</p>',
  code: 'VBAT  = 4.2 V     // a full battery\nV_ADC = 1.2 V     // the most the ADC can read\nR1    = 100 kΩ    // from VBAT to the ADC\nR2    = ____ kΩ   // from the ADC to ground',
  ask: 'Type R2 in kΩ.', value: 40, tol: .5,
  near: [[28.6, 'That is 100 × 1.2 / 4.2: it treats R2 as a fraction of R1 alone. The fraction is R2 / (R1 + R2).'],
    [250, 'That puts 1.2 V across R1. The ADC sees the voltage across R2, the bottom resistor.'], [40000, 'Right number, wrong unit: the answer is in kΩ.']],
  hint: 'The current is the same in both: 4.2 − 1.2 = 3.0 V across R1, 1.2 V across R2. So R2 / R1 = 1.2 / 3.0.',
  answer: '40', explain: '3.0 V across 100 kΩ is a current of 30 µA. 1.2 V at 30 µA is 40 kΩ.'};

const T_DIVIDER = {id: 'divider', file: 'evb_battery.sch', title: 'The battery monitor', h: 300,
  intro: '<p>Real resistors only come in standard values, so 40 kΩ is out. Anything that puts the ADC between <b>0.9 V and 1.2 V</b> at a full battery is fine. The divider is always on, so it may draw at most <b>50 µA</b> from the battery.</p>',
  ask: 'Wire VBAT, R1, R2 and the ADC pin into a divider, and pick the two values.',
  parts: [
    {id: 'VBAT', type: 'port', name: 'VBAT', sub: '4.2 V full', side: 'r', x: 110, y: 90, src: 4.2},
    {id: 'R1', type: 'R', rot: 90, x: 300, y: 150, vals: ohms(10e3, 33e3, 47e3, 100e3, 220e3, 330e3, 1e6)},
    {id: 'R2', type: 'R', rot: 90, x: 440, y: 150, vals: ohms(10e3, 33e3, 47e3, 100e3, 220e3, 330e3, 1e6)},
    {id: 'ADC', type: 'port', name: 'ADC', sub: 'reads 0 to 1.2 V', side: 'l', x: 640, y: 150},
    {id: 'GND', type: 'gnd', x: 370, y: 270}
  ],
  check(c) {
    const s = c.dc(), v = s.v('ADC.p'), i = s.supply('VBAT');
    const rows = [['At VBAT = 4.2 V', ''], ['ADC input', fmtV(v)], ['Battery current', fmtSI(i, 'A')]];
    if (c.same('ADC.p', 'VBAT.p')) return {msg: 'The ADC is wired straight to the battery, so it sees all 4.2 V. It needs the point between the two resistors.', rows};
    if (v > 1.2005) return {msg: 'The ADC sees ' + fmtV(v) + '. Everything above 1.2 V reads as full scale, so a full battery and a half-empty one look the same. Make the bottom resistor smaller compared with the top one.', rows};
    if (v < .01) return {msg: 'The ADC sees 0 V: it is tied to ground, or no current reaches it. The ADC goes to the point between the two resistors.', rows};
    if (v < .9) return {msg: 'The ADC sees only ' + fmtV(v) + ' at a full battery, so most of its range goes unused. Aim for 0.9 to 1.2 V.', rows};
    if (i > 50.5e-6) return {msg: 'The voltage is right, but the divider draws ' + fmtSI(i, 'A') + ' from the battery, all day, every day. The budget is 50 µA: same ratio, bigger resistors.', rows};
    return {ok: true, rows};
  },
  hint: 'VBAT → top resistor → ADC point → bottom resistor → GND. The bottom resistor should be about a third of the top one.',
  answer: {wires: [['VBAT.p', 'R1.a'], ['R1.b', 'R2.a'], ['R1.b', 'ADC.p'], ['R2.b', 'GND.p']], vals: {R1: 3, R2: 1}},
  wrong: {wires: [['VBAT.p', 'R1.a'], ['R1.b', 'R2.a'], ['R1.b', 'ADC.p'], ['R2.b', 'GND.p']]},
  explain: '100 kΩ over 33 kΩ gives 4.2 × 33 / 133 = 1.04 V at a full battery, and 32 µA. 330 kΩ over 100 kΩ works too, and drains even less.'};

/* Tuesday: what a gate is made of */
function miniMos(done) {
  quiz('Transistors as switches', '<p>In CMOS logic every transistor is a switch, opened and closed by the voltage on its gate.</p>', [
    {q: 'An NMOS transistor conducts when its gate is…', opts: ['1 (VDD)', '0 (ground)', 'either, it is always on'], ok: 0, why: 'NMOS: a 1 on the gate closes the switch. It is good at pulling a node down to ground.'},
    {q: 'A PMOS transistor conducts when its gate is…', opts: ['1 (VDD)', '0 (ground)', 'either, it is always on'], ok: 1, why: 'PMOS: a 0 on the gate closes the switch (that is the little circle on its gate). It is good at pulling a node up to VDD.'},
    {q: 'Why does the pull-up half of a CMOS gate use PMOS and not NMOS?', opts: ['An NMOS passing a 1 loses a threshold: the output only reaches about VDD − 0.4 V', 'PMOS transistors are smaller', 'An NMOS cannot be connected to VDD at all'], ok: 0,
      why: 'An NMOS turns itself off as its source rises toward its gate voltage, so it passes a weak 1. A PMOS passes a full 1, and an NMOS a full 0.'}
  ], 'mos', done);
}

const T_NAND = {id: 'nand', file: 'nand2.sch', title: 'A NAND gate from four transistors', h: 410,
  intro: '<p>A NAND gives 0 only when A and B are both 1. Pull Y down to ground through NMOS switches that are <b>all</b> on only when A = B = 1; pull it up to VDD through PMOS switches of which <b>at least one</b> is on otherwise.</p>',
  ask: 'Wire P1, P2, N1 and N2 between VDD, GND, the inputs A and B, and the output Y.',
  parts: [
    {id: 'VDD', type: 'vdd', v: 1.8, x: 380, y: 34},
    {id: 'P1', type: 'pmos', x: 300, y: 130}, {id: 'P2', type: 'pmos', x: 470, y: 130},
    {id: 'N1', type: 'nmos', x: 300, y: 275}, {id: 'N2', type: 'nmos', x: 470, y: 275},
    {id: 'A', type: 'port', name: 'A', side: 'r', x: 120, y: 160, in: true}, {id: 'B', type: 'port', name: 'B', side: 'r', x: 120, y: 250, in: true},
    {id: 'Y', type: 'port', name: 'Y', side: 'l', x: 650, y: 205},
    {id: 'GND', type: 'gnd', x: 400, y: 385}
  ],
  check(c) {
    for (const p of ['N1', 'N2']) for (const n of ['d', 's']) if (c.same(p + '.' + n, 'VDD.p')) return {msg: p + ' connects to VDD. An NMOS only passes a weak 1, so the pull-up side must be PMOS.'};
    for (const p of ['P1', 'P2']) for (const n of ['d', 's']) if (c.same(p + '.' + n, 'GND.p')) return {msg: p + ' connects to GND. A PMOS only passes a weak 0, so the pull-down side must be NMOS.'};
    const rows = [['A', 'B', 'Y should be', 'Your Y']], say = v => v === 'Z' ? 'floating' : v === 'X' ? 'short!' : String(v);
    let bad = null;
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => {
      const r = c.logic({A: a, B: b}), y = r.v('Y.p'), want = a && b ? 0 : 1;
      rows.push([a, b, want, say(r.short && y !== 'X' ? 'X' : y)]);
      if (!bad) {
        const g = ['P1', 'P2', 'N1', 'N2'].find(p => r.v(p + '.g') === 'Z');
        if (g) bad = 'The gate of ' + g + ' is not connected to A or B, so nothing ever switches it.';
        else if (r.short) bad = 'For A = ' + a + ', B = ' + b + ', switches that are on connect VDD straight to GND: a short circuit, and a hot chip.';
        else if (y !== want) bad = 'For A = ' + a + ', B = ' + b + ', Y should be ' + want + '; yours is ' + (y === 'Z' ? 'floating: no switch that is on connects it to VDD or GND.' : y + '.');
      }
    });
    return bad ? {msg: bad, rows} : {ok: true, rows};
  },
  hint: 'For Y to fall only when both inputs are 1, the two NMOS go in series (one after the other) from Y to GND. The two PMOS go side by side from VDD to Y.',
  answer: {wires: [['VDD.p', 'P1.s'], ['VDD.p', 'P2.s'], ['P1.d', 'Y.p'], ['P2.d', 'Y.p'], ['Y.p', 'N1.d'], ['N1.s', 'N2.d'], ['N2.s', 'GND.p'],
    ['A.p', 'P1.g'], ['A.p', 'N1.g'], ['B.p', 'P2.g'], ['B.p', 'N2.g']]},
  wrong: {wires: [['VDD.p', 'P1.s'], ['P1.d', 'P2.s'], ['P2.d', 'Y.p'], ['Y.p', 'N1.d'], ['Y.p', 'N2.d'], ['N1.s', 'GND.p'], ['N2.s', 'GND.p'],
    ['A.p', 'P1.g'], ['A.p', 'N1.g'], ['B.p', 'P2.g'], ['B.p', 'N2.g']]},
  explain: 'NMOS in series, PMOS in parallel. Swap the two (PMOS in series, NMOS in parallel) and you get a NOR. That is why NAND2 is the cheapest gate in the library.'};

/* Wednesday: I²C pull-ups */
const T_RISE = {id: 'rise', kind: 'num', unit: 'ns', file: 'i2c_bus.txt', title: 'How fast does the bus rise?',
  intro: '<p>When every chip lets go of an I²C line, the pull-up resistor charges the capacitance of the wires and pins back up to VDD. I²C measures the rise time from 30% to 70% of VDD, which works out to t<sub>r</sub> = 0.85 · R · C.</p>',
  code: 'R_pullup = 4.7 kΩ\nC_bus    = 200 pF\nt_r      = 0.85 · R · C = ____ ns   // standard mode allows 1000 ns',
  ask: 'Type the rise time in ns.', value: 799, tol: 5,
  near: [[940, 'That is R · C. The 30% to 70% rise takes 0.85 of it.'], [.8, 'Right digits, wrong unit: the answer is in nanoseconds.'], [.799, 'Right digits, wrong unit: the answer is in nanoseconds.']],
  hint: 'kΩ × pF = 10³ × 10⁻¹² s = 1 ns. So 4.7 × 200 is already in nanoseconds.',
  answer: '799', explain: '4.7 kΩ × 200 pF = 940 ns, and 0.85 × 940 ≈ 799 ns: under the 1000 ns limit.'};

const T_PULLUP = {id: 'pullup', file: 'evb_i2c.sch', title: 'Pull-ups for the I²C bus', h: 330,
  intro: '<p>Each line needs its own pull-up to VDD. Too big and the line rises too slowly (limit <b>1000 ns</b>, with 200 pF on each line); too small and a pin pulling the line low has to sink too much current (limit <b>3 mA</b>).</p>',
  ask: 'Connect the chip to the sensor, add a pull-up on each line, and pick the values.',
  parts: [
    {id: 'VDD', type: 'vdd', v: 3.3, x: 380, y: 36},
    {id: 'R1', type: 'R', rot: 90, x: 330, y: 125, vals: ohms(470, 1e3, 2.2e3, 4.7e3, 10e3, 47e3), pick: 5},
    {id: 'R2', type: 'R', rot: 90, x: 450, y: 125, vals: ohms(470, 1e3, 2.2e3, 4.7e3, 10e3, 47e3), pick: 5},
    {id: 'MCU', type: 'box', name: 'Timer chip', sub: 'open drain', x: 130, y: 255, w: 130, h: 100, pins: [['SDA', 'r', -20], ['SCL', 'r', 20]], od: ['SDA', 'SCL']},
    {id: 'DEV', type: 'box', name: 'Temp sensor', sub: 'open drain', x: 630, y: 255, w: 130, h: 100, pins: [['SDA', 'l', -20], ['SCL', 'l', 20]], od: ['SDA', 'SCL']}
  ],
  check(c) {
    for (const L of ['SDA', 'SCL']) if (!c.same('MCU.' + L, 'DEV.' + L)) return {msg: 'The chip\'s ' + L + ' and the sensor\'s ' + L + ' are not connected, so they cannot hear each other.'};
    if (c.same('MCU.SDA', 'MCU.SCL')) return {msg: 'SDA and SCL are wired together: data and clock would be the same wire.'};
    const rows = [['Line', 'Released', 'Sink current', 'Rise time']];
    let bad = null;
    ['SDA', 'SCL'].forEach(L => {
      const pin = 'MCU.' + L, hi = c.dc().v(pin), lo = c.dc({}, {on: [pin]}), i = lo.v(pin);
      const tr = i > 1e-9 ? .85 * (hi / i) * 200e-12 : Infinity;
      rows.push([L, fmtV(hi), fmtSI(i, 'A'), tr === Infinity ? 'never' : fmtSI(tr, 's')]);
      if (bad) return;
      if (hi < .05) bad = L + ' floats: when everyone lets go, nothing pulls it up to VDD, so it never reads as 1.';
      else if (hi < .7 * 3.3) bad = 'When everyone lets go, ' + L + ' only reaches ' + fmtV(hi) + '. A 1 needs at least 2.31 V.';
      else if (i > 3.0e-3) bad = 'When a chip pulls ' + L + ' low, it has to sink ' + fmtSI(i, 'A') + ' through the pull-up. An I²C pin is only good for 3 mA: use a bigger resistor.';
      else if (tr > 1000e-9) bad = L + ' takes ' + fmtSI(tr, 's') + ' to rise. Standard-mode I²C allows 1000 ns: use a smaller resistor.';
    });
    return bad ? {msg: bad, rows} : {ok: true, rows};
  },
  hint: 'From the rise time: R ≤ 1000 ns / (0.85 × 200 pF) ≈ 5.9 kΩ. From the current: R ≥ 3.3 V / 3 mA = 1.1 kΩ.',
  answer: {wires: [['VDD.p', 'R1.a'], ['VDD.p', 'R2.a'], ['R1.b', 'MCU.SDA'], ['MCU.SDA', 'DEV.SDA'], ['R2.b', 'MCU.SCL'], ['MCU.SCL', 'DEV.SCL']], vals: {R1: 3, R2: 3}},
  wrong: {wires: [['VDD.p', 'R1.a'], ['VDD.p', 'R2.a'], ['R1.b', 'MCU.SDA'], ['MCU.SDA', 'DEV.SDA'], ['R2.b', 'MCU.SCL'], ['MCU.SCL', 'DEV.SCL']]},
  explain: 'Anything from 1.1 kΩ to 5.9 kΩ works: 2.2 kΩ or 4.7 kΩ here. Faster I²C modes allow less rise time, which is why boards that run them use smaller pull-ups.'};

/* Thursday: a button that bounces */
const T_RC = {id: 'rc', kind: 'num', unit: 'Hz', file: 'debounce.txt', title: 'The cutoff frequency',
  intro: '<p>A resistor in series and a capacitor to ground make a low-pass filter: slow changes, like a real press, get through; fast ones, like bounce, are smoothed away. The boundary is the cutoff frequency f<sub>c</sub> = 1 / (2π · R · C).</p>',
  code: 'R   = 10 kΩ\nC   = 1 µF\nf_c = 1 / (2π · R · C) = ____ Hz',
  ask: 'Type f_c in Hz.', value: 15.92, tol: .25,
  near: [[10, 'That is R · C in milliseconds: the time constant τ. f_c = 1 / (2π · τ).'], [100, 'That is 1 / τ. Divide by 2π as well.'], [.0159, 'Check the units: 10 kΩ × 1 µF = 10⁴ × 10⁻⁶ = 0.01 s.'], [1.59, 'Check the units: 10 kΩ × 1 µF = 10⁴ × 10⁻⁶ = 0.01 s.'], [159, 'Check the units: 10 kΩ × 1 µF = 10⁴ × 10⁻⁶ = 0.01 s.']],
  hint: 'R · C = 10 000 Ω × 0.000 001 F = 0.01 s. Then 1 / (2 × 3.14 × 0.01).',
  answer: '15.9', explain: 'R · C = 10 ms, and 1 / (2π × 10 ms) ≈ 15.9 Hz. A press lasts tens of milliseconds and gets through; bounce flickers at kilohertz and does not.'};

const T_FILTER = {id: 'filter', file: 'evb_button.sch', title: 'Debounce the button', h: 290,
  intro: '<p>Bounce lasts up to 5 ms, so the filter needs a time constant τ = R · C of <b>at least 5 ms</b>. The spec allows a press to reach the timer at most <b>20 ms</b> late.</p>',
  ask: 'Wire the button to the capture pin through a low-pass filter, and pick R and C.',
  parts: [
    {id: 'BTN', type: 'port', name: 'BTN', sub: '3.3 V pressed', side: 'r', x: 100, y: 100, src: 3.3},
    {id: 'R1', type: 'R', rot: 90, x: 290, y: 170, vals: ohms(1e3, 10e3, 100e3)},
    {id: 'C1', type: 'C', rot: 90, x: 470, y: 170, vals: [[10e-9, '10 nF'], [100e-9, '100 nF'], [1e-6, '1 µF']]},
    {id: 'IN', type: 'port', name: 'CAPTURE', sub: 'timer pin', side: 'l', x: 600, y: 100},
    {id: 'GND', type: 'gnd', x: 380, y: 270}
  ],
  check(c) {
    const dc = c.dc().v('IN.p'), H = f => c.ac(f, 'BTN').v('IN.p');
    if (dc < .05) return {msg: 'A steady press never reaches the pin: 0 V. A capacitor blocks a steady voltage, so it cannot sit in the path; the resistor goes in series, the capacitor from the pin to ground.', rows: [['Steady press at the pin', fmtV(dc)]]};
    if (dc < 3) return {msg: 'A steady press only reaches ' + fmtV(dc) + ' at the pin. Nothing should be to ground but the capacitor.', rows: [['Steady press at the pin', fmtV(dc)]]};
    if (H(1e6) > .5) return {msg: 'Nothing is filtered: even a 1 MHz flicker reaches the pin at full size. The capacitor has to go from the pin to ground.', rows: [['Steady press at the pin', fmtV(dc)]]};
    let lo = -3, hi = 6;
    for (let k = 0; k < 60; k++) {const m = (lo + hi) / 2; if (H(Math.pow(10, m)) > Math.SQRT1_2) lo = m; else hi = m}
    const fc = Math.pow(10, lo), tau = 1 / (2 * Math.PI * fc);
    const rows = [['Steady press at the pin', fmtV(dc)], ['Cutoff frequency', fmtSI(fc, 'Hz')], ['Time constant τ', fmtSI(tau, 's')]];
    if (tau < 4.95e-3) return {msg: 'τ is ' + fmtSI(tau, 's') + '. Bounce lasts up to 5 ms, so it still gets through: the filter needs to be slower.', rows};
    if (tau > 20.5e-3) return {msg: 'τ is ' + fmtSI(tau, 's') + '. Every real press reaches the timer that late; the spec allows 20 ms. Make it faster.', rows};
    return {ok: true, rows};
  },
  hint: 'τ = R · C between 5 and 20 ms. For example 10 kΩ × 1 µF = 10 ms.',
  answer: {wires: [['BTN.p', 'R1.a'], ['R1.b', 'IN.p'], ['IN.p', 'C1.a'], ['C1.b', 'GND.p']], vals: {R1: 1, C1: 2}},
  wrong: {wires: [['BTN.p', 'R1.a'], ['R1.b', 'IN.p'], ['IN.p', 'C1.a'], ['C1.b', 'GND.p']]},
  explain: '10 kΩ with 1 µF, or 100 kΩ with 100 nF: both give τ = 10 ms. The timer\'s pin has a Schmitt trigger, so the slow RC edge still switches it cleanly, once.'};

function miniSync(done) {
  quiz('Across the boundary', '<p>The filtered button goes into the chip, and from there into your timer, which runs on PCLK.</p>', [
    {q: 'The capture pin has a Schmitt trigger. Why does that matter after an RC filter?', opts: ['The RC edge rises slowly; a Schmitt trigger has two thresholds, so it switches once instead of chattering near one threshold', 'It makes the signal reach the core faster', 'It protects the pin from static electricity'], ok: 0,
      why: 'A slow edge spends a long time near the threshold, where a little noise makes a plain input flip back and forth. Hysteresis stops that.'},
    {q: 'The button has nothing to do with PCLK. What goes between the pin and the timer\'s logic?', opts: ['Two flip-flops in a row on PCLK: a synchronizer', 'A latch, so the press is not lost', 'Nothing: the RC filter already made it clean'], ok: 0,
      why: 'The press can change right at a PCLK edge and leave the first flip-flop metastable. The second one gives it a whole cycle to settle before the timer uses it.'}
  ], 'sync', done);
}

/* Friday: a gain of three */
const T_GAIN = {id: 'gain', kind: 'num', unit: 'kΩ', file: 'light_sensor.txt', title: 'A gain of three',
  intro: '<p>A non-inverting amplifier: the signal goes into the + input, and a divider from OUT back to the − input sets the gain. The op-amp moves OUT until both inputs are equal, so G = 1 + Rf / Rg (Rf from OUT to the − input, Rg from the − input to ground).</p>',
  code: 'sensor = 0 … 0.4 V\nADC    = 0 … 1.2 V    // so G = 3\nRg     = 10 kΩ\nRf     = ____ kΩ',
  ask: 'Type Rf in kΩ.', value: 20, tol: .3,
  near: [[30, 'Then Rf / Rg = 3, and G = 1 + 3 = 4. Do not forget the 1.'], [5, 'That gives G = 1 + 5 / 10 = 1.5. Rf is the bigger one.'], [3.33, 'That would be for G = 1 + Rg / Rf. Rf is on top: G = 1 + Rf / Rg.']],
  hint: '3 = 1 + Rf / 10 kΩ, so Rf / 10 kΩ = 2.',
  answer: '20', explain: 'G = 1 + 20 / 10 = 3: 0.4 V in, 1.2 V out, the whole ADC range.'};

const T_AMP = {id: 'amp', file: 'evb_light.sch', title: 'The light sensor amplifier', h: 320,
  intro: '<p>The op-amp runs from 0 to 3.3 V, so OUT cannot go below 0 V or above 3.3 V. With the right feedback, OUT = 3 × VIN for every input.</p>',
  ask: 'Wire a non-inverting amplifier with a gain of 3, and pick the resistors.',
  parts: [
    {id: 'VIN', type: 'port', name: 'VIN', sub: 'sensor 0–0.4 V', side: 'r', x: 110, y: 140, src: .25},
    {id: 'U1', type: 'opamp', x: 380, y: 120},
    {id: 'OUT', type: 'port', name: 'OUT', sub: 'to the ADC', side: 'l', x: 640, y: 120},
    {id: 'R1', type: 'R', x: 470, y: 240, vals: ohms(4.7e3, 10e3, 20e3, 47e3)},
    {id: 'R2', type: 'R', rot: 90, x: 240, y: 230, vals: ohms(4.7e3, 10e3, 20e3, 47e3)},
    {id: 'GND', type: 'gnd', x: 330, y: 300}
  ],
  check(c) {
    /* Which input follows the output? Drive OUT with 1 V, everything else at 0 V: the − input must move more than the + input */
    const f = c.dc({}, {force: {U1: 1}, zero: true}), d = f.v('U1.p') - f.v('U1.m');
    if (d > 1e-6) return {msg: 'The feedback goes to the + input. Any noise grows until OUT slams into a rail: that is a comparator, not an amplifier. Feedback goes to the − input.'};
    if (d > -1e-6) return {msg: 'Nothing feeds OUT back to the − input. With a gain of 100 000 and no feedback, OUT just slams into 0 V or 3.3 V.'};
    const rows = [['VIN', 'OUT should be', 'Your OUT']];
    let bad = null;
    [.1, .25, .4].forEach(vin => {
      const raw = c.dc({VIN: vin}).v('OUT.p'), out = Math.min(3.3, Math.max(0, raw)), want = 3 * vin;
      rows.push([fmtV(vin), fmtV(want), fmtV(out)]);
      if (!bad && Math.abs(out - want) > .02 * want + .002)
        bad = 'For VIN = ' + fmtV(vin) + ', OUT should be ' + fmtV(want) + '; yours is ' + fmtV(out) + '.'
          + (raw < -.005 ? ' It wants to go to ' + fmtV(raw) + ', but this op-amp cannot go below 0 V: that is an inverting amplifier.' : raw > 3.305 ? ' It hits the 3.3 V rail.' : '');
    });
    return bad ? {msg: bad, rows} : {ok: true, rows};
  },
  hint: 'VIN to the + input. One resistor from OUT to the − input (Rf), the other from the − input to GND (Rg), with Rf twice Rg.',
  answer: {wires: [['VIN.p', 'U1.p'], ['U1.o', 'OUT.p'], ['U1.o', 'R1.b'], ['R1.a', 'U1.m'], ['U1.m', 'R2.a'], ['R2.b', 'GND.p']], vals: {R1: 2, R2: 1}},
  wrong: {wires: [['VIN.p', 'U1.p'], ['U1.o', 'OUT.p'], ['U1.o', 'R1.b'], ['R1.a', 'U1.m'], ['U1.m', 'R2.a'], ['R2.b', 'GND.p']]},
  explain: 'Rf = 20 kΩ from OUT to the − input, Rg = 10 kΩ to ground: G = 1 + 20 / 10 = 3. The op-amp holds the − input at VIN, so OUT has to be three times higher.'};
