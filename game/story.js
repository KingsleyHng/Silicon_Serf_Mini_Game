/* Silicon Serf: three weeks, beat by beat.
   Week 1 is the spec, RTL and verification; week 2 is synthesis, constraints and timing; week 3 is the analog side, at the lab bench with WSL.
   STORY.segs  the days (title card name, subtitle, start time, light). The clock counts minutes from the first Monday 00:00,
               so each day starts 1440 minutes after the one before and still reads 09:00.
               Each scene() sets the whole room, so a saved game resumes on any day looking right.
   STORY.beats one thing to do at a time: who or where to go (to), the "next step" line (guide), what is said (lines),
               an optional mini-game (mini), what is said after it (post), and what changes in the world (after).
   ST.d.p holds the points of every mini-game (minis.js); ST.d.wait and ST.d.review the two choices. The ending is written from them. */
const DAY = 1440;
const day = (n, h) => n * DAY + (h || 540);
/* Every mini-game's points, by subject: [subject, [[mini-game, most points], …]] */
const SUBJECTS = [
  ['Spec', [['phases', 4]]],
  ['RTL', [['ctrl', 2], ['traps', 3], ['irq', 2], ['slverr', 2], ['lint', 3]]],
  ['Verification', [['wave', 2], ['assert', 2], ['cov', 1], ['cover', 2]]],
  ['Synthesis', [['flops', 2], ['synrep', 1], ['latch', 2], ['nolatch', 2]]],
  ['Timing', [['clock', 2], ['indelay', 2], ['setup', 2], ['setupfix', 1], ['hold', 2], ['holdfix', 1]]],
  ['Analog', [['ohm', 2], ['divider', 2], ['mos', 3], ['nand', 2], ['rise', 2], ['pullup', 2], ['rc', 2], ['filter', 2], ['sync', 2], ['gain', 2], ['amp', 2]]]
];
const got = s => s[1].reduce((n, m) => n + ((ST.d.p || {})[m[0]] || 0), 0), most = s => s[1].reduce((n, m) => n + m[1], 0);
const score = () => SUBJECTS.reduce((n, s) => n + got(s), 0), SCORE_MAX = SUBJECTS.reduce((n, s) => n + most(s), 0);

/* The room on a given day: where KT is (his office unless said otherwise), the regression light, the screens (on the lab bench: fpga, scope, psu) */
function room(o) {
  W.show('kt', true); W.put('kt', o.kt || 'ceo');
  W.tower('reg', o.reg || 'off');
  W.screen('mine', o.mine || ['$ vim', 'apb_regs.v'], o.mineC || '#7fe3c8');
  W.screen('skg', o.skg || ['regression', 'idle'], o.skgC || '#93a9b2');
  W.screen('jjy', o.jjy || ['timing', 'WNS +0.12'], o.jjyC || '#7fe3c8');
  W.screen('fpga', o.fpga || ['FPGA', 'no bitstream'], o.fpgaC || '#93a9b2');
  W.screen('scope', o.scope || ['‾\\_/‾\\_/‾'], '#ffd36a');
  W.screen('psu', o.psu || ['3.30 V', '0.02 A'], '#ff9e64');
}
/* Week 3: the block has signed off, everything at the desks is green */
const WEEK3 = o => room(Object.assign({reg: 'green', skg: ['regression', 'PASS 48/48'], jjy: ['timing', 'MET ✓']}, o));

