// v5: animated handshake. Hand rigs are placed by their thumb crotch (web); the robot can follow the human through a clasp relation. v4: regular handshake (hG) with hold-driven reach-in, sign hint aim, font mix per frame. v3: frame 4 rendered by SWFall (gl4). v2: frame list + freeze-frame state of every actor. Vector hands (no auto-grow), frame 4 crack gate (g4).
(function () {
  const FR = [
    { id: 'open', year: 1999, name: 'Your shop. Est. 1999', gate: 1 },
    { id: 'worked', year: 2008, name: 'It worked' },
    { id: 'online', year: 2020, name: 'Then the street went quiet' },
    { id: 'numbers', year: 2026, today: 1, name: 'This is what waiting costs', gate: 4 },
    { id: 'handshake', year: 2026, today: 1, name: 'Shake on it', gate: 5 },
    { id: 'website', year: 2027, name: 'Websites' },
    { id: 'systems', year: 2027, name: 'Business systems' },
    { id: 'assistant', year: 2028, name: 'AI assistant' },
    { id: 'automations', year: 2028, name: 'Automations' },
    { id: 'mobile', year: 2029, name: 'Mobile control' },
    { id: 'growth', year: 2029, name: 'Growth' },
    { id: 'future', year: 2030, name: 'Join the future' }
  ];
  const MOOD = {
    past: { '--ink': '#1a110a', '--chip': 'rgba(255,248,236,0.55)', '--line': 'rgba(43,29,18,0.3)', '--ptr': '#8c3829', '--glow': 'rgba(140,56,41,0)' },
    alarm: { '--ink': '#fff3f1', '--chip': 'rgba(42,3,7,0.45)', '--line': 'rgba(255,243,241,0.3)', '--ptr': '#fff3f1', '--glow': 'rgba(255,180,170,0.9)' },
    future: { '--ink': '#e9f6ff', '--chip': 'rgba(4,10,31,0.45)', '--line': 'rgba(185,220,255,0.3)', '--ptr': '#39e6ff', '--glow': 'rgba(57,230,255,0.9)' }
  };
  const PARTS = ['index', 'middle', 'thumb', 'ring', 'pinky', 'palm'];
  const UP = { wsign: 6, props: 7, counter: 7, dash: 7, orb: 8, door: 9, lamp: 10, sign: 11 };
  const FX = ['saturate(1) brightness(1)', 'saturate(1.08) brightness(1.05)', 'saturate(0.55) brightness(0.72)', 'saturate(0.45) brightness(0.6)', 'saturate(0) brightness(0.85)'];
  const S6 = [730, 205, 0.78, 1], M6 = [39, 318, 0.52, 1];

  // [anchorX, anchorY, scale, rotation, opacity]; anchor = the rig's transform-origin
  const P = {
    d: {
      shift: 40, gF12: 146,
      shop: [[700, 236, 0.9333, 1], [700, 236, 0.9333, 1], [730, 262, 0.88, 1], [420, 282, 1, 0.75], [520, 420, 0.6667, 0.14], S6, S6, S6, S6, S6, S6, [150, 318, 0.8333, 1]],
      // hand enters from the right (fingers point left); in frames 6-11 the engine mirrors it so it comes from the left (y lowered to clear the text)
      reach: [[1150, 645, 1.2, 24, 1], [1210, 700, 1.15, 18, 1], [1150, 800, 1.08, 10, 1], [1300, 1010, 1.05, 12, 0], [1320, 1040, 1.05, 12, 0],
        [935, 575, 1.1, 4, 1], [860, 610, 1.1, 0, 1], [928, 640, 1.1, 2, 1], [905, 610, 1.08, -5, 1], [885, 560, 1.1, 8, 1], [905, 570, 1.12, 11, 1], [1100, 900, 1, 4, 0]],
      // human (left) waits off-screen and reaches in while the ring is held; robot (right) is already reaching out
      sh: { off: [[-300, 560, 1.24, 0, 0], [1110, 560, 1.24, 0, 0]], wait: [-30, 540, 1.24, 0, 1] },
      // handshake rigs by web position [x, y, rot]: robot waits, both meet, clasp, then the robot leaves and the human hand rests
      hs: { s: 1.24, rWait: [826, 468], rMeet: [784, 470], hClasp: [748, 462, 10], hRest: [664, 492, 3], rOff: [1720, 520, -6], hExit: [-380, 700, 10], pivot: [748, 470] },
      // the pointing fingertip stops just outside the sign's flip button (it covers the sign text too), poke included
      aim: [35, 114],
      present: { off: [960, 820, 0.95, 34, 0], on: [840, 620, 1.1, 22, 1] }
    },
    // phone (390x740): text on top; shop centred over the lower part; big hands in from the bottom corners (frames 1-3 from the
    // right, 6-11 mirrored from the left); the shop, hands, rings and cards sit in bottom-anchored layers (data-vy 1)
    m: {
      shift: 24, gF12: 42,
      shop: [[31, 296, 0.547, 1], [31, 296, 0.547, 1], [39, 304, 0.52, 1], [39, 266, 0.52, 0.75], [70, 330, 0.43, 0.14], M6, M6, M6, M6, M6, M6, [58, 505, 0.26, 1]],
      reach: [[215, 521, 0.82, 40, 1], [225, 536, 0.8, 42, 1], [232, 572, 0.78, 36, 1], [380, 800, 0.76, 40, 0], [390, 820, 0.76, 40, 0],
        [252, 508, 0.8, 58, 1], [262, 556, 0.8, 48, 1], [254, 530, 0.8, 54, 1], [250, 520, 0.78, 52, 1], [254, 505, 0.8, 60, 1], [258, 515, 0.82, 58, 1], [250, 700, 0.7, 40, 0]],
      sh: { off: [[-160, 496, 0.66, 0, 0], [420, 496, 0.66, 0, 0]], wait: [-16, 485, 0.66, 0, 1] },
      // handshake: the desktop pair scaled by 0.53 about the screen centre, clasp at about 60% of the height
      hs: { s: 0.66, rWait: [251, 447], rMeet: [229, 448], hClasp: [210, 444, 10], hRest: [165, 460, 3], rOff: [700, 475, -6], hExit: [-260, 560, 10], pivot: [210, 448] },
      // the pointing fingertip stops below-right of the sign card, clear of it through the poke
      aim: [62, 46],
      present: { off: [360, 760, 0.4, 34, 0], on: [290, 610, 0.45, 22, 1] }
    }
  };
  const SPEC = {
    hR: { ox: 975, oy: 320 }, hSH: { ox: 987.5, oy: 380 }, hSHb: { ox: 987.5, oy: 380 }, hSR: { ox: 212.5, oy: 380 }, hSRf: { ox: 212.5, oy: 380 }, hP: { ox: 575, oy: 450 }
  };
  // Vector arms are drawn long enough to always leave the screen, so no auto-grow: hands stay small.
  function rig(k, v) {
    const [ax, ay, s, r, o] = v, p = SPEC[k];
    return { x: ax - p.ox, y: ay - p.oy, scale: s, rotation: r, autoAlpha: o };
  }

  // where the human hand waits before the hold: fingertips just past the left edge of the screen
  function shWait(L, geo) { const w = P[L].sh.wait.slice(); if (geo) w[0] = geo.lx + w[0]; return w; }
  const rot = (v, a) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  // rig array [anchorX, anchorY, scale, rot, opacity] that puts a handshake hand's web at w ('h' human, 'r' robot)
  function atWeb(who, w, r, s, o) {
    const A = window.SWArt.HS, P0 = who === 'h' ? A.hw : A.rw, an = who === 'h' ? A.ancH : A.ancR, d = rot([(P0[0] - an[0]) * A.K * s, (P0[1] - an[1]) * A.K * s], r);
    return [w[0] - d[0], w[1] - d[1], s, r, o == null ? 1 : o];
  }
  // robot rig that keeps relation [x, y, phi] to a human rig: robot web on human svg point (x, y), robot turned phi from the human
  function follow(hv, rel) {
    const A = window.SWArt.HS, s = hv[2], r = hv[3], d = rot([(rel[0] - A.ancH[0]) * A.K * s, (rel[1] - A.ancH[1]) * A.K * s], r);
    return atWeb('r', [hv[0] + d[0], hv[1] + d[1]], r + rel[2], s, hv[4]);
  }
  function hs(L) {
    const q = P[L].hs, A = window.SWArt.HS, s = q.s, M = A.meet;
    return {
      s, meet: M, hold: A.hold, pivot: q.pivot,
      rWait: atWeb('r', q.rWait, 0, s), rMeet: atWeb('r', q.rMeet, 0, s),
      hMeet: atWeb('h', [q.rMeet[0] - (M[0] - A.hw[0]) * A.K * s, q.rMeet[1] - (M[1] - A.hw[1]) * A.K * s], 0, s),
      hClasp: atWeb('h', q.hClasp, q.hClasp[2], s), hRest: atWeb('h', q.hRest, q.hRest[2], s),
      rOff: atWeb('r', q.rOff, q.rOff[2], s, 0), hExit: atWeb('h', q.hExit, q.hExit[2], s, 0)
    };
  }
  // share of words set in Audiowide: none before the handshake, a few right after it, all of them by frame 12
  const MIX = [0, 0, 0, 0, 0, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9, 1];
  function mix(f, g) { return f === 5 ? (g.g5 ? 0.16 : 0) : MIX[f - 1]; }

  function state(f, L, g, geo) {
    const p = P[L], s = {}, i = f - 1;
    const d5 = f === 5 && g.g5, b4 = (f === 4 || f === 5) && g.g4;
    const mood = f <= 2 ? 'past' : (f <= 4 || (f === 5 && !g.g5)) ? 'alarm' : 'future';
    s.stage = Object.assign({}, MOOD[mood]);
    const bg = f === 1 ? 'bg1' : f === 2 ? 'bg2' : f === 3 ? 'bg3' : f <= 5 ? 'bg4' : f < 12 ? 'bg6' : 'bg12';
    ['bg1', 'bg2', 'bg3', 'bg4', 'bg6', 'bg12'].forEach(k => { s[k] = { autoAlpha: k === bg ? 1 : 0 }; });
    s.bg5 = { autoAlpha: d5 ? 1 : 0, scale: d5 ? 1 : 0.08 };
    s.vgP = { autoAlpha: f <= 2 ? 1 : 0 };
    s.vgA = { autoAlpha: mood === 'alarm' ? 1 : 0 };
    s.vgF = { autoAlpha: mood === 'future' ? 1 : 0 };
    s.grain = { autoAlpha: f <= 2 ? 0.22 : 0 };
    s.clight = { autoAlpha: f >= 3 && mood === 'alarm' ? 1 : 0 };
    s.pill = { autoAlpha: f === 1 || f === 4 || f === 5 ? 1 : 0 };
    s.skip = { opacity: f === 12 ? 0.45 : 1 };
    s.gP = { autoAlpha: f <= 2 ? 1 : 0 };
    s.gA = { autoAlpha: f === 3 ? 1 : 0 };
    s.gF = { autoAlpha: f >= 6 ? 1 : 0, y: f === 12 ? p.gF12 : 0 };
    const sh = p.shop[i];
    s.shop = { x: sh[0], y: sh[1], scale: sh[2], autoAlpha: sh[3] };
    // phone frame 12: a taller screen's extra height (geo.by = 740 + extra / 2 + 12) grows the small shop, its bottom and centre kept
    const g12 = L === 'm' && f === 12 && geo ? Math.min(0.32, sh[2] + Math.max(0, (geo.by - 752) * 2) / 700) - sh[2] : 0;
    if (g12) Object.assign(s.shop, { x: sh[0] - 300 * g12, y: sh[1] - 560 * g12, scale: sh[2] + g12 });
    s.shopfx = { filter: f <= 5 ? FX[i] : FX[0], autoAlpha: b4 ? 0 : 1 };
    if (f === 1 && g.g1) s.shopfx.filter = 'saturate(1.04) brightness(1.04)';
    s.pieces = { autoAlpha: f === 4 && g.g4 ? 1 : 0 };
    s.crack = { autoAlpha: f === 4 && g.g4 ? 1 : 0 };
    s.ring4 = { autoAlpha: f === 4 && !g.g4 ? 1 : 0, scale: f === 4 && !g.g4 ? 1 : 0.7 };
    s.f4h = { autoAlpha: 0 };
    s.gl4 = { autoAlpha: f === 4 && g.g4 ? 1 : 0 };
    s.halo = { autoAlpha: f >= 6 ? 1 : 0 };
    window.SWArt.ORDER.forEach(n => {
      const up = f >= (UP[n] || 12);
      s['L-' + n + '-o'] = { autoAlpha: up ? 0 : 1 };
      s['L-' + n + '-n'] = { autoAlpha: up ? 1 : 0 };
    });
    s['L-glass-o'].autoAlpha = f >= 4 ? 0 : 1;
    s['L-warm-o'] = { autoAlpha: f === 2 ? 1 : (f === 1 && g.g1) ? 0.7 : 0 };
    s.flip = { rotationY: g.g1 ? 180 : 0, autoAlpha: f >= 12 ? 0 : 1 };
    s.hit = { autoAlpha: f === 1 && !g.g1 ? 1 : 0 };
    s.hR = rig('hR', p.reach[i]);
    s['hR-red'] = { autoAlpha: f >= 3 && f <= 5 ? 1 : 0 };
    const nb = f >= 6 ? Math.min(6, f - 5) : 0;
    PARTS.forEach((pt, j) => { s['pi-' + pt] = { autoAlpha: j < nb ? 1 : 0 }; });
    const k = f < 5 ? 'off' : (f === 5 && !g.g5) ? 'on' : 'done', H = hs(L);
    const off = p.sh.off[0].slice(); if (geo) off[0] = geo.lx - 260;
    s.hSH = rig('hSH', k === 'off' ? off : k === 'on' ? shWait(L, geo) : f === 5 ? H.hRest : H.hExit);
    s.hSR = rig('hSR', k === 'off' ? p.sh.off[1] : k === 'on' ? H.rWait : H.rOff);
    s.hSRf = Object.assign({}, s.hSR); s.hSHb = Object.assign({}, s.hSH);
    s['hSH-red'] = { autoAlpha: k === 'done' ? 0 : 1 };
    s.duo = { x: 0, y: 0, rotation: 0 };
    s.hShadow = { autoAlpha: 0 };
    const pon = p.present.on.slice(); if (g12) { pon[0] += 300 * g12; pon[2] *= Math.sqrt(1 + g12 / sh[2]); }
    s.hP = rig('hP', f === 12 ? pon : p.present.off);
    s.ring = { autoAlpha: f === 5 && !g.g5 ? 1 : 0, scale: f === 5 && !g.g5 ? 1 : 0.7 };
    for (let n = 1; n <= 12; n++) {
      const v = n < f ? { autoAlpha: 0, y: -p.shift } : n === f ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: p.shift };
      s['t' + n] = v;
      if (n === 4) s.x4 = { autoAlpha: n === f ? 1 : 0 };
      else if (n >= 6) s['x' + n] = Object.assign({}, v);
    }
    s.t5a = { autoAlpha: g.g5 ? 0 : 1 };
    s.t5b = { autoAlpha: g.g5 ? 1 : 0 };
    return s;
  }

  window.SWFrames = { FR, ids: FR.map(f => f.id), state, MOOD, P, SPEC, rig, shWait, mix, hs, follow };
})();
