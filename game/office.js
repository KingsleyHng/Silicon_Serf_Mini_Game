/* The office of KT Silicon Labs: a bright two-storey office in pixel style (16 pixels per metre, like the people's skins).
   Downstairs, back wall left to right: the RTL lead's desk, the verification desk, the logo on a blue wall, the FPGA lab with server racks.
   In the middle: JJH's desk (test). Front: your desk and JJY's. Right: the pantry, the front door, a sofa by the door.
   Upstairs: a mezzanine along the left wall, 3 m up, reached by the stairs beside it: the meeting room at the back, KT's glass office at the front.
   Under the mezzanine: the server room and the washrooms (closed). The back and left walls are two storeys high, with a band of high windows.
   Coordinates: x to the right, z toward the camera (down the screen), y up; 1 unit is about 1 metre. */
/* Where people sit when they are not talking: their chair (at), facing their screen (face), next to the point they stand at (node).
   The engine sits them down whenever they are idle at that point, and stands them up while they speak. */
const SEATS = {
  kln: {node: 'kln', at: [-2.5, -4.6], face: Math.PI},
  skg: {node: 'skg', at: [1.5, -4.6], face: Math.PI},
  jjy: {node: 'jjy', at: [2.65, 3.2], face: Math.PI},
  qyl: {node: 'qyl', at: [-7.45, -3.95], face: -Math.PI / 2},
  wsl: {node: 'wsl', at: [5, -4.55], face: Math.PI},
  jjh: {node: 'jjh', at: [-.35, -.3], face: Math.PI},
  kt: {node: 'ceo', at: [-7.3, 1.95], face: 0, drop: .14}
};
Object.keys(SEATS).forEach(id => {WORLD.cast[id].seat = SEATS[id]});

