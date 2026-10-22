/* Silicon Serf: week 4, design for test, with JJH. A fourth kind of mini-game lives here: find the test for a fault (atpgTask).
   The others use codeTask, quiz (minis.js) and wireTask (circuit.js).

   atpgTask(t, done)                        set the inputs of a small gate circuit, then "Apply": a good chip and a chip with one fault both run it
     t.id, t.title, t.intro, t.ask, t.file, t.h (board height; the board is 760 wide)
     t.ins    the inputs, in order ['A', 'B', …];  t.gates [[net, 'and' | 'or', [in, in]], …] in order;  t.out the output net
     t.svg    the drawing (gates and wires; the inputs' names are drawn here too), t.at {net: [x, y]} where each net's values go
     t.faults [{net, sa: 0 or 1, at: [x, y] for the red cross, answer: {input: 0 or 1}, hint}, …] one after another
     t.wrong  an input pattern (a string like '0000') that catches none of the faults (tools/test.js applies it)
     Points: 1 per fault caught on the first or second apply; "Show answer" appears after three. */

/* Monday: what can go wrong in a chip that was designed right */
function miniDftWhy(done) {
  quiz('Why test every chip', '<p>A design can be perfect and a chip made from it still broken: the factory is not.</p>', [
    {q: 'A speck of dust connects one wire inside chip #417 to ground. Whatever the logic tries to drive, that wire now reads 0. In the stuck-at model this is…',
      opts: ['A stuck-at-0 fault on that wire', 'A stuck-at-1 fault on that wire', 'A timing violation'], ok: 0,
      why: 'Stuck-at-0: the wire behaves as if it were tied to 0. Real defects are messier, but tests that catch every stuck-at fault catch most of them.'},
    {q: "SKG's regression passed 48 out of 48. Why test the chips again after they are made?",
      opts: ['In case the regression missed a bug', 'Verification proves the design is right; test checks that each chip was made right', 'Only to give the customer a report'], ok: 1,
      why: 'Verification runs once, on the design. Test runs on every single chip, because defects are random and any chip can have one.'}
  ], 'dftwhy', done);
}
const T_SCANFF = {id: 'scanff', kind: 'expr', file: 'scan_dff.v', title: 'A scan flip-flop',
  intro: '<p>For test, every flip-flop in the chip becomes a <b>scan flip-flop</b>: a normal flop with a 2-to-1 mux in front of it. When <code>se</code> (scan enable) is 1, the flop takes <code>si</code> (scan in) from the flop before it. When <code>se</code> is 0, it takes <code>d</code> from the logic, as always.</p>',
  code: 'always @(posedge clk)\n  q <= ____;',
  ask: 'Type the next value of q.',
  sigs: {se: {w: 1}, si: {w: 1}, d: {w: 1}, q: {w: 1}}, w: 1, lhs: 'q',
  ref: 'se ? si : d', answer: 'se ? si : d',
  hint: 'A 2-to-1 mux fits in one line: condition ? the value when it is 1 : the value when it is 0.',
  explain: 'Chain these together, the q of one into the si of the next, and whenever se is 1 the whole chip becomes one long shift register.'};

