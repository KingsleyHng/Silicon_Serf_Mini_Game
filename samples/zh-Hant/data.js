/* 開店前半小時：人物、名詞、地方、主頁。
   全部都是虛構的。改掉任何一樣，就是你自己的遊戲。 */

/* 主頁 */
HOME.title = '開店前半小時';
HOME.sub = '一間小咖啡店開門前的三十分鐘';
HOME.fine = 'fab24hr 框架的範例遊戲。咖啡店與裡面的人都是虛構的。';
/* 你自己的贊助連結（主頁與結算卡會顯示），例如：
   HOME.support = {url: 'https://buymeacoffee.com/你的名字', label: '☕ 請我喝杯咖啡'}; */
HOME.support = null;

/* 遊戲裡的人。
   STORY.cast：對話框與圖鑑裡的樣子（about 是圖鑑的介紹）。
   WORLD.cast：3D 場景裡的身體（只有真的在場的人；送鮮奶的只會打電話）。 */
STORY.cast = {
  me: {name: '你', role: '咖啡師，上班第一週', tag: '你', color: '#c98a00'},
  mia: {name: '米亞', role: '領班', tag: '領班', color: '#a8327a', about: '負責早班。這間店的門她開過不知道幾次了，每天還是會親口試第一杯濃縮。'},
  sam: {name: '阿山', role: '熟客', tag: '熟客', color: '#2b6bd6', about: '幾乎每天早上第一個進門，點的永遠是同一杯。'},
  drv: {name: '鮮奶配送', role: '電話', tag: '電話', color: '#55616b', about: '每天早上送鮮奶來，通常比你還早到。'}
};
WORLD.cast = {
  me: {label: '你・咖啡師', fill: '#f2b01e', ink: '#231800', cloth: 0x3b3b3b, color: 0xc98a00, hair: 0x2b2320, node: 'start', face: Math.PI},
  mia: {label: '米亞・領班', fill: '#a8327a', ink: '#ffffff', cloth: 0x5b4636, color: 0xa8327a, hair: 0x6b3a22, long: true, node: 'bar', face: 0},
  sam: {label: '阿山・熟客', fill: '#2b6bd6', ink: '#ffffff', cloth: 0x2f5f9f, color: 0x2b6bd6, hair: 0x1c1c1c, node: 'outside', face: -Math.PI / 2, hidden: true}
};

/* 走過去用的地方（不是人）。at：站在哪裡才算到了；mark：「！」浮在哪裡。 */
STORY.places = {
  machine: {name: '咖啡機', at: [-3, -4.1], mark: [-3, 2.4, -5.4], go: '走去咖啡機'},
  grinder: {name: '磨豆機', at: [-5.2, -4.1], mark: [-5.2, 2.2, -5.4], go: '走去磨豆機'},
  door: {name: '前門', at: [6.2, 3], mark: [7.7, 3.1, 3], go: '走去前門'}
};

/* 玩家可以點的詞，點了跳出白話解釋。[詞, 解釋]。同一個意思的幾種寫法用「 / 」隔開。 */
const GLOSS = [
  ['濃縮咖啡 / 濃縮', '用高壓把熱水擠過磨得很細的咖啡粉，煮出一小杯很濃的咖啡。咖啡店大部分的飲料都從它開始。'],
  ['調磨豆機 / 調磨', '每天早上調整磨豆機，讓濃縮咖啡的味道剛好。咖啡豆每天都在變，所以咖啡師每天都要調。'],
  ['研磨度', '咖啡粉磨得多細。越細，水流得越慢；越粗，水一下就沖過去。'],
  ['萃取', '水從咖啡粉裡帶出多少味道。太少會酸，太多會苦。'],
  ['沖煮頭', '咖啡機上裝咖啡粉把手的地方，熱水從這裡流出來。'],
  ['小白咖啡', '濃縮咖啡加上一層薄薄的蒸氣奶泡。比拿鐵小杯，味道比較濃。'],
  ['熟客', '常常來、店員都知道他要點什麼的客人。']
];
termsSet(GLOSS, ' / ', [], []);
