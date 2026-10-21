/* The office of KT Silicon Labs: one open floor.
   Back wall, left to right: a glass meeting room with a whiteboard, the RTL lead's desk, the verification desk, the FPGA bench.
   Front: your desk on the left, the pantry against the right wall, the front door on the right wall.
   Coordinates: x to the right, z toward the camera (down the screen), y up; 1 unit is about 1 metre. */
levelAdd('office', function (K) {
  const {box, flat, lam, M, TX, label, screen, tower, desk, pickBox, G} = K;
  K.bounds(-9, 9, -6.2, 6);
  /* Floor and walls */
  const carpet = lam(0xc4ccd2, {map: TX.carpet}), wall = lam(0xeef2f4, {map: TX.wall});
  flat(18, 12.2, carpet, 0, 0, -.1, 1, G);
  flat(4, 4, lam(0xffffff, {map: TX.floor}), -7, .006, -4.2, .5, G);
  box(18.4, 3.2, .3, wall, 0, 1.6, -6.35, G);
  box(.3, 3.2, 12.4, wall, -9.15, 1.6, -.1, G);
  box(.3, 3.2, 8, wall, 9.15, 1.6, -2.1, G); box(.3, 3.2, 1.9, wall, 9.15, 1.6, 5.05, G);
  /* Front door (right wall, z 2–4) */
  box(.4, 2.6, .2, M.trim, 9.1, 1.3, 1.9, G); box(.4, 2.6, .2, M.trim, 9.1, 1.3, 4.1, G); box(.4, .3, 2.4, M.trim, 9.1, 2.65, 3, G);
  box(.08, 2.4, 2, M.glass, 9.15, 1.2, 3, G, false);
  /* Company logo on the back wall: the logo (logo.js) on a white plaque with a trim edge */
  box(2.7, 1.75, .04, M.trim, 4.2, 2.25, -6.19, G); box(2.6, 1.65, .05, lam(0xffffff), 4.2, 2.25, -6.17, G);
  const logoTex = new K.T.TextureLoader().load(LOGO.src); logoTex.encoding = K.T.sRGBEncoding; logoTex.anisotropy = 4;
  const logo = new K.T.Mesh(new K.T.PlaneGeometry(2.45, 2.45 * LOGO.h / LOGO.w), lam(0xffffff, {map: logoTex, transparent: true}));
  logo.position.set(4.2, 2.25, -6.14); G.add(logo);

  /* Meeting room: glass on two sides, a whiteboard on the back wall */
  box(2.5, 2.4, .08, M.glass, -7.75, 1.2, -2.2, G, false); box(2.5, .1, .14, M.trim, -7.75, 2.4, -2.2, G);
  box(.08, 2.4, 4, M.glass, -5, 1.2, -4.2, G, false); box(.14, .1, 4, M.trim, -5, 2.4, -4.2, G);
  box(.14, 2.5, .14, M.trim, -6.5, 1.25, -2.2, G); box(.14, 2.5, .14, M.trim, -5, 1.25, -2.2, G);
  box(2.8, 1.4, .06, lam(0xffffff), -7.2, 1.6, -6.15, G); box(2.9, .08, .14, M.trim, -7.2, .88, -6.12, G);
  screen('board', G, -7.2, 1.6, -6.1, 2.6, 1.2, ['PSEL  _/‾‾‾‾‾\\_', 'PEN   ___/‾‾\\_', 'SETUP → ACCESS'], '#1f5f8b');
  box(1.2, .72, .7, M.desk, -8.2, .36, -3.6, G);
  label('MEETING', -7, -2.8, 2.4, G);

  /* Desks along the back wall: the RTL lead, then verification (with the regression light) */
  const monitor = (x, z, id, lines, color) => {box(.9, .55, .06, M.dark, x, 1.12, z, G); box(.1, .3, .1, M.trim, x, .9, z, G); screen(id, G, x, 1.12, z + .04, .8, .45, lines, color)};
  desk(-2.2, -5.4, 2, G); monitor(-2.2, -5.55, 'kln', ['review queue', '3 open'], '#7fe3c8');
  desk(1.8, -5.4, 2, G); monitor(1.6, -5.55, 'skg', ['regression', 'idle'], '#93a9b2');
  tower('reg', G, 2.6, 1.05, -5.6);
  label('RTL', -.2, -3.3, 1.6, G);

  /* FPGA bench: a workbench, a green board with LEDs, a monitor */
  const bench = lam(0x6a7a84, {map: TX.panel});
  box(3, .9, 1, bench, 6, .45, -5.4, G); box(3.1, .06, 1.1, lam(0xd9dde0), 6, .93, -5.4, G);
  box(.9, .05, .6, M.green, 5.6, .99, -5.3, G); [5.3, 5.5, 5.7].forEach(x => box(.08, .06, .08, lam(0xffd36a), x, 1.04, -5.1, G));
  box(.9, .55, .06, M.dark, 6.7, 1.3, -5.7, G); screen('fpga', G, 6.7, 1.3, -5.66, .8, .45, ['FPGA', 'no bitstream'], '#93a9b2');
  pickBox('fpga', 3, 2, 1.4, 6, 1, -5.3, G);
  label('LAB', 6, -3.5, 1.6, G);

  /* Your desk, front left */
  desk(-2.2, 2.4, 2, G); monitor(-2.2, 2.25, 'mine', ['login:', '_'], '#93a9b2');
  box(.5, .5, .5, M.trim, -2.2, .25, 3.5, G);
  pickBox('mydesk', 2.2, 2, 1.4, -2.2, 1, 2.5, G);
  /* JJY's desk next to yours: synthesis and timing */
  desk(1.2, 2.4, 2, G); monitor(1.2, 2.25, 'jjy', ['timing', 'WNS +0.12'], '#7fe3c8');

  /* Pantry against the right wall: counter, coffee machine, fridge */
  const counter = lam(0x8a6a4a, {map: TX.wood});
  box(.9, .9, 2.6, counter, 8.5, .45, -.6, G); box(1, .06, 2.7, lam(0xe8e2d6), 8.5, .93, -.6, G);
  box(.5, .6, .5, M.dark, 8.6, 1.26, -1.4, G);
  box(.9, 2, .9, lam(0xe6ebed, {map: TX.panel}), 8.5, 1, -2.6, G);
  pickBox('pantry', 1.4, 2, 3, 8.4, 1, -.6, G);
  label('PANTRY', 6.6, .9, 2.4, G);

  /* Where things block walking: [x0, x1, z0, z1] */
  K.block([
    [-9, -6.5, -2.3, -2.1], [-5.1, -4.9, -6.2, -2.1], [-8.8, -7.6, -3.95, -3.25],
    [-3.2, -1.2, -5.85, -4.95], [.8, 2.8, -5.85, -4.95], [4.5, 7.5, -6.2, -4.9],
    [-3.2, -1.2, 1.95, 2.85], [.2, 2.2, 1.95, 2.85], [8, 9, -3.1, .7]
  ]);
  /* Where people stand, and how they can walk between those points */
  K.nodes({
    outside: [10.4, 3], door: [8.3, 3], lobby: [7.4, 3.6], start: [6.2, 3.2], center: [3.6, .4], aisle: [-.2, -3],
    kln: [-2.2, -4.3], skg: [1.8, -4.3], lab: [5.2, -4], meet: [-5.75, -1.4], qyl: [-6.8, -3.9], front: [-.3, 4.2], mine: [-2.2, 3.8], jjy: [1.2, 3.6],
    pantry: [7, -.6], pantry2: [6.8, .5]
  }, 'outside-door door-lobby lobby-start door-start start-center center-aisle aisle-kln aisle-skg center-lab aisle-meet meet-qyl start-front front-mine front-jjy center-pantry center-pantry2 pantry-pantry2');
  /* Home-screen camera shots */
  WORLD.shots = [{p: [-2, 1.2, -4.4], d: 14, yaw: .3, pitch: .6}, {p: [3, 1, 0], d: 18, yaw: -.3, pitch: .7}];
});
WORLD.level = 'office';
