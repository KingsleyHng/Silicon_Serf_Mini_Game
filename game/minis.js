/* Silicon Serf: the mini-games. Two kinds, both in the bottom panel.

   quiz(title, intro, qs, key, done)        pick one answer per question, then "Check"
     qs   [{q: question HTML, opts: [answer, …], ok: index of the right answer, why: one-line explanation, code: true for code answers}, …]
     Points: one per right answer. A question left unanswered counts as wrong.

   codeTask(t, done)                        type an answer and run it (check.js judges it)
     t.id     name of the task (points go to ST.d.p[t.id]; tools/test.js types its answer)
     t.kind   'expr' (Verilog), 'sdc' (a constraint) or 'num' (a number)
     t.title, t.intro (HTML above the code), t.code (the code around the blank, ____ marks the blank), t.ask (what to type)
     The answer box is a small editor: syntax colours, the task's signals in their own colour (other names in red), Enter runs.
     t.hint   shown after the first wrong run; t.answer shown by "Show answer"
     t.say    'assert' or 'cover' changes how a counterexample is explained
     plus what check.js needs for that kind (sigs, ref, w, …)
     Points: 2 when right on the first run, 1 on the second or third, 0 after that or after "Show answer".
     A typing mistake (unknown signal, a missing bracket) does not use up a run. */

const PTS = () => ST.d.p || (ST.d.p = {});

function quiz(title, intro, qs, key, done) {
  const pick = qs.map(() => -1);
  let checked = false;
  const draw = () => {
    const body = qs.map((q, i) => '<div class="qz" data-q="' + i + '"><p>' + q.q + '</p>'
      + q.opts.map((o, j) => {
        const st = checked ? (j === q.ok ? ' ok' : j === pick[i] ? ' bad' : '') : (j === pick[i] ? ' on' : '');
        return '<button class="btn opt' + (q.code ? ' code' : '') + st + '" type="button" data-o="' + j + '"' + (checked ? ' disabled' : '') + '>' + o + '</button>';
      }).join('')
      + (checked ? '<p class="why fine">' + (pick[i] === q.ok ? '✓ ' : '✗ ') + q.why + '</p>' : '') + '</div>').join('');
    setPanel(intro + body + nextBtn(checked ? 'Done' : 'Check'), title);
    if (!checked) $$('.qz').forEach(g => $$('.opt', g).forEach(b => b.onclick = () => {pick[+g.dataset.q] = +b.dataset.o; SFX.blip(); draw()}));
    $('#next').onclick = () => {
      if (!checked) {checked = true; const n = pick.filter((p, i) => p === qs[i].ok).length; PTS()[key] = n; if (n === qs.length) SFX.ok(); draw(); return}
      hidePanel(); done();
    };
  };
  draw();
}

/* A small waveform as a table: rows [[name, [v0, v1, …]], …]; hi = column indexes to highlight */
const waveTable = (rows, hi) => '<div class="wave-wrap"><table class="wave"><tr><th>cycle</th>' + rows[0][1].map((v, i) => '<th>' + (i + 1) + '</th>').join('') + '</tr>'
  + rows.map(r => '<tr><th>' + r[0] + '</th>' + r[1].map((v, i) => '<td' + ((hi || []).indexOf(i) >= 0 ? ' class="hi"' : '') + '>' + v + '</td>').join('') + '</tr>').join('') + '</table></div>';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const codeBlock = s => '<pre class="code">' + esc(s).replace(/____/g, '<b class="blank">____</b>') + '</pre>';

/* A wrong answer that still counts as a run (tools/test.js types it on its second run to reach "Show answer") */
const wrongOf = t => t.kind === 'expr' ? "1'b0" : t.kind === 'num' ? '0'
  : t.cmd === 'create_clock' ? 'create_clock -period 1 [get_ports ' + t.port + ']' : t.cmd + ' -clock ' + t.clock + ' 9 [get_ports ' + t.port + ']';

/* The editor's colours: Verilog / SVA / SDC words, numbers, operators, brackets by depth.
   sigs = the task's signals (shown in their own colour); flag = mark other names in red (only in what the player types) */