STORY.segs = {
  mon: {name: 'Week 1 · Monday', sub: 'A badge, a laptop, and a spec to read.', t: day(0), mood: 'day',
    scene() {room({kt: 'lobby', mine: ['login:', '_'], mineC: '#93a9b2'})}},
  tue: {name: 'Week 1 · Tuesday', sub: 'Registers. The simulator licence came through overnight.', t: day(1), mood: 'day',
    scene() {room({})}},
  wed: {name: 'Week 1 · Wednesday', sub: 'What happens when the processor asks for something that is not there.', t: day(2), mood: 'day',
    scene() {room({mine: ['pushed', 'ctrl + irq'], skg: ['regression', 'queued'], skgC: '#ffc94a'})}},
  thu: {name: 'Week 1 · Thursday', sub: 'The nightly regression ran your block for the first time.', t: day(3), mood: 'day',
    scene() {room({reg: 'red', skg: ['regression', 'FAIL 1/48'], skgC: '#ff8a7a'})}},
  fri: {name: 'Week 1 · Friday', sub: 'Green is not the same as done.', t: day(4), mood: 'day',
    scene() {room({reg: 'green', skg: ['regression', 'PASS 48/48']})}},
  mon2: {name: 'Week 2 · Monday', sub: 'Your RTL is merged. Now it has to become gates.', t: day(7), mood: 'day',
    scene() {room({reg: 'green', skg: ['regression', 'PASS 48/48'], jjy: ['synthesis', 'apb_regs…'], jjyC: '#ffc94a'})}},
  tue2: {name: 'Week 2 · Tuesday', sub: 'A warning in the synthesis log.', t: day(8), mood: 'day',
    scene() {room({reg: 'green', skg: ['regression', 'PASS 48/48'], jjy: ['synthesis', '1 warning'], jjyC: '#ffc94a'})}},
  wed2: {name: 'Week 2 · Wednesday', sub: 'The tools know nothing about speed until you tell them.', t: day(9), mood: 'day',
    scene() {room({reg: 'green', skg: ['regression', 'PASS 48/48'], jjy: ['constraints', 'none yet'], jjyC: '#93a9b2'})}},
  thu2: {name: 'Week 2 · Thursday', sub: 'The first timing report.', t: day(10), mood: 'day',
    scene() {room({reg: 'green', skg: ['regression', 'PASS 48/48'], jjy: ['timing', 'WNS -0.40'], jjyC: '#ff8a7a'})}},
  fri2: {name: 'Week 2 · Friday', sub: 'Sign-off.', t: day(11), mood: 'day',
    scene() {room({reg: 'green', skg: ['gate-level sim', 'PASS 48/48'], jjy: ['timing', 'MET ✓'], fpga: ['FPGA', 'irq cleared ✓']})}},
  mon3: {name: 'Week 3 · Monday', sub: 'The evaluation board is back. It runs on a battery, not on ones and zeros.', t: day(14), mood: 'day',
    scene() {WEEK3({fpga: ['EVB', 'VBAT ?'], fpgaC: '#ffc94a', psu: ['4.20 V', '0.00 A']})}},
  tue3: {name: 'Week 3 · Tuesday', sub: 'What your gates are made of.', t: day(15), mood: 'day',
    scene() {WEEK3({fpga: ['EVB', 'VBAT 96%'], fpgaC: '#7fe3c8'})}},
  wed3: {name: 'Week 3 · Wednesday', sub: 'The temperature sensor will not answer.', t: day(16), mood: 'day',
    scene() {WEEK3({fpga: ['I2C 0x48', 'NACK'], fpgaC: '#ff8a7a', scope: ['SDA ________']})}},
  thu3: {name: 'Week 3 · Thursday', sub: 'One press, four counts.', t: day(17), mood: 'day',
    scene() {WEEK3({fpga: ['capture', 'count 4/1'], fpgaC: '#ff8a7a', scope: ['_|‾|_|‾‾‾‾'], skg: ['board test', 'FAIL capture'], skgC: '#ff8a7a'})}},
  fri3: {name: 'Week 3 · Friday', sub: 'A gain of three, then the whole board.', t: day(18), mood: 'day',
    scene() {WEEK3({fpga: ['light', '0.28 V'], fpgaC: '#ffc94a', skg: ['board test', 'PASS 11/12']})}}
};

