/* The office of KT Silicon Labs: one bright open floor in pixel style (16 pixels per metre, like the people's skins).
   Back wall, left to right: a glass meeting room with a whiteboard, the RTL lead's desk, the verification desk, the logo on a blue wall, the FPGA lab with server racks.
   Windows with a city skyline on the back and left walls.
   Front left: KT's glass corner office. Front: your desk and JJY's. Right: the pantry, the front door, a sofa by the door.
   Coordinates: x to the right, z toward the camera (down the screen), y up; 1 unit is about 1 metre. */
/* Where people sit when they are not talking: their chair (at), facing their screen (face), next to the point they stand at (node).
   The engine sits them down whenever they are idle at that point, and stands them up while they speak. */
const SEATS = {
  kln: {node: 'kln', at: [-2.5, -4.6], face: Math.PI},
  skg: {node: 'skg', at: [1.5, -4.6], face: Math.PI},
  jjy: {node: 'jjy', at: [.85, 3.2], face: Math.PI},
  qyl: {node: 'qyl', at: [-7.45, -3.95], face: -Math.PI / 2},
  wsl: {node: 'wsl', at: [5, -4.55], face: Math.PI},
  kt: {node: 'ceo', at: [-7.3, 1.95], face: 0, drop: .14}
};
Object.keys(SEATS).forEach(id => {WORLD.cast[id].seat = SEATS[id]});

