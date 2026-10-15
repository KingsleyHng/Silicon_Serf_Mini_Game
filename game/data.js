/* Opening Shift: the people, the words, the places, the home screen.
   Everything here is fictional. Change any of it to make your own game. */

/* Home screen */
HOME.title = 'Opening Shift';
HOME.sub = 'Half an hour before a café opens';
HOME.fine = 'A sample game made with the fab24hr engine. The café and everyone in it are fictional.';
/* Your own support link (shown on the home screen and the ending card), for example:
   HOME.support = {url: 'https://buymeacoffee.com/your-name', label: '☕ Buy me a coffee'}; */
HOME.support = null;

/* Who is in the game.
   STORY.cast: how they appear in the dialogue box and the codex (about = codex text).
   WORLD.cast: their body in the 3D scene (only people who are physically there; the delivery driver only phones). */
STORY.cast = {
  me: {name: 'You', role: 'Barista, first week', tag: 'YOU', color: '#c98a00'},
  mia: {name: 'Mia', role: 'Shift lead', tag: 'LEAD', color: '#a8327a', about: 'Runs the morning shift. Has opened this café more times than she can count, and still tastes the first shot every day.'},
  sam: {name: 'Sam', role: 'Regular', tag: 'REG', color: '#2b6bd6', about: 'First through the door most mornings. Always orders the same thing.'},
  drv: {name: 'Dairy delivery', role: 'On the phone', tag: 'TEL', color: '#55616b', about: 'Brings the milk every morning, usually before you arrive.'}
};
WORLD.cast = {
  me: {label: 'You · Barista', fill: '#f2b01e', ink: '#231800', cloth: 0x3b3b3b, color: 0xc98a00, hair: 0x2b2320, node: 'start', face: Math.PI},
  mia: {label: 'Mia · Shift lead', fill: '#a8327a', ink: '#ffffff', cloth: 0x5b4636, color: 0xa8327a, hair: 0x6b3a22, long: true, node: 'bar', face: 0},
  sam: {label: 'Sam · Regular', fill: '#2b6bd6', ink: '#ffffff', cloth: 0x2f5f9f, color: 0x2b6bd6, hair: 0x1c1c1c, node: 'outside', face: -Math.PI / 2, hidden: true}
};

/* Places you walk to (not people). at = where you stand to use it; mark = where the "!" floats. */
STORY.places = {
  machine: {name: 'Espresso machine', at: [-3, -4.1], mark: [-3, 2.4, -5.4], go: 'Go to the espresso machine'},
  grinder: {name: 'Grinder', at: [-5.2, -4.1], mark: [-5.2, 2.2, -5.4], go: 'Go to the grinder'},
  door: {name: 'Front door', at: [6.2, 3], mark: [7.7, 3.1, 3], go: 'Go to the front door'}
};

/* Words players can tap for a plain explanation. [word, explanation]. Alternative spellings: separate with " / ". */
const GLOSS = [
  ['Espresso', 'Coffee made by pushing hot water through finely ground coffee under pressure. Small and strong; most café drinks start with it.'],
  ['Shot', 'One portion of espresso, pulled one at a time.'],
  ['Dial in / dialing in', 'Adjusting the grinder until the espresso tastes right. Beans change from day to day, so baristas do it every morning.'],
  ['Grind size', 'How fine the coffee is ground. Finer coffee slows the water down; coarser coffee lets it rush through.'],
  ['Extraction', 'How much flavour the water pulls out of the coffee. Too little tastes sour; too much tastes bitter.'],
  ['Group head', 'The part of the espresso machine where the basket of coffee locks in and the hot water comes out.'],
  ['Flat white', 'Espresso with a thin layer of steamed milk. Smaller and stronger than a latte.'],
  ['Regular', 'A customer who comes in so often that the staff know their order.']
];
termsSet(GLOSS, ' / ', [['shots', 'Shot'], ['grinder', 'Grind size']], []);
