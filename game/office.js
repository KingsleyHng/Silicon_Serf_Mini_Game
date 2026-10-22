/* The office of KT Silicon Labs: a bright two-storey open-plan office in pixel style (16 pixels per metre, like the people's skins), 26 by 16 metres.
   Downstairs, back wall left to right: two phone booths, tall windows, the brand wall with the logo and a neon sign, the FPGA lab, the kitchen.
   The open floor: the design pod (six desks facing each other: you, SKG and JJY on one side, KLN across from you), the test & layout pod (JJH, SYP),
   a lounge with two sofas, a huddle table with a whiteboard, a ping-pong table and bean bags by the front door (right wall).
   Upstairs: a mezzanine along the left wall, 3 m up, reached by the stairs beside it: the meeting room at the back, KT's glass office at the front.
   Under the mezzanine: the server room and the washrooms (closed). The back and left walls are two storeys high, with a band of high windows.
   Coordinates: x to the right, z toward the camera (down the screen), y up; 1 unit is about 1 metre. */
/* Where people sit when they are not talking: their chair (at), facing their screen (face), next to the point they stand at (node).
   The engine sits them down whenever they are idle at that point, and stands them up while they speak.
   In the pods the side nearer the camera faces the back wall, so the screens the story changes are the ones you can read. */
const SEATS = {
  skg: {node: 'skg', at: [-4, -1.55], face: Math.PI},
  jjy: {node: 'jjy', at: [-.8, -1.55], face: Math.PI},
  kln: {node: 'kln', at: [-2.4, -4.05], face: 0},
  qyl: {node: 'qyl', at: [-11.45, -4.9], face: -Math.PI / 2},
  wsl: {node: 'wsl', at: [4.8, -6.55], face: Math.PI},
  jjh: {node: 'jjh', at: [3.2, 2.85], face: Math.PI},
  syp: {node: 'syp', at: [4.8, 2.85], face: Math.PI},
  kt: {node: 'ceo', at: [-11.3, 1.95], face: 0, drop: .14}
};
Object.keys(SEATS).forEach(id => {WORLD.cast[id].seat = SEATS[id]});

