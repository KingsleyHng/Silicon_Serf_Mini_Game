/* Silicon Serf: week 5, layout and tape-out, with SYP. Two more kinds of mini-game live here: a floorplan (floorTask) and a DRC hunt (drcTask).
   The others use codeTask, quiz (minis.js), wireTask (circuit.js) and atpgTask (dft.js).

   floorTask(t, done)                       put the blocks of a chip into a grid of spaces, keeping the bundles of wires short
     t.id, t.title, t.intro, t.ask, t.file, t.h (board height; the board is 760 wide)
     t.cols, t.rows   the grid;  t.x0, t.y0, t.cell [w, h]  where it is drawn
     t.blocks [{id, name, sub, color, macro: true (must touch an edge), corner: true (must sit in a corner)}, …]
     t.pins   {id: {name, c: [col, row]}} pins on the edge (a column of -1 or t.cols is just outside the grid)
     t.nets   [[from, to, weight, what], …] wire length = weight × the spaces between them (across plus down)
     t.apart  [[a, b, msg], …] blocks that must not touch, not even at a corner
     t.slack  how far over the best possible wire length still passes;  t.answer, t.wrong {block: 'col,row'}
     Points: 3 when it passes on the first Check, 2 on the second, 1 on the third; "Show answer" appears after three.

   drcTask(t, done)                         mark which spots of a zoomed-in layout break the rules
     t.shapes [[layer 'm1' | 'm2', x, y, w, h], …], t.vias [[x, y], …], t.nets [[x, y, name], …] labels, t.rules (HTML)
     t.spots  [{id, at: [x, y], dim: what is written next to it, bad: true for a violation, why}, …]
     t.wrong  spots that are all fine (tools/test.js marks them)
     Points: one per violation marked, minus one per fine spot marked, never below 0. One Check. */

/* Monday: what layout is */
function miniPdWhy(done) {
  quiz('From netlist to layout', '<p>Synthesis turned your RTL into a netlist. Layout turns the netlist into shapes on silicon.</p>', [
    {q: 'JJY handed SYP the netlist of the chip, your block inside it: fourteen thousand cells and the wires between them. What does the netlist <b>not</b> say?',
      opts: ['Where each cell sits on the silicon, and which path each wire takes through which metal layer', 'Which cells there are', 'Which cell connects to which'], ok: 0,
      why: 'A netlist is who connects to whom. Layout decides where: an address for every cell, a route for every wire.'},
    {q: 'In what order does SYP work?',
      opts: ['Route the wires, place the cells, then build the clock tree', 'Floorplan, place the cells, build the clock tree, route the wires, run the checks', 'Place the cells, run the checks, then floorplan'], ok: 1,
      why: 'Big decisions first: the outline and the big blocks, then the cells, then the clock that reaches them all, then the wires. Each step leaves room for the next.'}
  ], 'pdwhy', done);
}
const T_CORE = {id: 'core', kind: 'num', unit: 'µm', file: 'floorplan.tcl', title: 'How big is the core?',
  intro: '<p>The <b>core</b> is the part of the chip where the standard cells go. It cannot be packed full: the wires need room, and so do the buffers the tools add later. <b>Utilisation</b> is how much of the core the cells fill.</p>',
  code: 'standard cells      12 000 µm²   (the whole chip, from synthesis)\ntarget utilisation  70 %\ncore shape          square\n\ncore side = ____ µm',
  ask: 'Type the side of the core in µm.', value: 130.93, tol: .5,
  near: [[109.54, 'That is the square root of 12 000: a core packed 100% full, with no room for a single wire. Divide by the utilisation first.'],
    [17142.86, 'That is the area of the core. The question asks for its side: take the square root.'],
    [91.65, 'You multiplied by 0.7. The cells fill 70% of the core, so the core is bigger than the cells: divide.'],
    [8400, 'You multiplied by 0.7. The cells fill 70% of the core, so the core is bigger than the cells: divide.']],
  hint: 'Core area = cell area / utilisation. A square of that area has a side of √area.',
  answer: '131', explain: '12 000 / 0.7 ≈ 17 143 µm², and √17 143 ≈ 131 µm. The whole digital core is smaller than a grain of salt.'};