STORY.beats = [
  /* ═════════ Week 1 · Monday: arrival and the spec ═════════ */
  {seg: 'mon', to: 'kt', guide: 'Say hello to the person by the door',
    lines: () => [['kt', "You must be our new RTL engineer. Welcome to KT Silicon Labs! I'm KT."],
      ['kt', 'Everyone here started with one small block. Yours is the APB register block for the new timer.'],
      ['kt', "People in this industry like to joke that we're silicon serfs: we work the fields, the chip gets the glory. Don't let them scare you."],
      ['me', "I'll do my best."],
      ['kt', 'KLN leads the RTL team and will look after you. Back of the room, middle desk.']],
    after() {if (W) W.walk('kt', 'ceo')}},
  {seg: 'mon', to: 'kln', guide: 'Find KLN, your team lead',
    lines: () => [['kln', "Welcome. I'm KLN. Your block is small on purpose: three registers on APB, so the processor can set up the timer and read its status."],
      ['kln', 'Two weeks from now it should be RTL, verified, synthesized and meeting timing. That is the whole front-end in miniature.'],
      ['kln', 'Rule one here: no code before you have read the spec. QYL wrote it and will walk you through the bus.'],
      ['kln', 'Rule zero: log in. Your desk is the one at the front with the empty screen.']]},
  {seg: 'mon', to: 'mydesk', guide: 'Log in at your desk',
    lines: () => [['sys', 'You type your new username. The screen thinks about it, then says: account not found.'],
      ['sys', 'Your phone buzzes before you can try again.']],
    after() {if (W) W.screen('mine', ['account', 'not found'], '#ff8a7a')}},
  {seg: 'mon', ring: ['Marvin · IT', 'Incoming call', ANSWER],
    lines: () => [['marvin', "Hi, Marvin from IT. I can see you trying to log in. Your account exists, it just hasn't reached every server yet."],
      ['marvin', "The simulator licence is the slow part. You'll have it tomorrow morning. Sorry, first days are like this."]],
    mini(done) {
      say([['me', 'No simulator until tomorrow. What should I do with the rest of today?']], null, {choice: [
        ['Go straight to QYL and read the spec', () => {ST.d.wait = 'spec'; done()}],
        ['Sit with SKG and watch a regression run first', () => {ST.d.wait = 'skg'; done()}]]});
    },
    post: () => ST.d.wait === 'skg'
      ? [['sys', 'You walk over to the verification desk.'], ['skg', "Sure, pull up a chair. This is the regression: forty-eight tests, every night, on every block. Green means nothing broke."],
        ['skg', "When it goes red on your block, I'll come and find you. Now go and read the spec, QYL is waiting."]]
      : [['sys', 'You take a printed copy of the spec and head for the meeting room.']],
    after() {if (W) W.screen('mine', ['account OK', 'no licence'], '#ffc94a')}},
  {seg: 'mon', to: 'qyl', guide: 'Read the spec with QYL in the meeting room',
    lines: () => [['qyl', "Hi, I'm QYL. I wrote the spec, so blame me for anything confusing."],
      ['qyl', 'APB is the simplest bus on the chip. The Requester starts every transfer; your block is the Completer and answers.'],
      ['qyl', 'Each transfer takes two cycles. In SETUP, PSEL is 1 and PENABLE is 0: the address is there, but you do nothing yet.'],
      ['qyl', 'In ACCESS, both are 1, and the transfer completes on the clock edge at the end of it. Try it on the whiteboard.']],
    mini: miniPhases,
    post: () => PTS().phases === 4
      ? [['qyl', 'All four. Most people miss cycle 4: PSEL never drops, so only PENABLE tells you a new transfer started.']]
      : [['qyl', "Look at cycle 4 again: PSEL stays 1 and only PENABLE drops. That's a new transfer starting straight away."],
        ['qyl', 'Read section 3 tonight. It will make sense the second time.']]},

  /* ═════════ Week 1 · Tuesday: CTRL and the interrupt register ═════════ */
  {seg: 'tue', to: 'kln', guide: 'Get your first task from KLN',
    lines: () => [['kln', 'Licence works? Good. Three registers: CTRL, which the processor reads and writes; STATUS, read only; and IRQ, the interrupt register.'],
      ['kln', "Start with CTRL. It's 32 bits, but the processor can write just one byte of it. PSTRB says which bytes."],
      ['kln', "A byte whose strobe is 0 must keep its old value. Today you'll type real Verilog: the tools check it against every input, so any correct form passes."]]},
  {seg: 'tue', to: 'mydesk', guide: 'Write CTRL at your desk',
    lines: () => [['sys', 'You open apb_regs.v. The ports are there, the rest is empty.']],
    mini: done => codeTask(T_CTRL, done),
    post: () => [['sys', 'You copy the line for bytes 1 to 3, then fold all four into a for loop. CTRL is done.']]},
  {seg: 'tue', to: 'kln', guide: 'Show KLN, then get the next task',
    lines: () => [['kln', 'CTRL looks right. Now IRQ, the one people get wrong.'],
      ['kln', 'Hardware sets a bit when an event happens. The processor writes 1 to clear it. Writing 0 leaves a bit alone.'],
      ['kln', "And if a new event lands on the same edge as the clear, the bit stays 1. Lose that event and someone's interrupt never fires."]]},
  {seg: 'tue', to: 'mydesk', guide: 'Write the interrupt register',
    lines: () => [['sys', 'Someone left three versions of an interrupt register in an old branch. Before you write your own, you read theirs.']],
    mini: miniIrq,
    post: () => [['sys', 'One assignment, one result. You commit the file and push it.']],
    after() {if (W) W.screen('mine', ['pushed', 'ctrl + irq'], '#7fe3c8')}},

  /* ═════════ Week 1 · Wednesday: errors and lint ═════════ */
  {seg: 'wed', to: 'qyl', guide: 'Ask QYL about bus errors',
    lines: () => [['qyl', 'Section 4: errors. The processor can ask for an address where nothing lives, or try to write STATUS, which is read only.'],
      ['qyl', 'Either way your block raises PSLVERR in the ACCESS cycle, and only then. The bridge turns it into an error the software can see.'],
      ['qyl', 'In every other cycle it must be 0. Even in SETUP, even when the address is bad already.']]},
  {seg: 'wed', to: 'mydesk', guide: 'Write PSLVERR',
    lines: () => [['sys', 'You add PRDATA first, the way you would write any register: in the clocked block, loaded at the end of ACCESS.'],
      ['sys', 'Then PSLVERR.']],
    mini: done => codeTask(T_SLVERR, done),
    post: () => [['sys', 'You run lint before asking for review, the way KLN said to.']]},
  {seg: 'wed', to: 'kln', guide: 'Go through the lint report with KLN',
    lines: () => [['kln', 'Lint found three lines. Lint reads code the way a strict teacher does: it does not run anything, it just refuses to let things slide.'],
      ['kln', 'Tell me what is wrong with each.']],
    mini: miniLint,
    post: () => PTS().lint === 3
      ? [['kln', 'All three. Lint is boring until the day it saves you a chip.']]
      : [['kln', "Fix those three and run lint again yourself before you ask for review. It's faster than waiting for me."]]},

  /* ═════════ Week 1 · Thursday: a red regression ═════════ */
  {seg: 'thu', to: 'skg', guide: 'SKG wants to talk about the red light',
    lines: () => (ST.d.wait === 'skg' ? [['skg', 'Remember the regression I showed you on Monday? This is what red looks like up close.']] : [])
      .concat([['skg', 'Morning. Forty-seven tests pass. Test 12 reads STATUS and expects 5A. Your block returns 00.'],
        ['skg', "Don't panic, this is literally my job. Let's look at the waveform together."]]),
    mini: miniWave,
    post: () => PTS().wave === 2
      ? [['skg', "Exactly. Your data turns up one cycle after I've already looked. Make it combinational."]]
      : [['skg', "Look at cycle 3 again. That's ACCESS, and that's when I sample. Your 5A arrives in cycle 4, after the transfer is over."],
        ['skg', 'The fix is on your side: pick PRDATA straight from the address, no register.']]},
  {seg: 'thu', to: 'mydesk', guide: 'Fix PRDATA and push the change',
    lines: () => [['sys', 'You delete the register and choose PRDATA straight from the address. Four lines shorter.'],
      ['sys', 'PSLVERR was already an assign, so it was right all along: valid during ACCESS, exactly when it is sampled.']],
    after() {if (W) {W.screen('mine', ['pushed', 'fix: PRDATA'], '#7fe3c8'); W.tower('reg', 'amber'); W.screen('skg', ['regression', 'rerun…'], '#ffc94a')}}},
  {seg: 'thu', to: 'skg', guide: 'Help SKG make sure the bug never comes back',
    lines: () => [['skg', "Rerun is going. But a test only catches this if it happens to read STATUS and compare. Let's make it impossible to miss."],
      ['skg', 'An assertion sits next to the design and checks a rule on every clock edge, in every test, forever. You write this one: you know the bug best.']],
    mini: done => codeTask(T_ASSERT, done),
    post: () => [['skg', "Added. If anyone ever breaks PRDATA again, forty-eight tests will shout about it, not just one."]]},

  /* ═════════ Week 1 · Friday: coverage, review, the FPGA ═════════ */
  {seg: 'fri', to: 'skg', guide: 'Check the regression with SKG',
    lines: () => [['skg', 'Forty-eight out of forty-eight. Green.'],
      ['skg', "Now the uncomfortable question every verification engineer asks: green on what? Here's the coverage report."]],
    mini: miniCover,
    post: () => [['skg', "Two new tests, aimed at both zeros. Both pass. Now the green means something."]]},
  {seg: 'fri', to: 'kln', guide: 'Answer KLN\'s last review comment',
    lines: () => [['kln', 'Last review comment before I merge. Your PSLVERR is combinational, with no register. Why?']],
    mini(done) {
      say([['me', 'How do I answer?']], null, {choice: [
        ['It has to be right during ACCESS, like PRDATA', () => {ST.d.review = 'explain'; done()}],
        ["I'm not sure. Can you explain what you'd expect?", () => {ST.d.review = 'ask'; done()}],
        ['The tests pass, so it must be fine', () => {ST.d.review = 'argue'; done()}]]});
    },
    post: () => ST.d.review === 'explain'
      ? [['kln', 'Right answer, and the right reason. Approved.']]
      : ST.d.review === 'ask'
        ? [['kln', 'Good question to ask. The Requester samples it on the edge that ends ACCESS, so it must be valid in that cycle. A register would make it one cycle late, like your PRDATA was.'],
          ['kln', 'Your code is right. Now you know why. Approved.']]
        : [['kln', "Tests only prove what they check. Yesterday's PRDATA bug passed forty-seven tests, and this morning two cases had never been tested at all."],
          ['kln', 'It is right, because it must be valid during ACCESS. Next time, give me that reason instead. Approved.']]},
  {seg: 'fri', to: 'fpga', guide: 'Load your design onto the FPGA',
    lines: () => [['sys', 'You load the bitstream. The board blinks once and settles.'],
      ['sys', 'You write to CTRL from the test program. The timer starts, counts down, and raises an interrupt. The LED lights up.'],
      ['sys', 'You clear it with a 1. The LED goes out. Your registers, in real hardware, for the first time.']],
    after() {if (W) W.screen('fpga', ['FPGA', 'irq cleared ✓'], '#7fe3c8')}},
  {seg: 'fri', to: 'kln', guide: 'Tell KLN it works on the FPGA',
    lines: () => [['kln', "Then it's merged. Your RTL is part of the chip."],
      ['kln', "But an FPGA is forgiving. The real chip is built from a library of gates, at a real clock speed. Next week JJY takes you through synthesis and timing."],
      ['kln', 'Go home. Rest. Nanoseconds are tiring.']]},

  /* ═════════ Week 2 · Monday: what synthesis builds ═════════ */
  {seg: 'mon2', to: 'jjy', guide: 'Meet JJY, at the desk next to yours',
    lines: () => [['jjy', "Hi, I'm JJY. I've been sitting next to you for a week, being quiet. That's the synthesis and timing life."],
      ['jjy', 'Synthesis reads your RTL and builds it out of real cells from the factory\'s cell library: gates for the logic, flip-flops for anything that remembers.'],
      ['jjy', 'Every bit you assign in an always @(posedge PCLK) block becomes a flip-flop. Everything else becomes gates. So before I run it, tell me what to expect.']],
    mini: miniSynth,
    post: () => [['jjy', 'Thirty-six flip-flops, about four hundred gates. A small block, as it should be. The netlist goes to the timing tools next.']]},

  /* ═════════ Week 2 · Tuesday: a latch ═════════ */
  {seg: 'tue2', ring: ['Marvin · IT', 'Incoming call', ANSWER],
    lines: () => [['marvin', "Marvin again. Good news: the synthesis licence you didn't know you needed has been renewed."],
      ['marvin', "Bad news: it expired at midnight, so last night's run failed. JJY reran it by hand. You're welcome. I mean, JJY is welcome."]]},
  {seg: 'tue2', to: 'jjy', guide: 'JJY found a warning in the synthesis log',
    lines: () => [['jjy', "One warning from last night's run: latch inferred for rdata. Not your block, the timer next door. But you'll meet this one a lot."],
      ['jjy', 'A latch is what synthesis builds when combinational code forgets to give an output a value on some path. The output has to remember, so it gets memory you never asked for.']],
    mini: miniLatch,
    post: () => [['jjy', 'No warnings now. Plain gates, the way it was meant to be.']]},

  /* ═════════ Week 2 · Wednesday: constraints ═════════ */
  {seg: 'wed2', to: 'jjy', guide: 'Write the timing constraints with JJY',
    lines: () => [['jjy', "Synthesis has been running with no idea how fast the chip must go. That's like ordering a car without saying where the road is."],
      ['jjy', 'We tell it with constraints, in SDC: a few lines of commands. The clock first, then when the inputs arrive.']],
    mini: done => codeTask(T_CLOCK, () => codeTask(T_INDELAY, done)),
    post: () => [['jjy', "Two lines, and now every path in your block has a deadline. Tomorrow we find out which ones miss it."]]},

  /* ═════════ Week 2 · Thursday: setup and hold ═════════ */
  {seg: 'thu2', to: 'jjy', guide: 'Read the timing report with JJY',
    lines: () => [['jjy', "Static timing analysis ran overnight. It doesn't simulate anything: it adds up the delay of every timing path and compares it with the clock."],
      ['jjy', 'Your block is fine. The timer next door has a path with negative slack. Work it out with me.']],
    mini: done => codeTask(T_SETUP, done),
    post: () => [['jjy', 'Four hundred picoseconds late. Before I fix it, I need to know if this path is allowed to take an extra cycle. That is a spec question.']]},
  {seg: 'thu2', to: 'qyl', guide: 'Ask QYL whether the path can take an extra cycle',
    lines: () => [['qyl', 'The compare result feeds the interrupt. One more cycle of latency there is fine: software never notices 5 ns.'],
      ['qyl', "I'll add a line to the spec, so nobody \"fixes\" it back later."]]},
  {seg: 'thu2', to: 'jjy', guide: 'Fix the timing with JJY',
    lines: () => [['jjy', 'QYL said yes? Then we have options.']],
    mini: done => miniSetupFix(() => codeTask(T_HOLD, () => miniHoldFix(done))),
    post: () => [['jjy', 'Pipeline for the slow path, two delay buffers for the fast one. Rerunning.'],
      ['jjy', 'A setup check fails when a path is too slow for the clock. A hold check fails when a path is too fast for the flip-flop. Remember that and you are already ahead of most people.']]},

  /* ═════════ Week 2 · Friday: sign-off and lunch ═════════ */
  {seg: 'fri2', to: 'jjy', guide: 'Check the final timing with JJY',
    lines: () => [['jjy', 'Every path passes its setup check and its hold check. Timing is met.'],
      ['jjy', 'That is sign-off for your block. It goes into the tape-out database with everything else.']]},
  {seg: 'fri2', to: 'skg', guide: 'See SKG\'s last regression',
    lines: () => [['skg', 'I ran the whole regression on the netlist JJY made: gate-level simulation. Forty-eight out of forty-eight, assertions and all.'],
      ['skg', "Your assertion fired zero times. That's the only time I'm happy when something I wrote does nothing."]]},
  {seg: 'fri2', to: 'kln', guide: 'Report to KLN',
    lines: () => [['kln', 'Spec, RTL, verification, synthesis, timing. Your block went through the whole front-end in two weeks.'],
      ['kln', 'KT buys lunch for everyone who finishes their first block. The pantry, now, before it gets cold.']],
    after() {if (W) {W.put('kt', 'pantry2'); W.show('kt', true)}}},
  {seg: 'fri2', to: 'kt', guide: 'Join KT for lunch in the pantry', t: day(11, 750),
    lines: () => [['kt', 'There you are. KLN tells me your block has signed off.']].concat(score() >= 30
      ? [['kt', 'And that you got most of it right the first time. That is rare in your first two weeks.']]
      : [['kt', 'And that you made mistakes and fixed every one of them. That is exactly what the first two weeks are for.']])
      .concat([['kt', 'Silicon serfs, they call us. Long days in the fields, and the chip takes the credit.'],
        ['kt', 'But every chip that ships is made of first blocks like yours. Welcome to the team. Eat something.'],
        ['kt', 'And on Monday the evaluation board comes back. WSL from the lab wants a digital engineer at the bench. That will be you.']])},

  /* ═════════ Week 3 · Monday: a battery and two resistors ═════════ */
  {seg: 'mon3', to: 'wsl', guide: 'Meet WSL at the lab bench',
    lines: () => [['wsl', "Hi, I'm WSL. Analog design. You've walked past my bench for two weeks; I was the one muttering at the oscilloscope."],
      ['wsl', 'The evaluation board for the timer chip is back. Your registers are inside the chip. Everything around it is my problem, and this week yours too.'],
      ['wsl', 'The board runs on a lithium battery: 4.2 V when it is full. The chip has an ADC to watch it, but the ADC only reads up to 1.2 V.'],
      ['wsl', "So we divide the battery down with two resistors. Ohm's law, the oldest equation in the building. Paper first."]],
    mini: done => codeTask(T_OHM, done),
    post: () => [['wsl', 'Forty kilohms. Which you cannot buy: resistors come in standard values. So we pick real ones that land close enough.']]},
  {seg: 'mon3', to: 'fpga', guide: 'Wire the battery monitor at the bench',
    lines: () => [['sys', 'WSL opens the board schematic on the bench monitor: the battery, two resistors, the ADC pin, and no wires yet.']],
    mini: done => wireTask(T_DIVIDER, done),
    post: () => [['wsl', 'Battery monitor done. It draws a few microamps forever, which is why the resistors are big. A battery notices everything.']],
    after() {if (W) {W.screen('fpga', ['EVB', 'VBAT 96%'], '#7fe3c8'); W.screen('psu', ['4.20 V', '0.03 mA'], '#ff9e64')}}},

  /* ═════════ Week 3 · Tuesday: transistors ═════════ */
  {seg: 'tue3', to: 'jjy', guide: 'JJY has a question about gates',
    lines: () => [['jjy', 'Remember the four hundred gates synthesis built from your RTL? I only ever see them as names in a library: NAND2, INV, DFF.'],
      ['jjy', 'WSL has seen inside one. Go and ask, then come back and explain it to me. I have always wanted to know and never dared ask.']]},
  {seg: 'tue3', to: 'wsl', guide: 'Ask WSL what a gate is made of',
    lines: () => [['wsl', 'A gate is transistors, used as switches. Two kinds: an NMOS switch closes when its gate is 1, a PMOS switch closes when its gate is 0.'],
      ['wsl', 'CMOS uses both. PMOS switches pull the output up to VDD, NMOS switches pull it down to ground, and for every input exactly one side conducts.'],
      ['wsl', 'Quick check first, then build me a NAND.']],
    mini: done => miniMos(() => wireTask(T_NAND, done)),
    post: () => [['wsl', "Four transistors. The NAND2 in JJY's library is exactly this, drawn very, very small."]]},
  {seg: 'tue3', to: 'jjy', guide: 'Explain the NAND gate to JJY',
    lines: () => [['me', 'Two NMOS in series to ground, two PMOS side by side to VDD. Both inputs must be 1 to pull the output low.'],
      ['jjy', 'So that is why NAND is the cheapest gate in the library, and AND costs more: an AND is a NAND with an inverter after it.'],
      ['jjy', 'I will never read a netlist the same way again. Thank you.']]},

  /* ═════════ Week 3 · Wednesday: I²C pull-ups ═════════ */
  {seg: 'wed3', to: 'wsl', guide: 'Find out why the sensor will not answer',
    lines: () => [['wsl', 'The chip talks to a temperature sensor over I²C: two wires, SDA for data and SCL for the clock. The sensor never answers.'],
      ['wsl', 'On I²C nobody drives a line high. Every chip can only pull it low, or let go: open drain. When everyone lets go, a resistor to VDD pulls the line back up.'],
      ['wsl', 'There are no pull-ups on this board. Someone forgot them, and that someone was me. Before we add them: how fast does a line rise?']],
    mini: done => codeTask(T_RISE, done),
    post: () => [['wsl', 'Under 1000 ns. A smaller resistor would be faster, but then the pin has to sink more current when it pulls low. Pick carefully.']]},
  {seg: 'wed3', to: 'fpga', guide: 'Add the I²C pull-ups on the board',
    lines: () => [['sys', 'The schematic: the timer chip on the left, the sensor on the right, VDD at the top, two empty places for resistors.']],
    mini: done => wireTask(T_PULLUP, done),
    post: () => [['sys', 'WSL solders two resistors onto the board. The bus analyser scrolls: address 0x48, ACK, two bytes.'],
      ['wsl', 'Twenty-three and a half degrees. It talks. Thank you, digital person.']],
    after() {if (W) {W.screen('fpga', ['I2C 0x48', 'temp 23.5 C'], '#7fe3c8'); W.screen('scope', ['‾|_|‾|_|‾'], '#7fe3c8')}}},

  /* ═════════ Week 3 · Thursday: a bouncing button ═════════ */
  {seg: 'thu3', to: 'skg', guide: 'SKG found a strange bug on the board',
    lines: () => [['skg', 'The board test presses the capture button once and expects the timer to count one. It counts four. Sometimes six.'],
      ['skg', 'Your RTL passed every test, so for once this is not a digital bug. It is a mechanical one. Ask WSL.']]},
  {seg: 'thu3', to: 'wsl', guide: 'Ask WSL why one press counts four times',
    lines: () => [['wsl', 'Contact bounce. When metal hits metal it bounces for a few milliseconds, and your timer sees every bounce as a press.'],
      ['wsl', 'The fix is a low-pass filter: a resistor in series, a capacitor to ground. Slow changes, like a press, get through. Fast ones are smoothed away.']],
    mini: done => codeTask(T_RC, done),
    post: () => [['wsl', 'Sixteen hertz: a time constant of 10 ms, and bounce is over in 5. Now build one.']]},
  {seg: 'thu3', to: 'fpga', guide: 'Build the button filter',
    lines: () => [['sys', "The button on the left, the timer's capture pin on the right. A resistor, a capacitor, and a drawer of values."]],
    mini: done => wireTask(T_FILTER, done),
    post: () => [['sys', 'You press the button once. The timer counts one. You press it ten times. Ten.']],
    after() {if (W) {W.screen('fpga', ['capture', 'count 10/10'], '#7fe3c8'); W.screen('skg', ['board test', 'PASS capture'], '#7fe3c8')}}},
  {seg: 'thu3', to: 'wsl', guide: 'Tell WSL the button counts right',
    lines: () => [['wsl', 'Ten for ten. But the filter is only half the fix. The other half is digital, so it is yours.']],
    mini: miniSync,
    post: () => PTS().sync === 2
      ? [['wsl', 'Both right. Analog cleans up the edge; digital makes it safe to use. The boundary needs both sides.']]
      : [['wsl', 'The filter makes the edge slow, so the pin needs hysteresis. And anything from outside the clock needs two flip-flops before your logic touches it.'],
        ['wsl', 'Every chip has a border like this. Most of the bugs that escape to customers live on it.']]},

  /* ═════════ Week 3 · Friday: an amplifier, then the whole board ═════════ */
  {seg: 'fri3', to: 'qyl', guide: 'QYL has one last item for the board',
    lines: () => [['qyl', 'Last part of the board: a light sensor. Its output goes from 0 to 0.4 V. The ADC reads 0 to 1.2 V.'],
      ['qyl', 'Fed straight in, the sensor would only ever use a third of the ADC. The spec says: amplify by three. WSL has the op-amp.']]},
  {seg: 'fri3', to: 'wsl', guide: 'Design the amplifier with WSL',
    lines: () => [['wsl', 'An op-amp has two inputs, one output, and one habit: it moves its output until both inputs are at the same voltage.'],
      ['wsl', 'Put the signal on the + input and feed a third of the output back to the − input. To make the inputs equal, the output has to be three times the signal.']],
    mini: done => codeTask(T_GAIN, () => wireTask(T_AMP, done)),
    post: () => [['wsl', 'A gain of three. That was the last part. Power up the whole board.']],
    after() {if (W) W.walk('kt', 'lab')}},
  {seg: 'fri3', to: 'fpga', guide: 'Power up the whole board',
    lines: () => [['sys', 'You switch on the bench supply. Battery 96%. Temperature 23.5 °C. Light 0.84 V on the ADC. One press, one count.'],
      ['sys', 'Your registers, inside a chip, on a board that works.']],
    after() {if (W) {W.screen('fpga', ['EVB', 'all OK ✓'], '#7fe3c8'); W.screen('skg', ['board test', 'PASS 12/12'], '#7fe3c8')}}},
  {seg: 'fri3', to: 'kt', guide: 'KT came down to the lab',
    lines: () => [['kt', 'I heard the board works. I had to see it for myself.'],
      ['kt', 'Three weeks ago you had a badge and a laptop. Since then you wrote the RTL, verified it, signed it off, and wired up the board it lives on.']].concat(got(SUBJECTS[5]) >= 18
      ? [['kt', 'WSL says you got most of the analog right the first time. Most digital engineers never even look at the other side of the pin.']]
      : [['kt', 'WSL says the analog side made you sweat. Good. Most digital engineers never even look at the other side of the pin.']])
      .concat([['kt', 'Next: the timer itself. Go home. Rest. Nanoseconds are tiring, and microamps are worse.']])},
  {seg: 'fri3', end: true, t: day(18, 1050),
    lines: () => [['sys', 'Three weeks. One block, from spec to sign-off, and the board it lives on. Next: the timer itself.']]}
];

