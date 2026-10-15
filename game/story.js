/* Opening Shift: the half hour, beat by beat.
   STORY.segs  the moments of the day (title card name, subtitle, start time in minutes after midnight, light)
   STORY.beats one thing to do at a time: who or where to go (to), the "next step" line (guide), what is said (lines),
               an optional mini-game (mini), what is said after it (post), and what changes in the world (after).
   ST.d keeps what the player chose; the ending is written from it. */
STORY.segs = {
  open: {name: 'Before opening', sub: 'The café opens at seven. You have half an hour.', t: 390, mood: 'eve',
    scene() {W.show('sam', false); W.screen('machine', ['ESPRESSO', 'OFF'], '#93a9b2')}},
  dial: {name: 'Dialing in', sub: 'The first shot of the day is never quite right.', t: 405, mood: 'day',
    scene() {W.screen('machine', ['ESPRESSO', 'READY'], '#7fe3c8')}},
  first: {name: 'Doors open', sub: 'Someone is already waiting outside.', t: 420, mood: 'day',
    scene() {W.put('sam', 'door'); W.show('sam', true)}}
};

STORY.beats = [
  {seg: 'open', to: 'mia', guide: 'Say good morning to Mia behind the bar',
    lines: () => [['mia', "Morning! You're on bar today. First job: switch on the espresso machine."],
      ['mia', 'It takes a while to heat up. If we wait until seven, the first customers wait with us.'],
      ['me', 'On it.']]},
  {seg: 'open', to: 'machine', guide: 'Switch on the espresso machine',
    lines: () => [['sys', 'You flip the switch. The boiler starts to hum and the pressure gauge slowly climbs.'],
      ['sys', 'The group head has to get hot too, or the first shots come out sour.']],
    after() {if (W) W.screen('machine', ['ESPRESSO', 'HEATING…'], '#ffc94a')}},
  {seg: 'open', ring: ['Dairy delivery', 'Incoming call', ANSWER],
    lines: () => [['drv', "Hi, it's the dairy run. Bad news: I'm stuck in traffic, about forty minutes behind."],
      ['drv', "You'll be short on milk for the first hour. Sorry!"]],
    mini(done) {
      say([['mia', 'Short on milk at opening. What do you want to do?']], null, {choice: [
        ['Run to the corner shop for a few cartons', () => {ST.d.milk = 'shop'; done()}],
        ["Make it work with what's in the fridge", () => {ST.d.milk = 'fridge'; done()}]]});
    },
    post: () => ST.d.milk === 'shop'
      ? [['sys', 'You jog to the corner shop and back. Four cartons, slightly out of breath.'], ['mia', 'Good. That covers us until the van gets here.']]
      : [['mia', "Okay. We'll save the milk for the regulars and suggest black coffee to everyone else."]]},
  {seg: 'dial', to: 'grinder', guide: 'Dial in the grinder',
    lines: () => [['mia', "Machine's hot. Now the grinder. Pull a shot and watch the timer."],
      ['mia', 'Most baristas aim for somewhere around 25 to 30 seconds. Too fast usually tastes sour, too slow tastes bitter.']],
    mini: miniShot},
  {seg: 'dial', to: 'mia', guide: 'Let Mia taste your shot',
    lines: () => ST.d.ok
      ? [['mia', `${ST.d.time} seconds. Let me taste… Yes. Sweet, a little bright. That's the one.`], ['mia', `Leave the grinder on ${ST.d.grind}.`]]
      : [['mia', 'Still running fast. Let me nudge it… There. Coffee changes every day; you learn it by doing it every morning.'], ['mia', "We'll leave it on 5."]]},
  {seg: 'first', to: 'door', guide: 'Unlock the front door',
    lines: () => [['sys', 'You turn the sign to OPEN. Cold air comes in, and so does Sam.'],
      ['sam', 'Morning! First again, am I?']],
    after() {if (W) W.walk('sam', 'till')}},
  {seg: 'first', to: 'sam', guide: "Take Sam's order at the till",
    lines: () => [['sam', 'The usual, please. A flat white.']].concat(ST.d.milk === 'fridge'
      ? [['me', "We're short on milk this morning, but there's enough for a regular."], ['sam', "I'll take that as a compliment."]]
      : [['me', 'Coming right up.']])},
  {seg: 'first', end: true, t: 422,
    lines: () => [['sys', 'The first cup goes out at two minutes past seven. The day has started.']]}
];

/* Mini-game: pick a grind setting, pull a shot, read the time. 1 is finest (slow), 9 is coarsest (fast). */
function miniShot(done) {
  let g = 8, shots = 0, last = null;
  const timeOf = s => Math.round(46 - s * 3.4 + (Math.random() * 2 - 1));   // a made-up model: finer grind, slower shot
  const draw = () => {
    const verdict = last == null ? '' : last < 25 ? 'Too fast: thin and sour.' : last > 30 ? 'Too slow: heavy and bitter.' : 'In the window. Taste it.';
    setPanel('<p>Grind setting: <b class="mono">' + g + '</b> (1 = finest, 9 = coarsest)</p>'
      + '<div class="row"><button class="btn" id="finer" type="button">Finer</button><button class="btn" id="coarser" type="button">Coarser</button><button class="btn btn-primary" id="pull" type="button">Pull a shot</button></div>'
      + (last == null ? '<p class="fine">Aim for 25–30 seconds.</p>' : '<p>Shot ' + shots + ': <b class="mono">' + last + ' s</b>. ' + verdict + '</p>')
      + (last != null && (last >= 25 && last <= 30 || shots >= 5) ? nextBtn('Done') : ''), 'Dial in the grinder');
    $('#finer').onclick = () => {g = Math.max(1, g - 1); draw()};
    $('#coarser').onclick = () => {g = Math.min(9, g + 1); draw()};
    $('#pull').onclick = () => {shots++; last = timeOf(g); SFX.blip(); draw()};
    if ($('#next')) $('#next').onclick = () => {ST.d.shots = shots; ST.d.grind = g; ST.d.time = last; ST.d.ok = last >= 25 && last <= 30; hidePanel(); done()};
  };
  draw();
}

/* Ending card: written from what actually happened */
STORY.ending = () => ({
  title: 'Doors open',
  tl: ['open', 'dial', 'first'].map(k => [clockOf(STORY.segs[k].t), STORY.segs[k].name]),
  sub: ST.d.ok ? 'You dialed in the first shot yourself.' : 'Mia dialed in the grinder this time.',
  stats: [['Shots pulled', ST.d.shots || 0], ['Grind setting', ST.d.ok ? ST.d.grind : 5], ['Milk', ST.d.milk === 'shop' ? 'Corner shop' : 'Fridge only']],
  lines: [ST.d.milk === 'shop' ? 'The milk van arrived at 07:20. Nobody noticed it had been late.' : 'Two customers took black coffee instead. One of them said they liked it better.',
    'Tomorrow the beans will be a day older, and you will dial in again.']
});

/* Talking to someone who is not the next step */
STORY.talk = id => {
  if (id === 'mia' && ST.seg === 'open' && ST.q === 1) {busy = true; showGuide(); say([['mia', 'Machine first. The switch is on the right side.']], () => {busy = false; showGuide()}, {end: 'OK'}); return true}
  return false;
};