levelAdd('office', function (K) {
  const {T, box, flat, lam, M, px, pxc, P, rnd, label, screen, tower, pickBox, G} = K;
  const UP = 3, U = new T.Group(); U.position.y = UP; G.add(U);   // upstairs: everything in U is 3 m up, at the same x and z
  K.bounds(-9, 9, -6.2, 6);

  /* ── Pixel textures (16 pixels per metre; px repeats, pxc is a one-off picture) ── */
  const speck = (g, base, cs, n) => {P(g, base, 0, 0, 16, 16); for (let i = 0; i < n; i++) P(g, cs[rnd() * cs.length | 0], rnd() * 16 | 0, rnd() * 16 | 0)};
  const X = {
    planks: px(16, (g, s) => [['#efe2c8', 3], ['#e8d7b6', 11], ['#f2e6cf', 7], ['#e5d3b0', 14]].forEach(([c, j], r) => {
      const y = r * 4; P(g, c, 0, y, s, 4); P(g, '#dccaa8', 0, y + 3, s, 1); P(g, '#dccaa8', j, y, 1, 3); P(g, '#f4e9d4', (j + 4) % 16, y + 1, 3, 1)})),
    carpet: px(16, g => {speck(g, '#c7d4de', ['#b9c8d4', '#d4dfe7', '#bfcdd8'], 70); P(g, '#b0c0cc', 0, 0, 16, 1); P(g, '#b0c0cc', 0, 0, 1, 16)}),
    meetCarpet: px(16, g => {speck(g, '#dde2e9', ['#d2d8e1', '#e6eaf0'], 60); P(g, '#ccd3dc', 0, 0, 16, 1); P(g, '#ccd3dc', 0, 0, 1, 16)}),
    navy: px(16, g => {speck(g, '#2e4166', ['#273958', '#354a72', '#2a3c60'], 80)}),
    checker: px(16, (g, s) => {P(g, '#f3f5f6', 0, 0, s, s); P(g, '#dce2e5', 0, 0, 8, 8); P(g, '#dce2e5', 8, 8, 8, 8); P(g, '#cfd6da', 0, 0, s, 1); P(g, '#cfd6da', 0, 0, 1, s)}),
    labTile: px(16, (g, s) => {P(g, '#e4e9ec', 0, 0, s, s); P(g, '#cdd5da', 0, 0, s, 1); P(g, '#cdd5da', 0, 0, 1, s); [[4, 4], [12, 4], [4, 12], [12, 12]].forEach(p => P(g, '#d6dde1', p[0], p[1]))}),
    leaves: px(16, g => speck(g, '#4f9b3c', ['#3e8530', '#62b04a', '#2f6b25', '#78c25a'], 90)),
    pot: px(16, (g, s) => {P(g, '#f3f1ec', 0, 0, s, s); P(g, '#dcd8cf', 0, 0, s, 2); P(g, '#e6e2d9', 0, 13, s, 3)}),
    walnut: px(16, (g, s) => {P(g, '#6e472b', 0, 0, s, s); [[3, 2, 9], [9, 6, 8], [13, 0, 6]].forEach(([y, x, w]) => P(g, '#5b3a22', x, y, w, 1)); P(g, '#80573a', 4, 6, 5, 1); P(g, '#80573a', 1, 11, 6, 1)}),
    white: px(16, (g, s) => {P(g, '#f7f8f9', 0, 0, s, s); P(g, '#e9ecee', 0, 15, s, 1)}),
    fabric: px(16, g => speck(g, '#35506e', ['#2d4560', '#3e5b7c', '#304a66'], 70)),
    leather: px(16, g => speck(g, '#25292e', ['#1c1f23', '#30353b'], 50)),
    sofa: px(16, g => speck(g, '#3b86bd', ['#3279ad', '#4592c9', '#2f6f9f'], 70)),
    accent: px(16, g => speck(g, '#1f5f8b', ['#1b5680', '#246a99'], 40)),
    rack: px(16, (g, s) => {P(g, '#1f262b', 0, 0, s, s); for (let y = 0; y < 16; y += 4) {P(g, '#2c353b', 0, y, s, 1); P(g, '#39d67a', 2, y + 2); if (rnd() > .4) P(g, '#f2b01e', 4, y + 2); for (let x = 8; x < 15; x += 2) P(g, '#151b1f', x, y + 2)}}),
    keys: px(16, (g, s) => {P(g, '#2a3035', 0, 0, s, s); for (let y = 1; y < 16; y += 3) for (let x = 1; x < 16; x += 2) P(g, '#4a535a', x, y)}),
    steel: px(16, (g, s) => {P(g, '#c9d0d4', 0, 0, s, s); P(g, '#b7bfc4', 0, 5, s, 1); P(g, '#dde2e5', 0, 9, s, 1)}),
    oak: px(16, (g, s) => {P(g, '#c99a62', 0, 0, s, s); [[2, 1, 9], [7, 5, 10], [12, 0, 7]].forEach(([y, x, w]) => P(g, '#b8864f', x, y, w, 1)); P(g, '#d8ad78', 3, 4, 6, 1)})
  };
  const L = (t, c) => lam(c || 0xffffff, {map: t});
  const W = {planks: L(X.planks), carpet: L(X.carpet), meet: L(X.meetCarpet), navy: L(X.navy), checker: L(X.checker), lab: L(X.labTile), leaves: L(X.leaves), pot: L(X.pot),
    walnut: L(X.walnut), white: L(X.white), fabric: L(X.fabric), leather: L(X.leather), sofa: L(X.sofa), accent: L(X.accent), rack: L(X.rack), keys: L(X.keys), steel: L(X.steel), oak: L(X.oak),
    grey: lam(0xaab4ba), gold: lam(0xd9ab45), frost: lam(0xffffff, {transparent: true, opacity: .5, depthWrite: false})};

  /* The view outside: one picture shared by every window, 16 pixels per metre and mapped by where each window is, so the windows
     downstairs look out at the hedge, the tree trunks and the lower floors across the park, and the high ones at the treetops, the roofs and the sky.
     Columns 0–296 are what the back wall looks out on (x from -9.25 to 9.25), columns 296–494 what the left wall looks out on (z from 6.1 to -6.3);
     row 0 is 7 m up, the bottom row is the ground. Clouds drift and leaves fall from the trees about twelve times a second
     (a still picture for people who ask for reduced motion). */
  const VW = 512, VH = 112, PPM = 16, BACK = 296, REG = [[0, BACK], [BACK, 198]];
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
  REG.forEach(([x0, w]) => {for (let i = 0; i < 4; i++) clouds.push({x0, w, x: rnd() * w, y: 14 + (rnd() * 22 | 0), s: 8 + (rnd() * 12 | 0), v: .1 + rnd() * .12})});
  /* A leaf starts somewhere in a crown (after a short wait), sways as it falls and lands on the hedge or the grass */
  const leaf = l => {const t = trees[Math.random() * trees.length | 0];
    return Object.assign(l, {t, x: t.x + (Math.random() * 2 - 1) * t.R * .8, y: t.cy + Math.random() * t.R * .6, v: .25 + Math.random() * .3, ph: Math.random() * 6,
      land: 86 + Math.random() * 22, c: ['#e8a030', '#e07a2b', '#d4b43a', '#c9583a', '#f0c848'][Math.random() * 5 | 0], wait: Math.random() * 40 | 0})};
  for (let i = 0; i < 30; i++) leaves.push(leaf({}));
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
  /* Other one-off pictures: the chip on the rug, the wafer, the book spines */
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
  /* A flat picture: pic(texture, w, h, x, y, z, ry, rx, {rep: repeat across, mat: material options}) */
  const pic = (tex, w, h, x, y, z, ry, rx, o) => {
    const geo = new T.PlaneGeometry(w, h);
    if (o && o.rep) {const uv = geo.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) * o.rep)}
    const m = new T.Mesh(geo, new T.MeshLambertMaterial(Object.assign({map: tex}, o && o.mat)));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); G.add(m); return m;
  };

  /* ── Floor and walls ── */
  const wall = lam(0xf4f7f8, {map: K.TX.wall});
  flat(18, 12.2, W.planks, 0, 0, -.1, 1, G);
  flat(7.6, 2.8, W.carpet, -.6, .004, -4.8, 1, G);                 // the back desks
  flat(6.4, 2.6, W.carpet, 1.3, .004, 2.6, 1, G);                  // the front desks
  flat(4.8, 2.9, W.lab, 6.6, .005, -4.75, 1, G);                   // the lab, with yellow tape along its edge
  flat(4.8, .12, M.hazard, 6.6, .007, -3.36, .5, G);
  flat(2.8, 4.2, W.checker, 7.6, .006, -1.2, 1, G);                // the pantry
  pic(chipTex, 2.6, 2.6, 3.4, .007, .3, 0, -Math.PI / 2);          // a chip rug in the middle of the floor
  /* The back and left walls go up two floors; the right wall stays low so the camera sees in */
  box(18.4, 6.4, .3, wall, 0, 3.2, -6.35, G);
  box(.3, 6.4, 12.4, wall, -9.15, 3.2, -.1, G);
  box(.3, 3.2, 8, wall, 9.15, 1.6, -2.1, G); box(.3, 3.2, 1.9, wall, 9.15, 1.6, 5.05, G);
  box(13.4, .12, .04, W.grey, 2.3, .06, -6.18, G);                 // skirting
  /* Front door (right wall, z 2–4) and a doormat */
  box(.4, 2.6, .2, M.trim, 9.1, 1.3, 1.9, G); box(.4, 2.6, .2, M.trim, 9.1, 1.3, 4.1, G); box(.4, .3, 2.4, M.trim, 9.1, 2.65, 3, G);
  box(.08, 2.4, 2, M.glass, 9.15, 1.2, 3, G, false);
  flat(1, 1.6, lam(0x3b4248), 8.4, .008, 3, 1, G); flat(.8, 1.4, W.accent, 8.4, .01, 3, 1, G);

  /* Windows: a dark frame, the view (lit a little from inside so it reads as daylight), mullions every metre or so, a white sill */
  const windowBack = (x0, x1, y0, y1) => {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    box(w + .14, h + .14, .03, M.trim, cx, cy, -6.19, G, false); pane(w, h, cx, cy, -6.17, 0, (x0 + 9.25) * PPM, (x1 + 9.25) * PPM);
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.05, h, .04, M.trim, x0 + w * i / n, cy, -6.16, G, false);
    box(w + .2, .05, .16, W.white, cx, y0 - .07, -6.12, G);
  };
  const windowLeft = (z0, z1, y0, y1) => {
    const w = z1 - z0, h = y1 - y0, cz = (z0 + z1) / 2, cy = (y0 + y1) / 2;
    box(.03, h + .14, w + .14, M.trim, -8.99, cy, cz, G, false); pane(w, h, -8.97, cy, cz, Math.PI / 2, BACK + (6.1 - z1) * PPM, BACK + (6.1 - z0) * PPM);
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.04, h, .05, M.trim, -8.96, cy, z0 + w * i / n, G, false);
    box(.16, .05, w + .2, W.white, -8.92, y0 - .07, cz, G);
  };
  windowBack(-3.9, 2.3, 1.55, 2.95); windowBack(5.9, 8.8, 1.7, 2.95);
  windowBack(-4.1, 8.8, UP + .7, UP + 2.9);                        // a band of high windows over the open floor
  windowLeft(-5.7, -2.7, UP + 1, UP + 2.8); windowLeft(-1.9, .5, UP + 1, UP + 2.8); windowLeft(1.2, 4.1, UP + 1, UP + 2.8);

  /* Company logo on a brand-blue wall: the logo (logo.js) on a white plaque with a trim edge */
  box(3.1, 3.2, .02, W.accent, 4.2, 1.6, -6.195, G, false);
  box(2.7, 1.75, .04, M.trim, 4.2, 2.25, -6.17, G); box(2.6, 1.65, .05, lam(0xffffff), 4.2, 2.25, -6.15, G);
  const logoTex = new T.TextureLoader().load(LOGO.src); logoTex.encoding = T.sRGBEncoding; logoTex.anisotropy = 4;
  const logo = new T.Mesh(new T.PlaneGeometry(2.45, 2.45 * LOGO.h / LOGO.w), lam(0xffffff, {map: logoTex, transparent: true}));
  logo.position.set(4.2, 2.25, -6.12); G.add(logo);

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
  /* A modern white desk with panel legs; the person works from the +z side */
  const desk = (x, z, w) => {
    const g = new T.Group(); g.position.set(x, 0, z); G.add(g);
    box(w, .06, .9, W.white, 0, .76, 0, g);
    [-1, 1].forEach(s => box(.06, .73, .8, W.grey, s * (w / 2 - .08), .365, 0, g));
    box(w - .2, .3, .03, W.grey, 0, .55, -.4, g);
    return g;
  };
  /* A monitor on a stand (its screen has an id, so the story can change what it shows) */
  const monitor = (x, z, id, lines, color, w) => {
    w = w || .9;
    box(w, .55, .06, M.dark, x, 1.12, z, G); box(.1, .3, .08, M.trim, x, .92, z - .02, G); box(.3, .02, .2, M.trim, x, .8, z, G);
    screen(id, G, x, 1.12, z + .035, w - .1, .45, lines, color);
  };
  /* A desk with two monitors, a keyboard, a mouse and a mug */
  const workstation = (x, z, id, lines, color, id2, lines2, color2) => {
    desk(x, z, 2);
    monitor(x - .42, z - .18, id, lines, color); monitor(x + .45, z - .18, id2, lines2, color2, .7);
    box(.55, .03, .18, W.keys, x - .35, .8, z + .2, G); box(.07, .03, .1, M.dark, x + .1, .8, z + .2, G);
    box(.08, .1, .08, W.pot, x + .75, .84, z + .22, G);
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

  /* ── Upstairs (x < -4.4): a mezzanine 3 m up with the meeting room at the back and KT's office at the front ── */
  box(4.6, .3, 12.2, W.white, -6.7, UP - .15, -.1, G);                // the floor slab and its trim
  box(.05, .32, 12.2, M.trim, -4.38, UP - .15, -.1, G); box(4.6, .32, .05, M.trim, -6.7, UP - .15, 6.02, G);
  flat(4.6, 12.2, W.planks, -6.7, .002, -.1, 1, U);
  flat(4.6, 4, W.meet, -6.7, .006, -4.2, 1, U);                      // meeting room
  flat(4.6, 5.2, W.navy, -6.7, .006, 3.4, 1, U);                     // KT's office
  box(4.6, .12, .04, W.grey, -6.7, .06, -6.18, U); box(.04, .12, 12, W.grey, -8.98, .06, -.1, U);   // skirting
  rail(-9, 5.98, -4.4, 5.98, U);                                     // the open front
  rail(-4.42, -2.2, -4.42, -1.6, U); rail(-4.42, .4, -4.42, .8, U);  // beside the top of the stairs

  /* Downstairs, under the mezzanine: the server room (racks behind a window) and the washrooms, closed off */
  box(.2, UP - .3, 12.2, wall, -4.5, (UP - .3) / 2, -.1, G);
  box(4.6, UP - .3, .2, wall, -6.7, (UP - .3) / 2, 5.95, G);
  box(.05, 1.5, 2.8, M.trim, -4.38, 1.45, -3.6, G); box(.02, 1.36, 2.66, W.rack, -4.36, 1.45, -3.6, G, false); box(.02, 1.36, 2.66, M.glass, -4.34, 1.45, -3.6, G, false);
  box(.06, 2.1, .9, W.walnut, -4.37, 1.05, -5.55, G); box(.03, .05, .2, W.gold, -4.33, 1.05, -5.25, G);
  screen('srv', G, -4.36, 2.55, -3.6, .53, .3, ['SERVER', 'ROOM'], '#93a9b2').rotation.y = Math.PI / 2;
  [-8.2, -7].forEach(x => {box(.9, 2.1, .06, W.walnut, x, 1.05, 6.06, G); box(.04, .2, .03, W.gold, x + .32, 1.05, 6.1, G);
    box(.34, .34, .03, W.accent, x, 2.4, 6.08, G); box(.06, .2, .02, W.white, x, 2.4, 6.1, G); box(.1, .1, .02, W.white, x, 2.53, 6.1, G)});   // washroom signs
  box(1.3, 2.3, .08, W.leaves, -5.3, 1.3, 6.08, G);                  // a green wall of moss
  /* A printer in the corner behind the stairs */
  box(.6, .75, .55, W.white, -3.85, .375, -2.6, G); box(.5, .12, .42, M.dark, -3.85, .81, -2.6, G); box(.34, .02, .24, lam(0xffffff), -3.85, .88, -2.62, G);

  /* The stairs: 15 steps of 20 cm up from the front (z 4.8) to a landing at the back, against the mezzanine; oak treads, a glass balustrade */
  const SX0 = -4.4, SX1 = -2.6, SW = SX1 - SX0, SCX = (SX0 + SX1) / 2, Z0 = 4.8, Z1 = .4, N = 15, RUN = (Z0 - Z1) / N, RISE = UP / N;
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
  glassWall(-9, -2.2, -6.5, -2.2, U); glassWall(-5, -2.2, -4.4, -2.2, U); glassWall(-4.4, -6.2, -4.4, -2.2, U);
  box(1.5, .1, .14, M.trim, -5.75, 2.4, -2.2, U); [-6.5, -5, -4.4].forEach(x => post(x, -2.2, U));
  box(2.8, 1.4, .06, lam(0xffffff), -7.2, 1.6, -6.15, U); box(2.9, .08, .14, M.trim, -7.2, .88, -6.12, U);
  screen('board', U, -7.2, 1.6, -6.1, 2.6, 1.2, ['PSEL  _/‾‾‾‾‾\\_', 'PEN   ___/‾‾\\_', 'SETUP → ACCESS'], '#1f5f8b');
  box(.8, .06, 2.1, W.white, -8.1, .74, -3.95, U); box(.12, .7, 1.6, W.grey, -8.1, .37, -3.95, U);
  [-4.6, -3.95, -3.3].forEach(z => chair(-7.45, z, -Math.PI / 2, null, false, U));
  /* QYL's laptop: the base toward QYL, the lid on the far side with its screen facing QYL */
  box(.3, .02, .4, W.steel, -7.95, .78, -3.95, U); box(.02, .26, .4, W.steel, -8.12, .9, -3.95, U, false);
  screen('qylpc', U, -8.105, .9, -3.95, .36, .2, ['spec v2.1', 'APB timing'], '#7fe3c8').rotation.y = Math.PI / 2;
  chair(-8.1, -2.6, Math.PI, null, false, U);
  plant(-4.9, -5.75, true, U);
  label('MEETING', -6.7, -2.8, 2.4, U);

  /* The landing upstairs: a sofa under the window, a water cooler */
  box(.7, .42, 1.6, W.sofa, -8.6, .21, -.7, U); box(.22, .55, 1.6, W.sofa, -8.9, .62, -.7, U);
  [-1.45, .05].forEach(z => box(.7, .3, .15, W.sofa, -8.6, .55, z, U));
  box(.32, .9, .32, W.white, -8.6, .45, .45, U); box(.24, .34, .24, lam(0x9ecbe0, {transparent: true, opacity: .75}), -8.6, 1.07, .45, U);
  plant(-4.95, .5, false, U);

  /* KT's office upstairs: glass walls with a door, navy carpet, a window, a walnut desk with a proper computer, a leather chair,
     two chairs for visitors, a bookshelf and a silicon wafer on a stand */
  glassWall(-9, .8, -6.5, .8, U); glassWall(-5, .8, -4.4, .8, U); glassWall(-4.4, .8, -4.4, 6, U);
  box(1.5, .1, .14, M.trim, -5.75, 2.4, .8, U); [-6.5, -5, -4.4].forEach(x => post(x, .8, U)); post(-4.4, 6, U);
  box(1.9, .07, .95, W.walnut, -7.3, .78, 3.05, U); box(1.8, .72, .08, W.walnut, -7.3, .37, 3.48, U); [-1, 1].forEach(s => box(.08, .72, .85, W.walnut, -7.3 + s * .86, .37, 3.05, U));
  /* KT sits on the -z side facing +z: the monitor stands at the far edge with its screen toward KT, the keyboard and mouse in front of it */
  box(.32, .02, .2, M.trim, -7.3, .825, 3.3, U); box(.06, .3, .05, M.trim, -7.3, .97, 3.33, U);
  box(.98, .58, .04, M.dark, -7.3, 1.2, 3.3, U);
  screen('ktpc', U, -7.3, 1.2, 3.277, .9, .5, ['Q3 roadmap', 'tape-out in 6 wk'], '#ffd36a').rotation.y = Math.PI;
  box(.5, .02, .16, W.keys, -7.3, .825, 2.82, U); box(.06, .02, .1, M.dark, -6.9, .825, 2.84, U);
  /* A laptop on the left, open toward KT: the base flat, the lid tilted back from the hinge at the far edge */
  box(.4, .02, .27, W.steel, -8, .825, 2.95, U);
  {const lid = new T.Group(); lid.position.set(-8, .835, 3.08); lid.rotation.x = .25; U.add(lid);
    box(.4, .27, .015, W.steel, 0, .135, 0, lid);
    screen('ktlap', lid, 0, .135, -.009, .36, .22, ['mail', '12 unread'], '#93a9b2').rotation.y = Math.PI}
  box(.09, .1, .09, W.pot, -6.62, .865, 2.75, U);                    // coffee
  box(.12, .16, .12, W.gold, -6.55, .9, 3.25, U);                    // an award
  box(.44, .12, .06, W.walnut, -6.62, .87, 3.46, U);                 // the name plate faces visitors
  screen('ceoplate', U, -6.62, .88, 3.495, .4, .1, ['KT · CEO'], '#e8c66a');
  chair(-7.3, 1.95, 0, W.leather, true, U);
  chair(-7.85, 4.05, Math.PI, null, false, U); chair(-6.75, 4.05, Math.PI, null, false, U);
  box(.4, 2, 1.6, W.walnut, -8.8, 1, 5.1, U); pic(booksTex, 1.45, 1.85, -8.59, 1 + UP, 5.1, Math.PI / 2);
  box(.3, 1, .3, W.white, -5.5, .5, 5.45, U); box(.06, .3, .06, M.trim, -5.5, 1.15, 5.45, U);
  const wafer = new T.Mesh(new T.CylinderGeometry(.3, .3, .02, 32), [lam(0xb8c2cc), lam(0xffffff, {map: waferTex, alphaTest: .5}), lam(0xb8c2cc)]);
  wafer.rotation.x = Math.PI / 2; wafer.position.set(-5.5, 1.55, 5.46); U.add(wafer);
  plant(-8.55, 1.25, true, U);

  /* ── Downstairs: desks along the back wall: the RTL lead, then verification (with the regression light) ── */
  workstation(-2.2, -5.4, 'kln', ['review queue', '3 open'], '#7fe3c8', 'kln2', ['git log', 'a3f9 irq fix'], '#7fe3c8');
  chair(-2.5, -4.6, Math.PI);
  workstation(1.8, -5.4, 'skg', ['regression', 'idle'], '#93a9b2', 'skg2', ['tb_apb.sv', 'assert ok'], '#7fe3c8');
  chair(1.5, -4.6, Math.PI);
  tower('reg', G, 2.65, 1.05, -5.75);
  label('RTL', -.2, -3.3, 1.6, G);
  plant(-3.85, -5.75, true); plant(3.25, -5.8);

  /* FPGA lab: a workbench, a green board with LEDs, a monitor, a scope, a bench power supply, WSL's chair; two server racks against the right wall */
  box(3, .9, 1, W.steel, 6, .45, -5.4, G); box(3.1, .06, 1.1, lam(0xd9dde0), 6, .93, -5.4, G);
  box(.9, .05, .6, M.green, 5.6, .99, -5.3, G); [5.3, 5.5, 5.7].forEach(x => box(.08, .06, .08, lam(0xffd36a), x, 1.04, -5.1, G));
  box(.9, .55, .06, M.dark, 6.7, 1.3, -5.7, G); box(.1, .3, .08, M.trim, 6.7, 1.05, -5.72, G); screen('fpga', G, 6.7, 1.3, -5.66, .8, .45, ['FPGA', 'no bitstream'], '#93a9b2');
  box(.5, .35, .35, W.steel, 4.95, 1.14, -5.55, G); screen('scope', G, 4.95, 1.16, -5.37, .36, .22, ['‾\\_/‾\\_/‾'], '#ffd36a');
  box(.36, .22, .3, M.dark, 7.3, 1.07, -5.3, G); screen('psu', G, 7.3, 1.08, -5.14, .3, .13, ['3.30 V', '0.02 A'], '#ff9e64');
  chair(5, -4.55, Math.PI);
  pickBox('fpga', 3, 2, 1.4, 6, 1, -5.3, G);
  [-5.65, -4.45].forEach(z => {box(.75, 2.2, 1.05, M.dark, 8.55, 1.1, z, G); box(.02, 2, .9, W.rack, 8.16, 1.1, z, G, false)});
  label('LAB', 6, -3.5, 1.6, G);

  /* JJH's desk in the middle of the floor: design for test */
  flat(2.8, 2.2, W.carpet, 0, .004, -.85, 1, G);
  workstation(0, -1.1, 'jjh', ['ATPG', 'idle'], '#93a9b2', 'jjh2', ['scan.def', '4 chains'], '#7fe3c8');
  chair(-.35, -.3, Math.PI);

  /* Your desk, front left, and JJY's next to it: synthesis and timing */
  workstation(-.4, 2.4, 'mine', ['login:', '_'], '#93a9b2', 'mine2', ['spec.pdf', 'APB v2'], '#93a9b2');
  chair(-.75, 3.2, Math.PI);
  pickBox('mydesk', 2.2, 2, 1.4, -.4, 1, 2.5, G);
  workstation(3, 2.4, 'jjy', ['timing', 'WNS +0.12'], '#7fe3c8', 'jjy2', ['report_timing', 'max paths'], '#7fe3c8');
  chair(2.65, 3.2, Math.PI);
  plant(4.6, 5.55, true);

  /* Pantry against the right wall: counter with cabinets above, coffee machine, microwave, fridge, a high table with stools */
  const counter = lam(0x8a6a4a, {map: K.TX.wood});
  box(.9, .9, 2.6, counter, 8.5, .45, -.6, G); box(1, .06, 2.7, lam(0xe8e2d6), 8.5, .93, -.6, G);
  box(.45, 1.6, 2.6, W.white, 8.75, 2.2, -.6, G);
  box(.5, .6, .5, W.steel, 8.6, 1.26, -1.4, G); box(.2, .12, .02, M.dark, 8.6, 1.35, -1.14, G, false); box(.12, .1, .12, W.pot, 8.45, 1.01, -1.25, G);
  box(.45, .35, .6, M.dark, 8.6, 1.13, .2, G);
  box(.9, 2, .9, lam(0xe6ebed, {map: K.TX.panel}), 8.5, 1, -2.6, G); box(.04, .6, .04, M.trim, 8.03, 1.2, -2.3, G);
  box(.7, .05, .7, W.white, 6.1, 1.05, -2.3, G); box(.08, 1, .08, M.trim, 6.1, .5, -2.3, G); box(.5, .04, .5, M.trim, 6.1, .02, -2.3, G);
  [[5.55, -2.3], [6.65, -2.3]].forEach(([x, z]) => {box(.35, .06, .35, W.walnut, x, .75, z, G); box(.05, .72, .05, M.trim, x, .36, z, G)});
  [[6, -2.4, 0xd94a3a], [6.15, -2.22, 0xf2b01e], [6.25, -2.38, 0x6cb94a]].forEach(([x, z, c]) => box(.1, .1, .1, lam(c), x, 1.13, z, G));
  pickBox('pantry', 1.4, 2, 3, 8.4, 1, -.6, G);
  label('PANTRY', 6.6, .9, 2.4, G);
  plant(8.55, 1.3, true);

  /* By the door: a sofa against the right wall and a low table */
  box(.7, .42, 1.6, W.sofa, 8.6, .21, 5.15, G); box(.22, .55, 1.6, W.sofa, 8.9, .62, 5.15, G);
  [4.4, 5.9].forEach(z => box(.7, .3, .15, W.sofa, 8.6, .55, z, G));
  box(.8, .06, .5, W.white, 7.45, .4, 5.2, G); box(.7, .37, .4, W.grey, 7.45, .185, 5.2, G); box(.3, .03, .22, lam(0x3b86bd), 7.35, .44, 5.2, G);

  /* How high the floor is: upstairs, the landing, the slope of the stairs, downstairs */
  K.ground((x, z) => x < SX0 ? UP : x > SX1 ? 0 : z >= -1.6 && z <= Z1 ? UP : z > Z1 && z < Z0 ? UP * (Z0 - z) / (Z0 - Z1) : 0);
  /* Where things block walking: [x0, x1, z0, z1]. The edge of the mezzanine and the sides of the stairs keep the two floors apart */
  K.block([
    [-4.45, -4.4, -6.2, -1.6], [-4.45, -4.4, .4, 6], [SX0, SX1, -1.7, -1.6], [SX1, SX1 + .05, -1.7, Z0], [-9, -4.4, 5.85, 6],
    [-9, -6.5, -2.3, -2.1], [-5, -4.4, -2.3, -2.1], [-8.5, -7.7, -5, -2.9], [-5.15, -4.65, -6, -5.5],
    [-9, -8.25, -1.55, .15], [-8.8, -8.4, .25, .65], [-5.2, -4.7, .25, .75],
    [-9, -6.5, .76, .84], [-5, -4.4, .76, .84], [-8.25, -6.35, 2.6, 3.5], [-8.1, -6.5, 3.8, 4.3], [-9, -8.6, 4.3, 5.9], [-5.65, -5.35, 5.3, 5.6], [-8.8, -8.3, 1, 1.5],
    [-4.2, -3.5, -2.9, -2.3], [-4.1, -3.6, -6, -5.5], [3, 3.5, -6, -5.55],
    [-3.2, -1.2, -5.85, -4.95], [.8, 2.8, -5.85, -4.95], [4.5, 7.5, -6.2, -4.9], [8.1, 9, -6.2, -3.9],
    [-1, 1, -1.55, -.65], [-1.4, .6, 1.95, 2.85], [2, 4, 1.95, 2.85], [8, 9, -3.1, .7], [5.75, 6.45, -2.65, -1.95],
    [8.3, 9, 4.35, 5.95], [7.05, 7.85, 4.95, 5.45], [4.35, 4.85, 5.3, 5.8], [8.3, 8.8, 1.05, 1.55]
  ]);
  /* Where people stand, and how they can walk between those points (in straight lines, so each line must be clear).
     Points ending in V are where a visitor stands to chat with that person; pantry, pantry2 and cooler are where people take a break. */
  K.nodes({
    outside: [10.4, 3], door: [8.3, 3], lobby: [7.4, 3.6], start: [6.2, 3.2], center: [3.6, .4], aisle: [-.2, -3], mid: [-2, -.6],
    kln: [-1.35, -4.25], skg: [2.6, -4.25], lab: [5.2, -4], wsl: [4.3, -3.95], front: [1.3, 4.4], mine: [-.4, 3.8], jjy: [3.85, 3.55],
    pantry: [7, -.6], pantry2: [6.8, .5], frontL: [-2, 5.3], stBot: [-3.5, 5.4],
    stTop: [-3.5, -.6], up2: [-5.75, -.6], meet: [-5.75, -1.6], qyl: [-6.8, -3.9], ceodoor: [-5.75, .2], ceo: [-6.3, 1.65], cooler: [-7.9, .3],
    jjh: [.85, .05], jjhV: [-1.3, .15], klnV: [-3.4, -3.8], skgV: [.4, -3.7], jjyV: [1.5, 3.8], wslV: [5.9, -3.6], qylV: [-6.4, -3.1], ktV: [-5.7, 2.6]
  }, 'outside-door door-lobby lobby-start door-start start-center center-aisle aisle-kln aisle-skg center-lab lab-wsl center-wsl start-front front-mine front-jjy ' +
    'center-pantry center-pantry2 pantry-pantry2 aisle-mid mid-frontL front-frontL frontL-stBot stBot-stTop stTop-up2 up2-meet meet-qyl up2-ceodoor ceodoor-ceo up2-cooler ' +
    'center-jjh mid-jjhV aisle-klnV aisle-skgV front-jjyV lab-wslV meet-qylV ceodoor-ktV');
  /* Home-screen camera shots */
  WORLD.shots = [{p: [-2, 1.2, -4.4], d: 14, yaw: .3, pitch: .6}, {p: [2, 1.5, 0], d: 20, yaw: -.3, pitch: .7}, {p: [-6.5, UP + 1, 3], d: 11, yaw: .45, pitch: .7}];
});
WORLD.level = 'office';
