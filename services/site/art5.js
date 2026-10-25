// v5: animated handshake: both right hands are rigged (human seen from the back, robot from the palm side); the robot is split into a back layer and a front layer (thumb + hooked fingertips) so its fingers can wrap over the human hand.
// v4: regular handshake (grip), pointing pose + finger morph, Zaslia/Audiowide signage. v3: power-grip clasp. v2: shop SVG (both eras), vector hands, frame-4 shop pieces, glass debris, screen crack, grain.
(function () {
  const KEEP = { viewBox: 1, filterUnits: 1, stdDeviation: 1, preserveAspectRatio: 1, gradientUnits: 1 };
  const kb = k => (KEEP[k] || k.startsWith('data-')) ? k : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  function h(t, a, ...kids) {
    let s = '<' + t;
    if (a) for (const k in a) if (a[k] != null) s += ' ' + kb(k) + '="' + a[k] + '"';
    return s + '>' + kids.flat(Infinity).filter(x => x != null && x !== false).join('') + '</' + t + '>';
  }
  const ORDER = ['facade', 'cornice', 'sign', 'awning', 'window', 'props', 'counter', 'dash', 'orb', 'warm', 'glass', 'wsign', 'kick', 'door', 'dsign', 'lamp', 'step'];
  const ERA = { fac: 1, side: 1, int: 1, gls: 1 };

  function layers(id, N) {
    const u = s => `url(#${id}-${ERA[s] ? (N ? 'n-' : 'o-') : ''}${s})`;
    const led = { stroke: '#39e6ff', strokeWidth: 2, fill: 'none', filter: u('glow') };
    const L = {};
    L.facade = N ? [
      h('polygon', { points: '580,40 616,26 616,546 580,560', fill: u('side') }),
      h('rect', { x: 20, y: 40, width: 560, height: 520, fill: u('fac') }),
      [110, 200, 400, 490].map(x => h('line', { x1: x, y1: 200, x2: x, y2: 560, stroke: '#8cd2ff', strokeOpacity: 0.12 })),
      h('rect', { x: 20, y: 40, width: 560, height: 520, ...led, opacity: 0.55 }),
      h('line', { x1: 616, y1: 26, x2: 616, y2: 546, stroke: '#39e6ff', strokeOpacity: 0.35 })
    ] : [
      h('polygon', { points: '580,40 616,26 616,546 580,560', fill: u('side') }),
      h('rect', { x: 20, y: 40, width: 560, height: 520, fill: u('fac') }),
      Array.from({ length: 6 }, (_, i) => { const y = 214 + i * 6 + (i > 2 ? 290 : 0); return h('line', { x1: 20, y1: y, x2: 580, y2: y, stroke: '#5a3a26', strokeOpacity: 0.12 }); }),
      h('rect', { x: 20, y: 40, width: 22, height: 520, fill: '#fff', opacity: 0.07 }),
      h('rect', { x: 558, y: 40, width: 22, height: 520, fill: '#000', opacity: 0.12 }),
      h('rect', { x: 20, y: 550, width: 560, height: 10, fill: '#5a3a26', opacity: 0.6 })
    ];
    L.cornice = [
      h('polygon', { points: '0,20 600,20 636,6 36,6', fill: N ? '#0d1a4a' : '#7a5238' }),
      h('polygon', { points: '600,20 636,6 636,36 600,50', fill: N ? '#050b26' : '#3e2718' }),
      h('rect', { x: 0, y: 20, width: 600, height: 30, fill: N ? '#0a1430' : '#563725' }),
      N ? h('line', { x1: 0, y1: 20, x2: 600, y2: 20, ...led }) : h('rect', { x: 0, y: 50, width: 600, height: 4, fill: '#d1a77d', opacity: 0.55 })
    ];
    L.sign = N ? [
      h('rect', { x: 40, y: 66, width: 520, height: 62, rx: 6, fill: '#071233' }),
      h('rect', { x: 40, y: 66, width: 520, height: 62, rx: 6, ...led, opacity: 0.7 }),
      h('text', { x: 300, y: 108, textAnchor: 'middle', fontFamily: 'Audiowide, sans-serif', fontWeight: 400, fontSize: 24, letterSpacing: 6, fill: '#e9f6ff', filter: u('glow') }, 'GENERAL STORE')
    ] : [
      h('rect', { x: 40, y: 66, width: 520, height: 62, rx: 2, fill: '#2c1c12' }),
      h('rect', { x: 48, y: 74, width: 504, height: 46, fill: 'none', stroke: '#d6b479', strokeOpacity: 0.55 }),
      h('text', { x: 300, y: 108, textAnchor: 'middle', fontFamily: 'Zaslia, serif', fontWeight: 400, fontSize: 30, letterSpacing: 8, fill: '#d6b479' }, 'GENERAL STORE')
    ];
    if (N) {
      L.awning = [
        h('polygon', { points: '46,152 554,152 600,320 0,320', fill: u('cone') }),
        h('rect', { x: 30, y: 138, width: 540, height: 14, rx: 3, fill: '#0a1430' }),
        h('polygon', { points: '570,138 590,130 590,144 570,152', fill: '#050b26' }),
        h('line', { x1: 34, y1: 152, x2: 566, y2: 152, ...led })
      ];
    } else {
      const st = [];
      for (let i = 0; i < 10; i++) {
        const t0 = 40 + 52 * i, t1 = t0 + 52, b0 = 22 + 55.6 * i, b1 = b0 + 55.6, col = i % 2 ? '#8c3829' : '#ecdcbc';
        st.push(h('polygon', { points: `${t0},138 ${t1},138 ${b1},200 ${b0},200`, fill: col }));
        st.push(h('path', { d: `M${b0} 199 A27.8 13 0 0 0 ${b1} 199 Z`, fill: col }));
      }
      L.awning = [h('rect', { x: 36, y: 132, width: 528, height: 8, rx: 3, fill: '#3e2718' }), st,
        h('polygon', { points: '40,138 560,138 578,200 22,200', fill: u('sh') }),
        h('polygon', { points: '40,138 560,138 562,146 38,146', fill: '#fff', opacity: 0.12 }),
        h('rect', { x: 20, y: 212, width: 560, height: 40, fill: u('sh'), opacity: 0.7 })];
    }
    L.window = [
      h('rect', { x: 56, y: 244, width: 288, height: 262, fill: N ? '#0b1640' : '#3a2519' }),
      h('rect', { x: 68, y: 256, width: 264, height: 238, fill: u('int') }),
      h('rect', { x: 68, y: 256, width: 264, height: 14, fill: '#000', opacity: 0.25 }),
      h('rect', { x: 68, y: 256, width: 10, height: 238, fill: '#000', opacity: 0.2 })
    ];
    if (N) {
      const b = [[84, 292, 30, 26], [122, 286, 30, 32], [160, 292, 30, 26], [236, 288, 34, 30], [278, 292, 30, 26], [90, 344, 38, 28], [140, 340, 30, 32], [250, 342, 50, 30]];
      L.props = [
        h('line', { x1: 68, y1: 318, x2: 332, y2: 318, stroke: '#9ff3ff', strokeWidth: 2, filter: u('glow') }),
        h('line', { x1: 68, y1: 372, x2: 332, y2: 372, stroke: '#9ff3ff', strokeWidth: 2, filter: u('glow') }),
        b.map((r, i) => h('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 4, fill: '#e9f6ff', opacity: 0.22 + (i % 3) * 0.08 }))
      ];
      L.counter = [h('rect', { x: 68, y: 438, width: 264, height: 56, fill: '#081236' }), h('line', { x1: 68, y1: 438, x2: 332, y2: 438, ...led })];
      L.dash = [
        h('rect', { x: 98, y: 372, width: 108, height: 60, rx: 5, fill: u('scr'), stroke: '#9ff3ff', strokeWidth: 1.2 }),
        [16, 26, 20, 32].map((v, i) => h('rect', { x: 108 + i * 14, y: 418 - v, width: 8, height: v, rx: 1.5, fill: '#e9f6ff', opacity: 0.85 })),
        h('rect', { x: 168, y: 384, width: 28, height: 4, rx: 2, fill: '#e9f6ff', opacity: 0.8 }),
        h('rect', { x: 168, y: 394, width: 22, height: 4, rx: 2, fill: '#e9f6ff', opacity: 0.55 }),
        h('rect', { x: 168, y: 404, width: 26, height: 4, rx: 2, fill: '#e9f6ff', opacity: 0.55 }),
        h('rect', { x: 148, y: 432, width: 8, height: 6, fill: '#9ff3ff', opacity: 0.6 })
      ];
      L.orb = [h('circle', { cx: 268, cy: 414, r: 30, fill: u('halo') }), h('circle', { cx: 268, cy: 418, r: 15, fill: u('orb') }), h('ellipse', { cx: 268, cy: 436, rx: 18, ry: 3, fill: '#39e6ff', opacity: 0.5 })];
    } else {
      const j = [[86, 284, 22, 34], [114, 292, 18, 26], [138, 280, 26, 38], [232, 288, 22, 30], [262, 282, 28, 36], [296, 294, 20, 24], [88, 344, 36, 28], [150, 336, 24, 36], [250, 342, 46, 30]];
      L.props = [
        h('rect', { x: 68, y: 316, width: 264, height: 4, fill: '#6a4a36' }),
        h('rect', { x: 68, y: 370, width: 264, height: 4, fill: '#6a4a36' }),
        j.map((r, i) => h('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 4, fill: i % 2 ? '#8c6e5a' : '#7a6656', opacity: 0.75 })),
        h('g', { 'data-layer': 'shoebox' },
          h('rect', { x: 278, y: 404, width: 46, height: 26, fill: '#a8875e' }), h('rect', { x: 278, y: 404, width: 46, height: 5, fill: '#c29f73' }),
          h('rect', { x: 284, y: 396, width: 16, height: 10, fill: '#efe2c4', transform: 'rotate(-8 292 401)' }),
          h('rect', { x: 300, y: 395, width: 14, height: 11, fill: '#e2d4b4', transform: 'rotate(10 307 400)' }))
      ];
      L.counter = [
        h('rect', { x: 68, y: 430, width: 264, height: 64, fill: u('wood') }),
        h('rect', { x: 68, y: 430, width: 264, height: 4, fill: '#a07a58' }),
        h('g', { 'data-layer': 'till' }, h('rect', { x: 92, y: 398, width: 46, height: 32, rx: 2, fill: '#4a4440' }), h('rect', { x: 98, y: 390, width: 34, height: 10, fill: '#3a3430' }), h('rect', { x: 100, y: 406, width: 30, height: 8, fill: '#7a8a6a', opacity: 0.7 })),
        h('g', { 'data-layer': 'dial-phone' }, h('path', { d: 'M160 430 L166 410 L202 410 L208 430 Z', fill: '#1f1a17' }), h('path', { d: 'M158 410 Q184 396 210 410 L206 404 Q184 392 162 404 Z', fill: '#2a2320' }), h('circle', { cx: 184, cy: 421, r: 6, fill: 'none', stroke: '#6a5a4e', strokeWidth: 1.5 })),
        h('g', { 'data-layer': 'ledger' }, h('path', { d: 'M222 430 L226 420 L252 418 L278 420 L282 430 Z', fill: '#d9c79f' }), h('line', { x1: 252, y1: 418, x2: 252, y2: 430, stroke: '#8c3829', strokeWidth: 1.5 }))
      ];
      L.warm = [h('rect', { x: 68, y: 256, width: 264, height: 238, fill: u('wrm') })];
    }
    L.glass = [
      h('rect', { x: 68, y: 256, width: 264, height: 238, fill: u('gls') }),
      h('polygon', { points: '120,256 176,256 96,494 68,494 68,410', fill: '#fff', opacity: N ? 0.12 : 0.08 }),
      h('polygon', { points: '200,256 214,256 140,494 126,494', fill: '#fff', opacity: N ? 0.1 : 0.06 }),
      N ? h('rect', { x: 56, y: 244, width: 288, height: 262, ...led }) : h('rect', { x: 196, y: 256, width: 8, height: 238, fill: '#3a2519' })
    ];
    L.wsign = N ? [
      h('rect', { x: 236, y: 266, width: 86, height: 32, rx: 4, fill: '#0b2a8a', stroke: '#39e6ff', strokeWidth: 1.2, filter: u('glow') }),
      h('text', { x: 279, y: 287, textAnchor: 'middle', fontFamily: 'Audiowide, sans-serif', fontWeight: 400, fontSize: 10, letterSpacing: 0.8, fill: '#e9f6ff' }, 'OPEN 24/7')
    ] : [
      h('rect', { x: 246, y: 444, width: 70, height: 34, fill: '#efe2c4', transform: 'rotate(-3 281 461)' }),
      h('rect', { x: 270, y: 440, width: 22, height: 7, fill: '#e8dcae', opacity: 0.8, transform: 'rotate(-3 281 461)' }),
      h('text', { x: 281, y: 466, textAnchor: 'middle', fontFamily: 'Zaslia, serif', fontWeight: 400, fontSize: 15, fill: '#4a2e1e', transform: 'rotate(-3 281 461)' }, 'Est. 1999')
    ];
    L.kick = [h('rect', { x: 56, y: 506, width: 288, height: 44, fill: N ? '#081236' : '#3a2519' })];
    L.door = N ? [
      h('rect', { x: 376, y: 234, width: 158, height: 316, fill: '#0b1640' }),
      h('rect', { x: 386, y: 244, width: 138, height: 306, fill: u('int'), opacity: 0.85 }),
      h('rect', { x: 386, y: 244, width: 138, height: 306, fill: u('gls') }),
      h('polygon', { points: '420,244 446,244 404,550 386,550 386,470', fill: '#fff', opacity: 0.1 }),
      h('rect', { x: 376, y: 234, width: 158, height: 316, ...led }),
      h('rect', { x: 506, y: 340, width: 5, height: 90, rx: 2.5, fill: '#9ff3ff', filter: u('glow') })
    ] : [
      h('rect', { x: 376, y: 234, width: 158, height: 316, fill: '#3a2519' }),
      h('rect', { x: 386, y: 244, width: 138, height: 306, fill: '#4a2e1e' }),
      h('rect', { x: 400, y: 260, width: 110, height: 150, fill: u('int') }),
      h('rect', { x: 400, y: 260, width: 110, height: 150, fill: u('gls') }),
      h('polygon', { points: '430,260 450,260 414,410 400,410 400,380', fill: '#fff', opacity: 0.07 }),
      h('rect', { x: 400, y: 428, width: 110, height: 100, fill: 'none', stroke: '#d1a77d', strokeOpacity: 0.3 }),
      h('rect', { x: 386, y: 244, width: 8, height: 306, fill: '#fff', opacity: 0.05 }),
      h('circle', { cx: 506, cy: 446, r: 5, fill: '#c9a25e' })
    ];
    L.dsign = N ? [
      h('rect', { x: 420, y: 300, width: 70, height: 26, rx: 13, fill: '#071233', stroke: '#39e6ff', strokeWidth: 1.2, filter: u('glow') }),
      h('circle', { cx: 434, cy: 313, r: 3, fill: '#39e6ff' }),
      h('text', { x: 461, y: 318, textAnchor: 'middle', fontFamily: 'Audiowide, sans-serif', fontWeight: 400, fontSize: 11, letterSpacing: 1.5, fill: '#e9f6ff' }, 'OPEN')
    ] : [
      h('path', { d: 'M428 326 L455 282 L482 326', stroke: '#2a1a10', strokeWidth: 1.2, fill: 'none' }),
      h('circle', { cx: 455, cy: 282, r: 2, fill: '#2a1a10' })
    ];
    L.lamp = N ? [h('rect', { x: 348, y: 214, width: 16, height: 4, rx: 2, fill: '#9ff3ff', filter: u('glow') })] : [
      h('circle', { cx: 356, cy: 228, r: 66, fill: u('lamp') }),
      h('path', { d: 'M356 250 L356 238 M346 238 L366 238', stroke: '#2a1a10', strokeWidth: 2 }),
      h('path', { d: 'M346 230 Q356 214 366 230 Z', fill: '#2a1a10' }),
      h('circle', { cx: 356, cy: 232, r: 6, fill: '#ffe2a6' })
    ];
    L.step = N ? [h('rect', { x: 366, y: 550, width: 178, height: 6, rx: 3, fill: '#9ff3ff', filter: u('glow') })] : [
      h('polygon', { points: '366,550 544,550 556,544 378,544', fill: '#a88a6e' }),
      h('rect', { x: 366, y: 550, width: 178, height: 10, fill: '#8a6c52' })
    ];
    return L;
  }

  function shop(id) {
    const lg = (k, a, x2, y2) => h('linearGradient', { id: id + '-' + k, x1: 0, y1: 0, x2: x2 ?? 0, y2: y2 ?? 1 }, a.map(s => h('stop', { offset: s[0], stopColor: s[1], stopOpacity: s[2] ?? 1 })));
    const rg = (k, a, at) => h('radialGradient', Object.assign({ id: id + '-' + k }, at), a.map(s => h('stop', { offset: s[0], stopColor: s[1], stopOpacity: s[2] ?? 1 })));
    const defs = h('defs', null,
      lg('o-fac', [[0, '#b58157'], [1, '#7a4f34']]), lg('n-fac', [[0, '#10215e'], [1, '#060c2a']]),
      lg('o-side', [[0, '#6a4530'], [1, '#3c2618']], 1, 0), lg('n-side', [[0, '#0a1440'], [1, '#030818']], 1, 0),
      lg('o-int', [[0, '#3a2a20'], [1, '#1c130e']]), lg('n-int', [[0, '#2350f0'], [0.55, '#163aa8'], [1, '#0a1a55']]),
      lg('o-gls', [[0, '#9a90a8', 0.42], [0.6, '#4a4252', 0.3], [1, '#1c1820', 0.5]], 0.4, 1),
      lg('n-gls', [[0, '#c9f4ff', 0.18], [0.5, '#7fdcff', 0.04], [1, '#2350f0', 0.12]], 0.4, 1),
      lg('sh', [[0, '#000', 0.38], [1, '#000', 0]]), lg('cone', [[0, '#39e6ff', 0.3], [1, '#39e6ff', 0]]),
      lg('scr', [[0, '#7fe9ff', 0.55], [1, '#2350f0', 0.35]]), lg('wood', [[0, '#8a6447'], [1, '#5a3b27']]),
      rg('lamp', [[0, '#ffd88f', 0.9], [1, '#ffd88f', 0]]),
      rg('wrm', [[0, '#ffcf7a', 0.62], [1, '#ffb85c', 0.14]], { cx: 0.5, cy: 0.72, r: 0.78 }),
      rg('orb', [[0, '#ffffff'], [0.35, '#9ff3ff'], [1, '#2350f0']], { cx: 0.38, cy: 0.32, r: 0.7 }),
      rg('halo', [[0, '#39e6ff', 0.6], [1, '#39e6ff', 0]]),
      h('filter', { id: id + '-glow', filterUnits: 'userSpaceOnUse', x: -60, y: -60, width: 760, height: 700 },
        h('feGaussianBlur', { stdDeviation: 3, result: 'b' }),
        h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' }))));
    const O = layers(id, false), N = layers(id, true);
    const body = ORDER.map(n => (O[n] ? h('g', { 'data-a': 'L-' + n + '-o' }, O[n]) : '') + (N[n] ? h('g', { 'data-a': 'L-' + n + '-n', opacity: 0 }, N[n]) : '')).join('');
    return h('svg', { viewBox: '0 0 600 560', width: '100%', height: '100%', style: 'display:block;overflow:visible' }, defs, body);
  }

  // ---------- vector hands (v1 look) ----------
  const PARTS = ['index', 'middle', 'thumb', 'ring', 'pinky', 'palm'];
  const K = 0.62, SEAM = '#3aa8ff';
  const MATS = {
    skin: { stops: [[0, '#f9dfc8'], [0.3, '#e8b08a'], [0.72, '#b8714f'], [1, '#74392a']], palm: ['#f8d8bd', '#dc9a72', '#8f4f36'], spec: '#fff4ea', nail: '#f8dccb', crease: '#7a3f2a' },
    skinRed: { stops: [[0, '#ffc6b6'], [0.3, '#e86a5c'], [0.72, '#9e2228'], [1, '#44060b']], palm: ['#ffbcaa', '#cf4c45', '#5a0b11'], spec: '#ffe6df', nail: '#ffd0c4', crease: '#44060b' },
    chrome: { stops: [[0, '#ffffff'], [0.16, '#e3e9f2'], [0.4, '#7486a0'], [0.54, '#151c2b'], [0.7, '#7f95b5'], [0.88, '#d6e4fb'], [1, '#ffffff']], palm: ['#f6f9ff', '#a3b0c4', '#3c4a62', '#121826'], spec: '#ffffff', nail: '#bfe3ff', crease: '#0d1220' },
    robot: { stops: [[0, '#eef2f8'], [0.18, '#c3cad6'], [0.42, '#66748a'], [0.56, '#141a26'], [0.72, '#6f7f98'], [0.9, '#c3cad6'], [1, '#eef2f8']], palm: ['#e4e9f1', '#98a3b5', '#394459', '#141a26'], spec: '#ffffff', nail: '#bfe3ff', crease: '#141a26' }
  };
  const POSE = {
    reach: { f: { pinky: [466, 330, 18, 150, 38, 31, 10], ring: [488, 292, 8, 194, 43, 36, 8], middle: [494, 254, -1, 214, 46, 38, 6], index: [480, 216, -10, 200, 44, 36, 6] }, t: [372, 214, -40, 150, 54, 42, 18] },
    shake: { f: { pinky: [470, 326, 12, 146, 38, 31, 26], ring: [490, 294, 6, 186, 43, 36, 22], middle: [496, 260, 1, 204, 46, 38, 18], index: [484, 226, -4, 194, 44, 36, 14] }, t: [392, 212, -64, 140, 54, 42, 12] },
    grip: { f: { pinky: [470, 326, 18, 140, 38, 31, 44], ring: [490, 294, 12, 178, 43, 36, 40], middle: [496, 260, 6, 196, 46, 38, 36], index: [484, 226, 0, 188, 44, 36, 32] }, t: [392, 212, -58, 136, 54, 42, 10] },
    hgrip: { f: { pinky: [470, 326, 22, 140, 38, 31, 46], ring: [490, 294, 14, 178, 43, 36, 42], middle: [496, 260, 8, 196, 46, 38, 38], index: [484, 226, 2, 188, 44, 36, 34] }, t: [384, 222, -24, 136, 54, 42, 34] },
    rgrip: { f: { pinky: [470, 326, 4, 132, 38, 31, 14], ring: [490, 294, -4, 168, 43, 36, 12], middle: [496, 260, -10, 186, 46, 38, 10], index: [484, 226, -16, 176, 44, 36, 8] }, t: [392, 212, -70, 150, 54, 42, 6] },
    point: { f: { pinky: [466, 326, 86, 150, 38, 31, 112], ring: [486, 292, 80, 194, 43, 36, 116], middle: [494, 258, 72, 214, 46, 38, 118], index: [482, 218, -4, 200, 44, 36, 0] }, t: [380, 222, 8, 150, 54, 42, 26] },
    open: { f: { pinky: [466, 334, 34, 146, 38, 31, 8], ring: [488, 294, 14, 190, 43, 36, 6], middle: [494, 254, -3, 210, 46, 38, 5], index: [480, 214, -20, 196, 44, 36, 5] }, t: [380, 226, -58, 150, 54, 42, 10] },
    // human, clasped: fingers curl down round the robot wrist (8th value = distal foreshortening), thumb folds over the top
    hclasp: { f: { pinky: [470, 326, 30, 146, 38, 31, 100, 0.56], ring: [490, 294, 25, 186, 43, 36, 96, 0.58], middle: [496, 260, 20, 204, 46, 38, 92, 0.6], index: [484, 226, 15, 194, 44, 36, 88, 0.62] }, t: [392, 212, -14, 140, 54, 42, 16] }
  };
  const rad = d => d * Math.PI / 180;
  // the clasp, in the human hand's svg frame: hw/rw = thumb crotch of each hand (robot in its mirrored svg); meet/hold = [x, y, phi]: the robot crotch lands on human point x,y, robot turned phi deg
  const CLASP = { hw: [392, 212], rw: [368, 212], meet: [434, 212, 0], hold: [404, 214, -26] };
  // robot, clasped. Written in the human frame as [joint x, joint y, proximal deg, distal deg, distal scale]: the proximal phalanges run down behind the human hand,
  // the knuckles sit just under its lower edge and the tips hook back up over it. Converted below into the robot's own (unmirrored) frame.
  (function () {
    const [wx, wy, ph] = CLASP.hold, c = Math.cos(rad(-ph)), s = Math.sin(rad(-ph)), O = POSE.shake, f = {};
    const spec = { index: [262, 338, 158, 232, 0.66], middle: [290, 346, 152, 224, 0.64], ring: [318, 350, 146, 216, 0.62], pinky: [346, 348, 140, 208, 0.58] };
    Object.keys(spec).forEach(k => {
      const [jx, jy, tp, td, sc] = spec[k], o = O.f[k], j = o[3] * 0.52 - (o[4] + o[5]) / 2 * 0.35;
      const dx = jx - j * Math.cos(rad(tp)) - wx, dy = jy - j * Math.sin(rad(tp)) - wy;
      const mx = CLASP.rw[0] + dx * c - dy * s, my = CLASP.rw[1] + dx * s + dy * c;
      f[k] = [760 - mx, my, 180 + ph - tp, o[3], o[4], o[5], tp - td, sc];
    });
    POSE.rclasp = { f, t: [392, 212, 180 + ph - 165, 140, 54, 42, 165 - 150] };
  })();
  // morph every finger group under root from pose a to pose b. t drives base + proximal angle, tc (default t) the distal curl and foreshortening
  function morph(root, a, b, t, tc) {
    const A = POSE[a], B = POSE[b]; if (tc == null) tc = t;
    root.querySelectorAll('[data-fg]').forEach(g => {
      const k = g.getAttribute('data-fg'), fa = k === 'thumb' ? A.t : A.f[k], fb = k === 'thumb' ? B.t : B.f[k];
      if (!fa || !fb) return;
      const L = (i, u) => { const x = fa[i] == null ? 1 : fa[i], y = fb[i] == null ? 1 : fb[i]; return x + (y - x) * u; };
      const v = [0, 1, 2, 3, 4, 5].map(i => L(i, t)), cu = L(6, tc), sc = L(7, tc), wm = (v[4] + v[5]) / 2, l1 = v[3] * 0.52;
      g.setAttribute('transform', 'translate(' + v[0].toFixed(2) + ' ' + v[1].toFixed(2) + ') rotate(' + v[2].toFixed(2) + ')');
      const j = g.querySelector(':scope > [data-fj]');
      if (j) j.setAttribute('transform', 'translate(' + (l1 - wm * 0.35).toFixed(2) + ' 0) rotate(' + cu.toFixed(2) + ')' + (Math.abs(sc - 1) > 0.001 ? ' scale(' + sc.toFixed(3) + ' 1)' : ''));
    });
  }
  // pointing pose, as used in the mirrored reach rig: index direction (deg, screen) and tip offset from the reach tip (rig px)
  function pointInfo() {
    const r = tipOf(POSE.reach.f.index), p = tipOf(POSE.point.f.index), ia = POSE.point.f.index;
    return { dir: 180 - (ia[2] + ia[6]), d: [-(p[0] - r[0]) * K, (p[1] - r[1]) * K] };
  }
  const ARM = 'M304 222 C196 262 70 336 -60 392 L-1500 1065 L-1500 1324 L-60 540 C86 446 212 372 304 342 Z';
  const PALM = 'M290 226 C340 203 420 193 472 203 C503 210 515 240 513 276 C511 318 494 346 463 357 C410 373 340 361 291 339 Z';
  function tipOf(fp) {
    const [x, y, a, len, w, tw, c] = fp, j = len * 0.52 - (w + tw) / 2 * 0.35, l2 = len * 0.52;
    return [x + j * Math.cos(rad(a)) + l2 * Math.cos(rad(a + c)), y + j * Math.sin(rad(a)) + l2 * Math.sin(rad(a + c))];
  }
  function hdefs(id, mats) {
    const st = M => M.stops.map(s => h('stop', { offset: s[0], stopColor: s[1] }));
    const box = { filterUnits: 'userSpaceOnUse', x: -150, y: -20, width: 950, height: 620 }, sbox = { filterUnits: 'userSpaceOnUse', x: -50, y: -60, width: 240, height: 120 };
    return h('defs', null, mats.map(m => { const M = MATS[m]; return [
      h('linearGradient', { id: id + '-f-' + m, x1: 0, y1: 0, x2: 0, y2: 1 }, st(M)),
      h('radialGradient', { id: id + '-p-' + m, cx: 0.42, cy: 0.3, r: 0.85 }, M.palm.map((c, i) => h('stop', { offset: i / (M.palm.length - 1), stopColor: c }))),
      h('linearGradient', { id: id + '-a-' + m, gradientUnits: 'userSpaceOnUse', x1: 200, y1: 262, x2: 249, y2: 376 }, st(M))]; }),
      h('filter', Object.assign({ id: id + '-bl' }, box), h('feGaussianBlur', { stdDeviation: 2.6 })),
      h('filter', Object.assign({ id: id + '-gl' }, box), h('feGaussianBlur', { stdDeviation: 2.4, result: 'b' }),
        h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' }))),
      // finger segments: same blurs on a small region in the segment's own frame (a full-size region per segment is very slow to paint)
      h('filter', Object.assign({ id: id + '-bs' }, sbox), h('feGaussianBlur', { stdDeviation: 2.6 })),
      h('filter', Object.assign({ id: id + '-gs' }, sbox), h('feGaussianBlur', { stdDeviation: 2.4, result: 'b' }),
        h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' }))));
  }
  const cap = (l, a, b) => 'M0 ' + (-a / 2) + ' L' + l + ' ' + (-b / 2) + ' A' + (b / 2) + ' ' + (b / 2) + ' 0 0 1 ' + l + ' ' + (b / 2) + ' L0 ' + (a / 2) + ' A' + (a / 2) + ' ' + (a / 2) + ' 0 0 1 0 ' + (-a / 2) + ' Z';
  function seg(id, l, a, b, last, m, back) {
    const M = MATS[m], ch = m === 'chrome', F = 'url(#' + id + '-f-' + m + ')', bl = 'url(#' + id + '-bs)', gl = 'url(#' + id + '-gs)';
    if (m === 'robot') {
      const g = 5, A = a * 0.86, B = b * 0.86, L = l - g;
      return [h('circle', { cx: 0, cy: 0, r: a * 0.36, fill: '#141a26' }),
        h('circle', { cx: 0, cy: 0, r: a * 0.36, fill: 'none', stroke: SEAM, strokeWidth: 1.3, filter: gl }),
        h('g', { transform: 'translate(' + g + ' 0)' },
          h('path', { d: cap(L, A, B), fill: F }),
          h('path', { d: 'M' + A * 0.2 + ' ' + (-A * 0.27) + ' L' + (L - B * 0.3) + ' ' + (-B * 0.27), stroke: M.spec, strokeWidth: A * 0.12, strokeLinecap: 'round', opacity: 0.85, filter: bl }),
          h('path', { d: 'M' + A * 0.3 + ' ' + A * 0.18 + ' L' + (L - B * 0.5) + ' ' + B * 0.18, stroke: '#141a26', strokeWidth: 1.2, opacity: 0.6 }),
          last ? h('circle', { cx: L - B * 0.1, cy: 0, r: 2.2, fill: '#bfe9ff', filter: gl }) : null)];
    }
    const out = [h('path', { d: cap(l, a, b), fill: F }),
      h('path', { d: 'M' + a * 0.2 + ' ' + (-a * 0.27) + ' L' + (l - b * 0.3) + ' ' + (-b * 0.27), stroke: M.spec, strokeWidth: a * 0.13, strokeLinecap: 'round', opacity: ch ? 0.9 : 0.42, filter: bl })];
    if (!ch && !last) out.push(h('path', { d: 'M' + (l - 2) + ' ' + (-b * 0.32) + ' q 5 ' + b * 0.16 + ' 0 ' + b * 0.32, stroke: M.crease, strokeWidth: 1.4, fill: 'none', opacity: 0.28 }));
    if (!ch && last) out.push(back
      ? h('ellipse', { cx: l - b * 0.3, cy: -b * 0.04, rx: b * 0.4, ry: b * 0.3, fill: M.nail, stroke: M.crease, strokeWidth: 1.3, strokeOpacity: 0.4, opacity: 0.92 })
      : h('ellipse', { cx: l - b * 0.25, cy: -b * 0.14, rx: b * 0.42, ry: b * 0.26, fill: M.nail, opacity: 0.5 }));
    if (ch) {
      out.push(h('path', { d: 'M5 ' + (-a / 2 + 3) + ' L5 ' + (a / 2 - 3), stroke: SEAM, strokeWidth: 1.6, filter: gl }));
      out.push(h('path', { d: 'M' + a * 0.4 + ' ' + a * 0.1 + ' L' + (l - b * 0.45) + ' ' + b * 0.1, stroke: SEAM, strokeWidth: 1.1, opacity: 0.85, filter: gl }));
      if (last) out.push(h('circle', { cx: l - b * 0.05, cy: 0, r: 2.4, fill: '#bfe9ff', filter: gl }));
    }
    return out;
  }
  // op.tip: distal phalanx only (the robot's front layer); op.back: back-of-hand nails
  function finger(id, fp, m, key, op) {
    op = op || {};
    const [x, y, ang, len, w, tw, curl] = fp, l1 = len * 0.52, l2 = len * 0.52, wm = (w + tw) / 2;
    return h('g', { 'data-fg': key, transform: 'translate(' + x + ' ' + y + ') rotate(' + ang + ')' }, op.tip ? '' : seg(id, l1, w, wm, false, m, op.back),
      h('g', { 'data-fj': '', transform: 'translate(' + (l1 - wm * 0.35) + ' 0) rotate(' + curl + ')' }, seg(id, l2, wm, tw, true, m, op.back)));
  }
  function parts(id, pose, m, armM, op) {
    op = op || {};
    const P = POSE[pose], M = MATS[m], am = armM || m, A = MATS[am], bl = 'url(#' + id + '-bl)', gl = 'url(#' + id + '-gl)', o = {};
    o.arm = am === 'robot' ? [h('path', { d: ARM, fill: 'url(#' + id + '-a-robot)' }),
      h('path', { d: 'M286 246 L-1500 1080', stroke: '#141a26', strokeWidth: 7, opacity: 0.7 }),
      h('path', { d: 'M290 262 L-1500 1104', stroke: '#dfe6f0', strokeWidth: 2.5, opacity: 0.8 }),
      h('path', { d: 'M300 226 C310 262 312 304 306 342', stroke: SEAM, strokeWidth: 2, fill: 'none', filter: gl })]
      : [h('path', { d: ARM, fill: 'url(#' + id + '-a-' + am + ')' }),
        h('path', { d: 'M-40 392 C80 340 190 270 296 234', stroke: A.spec, strokeWidth: 9, fill: 'none', strokeLinecap: 'round', opacity: 0.35, filter: bl })];
    ['pinky', 'ring', 'middle', 'index'].forEach(k => { o[k] = finger(id, P.f[k], m, k, op); });
    o.thumb = finger(id, P.t, m, 'thumb', { back: op.back });
    const met = m === 'chrome' || m === 'robot';
    o.palm = [h('path', { d: PALM, fill: 'url(#' + id + '-p-' + m + ')' }),
      h('ellipse', { cx: 410, cy: 236, rx: 70, ry: 16, transform: 'rotate(-6 410 236)', fill: M.spec, opacity: met ? 0.7 : 0.32, filter: bl })];
    // back of the hand: tendons fanning out from the wrist, a highlight and a crease on each knuckle
    if (op.back && !met) {
      const kn = ['index', 'middle', 'ring', 'pinky'].map(k => P.f[k]);
      o.palm.push(
        kn.map((f, i) => h('path', { d: 'M' + (316 + i * 3) + ' ' + (250 + i * 24) + ' Q' + (392 + i * 2) + ' ' + (238 + i * 29) + ' ' + (f[0] - 24) + ' ' + (f[1] + 1), stroke: M.crease, strokeWidth: 4, fill: 'none', strokeLinecap: 'round', opacity: 0.08 })),
        kn.map(f => h('ellipse', { cx: f[0] - 10, cy: f[1] - 3, rx: 11, ry: 7, fill: M.spec, opacity: 0.16 })),
        kn.map(f => h('path', { d: 'M' + (f[0] - 16) + ' ' + (f[1] + 8) + ' q 7 4 14 0', stroke: M.crease, strokeWidth: 1.5, fill: 'none', opacity: 0.32 })));
    }
    if (m === 'chrome') o.palm.push(
      h('path', { d: 'M322 246 C372 226 430 220 482 228', stroke: SEAM, strokeWidth: 1.5, fill: 'none', filter: gl }),
      h('path', { d: 'M300 304 C350 300 420 312 486 336', stroke: SEAM, strokeWidth: 1.2, fill: 'none', opacity: 0.8, filter: gl }),
      h('circle', { cx: 404, cy: 282, r: 11, fill: 'none', stroke: SEAM, strokeWidth: 2, filter: gl }),
      h('circle', { cx: 404, cy: 282, r: 4, fill: '#bfe9ff', filter: gl }),
      h('path', { d: 'M280 228 C292 262 296 304 288 344 L312 342 C320 302 316 258 304 220 Z', fill: 'url(#' + id + '-f-chrome)' }),
      h('path', { d: 'M296 226 C306 262 308 304 302 342', stroke: SEAM, strokeWidth: 1.4, fill: 'none', filter: gl }));
    if (m === 'robot') o.palm.push(
      h('path', { d: 'M318 250 C370 236 430 232 488 240', stroke: '#141a26', strokeWidth: 1.4, fill: 'none', opacity: 0.7 }),
      h('path', { d: 'M306 300 C360 296 430 306 494 326', stroke: '#141a26', strokeWidth: 1.4, fill: 'none', opacity: 0.7 }),
      h('path', { d: 'M330 276 C380 270 420 276 470 290', stroke: SEAM, strokeWidth: 1.3, fill: 'none', filter: gl }),
      h('circle', { cx: 404, cy: 282, r: 11, fill: 'none', stroke: SEAM, strokeWidth: 2, filter: gl }),
      h('circle', { cx: 404, cy: 282, r: 4, fill: '#bfe9ff', filter: gl }));
    return o;
  }
  const Z = ['arm', 'pinky', 'ring', 'middle', 'index', 'palm', 'thumb'], ZB = ['arm', 'thumb', 'pinky', 'ring', 'middle', 'index', 'palm'];
  const mirror = (s, dx) => h('g', { transform: 'translate(' + (760 + (dx || 0)) + ' 0) scale(-1 1)' }, s);
  const HID = 'opacity:0;visibility:hidden';
  const HV = {
    // two faces. 'p': palm side of the right hand, used in frames 1-5 (enters from the right). 'b': back of the same right hand (thumb behind, knuckles, nails),
    // used in frames 6-11, where the engine mirrors the rig so it enters from the left and so the silhouette still reads as a right hand. The engine toggles data-face.
    reach_human() {
      const id = 'hvR', face = (o, ord) => {
        const S = parts(id, 'reach', 'skin', null, o), R = parts(id, 'reach', 'skinRed', null, o), C = parts(id, 'reach', 'chrome', 'skin', o);
        return mirror(ord.map(k => [S[k], h('g', { 'data-a': 'hR-red', style: HID }, R[k]), k === 'arm' ? '' : h('g', { 'data-a': 'pi-' + k, style: HID }, C[k])]));
      };
      const body = [h('g', { 'data-face': 'p' }, face(null, Z)), h('g', { 'data-face': 'b', style: 'display:none' }, face({ back: 1 }, ZB))];
      const t = tipOf(POSE.reach.f.index);
      return { id, mats: ['skin', 'skinRed', 'chrome'], body, anchor: [760 - t[0], t[1]], pivot: [460, 282] };
    },
    reach4() { const id = 'hv4', R = parts(id, 'reach', 'skinRed'), t = tipOf(POSE.reach.f.index); return { id, mats: ['skinRed'], body: mirror(Z.map(k => R[k])), anchor: [760 - t[0], t[1]], pivot: [460, 282] }; },
    // right hand from the left, seen from the back: the thumb sits behind the hand, knuckles and nails face us. Red tint fades out after the shake.
    shake_human() {
      const id = 'hvSH', o = { back: 1 }, S = parts(id, 'shake', 'skin', null, o), R = parts(id, 'shake', 'skinRed', null, o);
      return { id, mats: ['skin', 'skinRed'], body: ZB.map(k => [S[k], h('g', { 'data-a': 'hSH-red' }, R[k])]), anchor: tipOf(POSE.shake.f.index), pivot: [300, 282], bg: 'sh' };
    },
    // the human fingertips again, drawn behind the robot: once clasped they wrap round behind the chrome hand
    shake_human_b() {
      const id = 'hvSHb', o = { back: 1, tip: 1 }, S = parts(id, 'shake', 'skin', null, o), R = parts(id, 'shake', 'skinRed', null, o);
      return { id, mats: ['skin', 'skinRed'], body: h('g', { 'data-tips': '', opacity: 0 }, ['pinky', 'ring', 'middle', 'index'].map(k => [S[k], h('g', { 'data-a': 'hSH-red' }, R[k])])), anchor: tipOf(POSE.shake.f.index), pivot: [300, 282], bg: 'sh' };
    },
    // right hand from the right, seen from the palm side. Back layer: arm, palm, fingers. Front layer (shake_robot_f): thumb + fingertip copies that fade in once they hook over the human hand.
    shake_robot() {
      const id = 'hvSR', R = parts(id, 'shake', 'robot'), t = tipOf(POSE.shake.f.index);
      return { id, mats: ['robot'], body: mirror(['arm', 'pinky', 'ring', 'middle', 'index', 'palm'].map(k => R[k])), anchor: [760 - t[0], t[1]], pivot: [460, 282], bg: 'sr' };
    },
    shake_robot_f() {
      const id = 'hvSRf', R = parts(id, 'shake', 'robot', null, { tip: 1 }), t = tipOf(POSE.shake.f.index);
      return { id, mats: ['robot'], body: mirror([h('g', { 'data-tips': '', opacity: 0 }, ['pinky', 'ring', 'middle', 'index'].map(k => R[k])), R.thumb]), anchor: [760 - t[0], t[1]], pivot: [460, 282], bg: 'sr' };
    },
    // v4 regular handshake, side view, both right hands. Human hand in front (we see its back); its fingers wrap down over the robot hand.
    // Robot hand behind: chrome fingertips curl round the heel of the human hand, robot thumb crosses over the top, human thumb crosses over it.
    grip() {
      const id = 'hvG', gl = 'url(#' + id + '-gl)', bl = 'url(#' + id + '-bl)', bb = 'url(#' + id + '-bb)', sb = 'url(#' + id + '-sb)';
      const SK = '#4a1d10', RK = '#0a0e18', OW = 3;
      const P = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const f = v => v.toFixed(1);
      const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L, dx / L, dy / L]; };
      const tube = (a, b, ra, rb) => { const [nx, ny] = nrm(a, b);
        return 'M' + f(a[0] + nx * ra) + ' ' + f(a[1] + ny * ra) + ' L' + f(b[0] + nx * rb) + ' ' + f(b[1] + ny * rb) + ' A' + rb + ' ' + rb + ' 0 0 0 ' + f(b[0] - nx * rb) + ' ' + f(b[1] - ny * rb) +
          ' L' + f(a[0] - nx * ra) + ' ' + f(a[1] - ny * ra) + ' A' + ra + ' ' + ra + ' 0 0 0 ' + f(a[0] + nx * ra) + ' ' + f(a[1] + ny * ra) + ' Z'; };
      const up = (a, b, ra, rb, k) => { let [nx, ny] = nrm(a, b); if (ny > 0) { nx = -nx; ny = -ny; } return 'M' + f(a[0] + nx * ra * k) + ' ' + f(a[1] + ny * ra * k) + ' L' + f(b[0] + nx * rb * k) + ' ' + f(b[1] + ny * rb * k); };
      const skinT = (a, b, ra, rb) => [h('path', { d: tube(a, b, ra, rb), fill: 'url(#' + id + '-f-skin)', stroke: SK, strokeWidth: OW, strokeLinejoin: 'round' }),
        h('path', { d: up(a, b, ra, rb, 0.48), stroke: '#fff1e4', strokeWidth: ra * 0.34, strokeLinecap: 'round', opacity: 0.5, filter: bl })];
      const robT = (a, b, ra, rb) => [h('path', { d: tube(a, b, ra, rb), fill: 'url(#' + id + '-f-robot)', stroke: RK, strokeWidth: OW, strokeLinejoin: 'round' }),
        h('path', { d: up(a, b, ra, rb, 0.5), stroke: '#ffffff', strokeWidth: ra * 0.26, strokeLinecap: 'round', opacity: 0.9, filter: bl }),
        h('path', { d: up(a, b, ra, rb, -0.32), stroke: RK, strokeWidth: 1.2, opacity: 0.55 })];
      const hFinger = (K0, J, T, r0, r1, r2) => { const [, , ux, uy] = nrm(J, T);
        return [skinT(K0, J, r0, r1), skinT(J, T, r1, r2),
          h('path', { d: 'M' + f(J[0] - uy * r1 * 0.7) + ' ' + f(J[1] + ux * r1 * 0.7) + ' Q' + f(J[0] + ux * 5) + ' ' + f(J[1] + uy * 5) + ' ' + f(J[0] + uy * r1 * 0.7) + ' ' + f(J[1] - ux * r1 * 0.7), stroke: SK, strokeWidth: 1.6, fill: 'none', opacity: 0.5 }),
          h('ellipse', { cx: f(T[0] - ux * r2 * 0.25 + (uy > 0 ? uy : -uy) * 0), cy: f(T[1] - uy * r2 * 0.25 - r2 * 0.32), rx: f(r2 * 0.62), ry: f(r2 * 0.4), transform: 'rotate(' + f(Math.atan2(uy, ux) * 57.3) + ' ' + f(T[0]) + ' ' + f(T[1]) + ')', fill: '#f8dccb', stroke: SK, strokeWidth: 1.2, opacity: 0.85 }),
          h('ellipse', { cx: f(K0[0]), cy: f(K0[1] - r0 * 0.15), rx: f(r0 * 0.5), ry: f(r0 * 0.34), fill: '#fff4ea', opacity: 0.5, filter: bl })]; };
      const rFinger = (R0, J, L, r0, r1, r2) => { const [, , ux, uy] = nrm(J, L), J2 = [J[0] + ux * 7, J[1] + uy * 7];
        return [h('circle', { cx: J[0], cy: J[1], r: f(r1 * 0.62), fill: '#141a26', stroke: RK, strokeWidth: 2 }),
          h('circle', { cx: J[0] + ux * 3.5, cy: J[1] + uy * 3.5, r: f(r1 * 0.62), fill: 'none', stroke: SEAM, strokeWidth: 1.6, filter: gl }),
          robT(J2, L, r1 * 0.94, r2), robT(R0, J, r0, r1),
          h('circle', { cx: f(R0[0]), cy: f(R0[1]), r: f(r0 * 0.34), fill: 'none', stroke: RK, strokeWidth: 1.4, opacity: 0.55 }),
          h('circle', { cx: f(L[0] + ux * r2 * 0.3), cy: f(L[1] + uy * r2 * 0.3), r: 2.6, fill: '#bfe9ff', filter: gl })]; };
      const arm = (k, A0, A1, B0, B1, base, bands, stroke, extra) => {
        const cid = id + '-' + k, quad = [A0, A1, B1, B0];
        return [h('clipPath', { id: cid }, h('polygon', { points: pts(quad) })),
          h('polygon', { points: pts(quad), fill: base }),
          h('g', { clipPath: 'url(#' + cid + ')' },
            h('g', { filter: bb }, bands.map(b => h('polygon', { points: pts([P(A0, B0, b[0]), P(A1, B1, b[0]), P(A1, B1, b[1]), P(A0, B0, b[1])]), fill: b[2], opacity: b[3] }))),
            extra || ''),
          h('path', { d: 'M' + pts([A1, A0]).replace(' ', ' L') + ' M' + pts([B0, B1]).replace(' ', ' L'), stroke, strokeWidth: OW + 1, fill: 'none' })];
      };
      const box = { filterUnits: 'userSpaceOnUse', x: -1200, y: -600, width: 3400, height: 2600 };
      const defs = h('defs', null,
        h('filter', Object.assign({ id: id + '-bb' }, box), h('feGaussianBlur', { stdDeviation: 16 })),
        h('filter', Object.assign({ id: id + '-sb' }, box), h('feGaussianBlur', { stdDeviation: 5 })));
      const hA0 = [238, 226], hB0 = [212, 338], hA1 = [-760, 700], hB1 = [-790, 830];
      const rA0 = [588, 212], rB0 = [612, 326], rA1 = [1580, 688], rB1 = [1604, 808];
      const ln = (u, st, w, op) => { const a = P(rA0, rB0, u), b = P(rA1, rB1, u); return h('path', { d: 'M' + a.join(' ') + ' L' + b.join(' '), stroke: st, strokeWidth: w, opacity: op }); };
      const ring = (t, st, w, fl) => { const a = P(rA0, rA1, t), b = P(rB0, rB1, t); return h('path', { d: 'M' + a.join(' ') + ' L' + b.join(' '), stroke: st, strokeWidth: w, filter: fl }); };
      const RB = 'M604 212 C548 198 452 194 384 202 C350 208 340 250 346 290 C352 326 384 344 424 346 C492 350 566 340 614 326 Z';
      const HB = 'M236 224 C292 204 352 194 398 198 C426 202 440 232 438 270 C436 306 424 334 400 344 C336 356 262 352 212 340 Z';
      const HF = [[[404, 214], [462, 222], [490, 256], 17, 15, 13], [[420, 246], [478, 256], [504, 292], 18, 16, 14], [[422, 280], [478, 292], [500, 326], 17, 15, 13], [[410, 314], [458, 326], [476, 352], 15, 13, 11]];
      const RF = [[[376, 362], [360, 336], [338, 306], 15, 14, 12], [[342, 366], [326, 340], [304, 308], 16, 15, 13], [[308, 364], [292, 338], [272, 308], 15, 14, 12], [[276, 358], [262, 336], [246, 310], 13, 12, 10]];
      const body = [defs,
        arm('ra', rA0, rA1, rB0, rB1, '#7f8ca2', [[0, 0.12, '#eef2f8', 0.95], [0.26, 0.44, '#141a26', 0.7], [0.58, 0.76, '#c3cad6', 0.9], [0.88, 1, '#2a3446', 0.85]], RK,
          [ln(0.24, '#141a26', 9, 0.6), ln(0.24, '#dfe6f0', 3.5, 0.85), ln(0.7, '#141a26', 9, 0.6), ln(0.7, '#dfe6f0', 3.5, 0.8), ring(0.02, '#141a26', 2), ring(0.06, SEAM, 2.6, gl)]),
        // robot hand, behind
        h('path', { d: RB, fill: 'url(#' + id + '-p-robot)', stroke: RK, strokeWidth: OW, strokeLinejoin: 'round' }),
        h('path', { d: 'M572 224 C528 214 476 212 432 216', stroke: '#141a26', strokeWidth: 1.4, fill: 'none', opacity: 0.7 }),
        h('path', { d: 'M584 314 C540 326 488 330 440 330', stroke: '#141a26', strokeWidth: 1.4, fill: 'none', opacity: 0.7 }),
        h('path', { d: 'M598 252 L566 252 L552 266', stroke: SEAM, strokeWidth: 1.4, fill: 'none', filter: gl }),
        h('circle', { cx: 544, cy: 278, r: 10, fill: 'none', stroke: SEAM, strokeWidth: 2, filter: gl }),
        h('circle', { cx: 544, cy: 278, r: 3.6, fill: '#bfe9ff', filter: gl }),
        h('path', { d: 'M596 216 C608 250 612 290 610 324', stroke: SEAM, strokeWidth: 2.2, fill: 'none', filter: gl }),
        arm('ha', hA0, hA1, hB0, hB1, '#c98a64', [[0, 0.3, '#f2c9a8', 0.9], [0.07, 0.15, '#fff0e2', 0.4], [0.68, 1, '#7a3f2c', 0.9], [0.88, 1, '#56271a', 0.7]], SK),
        // human fingers cast onto the chrome
        h('path', { d: 'M446 234 C476 258 504 300 508 342', stroke: '#05070d', strokeWidth: 26, fill: 'none', opacity: 0.45, filter: sb }),
        // human hand back
        h('path', { d: HB, fill: 'url(#' + id + '-p-skin)', stroke: SK, strokeWidth: OW, strokeLinejoin: 'round' }),
        [[404, 214], [420, 246], [422, 280], [410, 314]].map((k, i) => h('path', { d: 'M' + (262 + i * 4) + ' ' + (252 + i * 22) + ' Q' + (330 + i * 6) + ' ' + (236 + i * 26) + ' ' + (k[0] - 14) + ' ' + (k[1] + 2), stroke: SK, strokeWidth: 2, fill: 'none', opacity: 0.16, filter: bl })),
        h('path', { d: 'M252 240 C300 220 352 210 396 212', stroke: '#fff1e4', strokeWidth: 10, fill: 'none', opacity: 0.22, filter: bl }),
        HF.map(r => hFinger(...r)),
        // squeeze: robot fingertips press into the heel of the human hand
        h('path', { d: 'M248 330 C290 338 340 340 382 334', stroke: '#2a0b04', strokeWidth: 24, fill: 'none', opacity: 0.4, filter: sb }),
        RF.map(r => rFinger(...r)),
        // robot thumb over the top of the human hand, human thumb crossing over it
        h('path', { d: 'M500 214 C470 196 430 192 392 204', stroke: '#2a0b04', strokeWidth: 30, fill: 'none', opacity: 0.4, filter: sb }),
        rFinger([512, 214], [452, 188], [388, 204], 22, 20, 17),
        h('path', { d: 'M310 214 C350 192 390 180 420 176', stroke: '#05070d', strokeWidth: 26, fill: 'none', opacity: 0.35, filter: sb }),
        hFinger([300, 222], [356, 190], [418, 172], 22, 19, 16)
      ];
      return { id, mats: ['skin', 'robot'], body, anchor: [400, 270], pivot: [400, 300] };
    },
    present_bionic() { const id = 'hvP', C = parts(id, 'open', 'chrome', 'skin'); return { id, mats: ['skin', 'chrome'], body: mirror(Z.map(k => C[k])), anchor: [360, 282], pivot: [460, 282] }; }
  };
  const ORIG = { reach_human: [975, 320], reach4: [975, 320], shake_human: [987.5, 380], shake_human_b: [987.5, 380], shake_robot: [212.5, 380], shake_robot_f: [212.5, 380], grip: [600, 310], present_bionic: [575, 450] };
  // sfx: per-layout id suffix (the phone layout's copies get 'm'), so a hidden layout's gradients are never the ones painted
  function hand(v, sfx) {
    const d = HV[v](), o = ORIG[v], W = 760 * K, Ht = 520 * K;
    let svg = h('svg', { viewBox: '0 0 760 520', width: '100%', height: '100%', style: 'display:block;overflow:visible' }, hdefs(d.id, d.mats), d.body);
    if (sfx) svg = svg.replace(new RegExp('(id="|#)' + d.id + '-', 'g'), '$1' + d.id + sfx + '-');
    return '<div data-breath="' + (d.bg || '') + '" style="position:absolute;left:' + (o[0] - d.anchor[0] * K).toFixed(1) + 'px;top:' + (o[1] - d.anchor[1] * K).toFixed(1) + 'px;width:' + W.toFixed(1) + 'px;height:' + Ht.toFixed(1) + 'px;transform-origin:' + (d.pivot[0] / 7.6).toFixed(2) + '% ' + (d.pivot[1] / 5.2).toFixed(2) + '%;will-change:transform">' + svg + '</div>';
  }

  const rng = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
  // the frame-4 shop, pre-cut into 12 pieces that radiate from the window
  function pieces() {
    // one shared image of the frame-4 shop (12 live SVG copies were too heavy to paint)
    const src = shop('sp').replace('data-a="L-glass-o"', 'data-x="g" opacity="0"').replace('data-a="L-warm-o"', 'data-x="w" opacity="0"').replace(/data-a="/g, 'data-x="')
      .replace('<svg viewBox="0 0 600 560" width="100%" height="100%" style="display:block;overflow:visible">', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -10 680 600" width="680" height="600">');
    if (!pieces.url) pieces.url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    const svg = '<img alt="" src="' + pieces.url + '" style="position:absolute;left:-20px;top:-10px;width:680px;height:600px;display:block">';
    const rnd = rng(11), C = [34, 67];
    const PR = [[-2, 28], [-2, -2], [30, -2], [62, -2], [107, -2], [107, 38], [107, 72], [107, 102], [66, 102], [30, 102], [-2, 102], [-2, 62]];
    const B = [0, 2, 3, 5, 6, 8, 9, 11];
    const J = B.map(bi => { const p = PR[bi], t = 0.42 + rnd() * 0.12, dx = p[0] - C[0], dy = p[1] - C[1], L = Math.hypot(dx, dy), j = (rnd() - 0.5) * 6; return [C[0] + dx * t - dy / L * j, C[1] + dy * t + dx / L * j]; });
    const polys = [];
    for (let i = 0; i < 8; i++) { const a = B[i], b = B[(i + 1) % 8], pts = [J[i]]; let k = a; for (;;) { pts.push(PR[k]); if (k === b) break; k = (k + 1) % PR.length; } pts.push(J[(i + 1) % 8]); polys.push(pts); }
    for (let i = 0; i < 8; i += 2) polys.push([C, J[i], J[i + 1], J[(i + 2) % 8]]);
    return polys.map((pts, i) => {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const vx = cx - C[0], vy = cy - C[1], vl = Math.hypot(vx, vy) || 1;
      const dx = Math.round(vx / vl * (60 + rnd() * 140)), rot = Math.round((vx >= 0 ? 1 : -1) * (25 + rnd() * 55));
      const poly = pts.map(p => p[0].toFixed(1) + '% ' + p[1].toFixed(1) + '%').join(',');
      return '<div data-f4="pc' + i + '" data-dx="' + dx + '" data-rot="' + rot + '" data-px="' + (vx / vl * 7).toFixed(1) + '" data-py="' + (vy / vl * 7).toFixed(1) + '" style="position:absolute;inset:0;clip-path:polygon(' + poly + ');transform-origin:' + cx.toFixed(1) + '% ' + cy.toFixed(1) + '%;will-change:transform"><div style="position:absolute;inset:0;filter:saturate(0.45) brightness(0.6)">' + svg + '</div></div>';
    }).join('');
  }
  // small drifting glass chips; the big ones are near the lens, so they blur
  function debris() {
    const rnd = rng(23); let s = '';
    for (let i = 0; i < 18; i++) {
      const w = 14 + Math.pow(rnd(), 1.6) * 90, hh = w * (0.6 + rnd() * 0.8), x = rnd() * 1440, y = -560 + rnd() * 1300, near = w > 60;
      const fall = Math.round(near ? 1100 + rnd() * 500 : 480 + rnd() * 500), spin = Math.round((rnd() - 0.5) * 300);
      const n = rnd() > 0.5 ? 3 : 4, pts = [];
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rnd() * 0.8, r = 38 + rnd() * 12; pts.push((50 + Math.cos(a) * r).toFixed(1) + '% ' + (50 + Math.sin(a) * r).toFixed(1) + '%'); }
      const ang = Math.round(rnd() * 360), rb = rnd() > 0.6;
      const bg = rb ? 'linear-gradient(' + ang + 'deg,rgba(255,255,255,.9),rgba(255,120,170,.35) 30%,rgba(255,220,120,.3) 45%,rgba(120,255,210,.28) 60%,rgba(120,170,255,.32) 75%,rgba(255,255,255,.6))'
        : 'linear-gradient(' + ang + 'deg,rgba(255,255,255,.85),rgba(255,255,255,.08) 42%,rgba(255,200,200,.22) 70%,rgba(255,255,255,.7))';
      s += '<div data-f4="db' + i + '" data-fall="' + fall + '" data-spin="' + spin + '" style="position:absolute;left:' + x.toFixed(0) + 'px;top:' + y.toFixed(0) + 'px;width:' + w.toFixed(0) + 'px;height:' + hh.toFixed(0) + 'px;will-change:transform"><div style="position:absolute;inset:0;clip-path:polygon(' + pts.join(',') + ');background:' + bg + ';opacity:' + (0.45 + rnd() * 0.45).toFixed(2) + ';' + (near ? 'filter:blur(' + (w > 80 ? 3 : 1.5) + 'px);' : '') + '"></div></div>';
    }
    return s;
  }
  // full-screen crack, radiating from (cx, cy) in screen px
  function crack(w, hh, cx, cy, draw) {
    const rnd = rng(5), R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, hh - cy)) + 60, N = 13, rays = [];
    for (let i = 0; i < N; i++) { let a = i / N * Math.PI * 2 + (rnd() - 0.5) * 0.36, r = 0; const pts = [[cx, cy]]; while (r < R) { r += 24 + rnd() * 80; a += (rnd() - 0.5) * 0.14; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } rays.push(pts); }
    const P = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const lines = rays.map(P);
    rays.forEach(pts => {
      const n = rnd() > 0.5 ? 2 : 1;
      for (let b = 0; b < n && pts.length > 3; b++) {
        const k = 2 + Math.floor(rnd() * (pts.length - 3)), p = pts[k], q = pts[k - 1];
        let a = Math.atan2(p[1] - q[1], p[0] - q[0]) + (rnd() > 0.5 ? 1 : -1) * (0.4 + rnd() * 0.5), c = p; const br = [p];
        for (let s = 0; s < 3; s++) { const l = 30 + rnd() * 70; a += (rnd() - 0.5) * 0.3; c = [c[0] + Math.cos(a) * l, c[1] + Math.sin(a) * l]; br.push(c); }
        lines.push(P(br));
      }
    });
    const dist = p => Math.hypot(p[0] - cx, p[1] - cy);
    const near = (pts, r) => pts.slice(1).reduce((b, p) => Math.abs(dist(p) - r) < Math.abs(dist(b) - r) ? p : b, pts[1]);
    [36, 90, 170, 290].forEach((r, ri) => { for (let i = 0; i < N; i++) { if (rnd() > 0.85 - ri * 0.14) continue; const p = near(rays[i], r), q = near(rays[(i + 1) % N], r); lines.push(P([p, [(p[0] + q[0]) / 2 + (rnd() - 0.5) * 14, (p[1] + q[1]) / 2 + (rnd() - 0.5) * 14], q])); } });
    const facets = rays.map((pts, i) => { const a = near(pts, 320), b = near(rays[(i + 1) % N], 320); return '<path d="M' + cx + ' ' + cy + ' L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' Z" fill="#fff" opacity="' + (rnd() * 0.07).toFixed(3) + '"></path>'; }).join('');
    const dash = draw ? ' stroke-dasharray="1" stroke-dashoffset="1"' : '';
    const ps = () => lines.map(d => '<path data-ck="" d="' + d + '" pathLength="1"' + dash + '></path>').join('');
    return '<svg width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '" style="position:absolute;left:0;top:0;display:block;overflow:visible"><defs><filter id="ckg" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"></feGaussianBlur></filter><radialGradient id="cki"><stop offset="0" stop-color="#fff" stop-opacity=".95"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></radialGradient></defs><g>' + facets + '</g><g fill="none" stroke="rgba(255,225,225,.55)" stroke-width="4" filter="url(#ckg)">' + ps() + '</g><g fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" opacity=".92">' + ps() + '</g><circle cx="' + cx + '" cy="' + cy + '" r="30" fill="url(#cki)"></circle></svg><div data-flash="" style="position:absolute;left:' + (cx - 320) + 'px;top:' + (cy - 320) + 'px;width:640px;height:640px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,210,205,.35) 40%,rgba(255,210,205,0));opacity:0"></div>';
  }

  function grain(id) {
    return `<svg width="100%" height="100%" style="display:block"><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"></feTurbulence><feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0 0.05  0 0 0 0.9 0"></feColorMatrix></filter><rect width="100%" height="100%" filter="url(#${id})"></rect></svg>`;
  }

  function inject(root) {
    root.querySelectorAll('[data-art]').forEach(el => {
      if (el.getAttribute('data-done')) return;
      const t = el.getAttribute('data-art');
      el.innerHTML = t === 'shop' ? shop(el.getAttribute('data-id')) : t === 'hand' ? hand(el.getAttribute('data-v'), el.getAttribute('data-id') || '') : t === 'pieces' ? pieces() : t === 'debris' ? debris() : grain(el.getAttribute('data-id'));
      el.setAttribute('data-done', '1');
    });
  }

  const ancH = tipOf(POSE.shake.f.index);
  const HS = { K, ancH, ancR: [760 - ancH[0], ancH[1]], hw: CLASP.hw, rw: CLASP.rw, meet: CLASP.meet, hold: CLASP.hold };
  window.SWArt = { inject, shop, hand, grain, crack, ORDER, PARTS, morph, pointInfo, HS };
})();
