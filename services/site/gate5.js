// Loading glass. Frosted until every part of the page has rendered: fonts, scripts, the engine, the photos and the
// three 3D hands (each reports ok or fail to window.SW3D, see phone5.js). Until the stage shows, the glass carries only
// ambient light in the page's colours; then the real page sits behind the frost. The ring's liquid runs the page's own
// timeline (1999 cream to 2030 cyan), fills with real progress, flows once everything is in, and a click lifts the glass.
// Nothing behind it moves until then: keys are held, the stage is inert and the frame-1 sign hint waits.
(function () {
  const gate = document.querySelector('[data-gate]');
  window.SWGate = { done: false };
  if (!gate) { window.SWGate.done = true; return; }

  const t0 = performance.now(), age = () => performance.now() - t0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const no3d = /[?&]no3d\b/.test(location.search);
  const HANDS = ['reach', 'hands', 'fall'];
  // the 3D modules give up after 20-30 s themselves; the glass never waits longer than this for anything
  const LIMIT = { fonts: 8000, three: 15000, hands: 32000, all: 45000 };
  const R = 100, C = 2 * Math.PI * R;
  // the page's timeline, left to right: 1999 shop light to 2030 glass
  const STOPS = ['#f3e2c2', '#e3cdab', '#cfb293', '#c48a5a', '#8c3829', '#7a0914', '#2350f0', '#39e6ff'];

  const q = s => gate.querySelector(s);
  const num = q('[data-gate-n]'), mask = q('[data-gate-mask]'), meter = q('[role="progressbar"]');
  const go = q('[data-gate-go]'), live = q('[data-gate-live]'), liquid = q('[data-gate-liquid]');
  if (matchMedia('(hover: none)').matches) go.textContent = 'Tap to continue';
  if (reduced) gate.querySelectorAll('animate').forEach(a => a.remove());   // the liquid's ripple stays still

  // the liquid: 90 short arcs, each coloured by where it sits on the timeline, so colour follows the ring
  (function paintLiquid() {
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = t => {
      const x = t * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
      const a = hex(STOPS[i]), b = hex(STOPS[i + 1]);
      return 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',') + ')';
    };
    // angle 0 at twelve o'clock, clockwise, to match the mask circle (rotated -90 in the markup)
    const N = 90, ns = 'http://www.w3.org/2000/svg', pt = d => [120 + R * Math.cos(d - Math.PI / 2), 120 + R * Math.sin(d - Math.PI / 2)];
    const arc = (a0, a1, colour) => {
      const p0 = pt(a0), p1 = pt(a1), path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A' + R + ' ' + R + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2));
      path.setAttribute('stroke', colour);
      liquid.appendChild(path);
    };
    // each arc overlaps the next a little so no seams show between them; the last stops at twelve o'clock
    for (let i = 0; i < N; i++) arc((i / N) * 2 * Math.PI, Math.min(i + 1.6, N) / N * 2 * Math.PI, mix(i / (N - 1)));
    // the mask's round cap reaches a few degrees behind the start: keep that sliver 1999 cream, not 2030 cyan
    arc(-0.09, 0.02, STOPS[0]);
  })();

  let fontsDone = false;
  try {
    Promise.all(['40px Zaslia', '40px Audiowide', '300 40px Cormorant', '16px "Hanken Grotesk"', '16px "IBM Plex Mono"']
      .map(f => document.fonts.load(f)))
      .then(() => document.fonts.ready).catch(() => {}).then(() => { fontsDone = true; });
  } catch (_) { fontsDone = true; }

  // three's default loading manager sees every model and texture the hands fetch: per-file progress while they load
  let files = 0, hooked = false;
  function hook() {
    const M = window.THREE && window.THREE.DefaultLoadingManager;
    if (!M || hooked) return;
    hooked = true;
    const prev = M.onProgress;
    M.onProgress = function (url, loaded, total) { files = total ? loaded / total : 0; if (prev) prev.apply(this, arguments); };
  }

  const stage = () => document.querySelector('[data-stage]');
  function images() {
    const imgs = document.querySelectorAll('[data-stage] img');
    for (const i of imgs) if (!i.complete) return false;
    return document.readyState !== 'loading';
  }
  function handsSettled() {
    if (no3d || age() > LIMIT.hands) return HANDS.length;
    const S = (window.SW3D && window.SW3D.state) || {}, eng = window.__sw;
    return HANDS.filter(k => S[k] === 'ok' || S[k] === 'fail' ||
      // no WebGL: frame 4 keeps its flat pieces and fall3d never starts
      (k === 'fall' && eng && eng.fall === null)).length;
  }
  function stageShown() {
    const st = stage();
    if (!st || !window.__sw) return false;
    const cs = getComputedStyle(st);
    return cs.visibility === 'visible' && parseFloat(cs.opacity) > 0.98;
  }

  // weights add up to 100; the hands are most of the bytes, so most of the ring
  function target() {
    const parts = [
      [6, document.readyState !== 'loading'],
      [10, !!(window.gsap && window.Observer && window.SWEngine && window.SWArt && window.SWFrames)],
      [12, fontsDone || age() > LIMIT.fonts],
      [8, !!window.THREE || age() > LIMIT.three],
      [8, !!window.__sw],
      [8, images()]
    ];
    let p = parts.reduce((a, w) => a + (w[1] ? w[0] : 0), 0);
    const settled = handsSettled() / HANDS.length;
    p += 44 * Math.max(settled, Math.min(1, files) * 0.9);
    if (stageShown()) p += 4;
    return { p, all: parts.every(w => w[1]) && settled === 1 && stageShown() };
  }

  // the frame-1 sign hint counts five idle seconds before the hand points; keep that clock at zero behind the glass
  function holdHint() {
    const H = window.__sw && window.__sw.hint;
    if (H && !H.done) { H.t = 0; H.lv = 0; H.mv = 0; }
  }

  let shown = 0, readyAt = 0, done = false, lifted = false, inert = false, lit = false, queued = false, sleeper = 0;
  // animation frames stop in background tabs; a timer keeps loading moving there, so a visitor who comes back finds it ready
  function next() {
    if (queued) return;
    queued = true;
    const run = () => { if (!queued) return; queued = false; frame(); };
    requestAnimationFrame(run);
    setTimeout(run, 120);
  }
  function paint(v) {
    const n = Math.floor(v);
    num.textContent = n;
    mask.style.strokeDashoffset = (C * (1 - v / 100)).toFixed(2);
    meter.setAttribute('aria-valuenow', n);
  }

  function frame() {
    if (done) return;
    hook(); holdHint();
    const st = stage();
    if (st && !inert) { st.inert = true; inert = true; }
    if (!lit && stageShown()) { lit = true; gate.classList.add('is-lit'); }
    const t = target(), complete = t.all || age() > LIMIT.all;
    // two frames and a beat after the last part reports, so the hands' own cross-fades have finished too
    if (complete && !readyAt) readyAt = performance.now();
    // while a part is still on its way the ring creeps, never more than 6 points past what has really loaded
    const goal = readyAt && performance.now() - readyAt > 350 ? 100 : Math.min(Math.max(t.p, shown + 0.03), t.p + 6, 99);
    shown += Math.max(0, goal - shown) * (reduced ? 1 : 0.075);
    if (goal - shown < 0.35) shown = Math.max(shown, goal);
    paint(shown);
    if (shown >= 100) { finish(); return; }
    next();
  }

  function finish() {
    done = true;
    if (!lit) { lit = true; gate.classList.add('is-lit'); }
    gate.classList.add('is-done');
    gate.setAttribute('aria-busy', 'false');
    go.hidden = false;
    live.textContent = 'Ready. Press Enter or click to continue.';
    requestAnimationFrame(() => { try { go.focus({ preventScroll: true }); } catch (_) { go.focus(); } });
    gate.addEventListener('click', lift);
    // keep the hint asleep until the glass is gone
    sleeper = setInterval(holdHint, 50);
  }

  function lift() {
    if (lifted) return;
    lifted = true;
    gate.classList.add('is-out');
    clearInterval(sleeper);
    const st = stage();
    if (st) st.inert = false;
    window.removeEventListener('keydown', hold, true);
    setTimeout(() => {
      gate.remove();
      window.SWGate.done = true;
      const eng = window.__sw;
      if (eng && eng.hintArm && eng.cur === 1 && !eng.g.g1) eng.hintArm();
      if (window.SWPhone) window.SWPhone.check();
    }, reduced ? 200 : 950);
  }

  // while the glass is up, no key reaches the page; once ready, Enter or Space lifts it
  function hold(e) {
    e.stopPropagation();
    if (done && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); lift(); return; }
    if (e.key === ' ' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Home' || e.key === 'End' || e.key.indexOf('Arrow') === 0) e.preventDefault();
  }
  window.addEventListener('keydown', hold, true);

  gate.setAttribute('aria-busy', 'true');
  paint(0);
  next();
})();