/* Tuesday: chain the flops, then count what a test costs */
const SFF = ['SFF1', 'SFF2', 'SFF3', 'SFF4'];
const T_SCAN = {id: 'scan', file: 'scan_chain.sch', title: 'A scan chain', h: 320,
  intro: '<p>Four scan flip-flops. Their D inputs already come from the logic; what is missing is the test wiring. In shift mode the tester puts one bit per clock on SCAN_IN and reads one bit per clock from SCAN_OUT.</p>',
  ask: 'Chain the flops from SCAN_IN to SCAN_OUT, and give every flop the scan enable. Then Run: the tester shifts a pattern through.',
  parts: [
    {id: 'SCAN_IN', type: 'port', name: 'SCAN_IN', sub: 'from the tester', side: 'r', in: true, x: 98, y: 120},
    {id: 'SE', type: 'port', name: 'SE', sub: 'scan enable', side: 'r', in: true, x: 98, y: 280},
    {id: 'SCAN_OUT', type: 'port', name: 'SCAN_OUT', sub: 'to the tester', side: 'l', x: 640, y: 280}
  ].concat(SFF.map((id, i) => ({id, type: 'box', name: id, sub: 'D ← logic', w: 70, h: 120, x: 190 + i * 150, y: 150, pins: [['SI', 'l', -30], ['SE', 'l', 30], ['Q', 'r', -30]]}))),
  check(c) {
    const noSE = SFF.filter(f => !c.same(f + '.SE', 'SE.p'));
    if (noSE.length) return {msg: noSE.join(' and ') + (noSE.length > 1 ? ' do' : ' does') + ' not get the scan enable. When SE goes to 1 to shift, ' + (noSE.length > 1 ? 'they' : 'it') + ' would keep taking D from the logic, and the chain would break there.'};
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
      if (c.same(SFF[i] + '.Q', SFF[j] + '.Q')) return {msg: 'The outputs of ' + SFF[i] + ' and ' + SFF[j] + ' are wired together: two flops driving one wire, fighting over every bit.'};
    let net = 'SCAN_IN.p';
    const order = [];
    for (;;) {
      const next = SFF.filter(f => c.same(net, f + '.SI'));
      if (next.length > 1) return {msg: next.join(' and ') + ' take their scan input from the same wire. They would always hold the same bit, so the tester could never set them differently.'};
      if (!next.length || order.indexOf(next[0]) >= 0) break;
      order.push(next[0]); net = next[0] + '.Q';
    }
    if (order.length < 4) {
      const miss = SFF.filter(f => order.indexOf(f) < 0);
      return {msg: 'From SCAN_IN the chain goes ' + (order.length ? 'through ' + order.join(' → ') + ' and stops' : 'nowhere') + '. ' + miss.join(' and ') + (miss.length > 1 ? ' are' : ' is') + ' not in it: the tester could never load or read ' + (miss.length > 1 ? 'them' : 'it') + '.'};
    }
    if (!c.same(net, 'SCAN_OUT.p')) return {msg: 'The chain runs through all four flops, but the Q of ' + order[3] + ' does not reach SCAN_OUT: the tester could load a pattern but never read the answer.'};
    /* The tester shifts 1101 in while the bits the flops captured (0110) come out */
    const pat = [1, 0, 1, 1], st = [0, 1, 1, 0], rows = [['clock'].concat(order, ['SCAN_OUT'])];
    rows.push(['captured'].concat(st, [st[3]]));
    for (let k = 0; k < 4; k++) {st.unshift(pat[k]); st.pop(); rows.push([String(k + 1)].concat(st, [k < 3 ? st[3] : '—']))}
    return {ok: true, rows};
  },
  answer: {wires: [['SCAN_IN.p', 'SFF1.SI'], ['SFF1.Q', 'SFF2.SI'], ['SFF2.Q', 'SFF3.SI'], ['SFF3.Q', 'SFF4.SI'], ['SFF4.Q', 'SCAN_OUT.p'],
    ['SE.p', 'SFF1.SE'], ['SFF1.SE', 'SFF2.SE'], ['SFF2.SE', 'SFF3.SE'], ['SFF3.SE', 'SFF4.SE']]},
  wrong: {wires: [['SCAN_IN.p', 'SFF1.SI'], ['SFF1.Q', 'SFF2.SI'], ['SFF2.Q', 'SFF3.SI'], ['SFF3.Q', 'SFF4.SI'], ['SFF4.Q', 'SCAN_OUT.p'],
    ['SE.p', 'SFF1.SE'], ['SE.p', 'SFF2.SE'], ['SE.p', 'SFF3.SE'], ['SFF4.SE', 'SFF4.Q']]},
  hint: 'Two separate jobs. SE goes to every flop. The scan data goes in one line: SCAN_IN → the SI of one flop, its Q → the SI of the next, …, the last Q → SCAN_OUT.',
  explain: 'Loading and unloading happen at once: while the next pattern shifts in, the answer to the last one shifts out. The order of the flops does not matter; the tools pick the one with the shortest wires.'};