levelAdd('office', function (K) {
  const {T, box, flat, lam, M, px, pxc, P, rnd, label, screen, tower, pickBox, G} = K;
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
    steel: px(16, (g, s) => {P(g, '#c9d0d4', 0, 0, s, s); P(g, '#b7bfc4', 0, 5, s, 1); P(g, '#dde2e5', 0, 9, s, 1)})
  };
  const L = (t, c) => lam(c || 0xffffff, {map: t});
  const W = {planks: L(X.planks), carpet: L(X.carpet), meet: L(X.meetCarpet), navy: L(X.navy), checker: L(X.checker), lab: L(X.labTile), leaves: L(X.leaves), pot: L(X.pot),
    walnut: L(X.walnut), white: L(X.white), fabric: L(X.fabric), leather: L(X.leather), sofa: L(X.sofa), accent: L(X.accent), rack: L(X.rack), keys: L(X.keys), steel: L(X.steel),
    grey: lam(0xaab4ba), gold: lam(0xd9ab45), frost: lam(0xffffff, {transparent: true, opacity: .5, depthWrite: false})};

  /* One-off pictures: the city behind the windows, the chip on the rug, the wafer, the book spines */
  const skyTex = pxc(64, 32, g => {
    ['#c4e6f8', '#cdeaf9', '#d6eefa', '#dff2fb', '#e8f6fc', '#eff9fd'].forEach((c, i) => P(g, c, 0, i * 4, 64, 4)); P(g, '#f4fbfe', 0, 24, 64, 8);
    [[6, 5, 8], [38, 8, 10], [52, 3, 6]].forEach(([x, y, w]) => {P(g, '#ffffff', x, y, w, 2); P(g, '#ffffff', x + 2, y - 1, w - 4, 1)});
    for (let x = 0; x < 64;) {
      const w = 4 + (rnd() * 6 | 0), h = 8 + (rnd() * 14 | 0), c = ['#a9bccb', '#9bb0c1', '#b7c8d4', '#8fa6b8'][rnd() * 4 | 0];
      P(g, c, x, 32 - h, w, h);
      for (let y = 34 - h; y < 31; y += 2) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (rnd() > .35) P(g, '#eaf5fb', xx, y);
      x += w + (rnd() * 2 | 0);
    }
  });
  skyTex.wrapS = T.RepeatWrapping;
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
  flat(4, 4, W.meet, -7, .006, -4.2, 1, G);                       // meeting room
  flat(4, 5.3, W.navy, -7, .006, 3.4, 1, G);                       // KT's office
  flat(7.6, 2.8, W.carpet, -.6, .004, -4.8, 1, G);                 // the back desks
  flat(6.8, 2.6, W.carpet, -.8, .004, 2.6, 1, G);                  // the front desks
  flat(4.8, 2.9, W.lab, 6.6, .005, -4.75, 1, G);                   // the lab
  flat(2.8, 4.2, W.checker, 7.6, .006, -1.2, 1, G);                // the pantry
  pic(chipTex, 2.6, 2.6, 3.4, .007, .3, 0, -Math.PI / 2);          // a chip rug in the middle of the floor
  box(18.4, 3.2, .3, wall, 0, 1.6, -6.35, G);
  box(.3, 3.2, 12.4, wall, -9.15, 1.6, -.1, G);
  box(.3, 3.2, 8, wall, 9.15, 1.6, -2.1, G); box(.3, 3.2, 1.9, wall, 9.15, 1.6, 5.05, G);
  box(18, .12, .04, W.grey, 0, .06, -6.18, G); box(.04, .12, 12, W.grey, -8.98, .06, -.1, G);   // skirting
  /* Front door (right wall, z 2–4) and a doormat */
  box(.4, 2.6, .2, M.trim, 9.1, 1.3, 1.9, G); box(.4, 2.6, .2, M.trim, 9.1, 1.3, 4.1, G); box(.4, .3, 2.4, M.trim, 9.1, 2.65, 3, G);
  box(.08, 2.4, 2, M.glass, 9.15, 1.2, 3, G, false);
  flat(1, 1.6, lam(0x3b4248), 8.4, .008, 3, 1, G); flat(.8, 1.4, W.accent, 8.4, .01, 3, 1, G);

  /* Windows: a dark frame, the skyline (lit a little from inside so it reads as daylight), mullions every metre or so, a white sill */
  const sky = {emissive: 0xffffff, emissiveMap: skyTex, emissiveIntensity: .45};
  const windowBack = (x0, x1, y0, y1) => {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    box(w + .14, h + .14, .03, M.trim, cx, cy, -6.19, G, false); pic(skyTex, w, h, cx, cy, -6.17, 0, 0, {rep: w / h / 2, mat: sky});
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.05, h, .04, M.trim, x0 + w * i / n, cy, -6.16, G, false);
    box(w + .2, .05, .16, W.white, cx, y0 - .07, -6.12, G);
  };
  const windowLeft = (z0, z1, y0, y1) => {
    const w = z1 - z0, h = y1 - y0, cz = (z0 + z1) / 2, cy = (y0 + y1) / 2;
    box(.03, h + .14, w + .14, M.trim, -8.99, cy, cz, G, false); pic(skyTex, w, h, -8.97, cy, cz, Math.PI / 2, 0, {rep: w / h / 2, mat: sky});
    for (let i = 1, n = Math.round(w / 1.2); i < n; i++) box(.04, h, .05, M.trim, -8.96, cy, z0 + w * i / n, G, false);
    box(.16, .05, w + .2, W.white, -8.92, y0 - .07, cz, G);
  };
  windowBack(-4.7, 2.3, 1.55, 2.95); windowBack(5.9, 8.8, 1.7, 2.95);
  windowLeft(-5.7, -2.7, 1, 2.8); windowLeft(1.2, 4.1, 1, 2.8);

  /* Company logo on a brand-blue wall: the logo (logo.js) on a white plaque with a trim edge */
  box(3.1, 3.2, .02, W.accent, 4.2, 1.6, -6.195, G, false);
  box(2.7, 1.75, .04, M.trim, 4.2, 2.25, -6.17, G); box(2.6, 1.65, .05, lam(0xffffff), 4.2, 2.25, -6.15, G);
  const logoTex = new T.TextureLoader().load(LOGO.src); logoTex.encoding = T.sRGBEncoding; logoTex.anisotropy = 4;
  const logo = new T.Mesh(new T.PlaneGeometry(2.45, 2.45 * LOGO.h / LOGO.w), lam(0xffffff, {map: logoTex, transparent: true}));
  logo.position.set(4.2, 2.25, -6.12); G.add(logo);

  /* ── Furniture ── */
  /* An office chair facing +z (turn it with ry): seat and back on a pole and a cross base, armrests; tall = a high back */
  const chair = (x, z, ry, mat, tall) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; G.add(g);
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
  const plant = (x, z, tall) => {
    box(.45, .45, .45, W.pot, x, .225, z, G);
    if (tall) {box(.08, .9, .08, W.walnut, x, .9, z, G); [[0, 1.45, 0, .6], [.18, 1.15, .1, .4], [-.15, 1.25, -.12, .42], [.05, 1.75, -.05, .38]].forEach(([dx, y, dz, s]) => box(s, s, s, W.leaves, x + dx, y, z + dz, G))}
    else [[0, .62, 0, .5], [.16, .78, .1, .3], [-.14, .8, -.08, .32]].forEach(([dx, y, dz, s]) => box(s, s, s, W.leaves, x + dx, y, z + dz, G));
  };

  /* Meeting room: glass on two sides with a frosted band, a whiteboard, a long table with chairs */
  box(2.5, 2.4, .08, M.glass, -7.75, 1.2, -2.2, G, false); box(2.5, .1, .14, M.trim, -7.75, 2.4, -2.2, G); box(2.5, .12, .09, W.frost, -7.75, 1.3, -2.2, G, false);
  box(.08, 2.4, 4, M.glass, -5, 1.2, -4.2, G, false); box(.14, .1, 4, M.trim, -5, 2.4, -4.2, G); box(.09, .12, 4, W.frost, -5, 1.3, -4.2, G, false);
  box(.14, 2.5, .14, M.trim, -6.5, 1.25, -2.2, G); box(.14, 2.5, .14, M.trim, -5, 1.25, -2.2, G);
  box(2.8, 1.4, .06, lam(0xffffff), -7.2, 1.6, -6.15, G); box(2.9, .08, .14, M.trim, -7.2, .88, -6.12, G);
  screen('board', G, -7.2, 1.6, -6.1, 2.6, 1.2, ['PSEL  _/‾‾‾‾‾\\_', 'PEN   ___/‾‾\\_', 'SETUP → ACCESS'], '#1f5f8b');
  box(.8, .06, 2.1, W.white, -8.1, .74, -3.95, G); box(.12, .7, 1.6, W.grey, -8.1, .37, -3.95, G);
  [-4.6, -3.95, -3.3].forEach(z => chair(-7.45, z, -Math.PI / 2));
  box(.3, .02, .4, W.steel, -7.95, .78, -3.95, G); box(.02, .26, .4, W.steel, -8.12, .9, -3.95, G, false);   // QYL's laptop
  chair(-8.1, -2.6, Math.PI);
  label('MEETING', -7, -2.8, 2.4, G);

  /* Desks along the back wall: the RTL lead, then verification (with the regression light) */
  workstation(-2.2, -5.4, 'kln', ['review queue', '3 open'], '#7fe3c8', 'kln2', ['git log', 'a3f9 irq fix'], '#7fe3c8');
  chair(-2.5, -4.6, Math.PI);
  workstation(1.8, -5.4, 'skg', ['regression', 'idle'], '#93a9b2', 'skg2', ['tb_apb.sv', 'assert ok'], '#7fe3c8');
  chair(1.5, -4.6, Math.PI);
  tower('reg', G, 2.65, 1.05, -5.75);
  label('RTL', -.2, -3.3, 1.6, G);
  plant(-4.4, -5.75, true); plant(3.25, -5.8);

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

  /* Your desk, front left, and JJY's next to it: synthesis and timing */
  workstation(-2.2, 2.4, 'mine', ['login:', '_'], '#93a9b2', 'mine2', ['spec.pdf', 'APB v2'], '#93a9b2');
  chair(-2.55, 3.2, Math.PI);
  pickBox('mydesk', 2.2, 2, 1.4, -2.2, 1, 2.5, G);
  workstation(1.2, 2.4, 'jjy', ['timing', 'WNS +0.12'], '#7fe3c8', 'jjy2', ['report_timing', 'max paths'], '#7fe3c8');
  chair(.85, 3.2, Math.PI);
  plant(-4.4, 5.55, true); plant(3.1, 5.6);

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

  /* KT's corner office: glass walls with a frosted band, a door at the back corner, navy carpet, a window, a walnut desk, a leather chair,
     two chairs for visitors, a bookshelf and a silicon wafer on a stand */
  box(4, 2.4, .08, M.glass, -7, 1.2, .8, G, false); box(4, .1, .14, M.trim, -7, 2.4, .8, G); box(4, .12, .09, W.frost, -7, 1.3, .8, G, false);
  box(.08, 2.4, 3.6, M.glass, -5, 1.2, 4.2, G, false); box(.14, .1, 5.2, M.trim, -5, 2.4, 3.4, G); box(.09, .12, 3.6, W.frost, -5, 1.3, 4.2, G, false);
  [.8, 2.4, 6].forEach(z => box(.14, 2.5, .14, M.trim, -5, 1.25, z, G));
  box(1.9, .07, .95, W.walnut, -7.3, .78, 3.05, G); box(1.8, .72, .08, W.walnut, -7.3, .37, 3.48, G); [-1, 1].forEach(s => box(.08, .72, .85, W.walnut, -7.3 + s * .86, .37, 3.05, G));
  box(.5, .02, .35, W.steel, -7.6, .83, 2.95, G); box(.5, .32, .02, W.steel, -7.6, .99, 2.78, G, false);
  screen('ceoplate', G, -6.75, .9, 3.4, .42, .14, ['KT · CEO'], '#e8c66a');
  box(.12, .16, .12, W.gold, -6.6, .9, 2.8, G);
  chair(-7.3, 1.95, 0, W.leather, true);
  chair(-7.85, 4.05, Math.PI); chair(-6.75, 4.05, Math.PI);
  box(.4, 2, 1.6, W.walnut, -8.8, 1, 5.1, G); pic(booksTex, 1.45, 1.85, -8.59, 1, 5.1, Math.PI / 2);
  box(.3, 1, .3, W.white, -5.5, .5, 5.45, G); box(.06, .3, .06, M.trim, -5.5, 1.15, 5.45, G);
  const wafer = new T.Mesh(new T.CylinderGeometry(.3, .3, .02, 32), [lam(0xb8c2cc), lam(0xffffff, {map: waferTex, alphaTest: .5}), lam(0xb8c2cc)]);
  wafer.rotation.x = Math.PI / 2; wafer.position.set(-5.5, 1.55, 5.46); G.add(wafer);
  plant(-8.55, 1.25, true);

  /* Where things block walking: [x0, x1, z0, z1] */
  K.block([
    [-9, -6.5, -2.3, -2.1], [-5.1, -4.9, -6.2, -2.1], [-8.5, -7.7, -5, -2.9],
    [-3.2, -1.2, -5.85, -4.95], [.8, 2.8, -5.85, -4.95], [4.5, 7.5, -6.2, -4.9], [8.1, 9, -6.2, -3.9],
    [-3.2, -1.2, 1.95, 2.85], [.2, 2.2, 1.95, 2.85], [8, 9, -3.1, .7], [5.75, 6.45, -2.65, -1.95],
    [8.3, 9, 4.35, 5.95], [7.05, 7.85, 4.95, 5.45],
    [-9, -5, .76, .84], [-5.05, -4.95, 2.4, 6], [-8.25, -6.35, 2.6, 3.5], [-8.1, -6.5, 3.8, 4.3], [-9, -8.6, 4.3, 5.9], [-5.65, -5.35, 5.3, 5.6],
    [-4.65, -4.15, -6, -5.5], [3, 3.5, -6, -5.55], [-4.65, -4.15, 5.3, 5.8], [2.85, 3.35, 5.35, 5.85], [8.3, 8.8, 1.05, 1.55], [-8.8, -8.3, 1, 1.5]
  ]);
  /* Where people stand, and how they can walk between those points */
  K.nodes({
    outside: [10.4, 3], door: [8.3, 3], lobby: [7.4, 3.6], start: [6.2, 3.2], center: [3.6, .4], aisle: [-.2, -3],
    kln: [-1.35, -4.25], skg: [2.6, -4.25], lab: [5.2, -4], wsl: [4.3, -3.95], meet: [-5.75, -1.4], qyl: [-6.8, -3.9], front: [-.3, 4.2], mine: [-2.2, 3.8], jjy: [2.05, 3.55],
    pantry: [7, -.6], pantry2: [6.8, .5], west: [-4.2, .2], ceodoor: [-4.3, 1.8], ceoin: [-5.7, 1.8], ceo: [-6.3, 1.65]
  }, 'outside-door door-lobby lobby-start door-start start-center center-aisle aisle-kln aisle-skg center-lab lab-wsl center-wsl aisle-meet meet-qyl start-front front-mine front-jjy center-pantry center-pantry2 pantry-pantry2 center-west west-ceodoor ceodoor-ceoin ceoin-ceo');
  /* Home-screen camera shots */
  WORLD.shots = [{p: [-2, 1.2, -4.4], d: 14, yaw: .3, pitch: .6}, {p: [3, 1, 0], d: 18, yaw: -.3, pitch: .7}, {p: [-6.5, 1, 3], d: 11, yaw: .45, pitch: .7}];
});
WORLD.level = 'office';