/* Tuesday: the floorplan, then what layout thinks of your RTL */
const T_FLOOR = {id: 'floor', file: 'floorplan.def', title: 'Floorplan', h: 300, cols: 4, rows: 3, x0: 150, y0: 36, cell: [115, 76],
  intro: '<p>The core of the chip as twelve spaces. Five blocks go in; the empty spaces fill with standard cells and wires. Each line between two blocks is a bundle of wires: the thicker the line, the more wires, and a bundle that has to cross two spaces costs twice the wire of one that crosses one.</p>',
  ask: 'Click a block, then a space to put it there; click a placed block to move it. Keep the total wire at or under SYP\'s target and follow the two rules: the SRAM touches an edge, and the ADC sits in a corner, not next to the CPU. Then Check.',
  blocks: [
    {id: 'CPU', name: 'CPU', color: '#3b6fa8'},
    {id: 'SRAM', name: 'SRAM', sub: 'macro', color: '#6a4b9e', macro: true},
    {id: 'REGS', name: 'apb_regs', sub: 'your block', color: '#a87a12'},
    {id: 'TIMER', name: 'Timer', color: '#2b7a4e'},
    {id: 'ADC', name: 'ADC', sub: 'analog', color: '#13706f', corner: true}
  ],
  pins: {PWM: {name: 'PWM pins', c: [4, 1]}, AIN: {name: 'ADC_IN pin', c: [-1, 2]}},
  nets: [['CPU', 'SRAM', 4, 'a 32-bit bus, busy every cycle'], ['REGS', 'TIMER', 3, 'CTRL, the counter, the capture'], ['TIMER', 'PWM', 2, 'the timer outputs'],
    ['ADC', 'AIN', 2, 'the analog input'], ['CPU', 'REGS', 1, 'APB'], ['ADC', 'CPU', 1, 'the ADC results']],
  apart: [['ADC', 'CPU', 'The ADC touches the CPU (a corner counts). The CPU switches millions of times a second, and that noise couples straight into the analog: move them apart.']],
  slack: 2,
  answer: {SRAM: '0,0', CPU: '1,0', REGS: '2,1', TIMER: '3,1', ADC: '0,2'},
  wrong: {SRAM: '1,1', CPU: '2,1', REGS: '2,0', TIMER: '3,0', ADC: '0,0'}};