const T_TTIME = {id: 'ttime', kind: 'num', unit: 'ms', file: 'test_time.txt', title: 'How long does a test take?',
  intro: '<p>For every pattern the tester shifts the chains full (one bit per clock in each chain, all chains at once), pulses the clock once with SE = 0 so the logic captures its answer, and shifts that answer out while the next pattern shifts in.</p>',
  code: 'flip-flops      2000, in 4 chains of 500\npatterns        10 000\nshift clock     50 MHz  (20 ns)\n\ncycles per pattern ≈ 500 shift + 1 capture\ntest time       = ____ ms',
  ask: 'Type the test time in ms.', value: 100.2, tol: .5,
  near: [[400.8, 'That is one long chain of 2000. With four chains shifting side by side, each is only 500 long.'], [400, 'That is one long chain of 2000. With four chains shifting side by side, each is only 500 long.'],
    [.1002, 'Right digits, wrong unit: the answer is in milliseconds.'], [.1, 'Right digits, wrong unit: the answer is in milliseconds.'], [100200, 'Right digits, wrong unit: that is microseconds.']],
  hint: '10 000 patterns × 501 cycles × 20 ns, then 1 ms = 1 000 000 ns.',
  answer: '100.2', explain: 'About a tenth of a second for each chip. Tester time costs money by the second, which is why chips have many short chains instead of one long one.'};

/* Wednesday: find a test by hand, the way ATPG does */
const T_ATPG = {id: 'atpg', file: 'atpg_by_hand.v', title: 'Catch the fault', h: 290,
  intro: '<p>Two AND gates and an OR: <code>Y = (A & B) | (C & D)</code>. A good chip and a chip with one fault get the same inputs. If their Y differs, the pattern <b>catches</b> the fault.</p>',
  ask: 'Set A, B, C and D, then Apply. Activate the fault (drive the wire to the opposite of what it is stuck at), then propagate it (set the other inputs so the difference reaches Y).',
  ins: ['A', 'B', 'C', 'D'], gates: [['N1', 'and', ['A', 'B']], ['N2', 'and', ['C', 'D']], ['Y', 'or', ['N1', 'N2']]], out: 'Y',
  svg: '<g class="sym">'
    + '<path d="M70 60H210V70H250M70 110H210V100H250M70 180H210V190H250M70 230H210V220H250M310 85H420V130H502M310 205H420V160H502M560 145H660"/>'
    + '<path class="fill" d="M250 55H280A30 30 0 0 1 280 115H250Z"/><path class="fill" d="M250 175H280A30 30 0 0 1 280 235H250Z"/>'
    + '<path class="fill" d="M490 115Q512 145 490 175Q540 175 562 145Q540 115 490 115Z"/></g>'
    + '<text x="278" y="90" class="sub">AND</text><text x="278" y="210" class="sub">AND</text><text x="526" y="150" class="sub">OR</text>'
    + '<text x="330" y="78" class="pinname">N1</text><text x="330" y="198" class="pinname">N2</text><text x="684" y="150" class="lbl">Y</text>',
  at: {A: [140, 79], B: [140, 129], C: [140, 199], D: [140, 249], N1: [395, 104], N2: [395, 224], Y: [612, 164]},
  faults: [
    {net: 'N1', sa: 0, at: [395, 85], answer: {A: 1, B: 1, C: 0, D: 0},
      hint: 'N1 is A AND B, so making it 1 takes A = 1 and B = 1. Then the OR passes N1 through only if its other input, N2, is 0.'},
    {net: 'D', sa: 1, at: [140, 230], answer: {A: 0, B: 0, C: 1, D: 0},
      hint: 'Set D to 0, the opposite of stuck-at-1. The AND passes D through only when C is 1, and the OR passes N2 through only when N1 is 0.'}
  ],
  wrong: '0000'};