const HL_KW = /^(always|posedge|negedge|if|else|assign|begin|end|assert|cover|property|case|endcase|reg|wire|module|create_clock|set_input_delay|set_output_delay|get_ports|get_clocks)$/;
function hlCode(text, sigs, flag) {
  const re = /(\/\/[^\n]*)|(____)|(\d*'[sS]?[bBoOdDhH][0-9a-fA-FxXzZ_?]+|\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(-[A-Za-z_]+)|(\|->|\|=>|===|!==|==|!=|<=|>=|&&|\|\||<<|>>|[~!&|^?:+*\/%<>=-])|([([{])|([)\]}])|([^]+?)/g;
  let out = '', m, depth = 0;
  const span = (c, x) => '<span class="' + c + '">' + esc(x) + '</span>';
  while ((m = re.exec(text))) {
    const x = m[0];
    if (m[1]) out += span('hl-com', x);
    else if (m[2]) out += '<b class="blank">____</b>';
    else if (m[3]) out += span('hl-num', x);
    else if (m[4]) out += HL_KW.test(x) ? span('hl-kw', x) : sigs && sigs[x] ? span('hl-sig', x) : flag && sigs ? span('hl-bad', x) : esc(x);
    else if (m[5]) out += span('hl-kw', x);
    else if (m[6]) out += span('hl-op', x);
    else if (m[7]) out += span('hl-b' + (depth++ % 3), x);
    else if (m[8]) out += depth > 0 ? span('hl-b' + (--depth % 3), x) : span('hl-bad', x);
    else out += esc(x);
  }
  return out;
}
const FILE = t => t.kind === 'sdc' ? 'apb_regs.sdc' : t.kind === 'num' ? 'timing_report.txt' : t.say ? 'apb_regs_sva.sv' : 'apb_regs.v';

function codeTask(t, done) {
  let runs = 0, solved = false, shown = false;
  const multi = t.kind !== 'num', sigs = t.kind === 'expr' ? t.sigs : null;
  setPanel('<div class="task" data-task="' + t.id + '" data-wrong="' + esc(wrongOf(t)) + '">'
    + (t.intro || '')
    + (t.code ? '<pre class="code ed-ctx">' + hlCode(t.code, t.sigs, false) + '</pre>' : '') + '<p>' + t.ask + '</p>'
    + (t.sigs ? '<p class="sigs">' + Object.keys(t.sigs).map(n => '<button class="sig" type="button" data-k="' + n + '" title="Insert ' + n + '">' + n + (t.sigs[n].w > 1 ? '<small>[' + (t.sigs[n].w - 1) + ':0]</small>' : '') + '</button>').join('') + '</p>' : '')
    + '<div class="ed' + (multi ? '' : ' ed-one') + '"><div class="ed-bar"><span>' + FILE(t) + '</span><span>' + (multi ? 'Enter runs · Shift+Enter adds a line' : 'Enter checks') + '</span></div>'
    + '<div class="ed-box"><pre class="ed-hl" aria-hidden="true"></pre>'
    + '<textarea id="codeIn" class="ed-in" rows="1" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Your answer"' + (t.unit ? ' placeholder="in ' + t.unit + '"' : multi ? ' placeholder="Type here"' : '') + '></textarea></div></div>'
    + '<div class="row"><button class="btn btn-primary" id="run" type="button">' + (t.kind === 'num' ? 'Check' : 'Run') + '</button><span class="fine" id="runs"></span></div>'
    + '<div id="fb" class="fb" aria-live="polite"></div><div id="taskEnd"></div></div>', t.title);
  const inp = $('#codeIn'), fb = $('#fb'), hl = $('.ed-hl');
  const paint = () => {hl.innerHTML = hlCode(inp.value, sigs, true) + (inp.value.endsWith('\n') || !inp.value ? ' ' : '')};
  inp.addEventListener('input', paint);
  $$('.sig').forEach(b => b.onclick = () => {
    if (inp.readOnly) return;
    const k = b.dataset.k, s = inp.selectionStart, e = inp.selectionEnd;
    inp.value = inp.value.slice(0, s) + k + inp.value.slice(e);
    inp.focus(); inp.setSelectionRange(s + k.length, s + k.length); paint();
  });
  inp.addEventListener('keydown', e => {if (e.key === 'Enter' && !e.isComposing && (!multi || !e.shiftKey)) {e.preventDefault(); $('#run').click()}});
  paint(); inp.focus();
  const finish = () => {
    $('#run').disabled = true; inp.readOnly = true;
    $$('.sig').forEach(b => b.disabled = true);
    const end = $('#taskEnd'); end.innerHTML = nextBtn('Done');
    $('#next').onclick = () => {hidePanel(); done()};
  };
  const showAnswer = () => {
    shown = true; PTS()[t.id] = 0;
    inp.value = t.answer; paint();
    fb.innerHTML = '<p class="fb-ans">One correct answer:</p><pre class="code ed-ctx">' + hlCode(t.answer, t.sigs, false) + '</pre>' + (t.explain ? '<p class="fine">' + t.explain + '</p>' : '');
    finish();
  };
  $('#run').onclick = () => {
    if (solved || shown) return;
    const r = t.kind === 'expr' ? vxCheck(t, inp.value) : t.kind === 'sdc' ? sdcCheck(t, inp.value) : numCheck(t, inp.value);
    if (r.err) {fb.innerHTML = '<p class="fb-err">⚠ ' + esc(r.err) + '</p><p class="fine">Typing mistakes do not count as a run.</p>'; SFX.blip(); return}
    runs++;
    if (r.ok) {
      solved = true; PTS()[t.id] = runs === 1 ? 2 : runs <= 3 ? 1 : 0; SFX.ok();
      fb.innerHTML = '<p class="fb-ok">✓ ' + (t.kind === 'expr' ? 'Correct for every input tried.' : 'Correct.') + (runs > 1 ? ' (run ' + runs + ')' : '') + '</p>' + (t.explain ? '<p class="fine">' + t.explain + '</p>' : '');
      finish(); return;
    }
    SFX.blip();
    fb.innerHTML = (t.kind === 'expr' ? counterexample(t, r) : '<p class="fb-bad">✗ ' + esc(r.msg) + '</p>')
      + (t.hint ? '<p class="fine"><b>Hint:</b> ' + t.hint + '</p>' : '');
    $('#runs').textContent = runs < 3 ? (3 - runs) + ' more run' + (runs === 2 ? '' : 's') + ' for points' : 'No points left, but keep trying';
    if (runs >= 3 && !$('#reveal')) {
      $('#taskEnd').innerHTML = '<div class="row end"><button class="btn" id="reveal" type="button">Show answer</button></div>';
      $('#reveal').onclick = showAnswer;
    }
    fb.scrollIntoView({block: 'nearest'});
  };
}

/* A wrong answer: one input where the player's answer and the right one differ, like a failing simulation */
function counterexample(t, r) {
  const rows = Object.keys(t.sigs).map(n => '<tr><th>' + n + '</th><td>' + vxFmt(r.env[n], t.sigs[n].w) + '</td></tr>').join('');
  const w = t.bool ? 1 : t.w, want = vxFmt(r.want, w), got = vxFmt(r.got, w);
  const what = t.say === 'assert'
    ? (r.want ? 'False alarm: the design is right in this cycle, but your assertion fails.' : 'Missed bug: the design is wrong in this cycle, but your assertion passes.')
    : t.say === 'cover'
      ? (r.want ? 'This cycle is exactly the case to count, but your cover misses it.' : 'Your cover counts this cycle, but it is not the case asked for.')
      : 'For these inputs the result should be <b class="mono">' + want + '</b>, yours is <b class="mono">' + got + '</b>.';
  return '<p class="fb-bad">✗ ' + what + '</p><div class="wave-wrap"><table class="wave kv">' + rows + '</table></div>';
}

/* ═════════ Week 1 · Spec and RTL ═════════ */

/* Monday: name the bus phase of each cycle from PSEL and PENABLE */
function miniPhases(done) {
  const PH = ['IDLE', 'SETUP', 'ACCESS'];
  quiz('Name the phases', '<p>Two transfers, back to back. For each cycle, which phase is the bus in?</p>'
    + waveTable([['PSEL', ['0', '1', '1', '1', '1']], ['PENABLE', ['0', '0', '1', '0', '1']]]),
    [
      {q: 'Cycle 1', opts: PH, ok: 0, why: 'PSEL is 0: no transfer for this block.'},
      {q: 'Cycle 2', opts: PH, ok: 1, why: 'PSEL is 1 and PENABLE is 0: the first cycle of a transfer.'},
      {q: 'Cycle 3', opts: PH, ok: 2, why: 'PSEL and PENABLE are both 1. The transfer completes on the edge at the end of this cycle.'},
      {q: 'Cycle 4', opts: PH, ok: 1, why: 'PSEL stays 1 but PENABLE drops: the next transfer starts straight away. You cannot spot it from PSEL rising.'}
    ], 'phases', done);
}

/* Tuesday: CTRL, one byte at a time */
const T_CTRL = {id: 'ctrl', kind: 'expr', title: 'CTRL, byte by byte',
  intro: '<p>PSTRB has one bit per byte of PWDATA. A write changes only the bytes whose strobe is 1; the others keep their value.</p>',
  code: '// runs on the edge that ends a write to CTRL\nalways @(posedge PCLK)\n  if (wr_ctrl)\n    ctrl[7:0] <= ____;   // byte 0',
  ask: 'Type the expression for byte 0.',
  sigs: {PSTRB: {w: 4, vals: [0, 1, 0xE, 0xF]}, PWDATA: {w: 32}, ctrl: {w: 32}}, w: 8, lhs: 'ctrl',
  ref: 'PSTRB[0] ? PWDATA[7:0] : ctrl[7:0]', answer: 'PSTRB[0] ? PWDATA[7:0] : ctrl[7:0]',
  hint: 'When PSTRB[0] is 1, take byte 0 of PWDATA (bits 7 to 0); otherwise keep byte 0 of ctrl. The ?: operator does it in one line.',
  explain: 'Bytes 1 to 3 are the same with PSTRB[1], PSTRB[2], PSTRB[3]. A for loop writes all four.'};

/* Tuesday: the write-1-to-clear interrupt register. First the traps, then the real thing. */
function miniIrq(done) {
  const A = 'irq_reg <= (irq_reg & ~clr) | irq_set;';
  const B = 'irq_reg <= irq_reg | irq_set;\nif (wr_irq) irq_reg <= irq_reg & ~PWDATA[3:0];';
  const C = 'if (wr_irq) irq_reg <= irq_reg & ~PWDATA[3:0];\nirq_reg <= irq_reg | irq_set;';
  quiz('Two traps', '<p>Four pending bits. A 1 on <code>irq_set</code> sets a bit; the processor writes 1 to clear it. If a new event arrives on the same edge as its clear, the bit must stay 1. A colleague tried three versions.</p>',
    [
      {q: 'Which one does it right?', code: true, opts: [esc(B), esc(A), esc(C)], ok: 1,
        why: 'One assignment, one result: clear first, then OR the new events in, so a new event always wins. With two non-blocking assignments to one register, only the last one counts.'},
      {q: 'In the first version, what goes wrong when the processor clears a bit?', opts: ['Nothing, it works', 'A new event on the same edge is lost', 'The bit can never be cleared'], ok: 1,
        why: 'The clear is written last, so it replaces the line that ORed irq_set in. An event that lands on that edge disappears.'},
      {q: 'And in the third version?', opts: ['Nothing, it works', 'A new event on the same edge is lost', 'The bit can never be cleared'], ok: 2,
        why: 'Now the OR is written last and replaces the clear. The old value is written straight back, and the interrupt stays on forever.'}
    ], 'traps', () => codeTask(T_IRQ, done));
}
const T_IRQ = {id: 'irq', kind: 'expr', title: 'The interrupt register',
  intro: '<p>Now write it yourself, without looking back. <code>clr</code> is already <code>PWDATA[3:0]</code> during a write to IRQ with PSTRB[0] = 1, and 0 at all other times.</p>',
  code: 'always @(posedge PCLK)\n  irq_reg <= ____;',
  ask: 'Type the next value of irq_reg.',
  sigs: {irq_reg: {w: 4}, clr: {w: 4}, irq_set: {w: 4}}, w: 4, lhs: 'irq_reg',
  ref: '(irq_reg & ~clr) | irq_set', answer: '(irq_reg & ~clr) | irq_set',
  hint: 'Two steps in one line: keep the bits of irq_reg that are not being cleared (AND with the inverse of clr), then OR in the new events.',
  explain: 'irq_set is ORed in last, so an event on the same edge as its clear survives.'};

/* Wednesday: the error response */
const T_SLVERR = {id: 'slverr', kind: 'expr', title: 'PSLVERR',
  intro: '<p>Registers live at 0x00 (CTRL), 0x04 (STATUS, read only) and 0x08 (IRQ). A transfer fails if there is no register at PADDR, or if it writes STATUS. PSLVERR must be 1 in the ACCESS cycle of a failed transfer, and 0 in every other cycle.</p>',
  code: 'assign PSLVERR = ____;',
  ask: 'Type the condition.',
  sigs: {PSEL: {w: 1}, PENABLE: {w: 1}, PWRITE: {w: 1}, PADDR: {w: 8}}, w: 1, lhs: 'PSLVERR',
  ref: "PSEL && PENABLE && (!(PADDR == 8'h00 || PADDR == 8'h04 || PADDR == 8'h08) || (PWRITE && PADDR == 8'h04))",
  answer: "PSEL && PENABLE && (!(PADDR == 8'h00 || PADDR == 8'h04 || PADDR == 8'h08) || (PWRITE && PADDR == 8'h04))",
  hint: "ACCESS is PSEL && PENABLE. AND that with (no register at PADDR) || (a write to 8'h04). \"No register\" is !(PADDR == 8'h00 || …).",
  explain: 'It is an assign, so PSLVERR is right during the ACCESS cycle itself, when the Requester samples it.'};

function miniLint(done) {
  quiz('Lint report', '<p>The lint tool flags three lines in your file. Your ports include <code>output reg [31:0] ctrl</code> and <code>output wire PSLVERR</code>.</p>',
    [
      {q: '<code>' + esc('assign ctrl = ctrl_reg;') + '</code>', opts: ['Fine as it is', 'ctrl is a reg: an assign cannot drive it', 'Missing a clock'], ok: 1,
        why: 'assign drives wires. Either declare the port as a wire, or write ctrl directly in the clocked block.'},
      {q: '<code>' + esc('for (i = 0; i < 4; i++)') + '</code>', opts: ['Fine in plain Verilog', 'i++ is SystemVerilog; plain Verilog needs i = i + 1', 'The loop is too short'], ok: 1,
        why: 'A tool reading the file as Verilog-2001 rejects ++.'},
      {q: 'Two always blocks both write irq_reg.', opts: ['The later block wins', 'Two drivers on one register: keep one always block per register', 'It is fine in simulation, so it is fine'], ok: 1,
        why: 'Simulation may hide it; synthesis cannot build a flip-flop with two owners.'}
    ], 'lint', done);
}

/* ═════════ Week 1 · Verification ═════════ */

/* Thursday: a read returns its data one cycle late */
function miniWave(done) {
  quiz('Read the waveform', '<p>SKG\'s test reads the STATUS register, which should return <b class="mono">5A</b>. Your PRDATA comes from a register loaded on the edge that ends ACCESS.</p>'
    + waveTable([['PSEL', ['0', '1', '1', '0']], ['PENABLE', ['0', '0', '1', '0']], ['PRDATA', ['00', '00', '00', '5A']]]),
    [
      {q: 'In which cycle does the Requester sample PRDATA?', opts: ['Cycle 2', 'Cycle 3', 'Cycle 4'], ok: 1,
        why: 'On the edge at the end of ACCESS, which is cycle 3. It sees 00.'},
      {q: 'What is the simplest fix?', opts: ['Ask SKG to sample one cycle later', 'Choose PRDATA with combinational logic from PADDR', 'Add another register stage'], ok: 1,
        why: 'Combinational PRDATA is correct throughout ACCESS. The bus timing comes from the spec; the testbench is right to sample where it does.'}
    ], 'wave', done);
}

/* Thursday: an assertion that would have caught it */
const T_ASSERT = {id: 'assert', kind: 'expr', say: 'assert', bool: true, title: 'Write an assertion',
  intro: '<p>An assertion is a rule checked on every clock edge of every test. <code>a |-> b</code> means: whenever <code>a</code> is true, <code>b</code> must be true as well. When <code>a</code> is false, the rule has nothing to say and passes.</p>',
  code: '// During the ACCESS cycle of a read from STATUS (0x04),\n// PRDATA must be {24\'d0, status}.\nassert property (@(posedge PCLK) ____ );',
  ask: 'Type the property.',
  sigs: {PSEL: {w: 1}, PENABLE: {w: 1}, PWRITE: {w: 1}, PADDR: {w: 8, vals: [0, 4, 8, 0x0C]}, status: {w: 8, vals: [0x5A, 0, 0xFF]}, PRDATA: {w: 32, vals: [0, 0x5A]}},
  tweak: (e, rnd) => {const r = rnd(); if (r < .5) e.PRDATA = e.status; else if (r < .65) e.PRDATA = e.status | 0x100n},
  ref: "PSEL && PENABLE && !PWRITE && PADDR == 8'h04 |-> PRDATA == {24'd0, status}",
  answer: "PSEL && PENABLE && !PWRITE && PADDR == 8'h04 |-> PRDATA == {24'd0, status}",
  hint: "The left side of |-> is the ACCESS cycle of a read from 0x04: PSEL, PENABLE, not PWRITE, and PADDR == 8'h04. The right side compares PRDATA with {24'd0, status}.",
  explain: 'Leave out !PWRITE and it fails on every write to STATUS, where PRDATA means nothing. Leave out PENABLE and it fails in SETUP, before the data is due.'};

/* Friday: coverage. Passing tests only matter for what they actually exercised. */
function miniCover(done) {
  quiz('Coverage report', '<p>SKG counts how often each kind of transfer happened across all 48 tests.</p>'
    + '<div class="wave-wrap"><table class="wave"><tr><th>case</th><th>hits</th></tr>'
    + [['read CTRL', 212], ['write CTRL', 187], ['read STATUS', 64], ['write STATUS (error)', 0], ['read IRQ', 41], ['clear IRQ', 38], ['clear IRQ + new event, same edge', 0]].map(r => '<tr><th>' + r[0] + '</th><td' + (r[1] ? '' : ' class="hi"') + '>' + r[1] + '</td></tr>').join('') + '</table></div>',
    [
      {q: 'All 48 tests pass. What do the two zeros tell you?', opts: ['Those cases work', 'Those cases were never tested: a bug there would pass every test', 'Those tests failed'], ok: 1,
        why: 'A test can only fail on what it does. Zero hits means nothing ever checked that case.'}
    ], 'cov', () => codeTask(T_COVER, done));
}
const T_COVER = {id: 'cover', kind: 'expr', say: 'cover', bool: true, title: 'Write a cover point',
  intro: '<p>A cover point counts the cycles where a condition is true, so you can see whether tests ever reach a case. This one is the corner case from Tuesday.</p>',
  code: '// The ACCESS cycle of a write to IRQ (0x08) with PSTRB[0] = 1,\n// where a bit being cleared also has a new event on irq_set.\ncover property (@(posedge PCLK) ____ );',
  ask: 'Type the condition.',
  sigs: {PSEL: {w: 1}, PENABLE: {w: 1}, PWRITE: {w: 1}, PADDR: {w: 8, vals: [0, 4, 8]}, PSTRB: {w: 4, vals: [1, 0, 0xF, 0xE]}, PWDATA: {w: 32, vals: [1, 2, 0xF, 0]}, irq_set: {w: 4, vals: [0, 1, 2, 0xF]}},
  tweak: (e, rnd) => {if (rnd() < .5) {e.PSEL = 1n; e.PENABLE = 1n; e.PWRITE = 1n}},
  ref: "PSEL && PENABLE && PWRITE && PADDR == 8'h08 && PSTRB[0] && (PWDATA[3:0] & irq_set) != 0",
  answer: "PSEL && PENABLE && PWRITE && PADDR == 8'h08 && PSTRB[0] && |(PWDATA[3:0] & irq_set)",
  hint: "Start from the ACCESS cycle of a write to 8'h08 with PSTRB[0]. Then \"some bit is both cleared and set\": (PWDATA[3:0] & irq_set) has at least one 1, which |( … ) tests.",
  explain: 'SKG adds a test that aims at this case, and the cover point proves the test really reaches it.'};

/* ═════════ Week 2 · Synthesis ═════════ */

/* Monday: what becomes a flip-flop */
const T_FLOPS = {id: 'flops', kind: 'num', title: 'Count the flip-flops',
  intro: '<p>Your finished block: CTRL is 32 bits written in <code>always @(posedge PCLK)</code>; the interrupt register is 4 pending bits, also clocked; STATUS is read straight from the <code>status</code> input; PRDATA and PSLVERR are combinational.</p>',
  ask: 'How many flip-flops will synthesis build?',
  value: 36, near: [[68, 'PRDATA is combinational now, so it has no flip-flops.'], [32, 'The 4 pending bits of the interrupt register are clocked too.'], [37, 'PSLVERR is an assign: no flip-flop.'], [44, 'STATUS is not stored anywhere: it comes straight from an input.'], [64, 'The interrupt register has 4 bits, not 32.']],
  hint: 'One flip-flop per bit assigned inside always @(posedge PCLK). Nothing else.',
  answer: '36', explain: '32 for CTRL and 4 for the pending bits.'};
function miniSynth(done) {
  codeTask(T_FLOPS, () => quiz('Synthesis report', '<p>KLN\'s first version of this block, years ago, kept the interrupt register as 32 bits. Its synthesis log said:</p>'
    + codeBlock('Info: 28 flip-flops removed: irq_reg[31:4] are constant 0'),
    [
      {q: 'Why did synthesis remove them?', opts: ['A synthesis bug', 'Nothing ever writes a 1 into bits 31:4, so they are always 0 and need no storage', 'Synthesis only supports 4-bit registers'], ok: 1,
        why: 'Synthesis proves the bits never change and replaces them with a constant. Harmless here, but a warning like this can also mean you forgot to connect something.'}
    ], 'synrep', done));
}

/* Tuesday: latches */
function miniLatch(done) {
  const A = 'always @(*) begin\n  if (rd_status) rdata = {24\'d0, status};\n  else if (rd_ctrl) rdata = ctrl;\nend';
  const B = 'always @(*) begin\n  rdata = 32\'d0;\n  if (rd_status) rdata = {24\'d0, status};\n  else if (rd_ctrl) rdata = ctrl;\nend';
  const C = 'always @(*)\n  case (PADDR)\n    8\'h00:   rdata = ctrl;\n    8\'h04:   rdata = {24\'d0, status};\n    default: rdata = 32\'d0;\n  endcase';
  quiz('Latch hunt', '<p>Synthesis warns: <code>latch inferred for rdata</code>. A combinational block must give its output a value on every path through it; when one path assigns nothing, the output has to remember its old value, and that takes a latch.</p>',
    [
      {q: 'Which block makes the latch?', code: true, opts: [esc(B), esc(C), esc(A)], ok: 2,
        why: 'When neither read happens, nothing assigns rdata. The other two give it a value on every path: a default at the top, or a default branch.'},
      {q: 'Why does JJY care?', opts: ['Latches are slower to simulate', 'A latch is open while its enable is high, so glitches pass through, and timing analysis of it is much harder', 'Latches use more power than anything else'], ok: 1,
        why: 'Flip-flops change only on the clock edge. A latch follows its input for a whole phase, which is hard to analyse and easy to get wrong.'}
    ], 'latch', () => codeTask(T_LATCH, done));
}
const T_LATCH = {id: 'nolatch', kind: 'expr', title: 'Remove the latch',
  intro: '<p>Rewrite the latch version as one expression, with the same priority (STATUS first), and 0 when neither read happens.</p>',
  code: 'always @(*)\n  rdata = ____;',
  ask: 'Type the expression for rdata.',
  sigs: {rd_status: {w: 1}, rd_ctrl: {w: 1}, status: {w: 8}, ctrl: {w: 32}}, w: 32, lhs: 'rdata',
  ref: "rd_status ? {24'd0, status} : rd_ctrl ? ctrl : 32'd0", answer: "rd_status ? {24'd0, status} : rd_ctrl ? ctrl : 32'd0",
  hint: "Chain two ?: operators: rd_status ? (STATUS value) : rd_ctrl ? ctrl : 32'd0. Check the case where both reads are 1: STATUS must win.",
  explain: 'Every input combination now has a value, so synthesis builds plain gates: a multiplexer, no latch.'};

/* ═════════ Week 2 · Constraints and timing ═════════ */

const T_CLOCK = {id: 'clock', kind: 'sdc', title: 'Define the clock',
  intro: '<p>Synthesis and timing tools know nothing about speed until you tell them. Constraints are written in SDC, one command per line. The APB clock comes in on port <code>PCLK</code> and runs at <b>200 MHz</b>. Times are in nanoseconds.</p>',
  code: 'create_clock -period ____ [get_ports ____]',
  ask: 'Type the whole command.',
  cmd: 'create_clock', value: 5, port: 'PCLK',
  unitHint: v => Math.abs(v - 200) < 1e-6 ? '-period is a time in nanoseconds, not a frequency. Period = 1 / frequency = 1 / 200 MHz.' : Math.abs(v - .005) < 1e-6 ? 'Right number, wrong unit: the tool works in nanoseconds. 0.005 µs is how many ns?' : 'Period = 1 / frequency. 1 / 200 MHz is how many nanoseconds?',
  hint: '1 / 200 MHz = 1 / (200 × 10⁶) s = 5 × 10⁻⁹ s.',
  answer: 'create_clock -period 5 [get_ports PCLK]',
  explain: 'Without -name, the clock takes the name of its port: PCLK.'};
const T_INDELAY = {id: 'indelay', kind: 'sdc', title: 'An input delay',
  intro: '<p>PADDR comes from the bridge, which changes it <b>2 ns</b> after each rising edge of PCLK. Your logic only gets the rest of the cycle. Tell the tool, so it checks the path from the PADDR port correctly.</p>',
  code: 'set_input_delay -clock ____ ____ [get_ports ____]',
  ask: 'Type the whole command.',
  cmd: 'set_input_delay', value: 2, clock: 'PCLK', port: 'PADDR', ports: ['PADDR', 'PADDR*', 'PADDR[*]'],
  unitHint: v => Math.abs(v - 3) < 1e-6 ? 'The delay is how late the input arrives after the edge (2 ns), not how much time is left.' : 'The bridge changes PADDR 2 ns after the edge.',
  hint: 'The value is how late the signal arrives after the clock edge. -clock says which clock.',
  answer: 'set_input_delay -clock PCLK 2 [get_ports PADDR]',
  explain: 'Now the tool knows the path from PADDR to PSLVERR has 5 − 2 = 3 ns, not 5.'};

const REPORT = rows => '<div class="wave-wrap"><table class="wave kv">' + rows.map(r => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</table></div>';
const T_SETUP = {id: 'setup', kind: 'num', unit: 'ns', title: 'Setup slack',
  intro: '<p>A path in the timer: from one flip-flop, through the compare logic, to another flip-flop. For a <b>setup</b> check, the data must arrive at least the setup time before the next clock edge.</p>'
    + REPORT([['clock period', '5.00 ns'], ['clock uncertainty', '0.30 ns'], ['clock-to-Q (launch flip-flop)', '0.30 ns'], ['logic delay', '4.60 ns'], ['setup time (capture flip-flop)', '0.20 ns']])
    + '<p class="fine">slack = required time − arrival time. Required: the period, minus uncertainty and setup. Arrival: clock-to-Q plus logic.</p>',
  ask: 'What is the setup slack?',
  value: -0.4, tol: .005,
  near: [[0.4, 'Right size, wrong sign: the data arrives after it is required, so the slack is negative.'], [-0.1, 'Close: did you forget to subtract the clock uncertainty from the required time?'], [-0.2, 'Close: did you forget the setup time?'], [0.2, 'Check the sign and whether you included the clock uncertainty.']],
  hint: 'Required = 5.00 − 0.30 − 0.20. Arrival = 0.30 + 4.60. Slack = required − arrival.',
  answer: '-0.4', explain: 'Required 4.50 ns, arrival 4.90 ns: the data is 0.40 ns late. Negative slack means a timing violation.'};
function miniSetupFix(done) {
  quiz('Fix the setup violation', '<p>The path is 0.40 ns too slow. QYL confirms the spec allows one extra cycle of latency on this path.</p>',
    [
      {q: 'What does JJY suggest first?', opts: ['Raise the clock to 250 MHz', 'Add a pipeline register in the middle of the logic', 'Ignore it, 0.40 ns is tiny', 'Add delay buffers'], ok: 1,
        why: 'Splitting the logic in two gives each half a full cycle. It costs one cycle of latency and 32 flip-flops of area, which the spec allows. A faster clock makes it worse; buffers add delay.'}
    ], 'setupfix', done);
}
const T_HOLD = {id: 'hold', kind: 'num', unit: 'ns', title: 'Hold slack',
  intro: '<p>A different path: a short one, from one flip-flop almost straight into the next. For a <b>hold</b> check, new data must not arrive too soon after the same clock edge, or the capturing flip-flop loses the value it is storing. The capture flip-flop gets its clock a little late (skew).</p>'
    + REPORT([['clock period', '5.00 ns'], ['clock-to-Q (launch flip-flop)', '0.12 ns'], ['logic delay', '0.04 ns'], ['hold time (capture flip-flop)', '0.05 ns'], ['clock skew (capture clock arrives later)', '0.25 ns']])
    + '<p class="fine">slack = arrival time − required time. Arrival: clock-to-Q plus logic. Required: hold time plus skew.</p>',
  ask: 'What is the hold slack?',
  value: -0.14, tol: .005,
  near: [[0.14, 'Right size, wrong sign: the data arrives before it is allowed to, so the slack is negative.'], [0.11, 'Close: the skew moves the capture edge later, so add it to the required time.'], [4.86, 'The clock period plays no part in a hold check: both flip-flops use the same edge.'], [-4.86, 'The clock period plays no part in a hold check: both flip-flops use the same edge.']],
  hint: 'Arrival = 0.12 + 0.04. Required = 0.05 + 0.25. Slack = arrival − required.',
  answer: '-0.14', explain: 'The data arrives at 0.16 ns, but must not change before 0.30 ns: a hold violation of 0.14 ns.'};
function miniHoldFix(done) {
  quiz('Fix the hold violation', '<p>The short path is 0.14 ns too fast.</p>',
    [
      {q: 'What fixes it?', opts: ['Lower the clock frequency', 'Add delay buffers on the short path', 'Add a pipeline register'], ok: 1,
        why: 'A hold check compares two things on the same clock edge, so the clock period does not matter: slowing the chip down fixes nothing. Making the short path a little slower does.'}
    ], 'holdfix', done);
}
