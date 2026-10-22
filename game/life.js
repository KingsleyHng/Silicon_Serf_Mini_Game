/* Office life: while you walk around freely, now and then someone gets up for a coffee or goes over to a colleague's desk for a chat,
   then goes back to their seat. Nobody leaves while a conversation, a task or a card is open, and the moment one opens everyone who is away
   walks straight back, so the story always finds people where it expects them. Runs on MOVE.after (every 0.2 s) and uses only W. */
const LIFE = {
  /* Where a visitor stands next to each person's desk (nodes in office.js), and the break spots: [node, [x, z] to look at] */
  visit: {kln: 'klnV', skg: 'skgV', jjy: 'jjyV', wsl: 'wslV', jjh: 'jjhV', qyl: 'qylV', kt: 'ktV'},
  breaks: [['pantry', [8.6, -1.4]], ['pantry2', [8.6, .2]], ['cooler', [-8.6, .45]]],
  /* What people say when they get to a colleague, what the colleague answers, and what they say on a break */
  ask: {
    kln: ['Got a minute for a review?', 'How is the merge going?', 'Lunch later?'],
    skg: ['The nightly run finished. Want the summary?', 'Did you touch the testbench?', 'Coverage went up again.'],
    jjy: ['Who changed the clock constraints?', 'Your netlist is 3% smaller now.', 'Hold slack looks fine today.'],
    wsl: ['Has anyone seen my scope probe?', 'The board needs another pull-up.', 'Coffee first, then the ADC.'],
    jjh: ['Did anyone touch the scan settings?', 'Coverage went up two points overnight.', 'Is that memory on the BIST list?'],
    qyl: ['I updated the spec. Again.', 'Quick question about the bus.', 'Can I borrow you for five minutes?'],
    kt: ['How is everyone doing?', 'Anything blocking you?', 'Good work this week.']
  },
  reply: ['Sure.', 'Give me a second.', 'Good timing.', 'Mostly green.', 'Again?', 'Let me finish this line.', 'Sounds good.'],
  rest: ['Coffee time.', 'Who finished the oat milk?', 'Just stretching my legs.', 'One more cup.', 'Water break.']
};
const life = {away: {}, next: 0, freeSince: 0, last: {}};
const pickOne = a => a[Math.random() * a.length | 0];
const seatOf = id => WORLD.cast[id] && WORLD.cast[id].seat;
/* At their own seat and free to get up: not hidden, not walking, not put somewhere else by the story, not the person you are looking for,
   not already talking to someone who came over (except the visitor `by`) */
function lifeIdle(id, by) {
  const st = seatOf(id), b = curBeat();
  if (!st || !W.has(id) || life.away[id] || !W.snap().vis[id] || (b && b.to === id)) return false;
  for (const k in life.away) if (k !== by && life.away[k].to === id) return false;
  const d = W.dest(id), n = W.node(st.node);
  return !!d && !!n && Math.min(Math.hypot(d[0] - st.at[0], d[1] - st.at[1]), Math.hypot(d[0] - n[0], d[1] - n[1])) < .3;
}
/* A line over someone's head, only when you are close enough to notice */
function lifeSay(id, text) {
  const s = W.snap(), p = s[id];
  if (p && Math.hypot(p[0] - s.me[0], p[1] - s.me[1], p[2] - s.me[2]) < 11) bubble(id, text, 2600);
}
function lifeStart(id, now) {
  const a = {t: now, phase: 'go'}, friends = Object.keys(LIFE.visit).filter(k => k !== id && lifeIdle(k)),
    taken = Object.keys(life.away).map(k => life.away[k].spot), spots = LIFE.breaks.filter(b => taken.indexOf(b[0]) < 0);
  if (friends.length && (Math.random() < .55 || !spots.length)) {a.to = pickOne(friends); a.spot = LIFE.visit[a.to]}
  else if (spots.length) {const b = pickOne(spots); a.spot = b[0]; a.look = b[1]}
  else return;
  life.away[id] = a; life.last[id] = now;
  W.walk(id, a.spot, () => {
    if (life.away[id] !== a || !MOVE.can()) return;   /* called back, or the walk ended because a conversation started */
    a.phase = 'stay'; a.until = performance.now() + 8000 + Math.random() * 5000;
    if (a.to && lifeIdle(a.to, id)) {
      W.face(id, a.to); W.up(a.to, true); W.face(a.to, id); lifeSay(id, pickOne(LIFE.ask[id] || LIFE.reply));
      setTimeout(() => {if (life.away[id] === a && MOVE.can()) lifeSay(a.to, pickOne(LIFE.reply))}, 2800);
    } else {a.to = null; if (a.look) W.look(id, a.look[0], a.look[1]); if (Math.random() < .5) lifeSay(id, pickOne(LIFE.rest))}
  });
}
/* Everyone who is away goes back to their seat (when a conversation, task or card opens) */
function lifeHome() {
  for (const id in life.away) {
    const a = life.away[id]; delete life.away[id];
    if (a.to && dlg.hidden) W.up(a.to, false);
    W.walk(id, seatOf(id).node);
  }
}
MOVE.after = () => {
  if (!W) return;
  const now = performance.now();
  if (!ST.on) {life.away = {}; life.freeSince = 0; return}
  if (!MOVE.can()) {lifeHome(); life.freeSince = 0; return}
  if (!life.freeSince) {life.freeSince = now; life.next = now + 5000 + Math.random() * 6000}
  for (const id in life.away) {
    const a = life.away[id];
    if (a.phase === 'stay' && now > a.until) {
      a.phase = 'back'; if (a.to) W.up(a.to, false);
      W.walk(id, seatOf(id).node, () => {if (life.away[id] === a) delete life.away[id]});
    }
  }
  if (now < life.next) return;
  life.next = now + 12000 + Math.random() * 14000;
  if (Object.keys(life.away).length >= 2) return;
  const who = Object.keys(LIFE.visit).filter(id => lifeIdle(id) && now - (life.last[id] || -1e9) > 60000);
  if (who.length) lifeStart(pickOne(who), now);
};