function floorTask(t, done) {
  const at = {}, by = id => t.blocks.find(b => b.id === id), [CW, CH] = t.cell;
  let sel = null, runs = 0, over = false;
  PTS()[t.id] = 0;
  const cell = k => t.pins[k] ? t.pins[k].c : at[k], dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const wire = p => t.nets.reduce((n, [a, b, w]) => {const A = t.pins[a] ? t.pins[a].c : p[a], B = t.pins[b] ? t.pins[b].c : p[b]; return A && B ? n + w * dist(A, B) : n}, 0);
  const edge = c => c[0] === 0 || c[0] === t.cols - 1 || c[1] === 0 || c[1] === t.rows - 1, corner = c => (c[0] === 0 || c[0] === t.cols - 1) && (c[1] === 0 || c[1] === t.rows - 1);
  /* The first rule a placement breaks, as a sentence (or null) */
  const broken = p => {
    for (const b of t.blocks) {
      if (b.macro && !edge(p[b.id])) return 'The ' + b.name + ' sits in the middle. A macro is solid: no wire can cross it, so every bundle has to go the long way round. Put it against an edge of the core.';
      if (b.corner && !corner(p[b.id])) return 'The ' + b.name + ' is not in a corner. Analog goes in a corner: the quietest place in the chip, with the fewest neighbours.';
    }
    for (const [a, b, msg] of t.apart) if (Math.max(Math.abs(p[a][0] - p[b][0]), Math.abs(p[a][1] - p[b][1])) < 2) return msg;
    return null;
  };
  /* The best wire length that keeps every rule, by trying every placement (12 × 11 × 10 × 9 × 8: quick) */
  const best = (() => {
    const slots = [], ids = t.blocks.map(b => b.id), p = {};
    for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) slots.push([c, r]);
    let m = Infinity;
    const go = (i, used) => {
      if (i === ids.length) {if (!broken(p)) m = Math.min(m, wire(p)); return}
      slots.forEach((s, j) => {if (!(used & 1 << j)) {p[ids[i]] = s; go(i + 1, used | 1 << j)}});
    };
    go(0, 0); return m;
  })(), target = best + t.slack;
  const centre = c => [t.x0 + (c[0] + .5) * CW, t.y0 + (c[1] + .5) * CH];
  const pinAt = c => [c[0] < 0 ? t.x0 : c[0] >= t.cols ? t.x0 + t.cols * CW : centre(c)[0], c[1] < 0 ? t.y0 : c[1] >= t.rows ? t.y0 + t.rows * CH : centre(c)[1]];
  const draw = () => {
    const W0 = t.cols * CW, H0 = t.rows * CH;
    let s = '<rect class="fp-core" x="' + t.x0 + '" y="' + t.y0 + '" width="' + W0 + '" height="' + H0 + '"/>';
    for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++)
      s += '<rect class="fp-slot" tabindex="0" role="button" aria-label="Space ' + (c + 1) + ' across, ' + (r + 1) + ' down" data-slot="' + c + ',' + r + '" x="' + (t.x0 + c * CW + 4) + '" y="' + (t.y0 + r * CH + 4) + '" width="' + (CW - 8) + '" height="' + (CH - 8) + '"/>';
    Object.keys(t.pins).forEach(k => {
      const P = t.pins[k], [x, y] = pinAt(P.c), right = P.c[0] >= t.cols;
      s += '<rect class="fp-pin" x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12"/><text class="pinname" x="' + (right ? x + 12 : x - 12) + '" y="' + (y + 4) + '" text-anchor="' + (right ? 'start' : 'end') + '">' + P.name + '</text>';
    });
    /* The blocks, then the bundles as straight "fly lines" (the way layout tools draw them before routing), then the names on top */
    let names = '';
    t.blocks.forEach(b => {
      if (!at[b.id]) return;
      const x = t.x0 + at[b.id][0] * CW, y = t.y0 + at[b.id][1] * CH;
      s += '<g class="fp-blk' + (sel === b.id ? ' sel' : '') + '"><rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (CW - 12) + '" height="' + (CH - 12) + '" style="fill:' + b.color + '"/></g>';
      names += '<g class="fp-name"><text class="lbl" x="' + (x + CW / 2) + '" y="' + (y + CH / 2 - (b.sub ? 2 : -4)) + '" text-anchor="middle">' + b.name + '</text>'
        + (b.sub ? '<text class="sub" x="' + (x + CW / 2) + '" y="' + (y + CH / 2 + 14) + '" text-anchor="middle">' + b.sub + '</text>' : '') + '</g>';
    });
    t.nets.forEach(([a, b, w]) => {
      const A = cell(a), B = cell(b); if (!A || !B) return;
      const [x1, y1] = t.pins[a] ? pinAt(A) : centre(A), [x2, y2] = t.pins[b] ? pinAt(B) : centre(B);
      s += '<line class="fly" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" style="stroke-width:' + (1 + w * 1.6) + '"/>';
    });
    s += names;
    $('.wb-box').innerHTML = '<svg viewBox="0 0 760 ' + t.h + '" role="img" aria-label="' + esc(t.title) + '">' + s + '</svg>';
    $$('.fp-slot').forEach(r => {r.onclick = () => put(r.dataset.slot); r.onkeydown = e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); put(r.dataset.slot)}}});
    $$('.fp-pick').forEach(b => {const on = sel === b.dataset.blk; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('placed', !!at[b.dataset.blk])});
    const all = t.blocks.every(b => at[b.id]);
    $('#fpWire').innerHTML = 'Wire: <b>' + wire(at) + '</b>' + (all ? '' : ' so far') + ' · SYP\'s target: ≤ ' + target;
  };
  /* A click on a space: put the chosen block there (a block already there swaps places with it), or pick up the block that is there */
  const put = key => {
    if (over) return;
    const c = key.split(',').map(Number), here = t.blocks.find(b => at[b.id] && at[b.id][0] === c[0] && at[b.id][1] === c[1]);
    if (sel) {if (here && here.id !== sel) {if (at[sel]) at[here.id] = at[sel]; else delete at[here.id]} at[sel] = c; sel = null}
    else if (here) sel = here.id;
    SFX.blip(); $('#fb').innerHTML = ''; draw();
  };
  const finish = (pts, how) => {
    over = true; PTS()[t.id] = pts; sel = null; draw();
    $('#fpRun').disabled = true; $$('.fp-pick').forEach(b => b.disabled = true); $('#runs').textContent = '';
    $('#fb').innerHTML = how;
    $('#taskEnd').innerHTML = nextBtn('Done');
    $('#next').onclick = () => {hidePanel(); done()};
  };
  setPanel('<div class="task fp-task" data-task="' + t.id + '" data-wrong="' + esc(JSON.stringify(t.wrong)).replace(/"/g, '&quot;') + '">' + t.intro
    + '<ul class="fine fp-nets">' + t.nets.map(([a, b, w, what]) => '<li><b>' + (by(a) || t.pins[a]).name + ' – ' + (by(b) || t.pins[b]).name + '</b> × ' + w + ': ' + what + '</li>').join('') + '</ul>'
    + '<p>' + t.ask + '</p>'
    + '<div class="row fp-picks">' + t.blocks.map(b => '<button class="btn fp-pick" type="button" data-blk="' + b.id + '" style="--blk:' + b.color + '">' + b.name + '</button>').join('') + '</div>'
    + '<div class="wb"><div class="ed-bar"><span>' + t.file + '</span><span id="fpWire"></span></div><div class="wb-box"></div></div>'
    + '<div class="row"><button class="btn btn-primary" id="fpRun" type="button">Check</button><span class="fine" id="runs"></span></div>'
    + '<div id="fb" class="fb" aria-live="polite"></div><div id="taskEnd"></div></div>', t.title);
  $$('.fp-pick').forEach(b => b.onclick = () => {if (over) return; sel = sel === b.dataset.blk ? null : b.dataset.blk; SFX.blip(); draw()});
  $('#fpRun').onclick = () => {
    if (over) return;
    const left = t.blocks.filter(b => !at[b.id]);
    if (left.length) {$('#fb').innerHTML = '<p class="fb-bad">Place every block first: ' + left.map(b => b.name).join(', ') + (left.length > 1 ? ' are' : ' is') + ' still waiting.</p>'; return}
    runs++;
    const why = broken(at), w = wire(at);
    if (!why && w <= target) {
      SFX.ok();
      finish(runs <= 3 ? 4 - runs : 0, '<p class="fb-ok">✓ A floorplan SYP can work with: wire ' + w + (w === best ? ', as short as it gets.' : ', within the target.') + (runs > 1 ? ' (check ' + runs + ')' : '') + '</p>');
      return;
    }
    SFX.blip();
    const heavy = t.nets.slice().sort((a, b) => b[2] * dist(cell(b[0]), cell(b[1])) - a[2] * dist(cell(a[0]), cell(a[1])))[0];
    $('#fb').innerHTML = '<p class="fb-bad">✗ ' + (why || 'Every rule kept, but the wire comes to ' + w + ' and the target is ' + target + '. The costliest bundle now: '
      + (by(heavy[0]) || t.pins[heavy[0]]).name + ' – ' + (by(heavy[1]) || t.pins[heavy[1]]).name + ', ' + heavy[2] + ' × ' + dist(cell(heavy[0]), cell(heavy[1])) + '.') + '</p>'
      + '<p class="fine"><b>Hint:</b> Start with the thickest line: the SRAM in a corner with the CPU right beside it. Then your block next to the timer, and the timer next to its pins.</p>';
    $('#runs').textContent = runs < 3 ? (4 - runs - 1) + (runs === 2 ? ' point' : ' points') + ' left' : '';
    if (runs >= 3 && !$('#reveal')) {
      $('#taskEnd').innerHTML = '<div class="row end"><button class="btn" id="reveal" type="button">Show answer</button></div>';
      $('#reveal').onclick = () => {Object.keys(t.answer).forEach(k => at[k] = t.answer[k].split(',').map(Number)); finish(0, '<p class="fb-ans">One good floorplan is on the board now: wire ' + wire(at) + '.</p>')};
    }
  };
  draw();
}