levelAdd('office', function (K) {
  const {T, box, flat, lam, M, px, pxc, P, rnd, label, screen, tower, pickBox, G} = K;
  const UP = 3, U = new T.Group(); U.position.y = UP; G.add(U);   // upstairs: everything in U is 3 m up, at the same x and z
  const BW = -8, LW = -13;                                         // the inside faces of the back wall (z) and the left wall (x)
  K.bounds(-13, 13, -8, 7.9);

  /* ── Pixel textures (16 pixels per metre; px repeats, pxc is a one-off picture) ── */
  const speck = (g, base, cs, n) => {P(g, base, 0, 0, 16, 16); for (let i = 0; i < n; i++) P(g, cs[rnd() * cs.length | 0], rnd() * 16 | 0, rnd() * 16 | 0)};
  const X = {
    planks: px(16, (g, s) => [['#efe2c8', 3], ['#e8d7b6', 11], ['#f2e6cf', 7], ['#e5d3b0', 14]].forEach(([c, j], r) => {
      const y = r * 4; P(g, c, 0, y, s, 4); P(g, '#dccaa8', 0, y + 3, s, 1); P(g, '#dccaa8', j, y, 1, 3); P(g, '#f4e9d4', (j + 4) % 16, y + 1, 3, 1)})),
    concrete: px(16, (g, s) => {speck(g, '#dfe1df', ['#d6d9d7', '#e7e9e7', '#d2d5d3', '#e3e2dc'], 70); P(g, '#cdd1cf', 0, 0, s, 1); P(g, '#cdd1cf', 0, 0, 1, s)}),
    carpet: px(16, g => {speck(g, '#c7d4de', ['#b9c8d4', '#d4dfe7', '#bfcdd8'], 70); P(g, '#b0c0cc', 0, 0, 16, 1); P(g, '#b0c0cc', 0, 0, 1, 16)}),
    meetCarpet: px(16, g => {speck(g, '#dde2e9', ['#d2d8e1', '#e6eaf0'], 60); P(g, '#ccd3dc', 0, 0, 16, 1); P(g, '#ccd3dc', 0, 0, 1, 16)}),
    navy: px(16, g => {speck(g, '#2e4166', ['#273958', '#354a72', '#2a3c60'], 80)}),
    terrazzo: px(16, g => speck(g, '#efebe4', ['#c96f4a', '#2f6f9f', '#d9ab45', '#8fae8b', '#b9b2a6'], 26)),
    labTile: px(16, (g, s) => {P(g, '#e4e9ec', 0, 0, s, s); P(g, '#cdd5da', 0, 0, s, 1); P(g, '#cdd5da', 0, 0, 1, s); [[4, 4], [12, 4], [4, 12], [12, 12]].forEach(p => P(g, '#d6dde1', p[0], p[1]))}),
    rug: px(16, (g, s) => {P(g, '#e9e2d3', 0, 0, s, s); P(g, '#c96f4a', 0, 0, s, 2); P(g, '#2f6f9f', 0, 7, s, 1); P(g, '#d9ab45', 0, 11, s, 2); for (let x = 0; x < 16; x += 4) P(g, '#c96f4a', x, 3, 2, 2)}),
    leaves: px(16, g => speck(g, '#4f9b3c', ['#3e8530', '#62b04a', '#2f6b25', '#78c25a'], 90)),
    pot: px(16, (g, s) => {P(g, '#f3f1ec', 0, 0, s, s); P(g, '#dcd8cf', 0, 0, s, 2); P(g, '#e6e2d9', 0, 13, s, 3)}),
    walnut: px(16, (g, s) => {P(g, '#6e472b', 0, 0, s, s); [[3, 2, 9], [9, 6, 8], [13, 0, 6]].forEach(([y, x, w]) => P(g, '#5b3a22', x, y, w, 1)); P(g, '#80573a', 4, 6, 5, 1); P(g, '#80573a', 1, 11, 6, 1)}),
    white: px(16, (g, s) => {P(g, '#f7f8f9', 0, 0, s, s); P(g, '#e9ecee', 0, 15, s, 1)}),
    fabric: px(16, g => speck(g, '#35506e', ['#2d4560', '#3e5b7c', '#304a66'], 70)),
    teal: px(16, g => speck(g, '#2f8f8a', ['#287d78', '#38a19b', '#2a837e'], 70)),
    mustard: px(16, g => speck(g, '#d9a53a', ['#c99630', '#e4b44c', '#cf9c34'], 70)),
    coral: px(16, g => speck(g, '#d9694f', ['#c95c44', '#e57a60', '#cf6249'], 70)),
    felt: px(16, g => speck(g, '#8fae8b', ['#83a37f', '#9bba97', '#88a884'], 70)),
    leather: px(16, g => speck(g, '#25292e', ['#1c1f23', '#30353b'], 50)),
    sofa: px(16, g => speck(g, '#3b86bd', ['#3279ad', '#4592c9', '#2f6f9f'], 70)),
    accent: px(16, g => speck(g, '#1f5f8b', ['#1b5680', '#246a99'], 40)),
    rack: px(16, (g, s) => {P(g, '#1f262b', 0, 0, s, s); for (let y = 0; y < 16; y += 4) {P(g, '#2c353b', 0, y, s, 1); P(g, '#39d67a', 2, y + 2); if (rnd() > .4) P(g, '#f2b01e', 4, y + 2); for (let x = 8; x < 15; x += 2) P(g, '#151b1f', x, y + 2)}}),
    keys: px(16, (g, s) => {P(g, '#2a3035', 0, 0, s, s); for (let y = 1; y < 16; y += 3) for (let x = 1; x < 16; x += 2) P(g, '#4a535a', x, y)}),
    steel: px(16, (g, s) => {P(g, '#c9d0d4', 0, 0, s, s); P(g, '#b7bfc4', 0, 5, s, 1); P(g, '#dde2e5', 0, 9, s, 1)}),
    oak: px(16, (g, s) => {P(g, '#c99a62', 0, 0, s, s); [[2, 1, 9], [7, 5, 10], [12, 0, 7]].forEach(([y, x, w]) => P(g, '#b8864f', x, y, w, 1)); P(g, '#d8ad78', 3, 4, 6, 1)})
  };
  const L = (t, c) => lam(c || 0xffffff, {map: t});
  const W = {planks: L(X.planks), concrete: L(X.concrete), carpet: L(X.carpet), meet: L(X.meetCarpet), navy: L(X.navy), terrazzo: L(X.terrazzo), lab: L(X.labTile), rug: L(X.rug),
    leaves: L(X.leaves), pot: L(X.pot), walnut: L(X.walnut), white: L(X.white), fabric: L(X.fabric), teal: L(X.teal), mustard: L(X.mustard), coral: L(X.coral), felt: L(X.felt),
    leather: L(X.leather), sofa: L(X.sofa), accent: L(X.accent), rack: L(X.rack), keys: L(X.keys), steel: L(X.steel), oak: L(X.oak),
    grey: lam(0xaab4ba), gold: lam(0xd9ab45), frost: lam(0xffffff, {transparent: true, opacity: .5, depthWrite: false})};

  /* The view outside: one picture shared by every window, 16 pixels per metre and mapped by where each window is, so the windows
     downstairs look out at the hedge, the tree trunks and the lower floors across the park, and the high ones at the treetops, the roofs and the sky.
     Columns 0–424 are what the back wall looks out on (x from -13.25 to 13.25), columns 424–686 what the left wall looks out on (z from 8.1 to -8.3);
     row 0 is 7 m up, the bottom row is the ground. Clouds drift and leaves fall from the trees about twelve times a second
     (a still picture for people who ask for reduced motion). */
  const VW = 704, VH = 112, PPM = 16, BACK = 424, REG = [[0, BACK], [BACK, 262]];
  const can = (w, h) => {const c = document.createElement('canvas'); c.width = w; c.height = h; return c};
  const skyC = can(VW, VH), fgC = can(VW, VH), viewC = can(VW, VH), trees = [];
  {const g = skyC.getContext('2d'); ['#9fd2f1', '#a9d7f3', '#b4dcf4', '#bfe1f6', '#cae6f7', '#d4eaf8', '#ddeef9'].forEach((c, i) => P(g, c, 0, i * 12, VW, 12)); P(g, '#e4f2fa', 0, 84, VW, 28)}
  {const g = fgC.getContext('2d');
    REG.forEach(([x0, w]) => {
      /* The city across the park: blocks of flats and offices with rows of windows, a few lit */
      for (let x = x0; x < x0 + w;) {
        const bw = Math.min(14 + (rnd() * 26 | 0), x0 + w - x), top = 34 + (rnd() * 32 | 0), c = ['#a9bccb', '#9bb0c1', '#b7c8d4', '#8fa6b8', '#c3d0d9'][rnd() * 5 | 0];
        P(g, c, x, top, bw, VH - top); P(g, '#7f97a9', x, top, bw, 1);
        for (let y = top + 3; y < VH - 4; y += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (rnd() > .3) P(g, rnd() > .85 ? '#fff6d8' : '#e4f1f8', xx, y, 2, 2);
        x += bw + (rnd() * 4 | 0);
      }
      /* Grass, and a hedge along the street */
      P(g, '#7fb069', x0, 92, w, 20); for (let i = 0; i < w * 3; i++) P(g, ['#6fa35a', '#8dbd74', '#77aa60'][rnd() * 3 | 0], x0 + rnd() * w | 0, 92 + rnd() * 20 | 0);
      P(g, '#3f7a35', x0, 80, w, 12); for (let i = 0; i < w * 4; i++) P(g, ['#2f6b25', '#4f9b3c', '#386f2c', '#5aa544'][rnd() * 4 | 0], x0 + rnd() * w | 0, 79 + rnd() * 13 | 0);
      /* Trees in the park: a trunk and a round crown, darker on the shaded side */
      for (let x = x0 + 14 + (rnd() * 10 | 0); x < x0 + w - 10; x += 52 + (rnd() * 22 | 0)) {
        const R = 15 + (rnd() * 6 | 0), cy = 44 + (rnd() * 8 | 0);
        P(g, '#6e472b', x - 1, cy, 4, VH - cy); P(g, '#5b3a22', x + 2, cy, 1, VH - cy);
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dy * 1.1) + rnd() * 2.2;
          if (d < R) P(g, d > R - 3 && dx + dy > 0 ? '#2f6b25' : ['#4f9b3c', '#3e8530', '#62b04a', '#78c25a', '#4a8f38'][rnd() * 5 | 0], x + dx, cy + dy);
        }
        trees.push({x, cy, R, x0, w});
      }
    });
  }
  const clouds = [], leaves = [];
  REG.forEach(([x0, w]) => {for (let i = 0; i < Math.round(w / 70); i++) clouds.push({x0, w, x: rnd() * w, y: 14 + (rnd() * 22 | 0), s: 8 + (rnd() * 12 | 0), v: .1 + rnd() * .12})});
  /* A leaf starts somewhere in a crown (after a short wait), sways as it falls and lands on the hedge or the grass */
  const leaf = l => {const t = trees[Math.random() * trees.length | 0];
    return Object.assign(l, {t, x: t.x + (Math.random() * 2 - 1) * t.R * .8, y: t.cy + Math.random() * t.R * .6, v: .25 + Math.random() * .3, ph: Math.random() * 6,
      land: 86 + Math.random() * 22, c: ['#e8a030', '#e07a2b', '#d4b43a', '#c9583a', '#f0c848'][Math.random() * 5 | 0], wait: Math.random() * 40 | 0})};
  for (let i = 0; i < 42; i++) leaves.push(leaf({}));
  const viewTex = new T.CanvasTexture(viewC);
  viewTex.magFilter = viewTex.minFilter = T.NearestFilter; viewTex.generateMipmaps = false; viewTex.encoding = T.sRGBEncoding;
  const drawView = () => {
    const g = viewC.getContext('2d'); g.drawImage(skyC, 0, 0);
    clouds.forEach(c => {
      c.x += c.v; if (c.x > c.w) c.x = -2 * c.s;
      const x = c.x0 + Math.round(c.x), y = c.y, s = c.s;
      g.save(); g.beginPath(); g.rect(c.x0, 0, c.w, VH); g.clip();
      P(g, '#ffffff', x, y, s * 2, 3); P(g, '#ffffff', x + 3, y - 2, s * 2 - 7, 2); P(g, '#ffffff', x + (s >> 1), y - 4, s, 2); P(g, '#e1edf5', x + 2, y + 3, s * 2 - 4, 1);
      g.restore();
    });
    g.drawImage(fgC, 0, 0);
    leaves.forEach(l => {
      if (l.wait > 0) {l.wait--; return}
      l.ph += .15; l.y += l.v; l.x += Math.sin(l.ph) * .35 + .05;
      if (l.y > l.land) {leaf(l); return}
      const x = Math.round(l.x); if (x >= l.t.x0 && x < l.t.x0 + l.t.w) P(g, l.c, x, Math.round(l.y), 2, Math.sin(l.ph) > 0 ? 2 : 1);   // a leaf turning over as it falls
    });
    viewTex.needsUpdate = true;
  };
  drawView();
  if (!reduceMotion) setInterval(() => {if (!document.hidden) drawView()}, 80);
  /* One pane of the view: w×h at (x, y, z) turned by ry, showing canvas columns u0..u1 at the window's own height */
  const viewMat = lam(0xffffff, {map: viewTex, emissive: 0xffffff, emissiveMap: viewTex, emissiveIntensity: .45});
  const pane = (w, h, x, y, z, ry, u0, u1) => {
    const geo = new T.PlaneGeometry(w, h), uv = geo.attributes.uv, v0 = (y - h / 2) * PPM / VH, v1 = (y + h / 2) * PPM / VH;
    [[u0, v1], [u1, v1], [u0, v0], [u1, v0]].forEach(([u, v], i) => uv.setXY(i, u / VW, v));
    const m = new T.Mesh(geo, viewMat); m.position.set(x, y, z); m.rotation.y = ry; G.add(m);
  };
  /* Other one-off pictures: the chip on the rug, the wafer, the book spines, the drinks in the fridge */
  const chipTex = pxc(32, 32, g => {
    P(g, '#e3e9ec', 0, 0, 32, 32); P(g, '#c7d0d5', 0, 0, 32, 1); P(g, '#c7d0d5', 0, 31, 32, 1); P(g, '#c7d0d5', 0, 0, 1, 32); P(g, '#c7d0d5', 31, 0, 1, 32);
    for (let i = 8; i < 25; i += 2) {P(g, '#c9a24a', i, 3, 1, 4); P(g, '#c9a24a', i, 25, 1, 4); P(g, '#c9a24a', 3, i, 4, 1); P(g, '#c9a24a', 25, i, 4, 1)}
    P(g, '#22303b', 7, 7, 18, 18); P(g, '#2e4050', 9, 9, 14, 14); P(g, '#1f5f8b', 11, 11, 10, 10); P(g, '#3b86bd', 12, 12, 4, 4); P(g, '#e8eef1', 8, 8, 1, 1);
  });
  const waferTex = pxc(32, 32, g => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot(x - 15.5, y - 15.5);
      if (r > 15.5 || (y > 29 && Math.abs(x - 15.5) < 2)) continue;
      P(g, r > 14.2 ? '#b8c2cc' : x % 4 === 0 || y % 4 === 0 ? '#6f7f91' : ['#8fb3d9', '#a99ad9', '#d99ab8', '#9ad9c4', '#d9cf9a'][((x >> 2) + (y >> 2) * 2) % 5], x, y);
    }
  });
  const booksTex = pxc(16, 32, g => {
    P(g, '#6e472b', 0, 0, 16, 32);
    [1, 11, 21].forEach(y0 => {for (let x = 1; x < 15;) {const w = 1 + (rnd() * 2 | 0), h = 6 + (rnd() * 3 | 0); P(g, ['#8e2f3a', '#2f5d8e', '#d6a540', '#3f7d4f', '#e8e1d0', '#5a4a8e', '#c0621d'][rnd() * 7 | 0], x, y0 + 9 - h, w, h); x += w}; P(g, '#5b3a22', 0, y0 + 9, 16, 1)});
  });
  const drinksTex = pxc(16, 32, g => {
    P(g, '#dfe9ee', 0, 0, 16, 32);
    [2, 10, 18, 26].forEach(y0 => {for (let x = 1; x < 15; x += 2) P(g, ['#d94a3a', '#f2b01e', '#3b86bd', '#6cb94a', '#e8eef1', '#7a4bb3'][rnd() * 6 | 0], x, y0, 1, 4); P(g, '#b7c4cb', 0, y0 + 4, 16, 1)});
  });
  /* A flat picture: pic(texture, w, h, x, y, z, ry, rx, {rep: repeat across, mat: material options}) */
  const pic = (tex, w, h, x, y, z, ry, rx, o) => {
    const geo = new T.PlaneGeometry(w, h);
    if (o && o.rep) {const uv = geo.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) * o.rep)}
    const m = new T.Mesh(geo, new T.MeshLambertMaterial(Object.assign({map: tex}, o && o.mat)));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); G.add(m); return m;
  };
  /* A glowing sign: text drawn once on a canvas with a soft glow, on a plane that ignores the lights */
  const neon = (text, w, h, x, y, z, col) => {
    const c = can(1024, Math.round(1024 * h / w)), g = c.getContext('2d');
    g.font = '700 ' + Math.round(c.height * .6) + 'px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = col; g.shadowBlur = c.height * .3; g.fillStyle = col; g.fillText(text, c.width / 2, c.height / 2); g.fillText(text, c.width / 2, c.height / 2);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(text, c.width / 2, c.height / 2);
    const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})); m.position.set(x, y, z); G.add(m); return m;
  };

  /* ── Floor and walls ── */
  const wall = lam(0xf4f7f8, {map: K.TX.wall});
  flat(26, 16, W.concrete, 0, 0, 0, 2, G);                           // polished concrete, a seam every 2 m
  flat(5.6, 3.7, W.carpet, -2.4, .004, -2.8, 1, G);                  // the design pod
  flat(4, 3.7, W.carpet, 4, .004, 1.6, 1, G);                        // the test & layout pod
  flat(5.4, 3, W.lab, 5.9, .005, -6.5, 1, G);                        // the lab, with yellow tape along its edge
  flat(5.4, .12, M.hazard, 5.9, .007, -5, .5, G);
  flat(4.2, 6.6, W.terrazzo, 10.9, .006, -4.7, 1, G);                // the kitchen
  flat(4.6, 2.4, W.rug, 3.4, .006, 6.6, 1.2, G);                     // the lounge rug
  flat(3.2, 2.2, W.rug, 9.9, .006, 6.6, 1.2, G);                     // the bean bags by the door
  pic(chipTex, 2.2, 2.2, .9, .007, 1.9, 0, -Math.PI / 2);           // a chip rug between the pods
  /* The back and left walls go up two floors; the right wall stays low so the camera sees in */
  box(26.6, 6.4, .3, wall, 0, 3.2, BW - .15, G);
  box(.3, 6.4, 16.3, wall, LW - .15, 3.2, -.15, G);
  box(.3, 3.2, 11, wall, 13.15, 1.6, -2.5, G); box(.3, 3.2, 2.9, wall, 13.15, 1.6, 6.45, G);
  box(21.4, .12, .04, W.grey, 2.3, .06, BW + .02, G);               // skirting
  /* Front door (right wall, z 3–5): two glass doors in a dark frame, a doormat */
  box(.4, 2.8, .2, M.trim, 13.1, 1.4, 2.9, G); box(.4, 2.8, .2, M.trim, 13.1, 1.4, 5.1, G); box(.4, .3, 2.4, M.trim, 13.1, 2.85, 4, G); box(.4, .06, .06, M.trim, 13.1, 1.35, 4, G, false);
  box(.08, 2.6, 2, M.glass, 13.15, 1.3, 4, G, false);
  flat(1, 1.8, lam(0x3b4248), 12.4, .008, 4, 1, G); flat(.8, 1.6, W.accent, 12.4, .01, 4, 1, G);

  /* Windows: a dark frame, the view (lit a little from inside so it reads as daylight), mullions every metre or so, a white sill */
  const windowBack = (x0, x1, y0, y1) => {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    box(w + .14, h + .14, .03, M.trim, cx, cy, BW - .01, G, false); pane(w, h, cx, cy, BW + .01, 0, (x0 + 13.25) * PPM, (x1 + 13.25) * PPM);
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.05, h, .04, M.trim, x0 + w * i / n, cy, BW + .02, G, false);
    box(w + .2, .05, .16, W.white, cx, y0 - .07, BW + .08, G);
  };
  const windowLeft = (z0, z1, y0, y1) => {
    const w = z1 - z0, h = y1 - y0, cz = (z0 + z1) / 2, cy = (y0 + y1) / 2;
    box(.03, h + .14, w + .14, M.trim, LW + .01, cy, cz, G, false); pane(w, h, LW + .03, cy, cz, Math.PI / 2, BACK + (8.1 - z1) * PPM, BACK + (8.1 - z0) * PPM);
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.04, h, .05, M.trim, LW + .04, cy, z0 + w * i / n, G, false);
    box(.16, .05, w + .2, W.white, LW + .08, y0 - .07, cz, G);
  };
  windowBack(-6.4, -2.7, .45, 2.95); windowBack(2.7, 9.3, 1.15, 2.95);   // tall windows on the open floor, higher over the lab bench
  windowBack(-8.2, 12.8, UP + .7, UP + 2.9);                         // a band of high windows over the whole floor
  windowLeft(-7.4, -3.2, UP + 1, UP + 2.8); windowLeft(-1.9, .5, UP + 1, UP + 2.8); windowLeft(1.2, 4, UP + 1, UP + 2.8); windowLeft(6.1, 7.6, UP + 1, UP + 2.8);

  /* The brand wall: the logo on a white plaque, two wafers from earlier tape-outs, and a neon line under it all */
  box(4.8, 3.2, .02, W.accent, 0, 1.6, BW + .005, G, false);
  box(2.7, 1.75, .04, M.trim, 0, 2.15, BW + .03, G); box(2.6, 1.65, .05, lam(0xffffff), 0, 2.15, BW + .05, G);
  const logoTex = new T.TextureLoader().load(LOGO.src); logoTex.encoding = T.sRGBEncoding; logoTex.anisotropy = 4;
  const logo = new T.Mesh(new T.PlaneGeometry(2.45, 2.45 * LOGO.h / LOGO.w), lam(0xffffff, {map: logoTex, transparent: true}));
  logo.position.set(0, 2.15, BW + .08); G.add(logo);
  [-1.85, 1.85].forEach(x => {
    const w = new T.Mesh(new T.CylinderGeometry(.3, .3, .02, 32), [lam(0xb8c2cc), lam(0xffffff, {map: waferTex, alphaTest: .5}), lam(0xb8c2cc)]);
    w.rotation.x = Math.PI / 2; w.position.set(x, 2.15, BW + .04); G.add(w);
  });
  neon('THINK IN SILICON', 3.6, .42, 0, .95, BW + .03, '#6fe9ff');

  /* ── Furniture (par is where a piece goes: G downstairs, U upstairs) ── */
  /* An office chair facing +z (turn it with ry): seat and back on a pole and a cross base, armrests; tall = a high back */
  const chair = (x, z, ry, mat, tall, par) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; (par || G).add(g);
    const m = mat || W.fabric;
    box(.5, .09, .5, m, 0, .48, 0, g); box(.5, tall ? .95 : .6, .09, m, 0, tall ? 1.02 : .86, -.23, g);
    box(.07, .4, .07, M.trim, 0, .26, 0, g); box(.56, .05, .07, M.trim, 0, .04, 0, g); box(.07, .05, .56, M.trim, 0, .04, 0, g);
    [-1, 1].forEach(s => {box(.05, .2, .05, M.trim, s * .26, .6, .05, g); box(.06, .04, .32, m, s * .26, .71, .02, g)});
    return g;
  };
  /* A potted plant: a pot and a few leaf blocks; a tall one gets a trunk */
  const plant = (x, z, tall, par) => {
    const g = par || G;
    box(.45, .45, .45, W.pot, x, .225, z, g);
    if (tall) {box(.08, .9, .08, W.walnut, x, .9, z, g); [[0, 1.45, 0, .6], [.18, 1.15, .1, .4], [-.15, 1.25, -.12, .42], [.05, 1.75, -.05, .38]].forEach(([dx, y, dz, s]) => box(s, s, s, W.leaves, x + dx, y, z + dz, g))}
    else [[0, .62, 0, .5], [.16, .78, .1, .3], [-.14, .8, -.08, .32]].forEach(([dx, y, dz, s]) => box(s, s, s, W.leaves, x + dx, y, z + dz, g));
  };
  /* A glass wall 2.4 m high with a frosted band and a trim on top, from (x0, z0) to (x1, z1), straight along x or z */
  const glassWall = (x0, z0, x1, z1, par) => {
    const alongX = z0 === z1, L = alongX ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, g = par || G;
    box(alongX ? L : .08, 2.4, alongX ? .08 : L, M.glass, cx, 1.2, cz, g, false);
    box(alongX ? L : .14, .1, alongX ? .14 : L, M.trim, cx, 2.4, cz, g);
    box(alongX ? L : .09, .12, alongX ? .09 : L, W.frost, cx, 1.3, cz, g, false);
  };
  /* A glass balustrade 0.9 m high with an oak handrail */
  const rail = (x0, z0, x1, z1, par) => {
    const alongX = z0 === z1, L = alongX ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, g = par || G;
    box(alongX ? L : .03, .9, alongX ? .03 : L, M.glass, cx, .5, cz, g, false);
    box(alongX ? L + .04 : .07, .06, alongX ? .07 : L + .04, W.oak, cx, .97, cz, g);
  };
  const post = (x, z, par) => box(.14, 2.5, .14, M.trim, x, 1.25, z, par || G);
  /* A sofa: seat, back and arms, with its back on the -x side (ry turns it), len along its seat */
  const sofa = (x, z, ry, len, mat, par) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; (par || G).add(g);
    box(.8, .42, len, mat, 0, .21, 0, g); box(.22, .78, len, mat, -.32, .5, 0, g);
    [-1, 1].forEach(s => box(.8, .58, .16, mat, 0, .29, s * (len / 2 - .08), g));
    for (let i = 0; i < Math.round(len / .8); i++) box(.14, .34, .5, W.white, -.16, .66, -len / 2 + .4 + i * (len - .8) / Math.max(1, Math.round(len / .8) - 1), g);
    return g;
  };
  /* A bean bag: a soft lump in one colour */
  const beanBag = (x, z, mat) => {box(.75, .32, .75, mat, x, .16, z, G); box(.6, .2, .6, mat, x + .02, .4, z - .04, G); box(.62, .32, .16, mat, x, .5, z - .3, G)};
  /* A bar stool */
  const stool = (x, z, h, mat) => {box(.36, .05, .36, mat || W.walnut, x, h, z, G); box(.05, h, .05, M.trim, x, h / 2, z, G); box(.3, .03, .3, M.trim, x, .015, z, G)};

  /* ── Upstairs (x < -8.4): a mezzanine 3 m up with the meeting room at the back and KT's office at the front ── */
  box(4.6, .3, 16, W.white, -10.7, UP - .15, 0, G);                  // the floor slab and its trim
  box(.05, .32, 16, M.trim, -8.38, UP - .15, 0, G); box(4.6, .32, .05, M.trim, -10.7, UP - .15, 7.98, G);
  flat(4.6, 16, W.planks, -10.7, .002, 0, 1, U);
  flat(4.6, 5.8, W.meet, -10.7, .006, -5.1, 1, U);                   // meeting room
  flat(4.6, 7.2, W.navy, -10.7, .006, 4.4, 1, U);                    // KT's office
  box(4.6, .12, .04, W.grey, -10.7, .06, BW + .02, U); box(.04, .12, 16, W.grey, LW + .02, .06, 0, U);   // skirting
  rail(-13, 7.98, -8.4, 7.98, U);                                    // the open front, with a planter along it
  box(4.2, .32, .3, W.walnut, -10.7, .16, 7.72, U);
  for (let x = -12.6; x < -8.7; x += .55) box(.42, .3 + rnd() * .15, .3, W.leaves, x, .42, 7.72, U);
  rail(-8.42, -2.2, -8.42, -1.6, U); rail(-8.42, .4, -8.42, .8, U); // beside the top of the stairs

  /* Downstairs, under the mezzanine: the server room (racks behind a window) and the washrooms, closed off */
  box(.2, UP - .3, 16, wall, -8.5, (UP - .3) / 2, 0, G);
  box(4.6, UP - .3, .2, wall, -10.7, (UP - .3) / 2, 7.9, G);
  box(.05, 1.5, 2.6, M.trim, -8.38, 1.45, -3.5, G); box(.02, 1.36, 2.46, W.rack, -8.36, 1.45, -3.5, G, false); box(.02, 1.36, 2.46, M.glass, -8.34, 1.45, -3.5, G, false);
  screen('srv', G, -8.36, 2.55, -3.5, .53, .3, ['SERVER', 'ROOM'], '#93a9b2').rotation.y = Math.PI / 2;
  [-12.2, -11].forEach(x => {box(.9, 2.1, .06, W.walnut, x, 1.05, 8.01, G); box(.04, .2, .03, W.gold, x + .32, 1.05, 8.05, G);
    box(.34, .34, .03, W.accent, x, 2.4, 8.03, G); box(.06, .2, .02, W.white, x, 2.4, 8.05, G); box(.1, .1, .02, W.white, x, 2.53, 8.05, G)});   // washroom signs
  box(1.3, 2.3, .08, W.leaves, -9.3, 1.3, 8.03, G);                  // a green wall of moss

  /* Two phone booths against the back wall, beside the mezzanine: felt sides, a glass door toward the room, a stool and a shelf */
  const booth = (x, z) => {
    box(1.4, .08, 1.3, M.dark, x, .04, z, G); box(1.4, .1, 1.3, W.white, x, 2.35, z, G);
    box(.06, 2.3, 1.3, W.felt, x - .67, 1.15, z, G); [-1, 1].forEach(s => box(1.4, 2.3, .06, W.felt, x, 1.15, z + s * .62, G));
    box(.03, 2.2, 1.18, M.glass, x + .68, 1.15, z, G, false); box(.05, .5, .05, M.trim, x + .66, 1.1, z + .45, G);
    box(.4, .04, .7, W.oak, x - .45, .95, z, G); stool(x - .05, z, .62, W.coral);
    box(1.2, .03, .03, lam(0xfff1c8, {emissive: 0xfff1c8, emissiveIntensity: .6}), x, 2.28, z - .5, G, false);
  };
  booth(-7.5, -7.25); booth(-7.5, -5.85);

  /* The stairs: 15 steps of 20 cm up from the front (z 4.8) to a landing at the back, against the mezzanine; oak treads, a glass balustrade */
  const SX0 = -8.4, SX1 = -6.6, SW = SX1 - SX0, SCX = (SX0 + SX1) / 2, Z0 = 4.8, Z1 = .4, N = 15, RUN = (Z0 - Z1) / N, RISE = UP / N;
  for (let i = 0; i < N; i++) {
    const top = (i + 1) * RISE, z = Z0 - (i + .5) * RUN;
    box(SW, top - .05, RUN, wall, SCX, (top - .05) / 2, z, G);
    box(SW + .04, .05, RUN + .02, W.oak, SCX, top - .025, z, G);
    if (i % 4 === 0 || i === N - 1) box(.05, .95, .05, M.trim, SX1 - .04, top + .47, z, G);
  }
  const ang = Math.atan2(UP, Z0 - Z1), len = Math.hypot(UP, Z0 - Z1);
  [[.03, .85, M.glass, .5], [.07, .06, W.oak, .97]].forEach(([w, h, m, dy]) => {const o = box(w, h, len, m, SX1 - .04, UP / 2 + dy, (Z0 + Z1) / 2, G, false); o.rotation.x = ang});
  box(SW, UP, 2, wall, SCX, UP / 2, -.6, G);                          // the landing, with a store-room door on its side
  flat(SW, 2, W.planks, SCX, .003, -.6, 1, U);
  box(.06, 2, .9, W.walnut, SX1 + .03, 1, -.6, G); box(.03, .05, .2, W.gold, SX1 + .07, 1, -.9, G);
  rail(SX1 - .04, -1.6, SX1 - .04, .4, U); rail(SX0, -1.58, SX1, -1.58, U);
  label('2F', SCX, -.9, 1.4, U);

  /* Meeting room upstairs: glass on two sides with a door, a whiteboard, a long table with chairs */
  glassWall(-13, -2.2, -10.5, -2.2, U); glassWall(-9, -2.2, -8.4, -2.2, U); glassWall(-8.4, BW, -8.4, -2.2, U);
  box(1.5, .1, .14, M.trim, -9.75, 2.4, -2.2, U); [-10.5, -9, -8.4].forEach(x => post(x, -2.2, U));
  box(2.8, 1.4, .06, lam(0xffffff), -11.2, 1.6, BW + .05, U); box(2.9, .08, .14, M.trim, -11.2, .88, BW + .08, U);
  screen('board', U, -11.2, 1.6, BW + .1, 2.6, 1.2, ['PSEL  _/‾‾‾‾‾\\_', 'PEN   ___/‾‾\\_', 'SETUP → ACCESS'], '#1f5f8b');
  box(.8, .06, 2.6, W.white, -12.1, .74, -4.9, U); box(.12, .7, 2.1, W.grey, -12.1, .37, -4.9, U);
  [-5.7, -4.9, -4.1].forEach(z => chair(-11.45, z, -Math.PI / 2, W.teal, false, U));
  /* QYL's laptop: the base toward QYL, the lid on the far side with its screen facing QYL */
  box(.3, .02, .4, W.steel, -11.95, .78, -4.9, U); box(.02, .26, .4, W.steel, -12.12, .9, -4.9, U, false);
  screen('qylpc', U, -12.105, .9, -4.9, .36, .2, ['spec v2.1', 'APB timing'], '#7fe3c8').rotation.y = Math.PI / 2;
  chair(-12.1, -3.2, Math.PI, W.teal, false, U);
  plant(-8.9, -7.6, true, U);
  label('MEETING', -10.7, -2.8, 2.4, U);

  /* The landing upstairs: a sofa under the window, a water cooler */
  sofa(-12.6, -.7, 0, 1.6, W.sofa, U);
  box(.32, .9, .32, W.white, -12.6, .45, .45, U); box(.24, .34, .24, lam(0x9ecbe0, {transparent: true, opacity: .75}), -12.6, 1.07, .45, U);
  plant(-8.95, .5, false, U);

  /* KT's office upstairs: glass walls with a door, navy carpet, windows, a walnut desk with a proper computer, a leather chair,
     two chairs for visitors, a bookshelf, a silicon wafer on a stand, and two armchairs by the front */
  glassWall(-13, .8, -10.5, .8, U); glassWall(-9, .8, -8.4, .8, U); glassWall(-8.4, .8, -8.4, 7.98, U);
  box(1.5, .1, .14, M.trim, -9.75, 2.4, .8, U); [-10.5, -9, -8.4].forEach(x => post(x, .8, U)); post(-8.4, 7.98, U);
  box(1.9, .07, .95, W.walnut, -11.3, .78, 3.05, U); box(1.8, .72, .08, W.walnut, -11.3, .37, 3.48, U); [-1, 1].forEach(s => box(.08, .72, .85, W.walnut, -11.3 + s * .86, .37, 3.05, U));
  /* KT sits on the -z side facing +z: the monitor stands at the far edge with its screen toward KT, the keyboard and mouse in front of it */
  box(.32, .02, .2, M.trim, -11.3, .825, 3.3, U); box(.06, .3, .05, M.trim, -11.3, .97, 3.33, U);
  box(.98, .58, .04, M.dark, -11.3, 1.2, 3.3, U);
  screen('ktpc', U, -11.3, 1.2, 3.277, .9, .5, ['Q3 roadmap', 'tape-out in 6 wk'], '#ffd36a').rotation.y = Math.PI;
  box(.5, .02, .16, W.keys, -11.3, .825, 2.82, U); box(.06, .02, .1, M.dark, -10.9, .825, 2.84, U);
  /* A laptop on the left, open toward KT: the base flat, the lid tilted back from the hinge at the far edge */
  box(.4, .02, .27, W.steel, -12, .825, 2.95, U);
  {const lid = new T.Group(); lid.position.set(-12, .835, 3.08); lid.rotation.x = .25; U.add(lid);
    box(.4, .27, .015, W.steel, 0, .135, 0, lid);
    screen('ktlap', lid, 0, .135, -.009, .36, .22, ['mail', '12 unread'], '#93a9b2').rotation.y = Math.PI}
  box(.09, .1, .09, W.pot, -10.62, .865, 2.75, U);                   // coffee
  box(.12, .16, .12, W.gold, -10.55, .9, 3.25, U);                   // an award
  box(.44, .12, .06, W.walnut, -10.62, .87, 3.46, U);                // the name plate faces visitors
  screen('ceoplate', U, -10.62, .88, 3.495, .4, .1, ['KT · CEO'], '#e8c66a');
  chair(-11.3, 1.95, 0, W.leather, true, U);
  chair(-11.85, 4.05, Math.PI, null, false, U); chair(-10.75, 4.05, Math.PI, null, false, U);
  box(.4, 2, 1.6, W.walnut, -12.8, 1, 5.1, U); pic(booksTex, 1.45, 1.85, -12.59, 1 + UP, 5.1, Math.PI / 2);
  box(.3, 1, .3, W.white, -9.5, .5, 5.45, U); box(.06, .3, .06, M.trim, -9.5, 1.15, 5.45, U);
  const wafer = new T.Mesh(new T.CylinderGeometry(.3, .3, .02, 32), [lam(0xb8c2cc), lam(0xffffff, {map: waferTex, alphaTest: .5}), lam(0xb8c2cc)]);
  wafer.rotation.x = Math.PI / 2; wafer.position.set(-9.5, 1.55, 5.46); U.add(wafer);
  plant(-12.55, 1.25, true, U);
  sofa(-12.45, 6.8, 0, 1.1, W.leather, U); sofa(-10.15, 6.8, Math.PI, 1.1, W.leather, U);
  box(.8, .35, .6, W.oak, -11.3, .175, 6.8, U); box(.2, .05, .26, lam(0xd94a3a), -11.4, .375, 6.75, U);

  /* ── Downstairs: the desk pods. Six desks back to back: oak tops on white frames, a felt divider with plants along it,
     monitors on arms; the side toward the camera (s = 1) faces the back wall, so its screens are the ones the story changes ── */
  /* One desk of a pod: x across, cz the middle of the pod; s = 1 on the camera side, -1 on the far side; o = {id, lines, color, id2, lines2, color2, chair, things} */
  const podDesk = (x, cz, s, o) => {
    const z = cz + s * .45, mz = cz + s * .14;
    box(1.5, .05, .78, W.oak, x, .765, z, G);
    [-1, 1].forEach(k => {box(.06, .72, .06, W.white, x + k * .66, .37, z, G); box(.06, .04, .7, M.trim, x + k * .66, .02, z, G)});
    /* the monitor on an arm, and a laptop beside it */
    box(.05, .34, .05, M.trim, x - .2, .95, mz - s * .05, G);
    box(.8, .46, .04, M.dark, x - .2, 1.17, mz, G);
    if (o.id) {const sc = screen(o.id, G, x - .2, 1.17, mz + s * .025, .72, .4, o.lines, o.color); if (s < 0) sc.rotation.y = Math.PI}
    box(.34, .02, .24, W.steel, x + .46, .8, z + s * .05, G); box(.34, .22, .015, W.steel, x + .46, .91, z - s * .07, G);
    if (o.id2) {const sc = screen(o.id2, G, x + .46, .91, z - s * .07 + s * .01, .3, .18, o.lines2, o.color2); if (s < 0) sc.rotation.y = Math.PI}
    box(.44, .02, .14, W.keys, x - .2, .8, z + s * .17, G); box(.06, .02, .09, M.dark, x + .12, .8, z + s * .19, G);
    (o.things || []).forEach(t => t === 'mug' ? box(.08, .1, .08, W.pot, x + .64, .84, z + s * .2, G)
      : t === 'plant' ? (box(.12, .12, .12, W.pot, x - .64, .85, z + s * .05, G), box(.16, .14, .16, W.leaves, x - .64, .97, z + s * .05, G))
      : t === 'phones' ? box(.18, .08, .16, M.dark, x + .66, .83, z - s * .15, G)
      : t === 'bottle' ? box(.07, .22, .07, W.teal, x - .66, .9, z + s * .2, G) : null);
    chair(x, cz + s * 1.25, s > 0 ? Math.PI : 0, o.chair);
  };
  /* The divider down the middle of a pod: a felt screen with a strip of plants on top */
  const podSpine = (cx, cz, n) => {
    const w = n * 1.6 - .1;
    box(w, .4, .05, W.felt, cx, 1, cz, G); box(w, .12, .2, W.white, cx, 1.26, cz, G);
    for (let x = cx - w / 2 + .3; x < cx + w / 2 - .2; x += .45) box(.26, .18 + rnd() * .12, .18, W.leaves, x, 1.4, cz, G);
  };
  /* The design pod: you between SKG and JJY, KLN across from you, two free desks for whoever comes in */
  podSpine(-2.4, -2.8, 3);
  podDesk(-4, -2.8, 1, {id: 'skg', lines: ['regression', 'idle'], color: '#93a9b2', id2: 'skg2', lines2: ['tb_apb.sv', 'assert ok'], color2: '#7fe3c8', chair: W.teal, things: ['bottle', 'phones']});
  podDesk(-2.4, -2.8, 1, {id: 'mine', lines: ['login:', '_'], color: '#93a9b2', id2: 'mine2', lines2: ['spec.pdf', 'APB v2'], color2: '#93a9b2', chair: W.mustard, things: ['mug']});
  podDesk(-.8, -2.8, 1, {id: 'jjy', lines: ['timing', 'WNS +0.12'], color: '#7fe3c8', id2: 'jjy2', lines2: ['report_timing', 'max paths'], color2: '#7fe3c8', chair: W.coral, things: ['plant', 'mug']});
  podDesk(-4, -2.8, -1, {chair: W.fabric, things: ['plant']});
  podDesk(-2.4, -2.8, -1, {id: 'kln', lines: ['review queue', '3 open'], color: '#7fe3c8', id2: 'kln2', lines2: ['git log', 'a3f9 irq fix'], color2: '#7fe3c8', chair: W.fabric, things: ['mug', 'phones']});
  podDesk(-.8, -2.8, -1, {chair: W.fabric, things: ['bottle']});
  tower('reg', G, -4.7, 1.05, -2.62);
  pickBox('mydesk', 1.6, 2, 1.2, -2.4, 1, -2.2, G);
  label('DESIGN', -2.4, .15, 1.8, G);
  /* The test & layout pod: JJH and SYP side by side, two hot desks across */
  podSpine(4, 1.6, 2);
  podDesk(3.2, 1.6, 1, {id: 'jjh', lines: ['ATPG', 'idle'], color: '#93a9b2', id2: 'jjh2', lines2: ['scan.def', '4 chains'], color2: '#7fe3c8', chair: W.coral, things: ['mug', 'plant']});
  podDesk(4.8, 1.6, 1, {id: 'syp', lines: ['layout', 'idle'], color: '#93a9b2', id2: 'syp2', lines2: ['apb_regs.gds', 'M1-M10'], color2: '#7fe3c8', chair: W.teal, things: ['phones', 'bottle']});
  podDesk(3.2, 1.6, -1, {chair: W.mustard, things: ['plant']});
  podDesk(4.8, 1.6, -1, {chair: W.mustard, things: ['mug']});
  label('TEST & LAYOUT', 4, 4.2, 2.6, G);

  /* FPGA lab: a workbench along the back wall, a green board with LEDs, a monitor, a scope, a bench power supply, WSL's chair; a server rack */
  box(3.4, .9, 1, W.steel, 5.8, .45, -7.45, G); box(3.5, .06, 1.1, lam(0xd9dde0), 5.8, .93, -7.45, G);
  box(.9, .05, .6, M.green, 5.4, .99, -7.35, G); [5.1, 5.3, 5.5].forEach(x => box(.08, .06, .08, lam(0xffd36a), x, 1.04, -7.15, G));
  box(.9, .55, .06, M.dark, 6.5, 1.3, -7.75, G); box(.1, .3, .08, M.trim, 6.5, 1.05, -7.77, G); screen('fpga', G, 6.5, 1.3, -7.71, .8, .45, ['FPGA', 'no bitstream'], '#93a9b2');
  box(.5, .35, .35, W.steel, 4.75, 1.14, -7.6, G); screen('scope', G, 4.75, 1.16, -7.42, .36, .22, ['‾\\_/‾\\_/‾'], '#ffd36a');
  box(.36, .22, .3, M.dark, 7.1, 1.07, -7.35, G); screen('psu', G, 7.1, 1.08, -7.19, .3, .13, ['3.30 V', '0.02 A'], '#ff9e64');
  chair(4.8, -6.55, Math.PI, W.teal);
  pickBox('fpga', 3, 2, 1.4, 5.8, 1, -7.3, G);
  box(.9, 2.2, 1, M.dark, 8.1, 1.1, -7.5, G); box(.75, 2, .02, W.rack, 8.1, 1.1, -6.99, G, false);
  label('LAB', 5.9, -4.55, 1.6, G);

  /* The kitchen: a counter with cabinets along the right wall, a coffee machine and a microwave, two drinks fridges, an island with stools */
  const counter = lam(0x8a6a4a, {map: K.TX.wood});
  box(.9, .9, 5, counter, 12.55, .45, -4.8, G); box(1, .06, 5.1, lam(0xe8e2d6), 12.55, .93, -4.8, G);
  box(.45, 1.4, 5, W.white, 12.8, 2.3, -4.8, G);
  box(.5, .6, .5, W.steel, 12.6, 1.26, -6.6, G); box(.2, .12, .02, M.dark, 12.6, 1.35, -6.34, G, false); box(.12, .1, .12, W.pot, 12.45, 1.01, -6.45, G);
  box(.45, .35, .6, M.dark, 12.6, 1.13, -3.2, G); box(.5, .06, .4, W.steel, 12.55, .97, -5.2, G);
  [10.2, 11.2].forEach(x => {box(.9, 2, .8, W.steel, x, 1, -7.55, G); pic(drinksTex, .7, 1.6, x, 1.05, -7.14, 0, 0, {mat: {emissive: 0xffffff, emissiveIntensity: .25}}); box(.04, .5, .04, M.trim, x + .38, 1.2, -7.12, G)});
  box(2.4, .9, 1, W.white, 10.4, .45, -4.4, G); box(2.5, .06, 1.1, W.oak, 10.4, .93, -4.4, G);
  [9.6, 10.4, 11.2].forEach(x => stool(x, -3.55, .72, W.mustard));
  [[10.1, -4.5, 0xd94a3a], [10.25, -4.32, 0xf2b01e], [10.35, -4.48, 0x6cb94a]].forEach(([x, z, c]) => box(.1, .1, .1, lam(c), x, 1.01, z, G));
  box(.3, .05, .3, W.white, 10.2, .97, -4.42, G);
  pickBox('pantry', 1.4, 2, 5, 12.5, 1, -4.8, G);
  label('PANTRY', 10.9, -2.2, 2.4, G);

  /* Play: a ping-pong table */
  box(2.74, .05, 1.52, lam(0x2f6f9f), 10.6, .76, .9, G); box(2.74, .006, .03, W.white, 10.6, .79, .9, G); box(.02, .15, 1.62, W.white, 10.6, .86, .9, G);
  [[-1.2, -.6], [-1.2, .6], [1.2, -.6], [1.2, .6]].forEach(([dx, dz]) => box(.06, .74, .06, M.trim, 10.6 + dx, .37, .9 + dz, G));
  box(.16, .02, .26, lam(0xd94a3a), 9.6, .8, .7, G); box(.16, .02, .26, lam(0xd94a3a), 11.7, .8, 1.1, G); box(.04, .04, .04, W.white, 10.2, .8, 1.2, G);

  /* The lounge in front: two sofas facing each other across a coffee table, on a rug; bean bags by the door */
  sofa(1.55, 6.6, 0, 2, W.sofa); sofa(5.25, 6.6, Math.PI, 2, W.sofa);
  box(1, .38, .6, W.oak, 3.4, .19, 6.6, G); box(.3, .03, .22, lam(0x3b86bd), 3.3, .395, 6.55, G); box(.1, .12, .1, W.pot, 3.65, .44, 6.7, G);
  beanBag(9.2, 6.2, W.coral); beanBag(10.5, 6.1, W.mustard); beanBag(9.9, 7.2, W.teal);
  box(.6, .3, .6, W.white, 9.9, .15, 6.55, G);
  /* A huddle corner on the left: a standing table with stools, and a whiteboard on wheels */
  box(1.6, .05, .8, W.oak, -3.4, 1.05, 6.4, G); [-1, 1].forEach(s => box(.06, 1, .6, W.white, -3.4 + s * .7, .52, 6.4, G));
  [[-3.9, 5.75], [-2.9, 5.75], [-3.9, 7.05], [-2.9, 7.05]].forEach(([x, z]) => stool(x, z, .75, W.coral));
  box(1.7, 1.1, .05, M.trim, -5.6, 1.45, 6.3, G); box(1.6, 1, .05, lam(0xffffff), -5.6, 1.45, 6.32, G);
  screen('huddle', G, -5.6, 1.45, 6.35, 1.5, .9, ['standup 09:30', 'tape-out −6 wk'], '#1f5f8b');
  [-1, 1].forEach(s => {box(.05, 1.6, .05, M.trim, -5.6 + s * .8, .8, 6.3, G); box(.05, .05, .5, M.trim, -5.6 + s * .8, .06, 6.3, G)});
  /* Plants everywhere */
  plant(-2.85, -7.55, true); plant(2.85, -7.55, true); plant(-6.2, 7.35, true); plant(6.55, 7.1, true); plant(12.45, 7.4, true); plant(8.95, -5.6, true);
  plant(-6.15, -4.4); plant(12.5, -1.75); plant(.4, 5.6);

  /* How high the floor is: upstairs, the landing, the slope of the stairs, downstairs */
  K.ground((x, z) => x < SX0 ? UP : x > SX1 ? 0 : z >= -1.6 && z <= Z1 ? UP : z > Z1 && z < Z0 ? UP * (Z0 - z) / (Z0 - Z1) : 0);
  /* Where things block walking: [x0, x1, z0, z1]. The edge of the mezzanine and the sides of the stairs keep the two floors apart */
  K.block([
    [-8.45, -8.4, -8, -1.6], [-8.45, -8.4, .4, 8], [SX0, SX1, -1.7, -1.6], [SX1, SX1 + .05, -1.7, Z0], [-13, -8.4, 7.5, 8],
    [-13, -10.5, -2.3, -2.1], [-9, -8.4, -2.3, -2.1], [-12.55, -11.65, -6.25, -2.95], [-9.15, -8.65, -7.85, -7.35],
    [-13, -12.2, -1.55, .15], [-12.8, -12.4, .25, .65], [-9.2, -8.7, .25, .75],
    [-13, -10.5, .76, .84], [-9, -8.4, .76, .84], [-12.25, -10.35, 2.6, 3.5], [-12.1, -10.5, 3.8, 4.3], [-13, -12.6, 4.3, 5.9], [-9.65, -9.35, 5.3, 5.6], [-12.8, -12.3, 1, 1.5],
    [-12.85, -9.75, 6.2, 7.4],
    [-8.4, -6.75, -7.95, -5.15], [-6.4, -5.9, -4.65, -4.15],
    [-4.8, 0, -3.65, -1.95], [2.4, 5.6, .75, 2.45],
    [4.05, 7.55, -8, -6.9], [7.6, 8.6, -8, -6.95], [8.7, 9.2, -5.85, -5.35], [-3.1, -2.6, -7.8, -7.3], [2.6, 3.1, -7.8, -7.3],
    [9.75, 11.65, -8, -7.1], [12.1, 13, -7.3, -2.3], [9.2, 11.6, -4.9, -3.9], [12.25, 12.75, -2, -1.5],
    [9.2, 12, .1, 1.7],
    [1.15, 1.95, 5.6, 7.6], [4.85, 5.65, 5.6, 7.6], [2.9, 3.9, 6.3, 6.9], [.15, .65, 5.35, 5.85],
    [8.8, 10.9, 5.8, 7.6], [12.2, 12.7, 7.15, 7.65], [6.3, 6.8, 6.85, 7.35],
    [-4.3, -2.5, 5.95, 6.85], [-6.45, -4.75, 6.2, 6.4], [-6.45, -5.95, 7.1, 7.6]
  ]);
  /* Where people stand, and how they can walk between those points (in straight lines, so each line must be clear).
     Points ending in V are where a visitor stands to chat with that person; pantry, pantry2, cooler, pong and lounge are where people take a break.
     The walkways: a front aisle (A3 – A2 – A15 – A1) from the stairs to the door, an aisle down the middle (A2 – C1 – C2) to the lab, one on the left (L1). */
  K.nodes({
    outside: [14.4, 4], door: [12.4, 4], lobby: [11.4, 4.6], start: [10, 3.8],
    A1: [7.4, 4.2], A15: [4, 4.6], A2: [1.2, 4.6], A3: [-5.6, 4.4], C1: [1.2, -.3], C2: [1.2, -4.95], L1: [-5.6, 0],
    skg: [-4, -.65], skgV: [-5.1, -1.3], mine: [-2.4, -.6], jjy: [-.8, -.65], jjyV: [.3, -1.3], kln: [-2.4, -4.95], klnV: [-1.3, -5],
    jjh: [3.2, 3.75], jjhV: [2, 3.5], syp: [4.8, 3.75], sypV: [5.95, 3.4],
    lab: [6.4, -5.6], wsl: [3.9, -6], wslV: [5.4, -5.45],
    K1: [8.6, -2.2], pantry: [11.4, -2.6], pantry2: [9.8, -2.7], pong: [10.6, 2.5], lounge: [3.4, 5.4], huddle: [-3.4, 5.3],
    stBot: [-7.5, 5.4], stTop: [-7.5, -.6], up2: [-9.75, -.6], meet: [-9.75, -1.6], qyl: [-10.8, -4.85], ceodoor: [-9.75, .2], ceo: [-10.3, 1.65], cooler: [-11.9, .3],
    qylV: [-10.4, -3.9], ktV: [-9.7, 2.6]
  }, 'outside-door door-lobby lobby-start door-start start-A1 A1-A15 A15-A2 A2-A3 A3-stBot stBot-stTop stTop-up2 up2-meet meet-qyl meet-qylV up2-ceodoor ceodoor-ceo ceodoor-ktV up2-cooler ' +
    'A2-C1 C1-C2 C1-L1 L1-A3 C1-mine C1-jjy C1-jjyV L1-skg L1-skgV C2-kln C2-klnV klnV-kln C2-lab C2-wsl lab-wslV lab-K1 C1-K1 A1-K1 K1-pantry K1-pantry2 pantry-pantry2 ' +
    'A15-jjh A15-syp A2-jjhV A1-sypV A15-lounge A2-lounge A3-huddle A2-huddle start-pong A1-pong');
  /* Home-screen camera shots */
  WORLD.shots = [{p: [-2.4, 1.2, -2.8], d: 15, yaw: .3, pitch: .6}, {p: [3, 1.5, 0], d: 27, yaw: -.3, pitch: .75}, {p: [-10.5, UP + 1, 3], d: 12, yaw: .45, pitch: .7}, {p: [9.5, 1.2, 2], d: 15, yaw: .5, pitch: .62}];
});
WORLD.level = 'office';