function atpgTask(t, done) {
  let f = 0, runs = 0, total = 0, caught = false;
  const v = {};
  t.ins.forEach(k => v[k] = 0);
  PTS()[t.id] = 0;
  const run = (ins, fault) => {
    const n = Object.assign({}, ins), fix = k => {if (fault && fault.net === k) n[k] = fault.sa};
    t.ins.forEach(fix);
    t.gates.forEach(([out, op, [a, b]]) => {n[out] = op === 'and' ? n[a] & n[b] : n[a] | n[b]; fix(out)});
    return n;
  };
  const draw = shown => {
    const F = t.faults[f], txt = (x, y, s, cls) => '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="middle">' + s + '</text>';
    let s = t.svg + t.ins.map((k, i) => txt(40, [64, 114, 184, 234][i], k + ' = ' + v[k], 'lbl')).join('');
    s += '<path class="fault" d="M' + (F.at[0] - 7) + ' ' + (F.at[1] - 7) + 'l14 14m0-14l-14 14"/>' + txt(F.at[0], F.at[1] - 13, F.net + ' stuck-at-' + F.sa, 'flt');
    if (shown) {const g = run(v), b = run(v, F); Object.keys(t.at).forEach(k => {if (t.ins.indexOf(k) < 0 || k === F.net) s += txt(t.at[k][0], t.at[k][1], g[k] + ' / ' + b[k], g[k] !== b[k] ? 'flt' : 'val')})}
    $('.wb-box').innerHTML = '<svg viewBox="0 0 760 ' + t.h + '" role="img" aria-label="' + esc(t.title) + '">' + s + '</svg>';
    $$('.atpg-in').forEach(b => {b.textContent = b.dataset.in + ' = ' + v[b.dataset.in]; b.dataset.v = v[b.dataset.in]; b.setAttribute('aria-pressed', v[b.dataset.in] ? 'true' : 'false')});
  };
  const page = () => {
    runs = 0; caught = false;
    setPanel('<div class="task atpg-task" data-task="' + t.id + '" data-fault="' + f + '" data-wrong="' + t.wrong + '">' + t.intro + '<p>' + t.ask + '</p>'
      + '<p class="fine">Fault ' + (f + 1) + ' of ' + t.faults.length + '. Values on the board read <b>good chip / faulty chip</b>.</p>'
      + '<div class="wb"><div class="ed-bar"><span>' + t.file + '</span><span>Click an input to flip it</span></div><div class="wb-box"></div></div>'
      + '<div class="row atpg-ins">' + t.ins.map(k => '<button class="btn atpg-in" type="button" data-in="' + k + '"></button>').join('')
      + '<button class="btn btn-primary" id="atpgRun" type="button">Apply</button><span class="fine" id="runs"></span></div>'
      + '<div id="fb" class="fb" aria-live="polite"></div><div id="taskEnd"></div></div>', t.title);
    $$('.atpg-in').forEach(b => b.onclick = () => {if (caught) return; v[b.dataset.in] ^= 1; SFX.blip(); draw(false); $('#fb').innerHTML = ''});
    $('#atpgRun').onclick = apply;
    draw(false);
  };
  const finish = (pts, how) => {
    caught = true; total += pts; PTS()[t.id] = total;
    $('#atpgRun').disabled = true; $$('.atpg-in').forEach(b => b.disabled = true);
    $('#fb').innerHTML = how;
    $('#taskEnd').innerHTML = nextBtn(f + 1 < t.faults.length ? 'Next fault' : 'Done');
    $('#next').onclick = () => {if (f + 1 < t.faults.length) {f++; t.ins.forEach(k => v[k] = 0); page()} else {hidePanel(); done()}};
  };
  const apply = () => {
    if (caught) return;
    const F = t.faults[f], g = run(v), b = run(v, F);
    runs++; draw(true);
    if (g[t.out] !== b[t.out]) {
      SFX.ok();
      finish(runs <= 2 ? 1 : 0, '<p class="fb-ok">✓ Caught. A good chip answers ' + t.out + ' = ' + g[t.out] + ', a chip with ' + F.net + ' stuck at ' + F.sa + ' answers ' + b[t.out] + '.' + (runs > 1 ? ' (apply ' + runs + ')' : '') + '</p>'
        + '<p class="fine">' + t.ins.map(k => k + ' = ' + v[k]).join(', ') + ' is a test for this fault.</p>');
      return;
    }
    SFX.blip();
    const msg = g[F.net] === F.sa
      ? 'Not caught. In a good chip ' + F.net + ' is already ' + F.sa + ', so a chip with it stuck at ' + F.sa + ' looks exactly the same. Activate first: make the good value of ' + F.net + ' ' + (1 - F.sa) + '.'
      : F.net + ' differs now (good ' + g[F.net] + ', faulty ' + b[F.net] + '), but the difference never reaches ' + t.out + ': it is ' + g[t.out] + ' on both chips. Propagate: set the other inputs on the way so they let it through.';
    $('#fb').innerHTML = '<p class="fb-bad">✗ ' + msg + '</p><p class="fine"><b>Hint:</b> ' + F.hint + '</p>';
    $('#runs').textContent = runs < 2 ? 'One more apply for the point' : runs < 3 ? 'No point left, but keep trying' : '';
    if (runs >= 3 && !$('#reveal')) {
      $('#taskEnd').innerHTML = '<div class="row end"><button class="btn" id="reveal" type="button">Show answer</button></div>';
      $('#reveal').onclick = () => {Object.assign(v, F.answer); draw(true); finish(0, '<p class="fb-ans">One test for this fault is on the board now: ' + t.ins.map(k => k + ' = ' + v[k]).join(', ') + '.</p>')};
    }
  };
  page();
}