/* Tuesday: SYP's placement notes on your RTL */
function miniPdRtl(done) {
  quiz('Notes from placement', '<p>Two comments from SYP\'s placement report, both about signals from your block.</p>', [
    {q: '"rst_n drives 2 000 flip-flops, all over the chip." Why does layout care?',
      opts: ['It does not: a reset is just one wire', 'Resets are not allowed in layout', 'One wire cannot drive 2 000 inputs in time, so the tool builds a tree of buffers out to every corner of the block'], ok: 2,
      why: 'High fanout means a buffer tree, and a buffer tree costs area, power and time. Expected for a reset and a clock; expensive when it is an accident.'},
    {q: '"timer_cmp → adc_trig: 3 mm of wire. Met timing after synthesis, fails after placement." Why?',
      opts: ['After synthesis the tools can only guess wire delays. Placed, the wire is real: 3 mm of it adds real delay', 'Synthesis made a mistake', 'Placement made the logic bigger'], ok: 0,
      why: 'Wire delay only becomes real after placement and routing. That is why timing is signed off again on the layout, and why blocks that talk a lot should sit close.'}
  ], 'pdrtl', done);
}

/* Wednesday: the clock tree, and what skew does to your slack */
const T_SKEW = {id: 'skew', kind: 'num', unit: 'ns', file: 'timing_post_cts.rpt', title: 'Setup slack with a real clock',
  intro: '<p>In week 2 the clock was ideal: every flip-flop got the edge at the same moment. After clock tree synthesis it is real, and reaches each flop a little later, some more than others.</p>',
  code: 'clock period            5.00 ns\nclock arrives at FF1    1.20 ns   (launch)\nclock arrives at FF2    1.05 ns   (capture)\ndata path FF1 → FF2     4.60 ns   (clock-to-Q and logic)\nsetup time of FF2       0.10 ns\n\nsetup slack = ____ ns',
  ask: 'Type the setup slack in ns.', value: .15, tol: .005,
  near: [[.3, 'That is the slack with an ideal clock. The clock reaches FF1 at 1.20 ns and FF2 at 1.05 ns: put both in.'],
    [.45, 'The skew is the wrong way round. The data leaves when the clock reaches FF1 (1.20) and must arrive before the clock reaches FF2 (5.00 + 1.05).'],
    [.25, 'The setup time is needed before the capture edge: take it off the required time.'],
    [-.15, 'Check the sign. Slack = required time − arrival time.']],
  hint: 'The data arrives at 1.20 + 4.60. It is required by the next edge at FF2: 5.00 + 1.05, minus the setup time. Slack = required − arrival.',
  answer: '0.15', explain: 'Required 5.00 + 1.05 − 0.10 = 5.95 ns, arrival 1.20 + 4.60 = 5.80 ns. The capture clock came 0.15 ns early and took exactly that off the 0.30 ns you had with an ideal clock.'};

