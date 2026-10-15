/* 開店前半小時：一件一件做。
   STORY.segs  一天裡的幾個時刻（字卡上的名字、副標、開始的時間＝午夜起算的分鐘、光線）
   STORY.beats 一次一件事：去找誰或去哪裡（to）、「下一步」那一行（guide）、講什麼（lines）、
               小遊戲（mini）、小遊戲之後講什麼（post）、世界怎麼變（after）。
   ST.d 記玩家選了什麼；結算照它寫。 */
STORY.segs = {
  open: {name: '開店前', sub: '七點開門，你還有半小時。', t: 390, mood: 'eve',
    scene() {W.show('sam', false); W.screen('machine', ['ESPRESSO', '關機'], '#93a9b2')}},
  dial: {name: '調磨豆機', sub: '每天的第一杯濃縮，都不會剛好。', t: 405, mood: 'day',
    scene() {W.screen('machine', ['ESPRESSO', '可以用了'], '#7fe3c8')}},
  first: {name: '開門', sub: '門外已經有人在等了。', t: 420, mood: 'day',
    scene() {W.put('sam', 'door'); W.show('sam', true)}}
};

STORY.beats = [
  {seg: 'open', to: 'mia', guide: '跟吧台後面的米亞說早安',
    lines: () => [['mia', '早！今天你站吧台。第一件事：把咖啡機打開。'],
      ['mia', '它要熱一陣子。等到七點才開，第一批客人就得跟我們一起等。'],
      ['me', '好，我去。']]},
  {seg: 'open', to: 'machine', guide: '打開咖啡機',
    lines: () => [['sys', '你按下開關。鍋爐開始嗡嗡響，壓力表慢慢往上爬。'],
      ['sys', '沖煮頭也要夠熱，不然一開始的濃縮會偏酸。']],
    after() {if (W) W.screen('machine', ['ESPRESSO', '預熱中…'], '#ffc94a')}},
  {seg: 'open', ring: ['鮮奶配送', '來電', ANSWER],
    lines: () => [['drv', '你好，我是送鮮奶的。壞消息：塞車，大概會晚四十分鐘。'],
      ['drv', '開店第一個小時，鮮奶會不夠。抱歉！']],
    mini(done) {
      say([['mia', '一開店就缺鮮奶。你想怎麼辦？']], null, {choice: [
        ['跑去巷口的便利商店買幾瓶', () => {ST.d.milk = 'shop'; done()}],
        ['先用冰箱裡現有的撐一下', () => {ST.d.milk = 'fridge'; done()}]]});
    },
    post: () => ST.d.milk === 'shop'
      ? [['sys', '你跑去巷口又跑回來，抱著四瓶鮮奶，有點喘。'], ['mia', '很好，撐到配送的車來應該夠。']]
      : [['mia', '好。鮮奶留給熟客，其他人就推黑咖啡。']]},
  {seg: 'dial', to: 'grinder', guide: '調磨豆機',
    lines: () => [['mia', '機器熱了。接下來調磨豆機：萃取一份，看計時器。'],
      ['mia', '大部分咖啡師會抓 25 到 30 秒左右。太快通常會酸，太慢會苦。']],
    mini: miniShot},
  {seg: 'dial', to: 'mia', guide: '請米亞試喝你的濃縮',
    lines: () => ST.d.ok
      ? [['mia', `${ST.d.time} 秒。我試試看……嗯，甜，帶一點果酸。就是這杯。`], ['mia', `磨豆機就停在 ${ST.d.grind}。`]]
      : [['mia', '還是太快。我幫你轉一下……好了。咖啡豆每天都不一樣，每天早上做，就會越來越有感覺。'], ['mia', '今天先停在 5。']]},
  {seg: 'first', to: 'door', guide: '打開前門',
    lines: () => [['sys', '你把牌子翻到「營業中」。冷空氣跟著阿山一起進來。'],
      ['sam', '早！我又是第一個嗎？']],
    after() {if (W) W.walk('sam', 'till')}},
  {seg: 'first', to: 'sam', guide: '在櫃台幫阿山點餐',
    lines: () => [['sam', '老樣子，一杯小白咖啡。']].concat(ST.d.milk === 'fridge'
      ? [['me', '今天鮮奶有點少，不過熟客的份一定有。'], ['sam', '那我就當作是稱讚了。']]
      : [['me', '馬上來。']])},
  {seg: 'first', end: true, t: 422,
    lines: () => [['sys', '七點零二分，第一杯送出去。今天開始了。']]}
];

/* 小遊戲：選研磨度、萃取一份、看時間。1 最細（慢），9 最粗（快）。 */
function miniShot(done) {
  let g = 8, shots = 0, last = null;
  const timeOf = s => Math.round(46 - s * 3.4 + (Math.random() * 2 - 1));   // 遊戲用的簡化模型：磨得越細，萃取越慢
  const draw = () => {
    const verdict = last == null ? '' : last < 25 ? '太快：水水的，偏酸。' : last > 30 ? '太慢：很重，偏苦。' : '在範圍裡，試喝看看。';
    setPanel('<p>研磨度：<b class="mono">' + g + '</b>（1 最細，9 最粗）</p>'
      + '<div class="row"><button class="btn" id="finer" type="button">磨細一點</button><button class="btn" id="coarser" type="button">磨粗一點</button><button class="btn btn-primary" id="pull" type="button">萃取一份</button></div>'
      + (last == null ? '<p class="fine">目標是 25–30 秒。</p>' : `<p>第 ${shots} 份：<b class="mono">${last} 秒</b>。${verdict}</p>`)
      + (last != null && (last >= 25 && last <= 30 || shots >= 5) ? nextBtn('完成') : ''), '調磨豆機');
    $('#finer').onclick = () => {g = Math.max(1, g - 1); draw()};
    $('#coarser').onclick = () => {g = Math.min(9, g + 1); draw()};
    $('#pull').onclick = () => {shots++; last = timeOf(g); SFX.blip(); draw()};
    if ($('#next')) $('#next').onclick = () => {ST.d.shots = shots; ST.d.grind = g; ST.d.time = last; ST.d.ok = last >= 25 && last <= 30; hidePanel(); done()};
  };
  draw();
}

/* 結算卡：照實際發生的事寫 */
STORY.ending = () => ({
  title: '開門了',
  tl: ['open', 'dial', 'first'].map(k => [clockOf(STORY.segs[k].t), STORY.segs[k].name]),
  sub: ST.d.ok ? '第一杯濃縮是你自己調出來的。' : '這次是米亞幫你調好磨豆機。',
  stats: [['萃取了幾份', ST.d.shots || 0], ['研磨度', ST.d.ok ? ST.d.grind : 5], ['鮮奶', ST.d.milk === 'shop' ? '巷口買的' : '只用冰箱裡的']],
  lines: [ST.d.milk === 'shop' ? '配送的車七點二十分到了。沒有人發現它遲到。' : '有兩位客人改點黑咖啡，其中一位說他比較喜歡這樣。',
    '明天咖啡豆又老了一天，你還是要再調一次。']
});

/* 跟不是下一步要找的人說話 */
STORY.talk = id => {
  if (id === 'mia' && ST.seg === 'open' && ST.q === 1) {busy = true; showGuide(); say([['mia', '先開機器。開關在右邊。']], () => {busy = false; showGuide()}, {end: '好'}); return true}
  return false;
};