/* Thursday: a rule violation in your own RTL, then the new coverage */
const T_RSTFIX = {id: 'rstfix', kind: 'expr', title: 'Fix the reset for test',
  intro: '<p>JJH\'s report: <code>DRC S29: 32 flip-flops (timer counter) reset by internal signal rst_n_int</code>. Your block resets the counter with <code>rst_n & ~soft_rst</code>, and <code>soft_rst</code> is CTRL bit 7, one of your own registers. During scan shift a 1 passing through that bit resets the counter in the middle of the pattern.</p>'
    + '<p>The rule: when <code>test_mode</code> is 1, a reset may come only from the reset pin <code>rst_n</code>. When <code>test_mode</code> is 0, the soft reset must still work.</p>',
  code: '// the reset of the timer counter\nassign rst_n_int = ____;',
  ask: 'Type the reset.',
  sigs: {rst_n: {w: 1}, soft_rst: {w: 1}, test_mode: {w: 1}}, w: 1, lhs: 'rst_n_int',
  ref: 'test_mode ? rst_n : (rst_n & ~soft_rst)', answer: 'test_mode ? rst_n : (rst_n & ~soft_rst)',
  hint: 'A mux on test_mode: in test mode just rst_n, otherwise rst_n & ~soft_rst as before.',
  explain: 'One mux, and the tester controls the counter\'s reset again. Every block in the chip gets the same test_mode signal for exactly this.'};
const T_FCOV = {id: 'fcov', kind: 'num', unit: '%', file: 'atpg_report.txt', title: 'Fault coverage',
  intro: '<p>JJH reruns ATPG on your fixed block. Fault coverage is the share of all the modelled faults that at least one pattern catches.</p>',
  code: 'total faults      12 000\ndetected faults   11 640\nfault coverage  = ____ %    // the target for sign-off is 95%',
  ask: 'Type the fault coverage in %.', value: 97, tol: .05,
  near: [[.97, 'Right ratio, now as a percentage: multiply by 100.'], [3, 'That is the share that was missed. Coverage is the share that was caught.'], [97.5, 'Check the division: 11 640 / 12 000.']],
  hint: '11 640 / 12 000, times 100.',
  answer: '97', explain: 'It was 91% before your fix: the 32 counter flops, and the logic behind them, could not be tested. Most of the 3% left are faults no input can ever reach, and JJH lists them in the report.'};

/* Friday: memories and pins */
function miniBist(done) {
  quiz('Memories and pins', '<p>Scan reaches the flip-flops. Two more things have to be testable before the chip is.</p>', [
    {q: 'The chip has 64 KB of SRAM. Why is it not tested through the scan chains like the flops?',
      opts: ['SRAM never has defects', 'Scan would test it, only a little slower', 'Memory cells are not flip-flops in a chain: a small engine on the chip, memory BIST, writes and reads patterns at full speed instead'], ok: 2,
      why: 'Memory BIST (MBIST) runs the memory test from inside the chip. The tester only says start and reads pass or fail.'},
    {q: 'A March test writes 0 everywhere, walks up the addresses reading 0 and writing 1, then walks down reading 1 and writing 0. What does walking both ways catch?',
      opts: ['Cells that disturb each other: a write to one address that flips another', 'Nothing extra, it is only for symmetry', 'Timing violations in the logic'], ok: 0,
      why: 'Whichever of two coupled cells is written first, one direction catches the other one flipping. Defects in memories love neighbours.'},
    {q: 'Almost every chip has these pins: TCK, TMS, TDI, TDO. What are they?',
      opts: ['A second power supply', 'JTAG: the test access port, so a tester or the board can reach the scan chains, the BIST engines and every pin', 'The I²C bus'], ok: 1,
      why: 'JTAG is how test gets in after the chip is soldered to a board. Its boundary scan can even check the board\'s solder joints, pin by pin.'}
  ], 'bist', done);
}