/* Thursday: the rules for shapes, and the voltage that reaches your block */
const T_DRC = {id: 'drc', file: 'apb_regs.gds  (zoomed in)', title: 'Design rule check', h: 320,
  intro: '<p>Two metal layers: <b class="m1">M1</b> runs left to right, <b class="m2">M2</b> up and down. Where a wire changes layer there is a <b>via</b>, the small square. Each wire is labelled with its net.</p>',
  rules: '<table class="kv drc-rules"><tr><th>Width</th><td>every M1 and M2 wire at least <b>0.10 µm</b></td></tr><tr><th>Spacing</th><td>wires of different nets on the same layer at least <b>0.10 µm</b> apart</td></tr><tr><th>Connection</th><td>two layers are joined only where there is a via</td></tr></table>',
  ask: 'Mark every spot that is wrong (click a letter to mark it, again to clear), then Check. A fine spot marked costs a point.',
  shapes: [['m1', 40, 56, 620, 16], ['m1', 40, 83, 270, 16], ['m1', 360, 170, 170, 16], ['m1', 530, 173, 60, 10], ['m1', 590, 170, 78, 16], ['m1', 190, 240, 330, 16],
    ['m2', 120, 28, 16, 270], ['m2', 250, 130, 16, 168], ['m2', 285, 130, 16, 168], ['m2', 652, 120, 16, 178], ['m2', 440, 28, 16, 110]],
  vias: [[258, 248]],
  nets: [[668, 68, 'a'], [318, 95, 'b'], [366, 164, 'n12'], [528, 252, 'd'], [140, 296, 'c'], [254, 126, 'd'], [289, 126, 'e'], [672, 296, 'n12'], [460, 40, 'g']],
  spots: [
    {id: 'A', at: [200, 77.5], dim: '0.07', bad: true, why: 'M1 spacing 0.07 µm, under 0.10: nets a and b are too close. The factory could print them touching: a short.'},
    {id: 'B', at: [128, 200], dim: '0.10', bad: false, why: 'M2 width exactly 0.10 µm. The rule says at least 0.10, so this passes.'},
    {id: 'C', at: [560, 178], dim: '0.06', bad: true, why: 'M1 narrowed to 0.06 µm, under 0.10: a wire this thin may print broken: an open.'},
    {id: 'D', at: [660, 178], dim: 'no via', bad: true, why: 'Net n12 on M1 ends right under net n12 on M2, but with no via they are not joined: an open.'},
    {id: 'E', at: [293, 248], dim: 'd × e', bad: false, why: 'Net d on M1 crosses net e on M2 without a via. That is fine: the layers are insulated, and wires cross like this millions of times.'},
    {id: 'F', at: [275.5, 190], dim: '0.12', bad: false, why: 'M2 spacing 0.12 µm, more than 0.10: fine.'}
  ],
  wrong: 'B,E,F'};