/* Ending card: written from what actually happened */
STORY.ending = () => {
  const s = score(), r = s / SCORE_MAX;
  const best = SUBJECTS.slice().sort((a, b) => got(b) / most(b) - got(a) / most(a))[0], worst = SUBJECTS.slice().sort((a, b) => got(a) / most(a) - got(b) / most(b))[0];
  return {
    title: r >= .9 ? 'Tape-out material' : r >= .65 ? 'Promising serf' : 'Serf in training',
    sub: r >= .9 ? 'Your first block and its board, from spec to bench, nearly flawless.' : r >= .65 ? 'Your first block signed off and its board works. A few bruises on the way.' : 'Your first block signed off, its board works, and you learned where every trap is.',
    led: '3 weeks',
    tl: [['WEEK 1', 'RTL and verification'], ['WEEK 2', 'Synthesis and timing'], ['WEEK 3', 'Analog and the board']],
    stats: SUBJECTS.map(x => [x[0], got(x) + ' / ' + most(x)])
      .concat([['Review', ST.d.review === 'explain' ? 'Explained' : ST.d.review === 'ask' ? 'Asked why' : 'Argued']]),
    lines: [
      'Score: ' + s + ' out of ' + SCORE_MAX + '.',
      got(best) === most(best) ? 'Your strongest subject: ' + best[0] + ', without a single point dropped.' : 'Your strongest subject: ' + best[0] + '.',
      got(worst) < most(worst) ? 'Worth another look: ' + worst[0] + ' (' + got(worst) + ' of ' + most(worst) + ').' : 'Every subject, full marks.',
      ST.d.review === 'explain' ? 'KLN approved your RTL on your own explanation.' : ST.d.review === 'ask' ? 'You asked KLN why, and came away knowing the reason behind your own code.' : 'KLN approved your RTL, and reminded you that passing tests are not a reason.',
      ST.d.wait === 'skg' ? 'You watched a regression on your first day, so the red light on Thursday did not scare you.' : 'You read the spec before writing a line, as KLN asked.'
    ],
    share: 'Silicon Serf: I took my first chip block from spec to sign-off, then wired up the board it lives on. ' + s + ' / ' + SCORE_MAX + '.'
  };
};

/* Talking to someone who is not the next step */
const CHAT = {
  kln: ['Questions are cheaper than bugs. Ask early.', 'Read the spec, then read it again.'],
  skg: ['If I find nothing, I worry my tests are too easy.', 'Every bug I find here is one the customer never sees.'],
  qyl: ['If the spec is unclear, tell me. Then it is my bug, not yours.', 'Every register bit has a reason. Ask me about any of them.'],
  jjy: ['Every path has a deadline. Most of them do not know it yet.', 'A nanosecond is about thirty centimetres of light. Chips are small for a reason.'],
  wsl: ['Everything is analog if you zoom in far enough.', 'A one and a zero are just two voltages we agreed not to argue about.', 'The scope never lies. The probe sometimes does.'],
  kt: ['Go on, the team is waiting for you.', 'My door is always open. It is also made of glass, so I see who walks past it.', 'That wafer on the stand is from our first tape-out. Every die on it worked.']
};
let chatN = 0;
STORY.talk = id => {
  const L = CHAT[id];
  if (!L) return false;
  busy = true; showGuide();
  say([[id, L[chatN % L.length]]], () => {busy = false; showGuide()}, {end: 'OK'});
  chatN += 1;
  return true;
};