function drcTask(t, done) {
  const on = {};
  let over = false;
  PTS()[t.id] = 0;
  const draw = () => {
    let s = t.shapes.map(([l, x, y, w, h]) => '<rect class="' + l + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>').join('');
    s += t.vias.map(([x, y]) => '<rect class="via" x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12"/><path class="via-x" d="M' + (x - 4) + ' ' + (y - 4) + 'l8 8m0-8l-8 8"/>').join('');
    s += t.nets.map(([x, y, n]) => '<text class="sub" x="' + x + '" y="' + y + '">' + n + '</text>').join('');
    s += t.spots.map(p => {
      const st = over ? (p.bad ? (on[p.id] ? ' hit' : ' miss') : on[p.id] ? ' false' : ' fine') : on[p.id] ? ' on' : '', [x, y] = p.at;
      return '<g class="drc-spot' + st + '" data-spot="' + p.id + '" tabindex="' + (over ? -1 : 0) + '" role="button" aria-pressed="' + !!on[p.id] + '" aria-label="Spot ' + p.id + ', ' + p.dim + '">'
        + '<circle class="ring" cx="' + x + '" cy="' + y + '" r="14"/><circle class="tag" cx="' + (x - 20) + '" cy="' + (y - 20) + '" r="10"/>'
        + '<text class="lbl" x="' + (x - 20) + '" y="' + (y - 16) + '" text-anchor="middle">' + p.id + '</text>'
        + '<text class="val" x="' + (x + 18) + '" y="' + (y - 14) + '">' + p.dim + '</text></g>';
    }).join('');
    $('.wb-box').innerHTML = '<svg viewBox="0 0 760 ' + t.h + '" role="img" aria-label="' + esc(t.title) + '">' + s + '</svg>';
    if (!over) $$('.drc-spot').forEach(g => {
      const flip = () => {on[g.dataset.spot] = !on[g.dataset.spot]; SFX.blip(); draw()};
      g.onclick = flip; g.onkeydown = e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); flip()}};
    });
  };
  setPanel('<div class="task drc-task" data-task="' + t.id + '" data-wrong="' + t.wrong + '">' + t.intro + t.rules + '<p>' + t.ask + '</p>'
    + '<div class="wb"><div class="ed-bar"><span>' + t.file + '</span><span>Widths and gaps in µm</span></div><div class="wb-box"></div></div>'
    + '<div class="row"><button class="btn btn-primary" id="drcRun" type="button">Check</button></div>'
    + '<div id="fb" class="fb" aria-live="polite"></div><div id="taskEnd"></div></div>', t.title);
  $('#drcRun').onclick = () => {
    if (over) return;
    if (!t.spots.some(p => on[p.id])) {$('#fb').innerHTML = '<p class="fb-bad">Mark at least one spot first.</p>'; return}
    over = true;
    const hit = t.spots.filter(p => p.bad && on[p.id]).length, bad = t.spots.filter(p => p.bad).length, fa = t.spots.filter(p => !p.bad && on[p.id]).length, pts = Math.max(0, hit - fa);
    PTS()[t.id] = pts; if (hit === bad && !fa) SFX.ok(); else SFX.blip();
    draw(); $('#drcRun').disabled = true;
    $('#fb').innerHTML = '<p class="' + (hit === bad && !fa ? 'fb-ok">✓ All ' + bad + ' violations found, no false alarms.' : 'fb-bad">' + hit + ' of ' + bad + ' violations found' + (fa ? ', ' + fa + ' fine spot' + (fa > 1 ? 's' : '') + ' marked' : '') + '.') + '</p>'
      + '<ul class="drc-why">' + t.spots.map(p => '<li><b>' + p.id + '</b> ' + (p.bad ? (on[p.id] ? '✓ ' : '✗ missed: ') : on[p.id] ? '✗ fine: ' : '✓ ') + p.why + '</li>').join('') + '</ul>';
    $('#taskEnd').innerHTML = nextBtn('Done');
    $('#next').onclick = () => {hidePanel(); done()};
  };
  draw();
}
const T_IR = {id: 'ir', kind: 'num', unit: 'V', file: 'power_grid.txt', title: 'IR drop',
  intro: '<p>Every gate in the timer draws its current from the supply pads, through metal straps. Metal has a little resistance, so the voltage that reaches the block is a little lower than at the pad. The drop is current × resistance: <b>IR drop</b>.</p>',
  code: 'supply at the pad              0.90 V\ncurrent of the timer           5 mA\nstrap resistance, pad → timer  4 Ω\n\nvoltage at the timer = ____ V',
  ask: 'Type the voltage at the timer in V.', value: .88, tol: .002,
  near: [[.02, 'That is the drop, I × R. The timer gets the supply minus the drop.'], [.92, 'The drop takes voltage away: subtract it.'],
    [20, '20 is the drop in millivolts. The question asks for the voltage at the timer, in volts.'], [-19.1, '5 mA is 0.005 A: the drop is 0.005 × 4 V.'],
    [880, 'Right digits, but in millivolts. Type it in volts.']],
  hint: 'Drop = 0.005 A × 4 Ω. Then the timer sees 0.90 V minus the drop.',
  answer: '0.88', explain: 'A 20 mV drop: about 2% of the supply. Sign-off usually allows 5%. Past that the gates slow down, and the timing JJY signed off is no longer true.'};

/* Friday: the last checks before the factory */
function miniTapeout(done) {
  quiz('Before tape-out', '<p>Three questions SYP gets asked at every tape-out.</p>', [
    {q: 'DRC is clean. Then LVS fails: <code>net n812: 1 net in the netlist, 2 in the layout</code>. What happened?',
      opts: ['A spacing rule is broken', 'The layout is too slow', 'Somewhere a wire that should be one net is cut in two: the layout no longer matches the netlist'], ok: 2,
      why: 'LVS, layout versus schematic, rebuilds the circuit from the shapes and compares it with the netlist. DRC asks: can the factory make it? LVS asks: is it the circuit we meant?'},
    {q: 'WSL\'s amplifier needs R1 and R2 in a ratio of exactly 1 : 2. On silicon every resistor comes out a few % off, more on one side of the chip than the other. How does SYP draw them?',
      opts: ['Split both into equal unit pieces and interleave them around one centre, so a drift across the chip shifts both the same way', 'As far apart as possible, so they cannot disturb each other', 'As large as possible'], ok: 0,
      why: 'Common-centroid layout. The values drift; the ratio holds. Most of analog layout is about matching.'},
    {q: 'A week after tape-out SKG finds one inverted bit in your block. The transistor layers are already in the factory. What is the cheapest fix?',
      opts: ['A new tape-out, from the RTL', 'A metal-only ECO: wire in some of the spare gates SYP scattered over the block, changing only the upper metal masks', 'Write it in the datasheet'], ok: 1,
      why: 'Spare cells cost a little area and can save millions. A few metal masks cost weeks; a full set costs months.'}
  ], 'tapeout', done);
}
