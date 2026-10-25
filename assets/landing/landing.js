/* saad-dev.com landing.
   One door active at a time: body[data-active] + .door.on pick the preview and the door's theme (landing.css).
   A spring follows the pointer (or the phone's tilt) and writes --rx --ry (deg) and --tx --ty (vw/vh) on :root. */
(function () {
  const root = document.documentElement, body = document.body;
  const doors = [...document.querySelectorAll('.door')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TILT = () => reduced.matches ? 3 : 18;     // degrees at the button's edge
  const SHIFT = () => reduced.matches ? 1 : 6;     // vw / vh against the pointer
  const LEAVE_MS = 500, TAP_MS = 600;

  /* ---------- active door ---------- */
  let active = '';
  function activate(name) {
    if (name === active) return;
    active = name;
    body.dataset.active = name;
    doors.forEach(d => d.classList.toggle('on', d.dataset.door === name));
    if (name === 'services') drawGlassMap(doors.find(d => d.dataset.door === 'services'));
    if (!name) aim(0, 0);
    wake();
  }

  /* ---------- spring ---------- */
  const axes = { rx: [0, 0, 0], ry: [0, 0, 0], tx: [0, 0, 0], ty: [0, 0, 0] }; // [value, velocity, target]
  const K = 85, C = 9;   // underdamped: it overshoots and settles, which reads as bounce
  function aim(nx, ny) {   // nx, ny in -1..1, pointer position across the door
    axes.ry[2] = nx * TILT();
    axes.rx[2] = -ny * TILT();
    axes.tx[2] = -nx * SHIFT();
    axes.ty[2] = -ny * SHIFT();
  }
  let raf = 0, last = 0;
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }
  function step(now) {
    const dt = Math.min(0.034, (now - last) / 1000); last = now;
    // a slow wobble on top while a preview is showing, so it never sits dead still
    const t = now / 1000, live = active && !reduced.matches && !body.classList.contains('leaving');
    const wob = { rx: live ? Math.sin(t * .9) * 1.6 : 0, ry: live ? Math.cos(t * .7) * 2.2 : 0, tx: 0, ty: live ? Math.sin(t * .6) * .6 : 0 };
    let moving = live;
    for (const k in axes) {
      const a = axes[k], goal = a[2] + wob[k];
      a[1] += (K * (goal - a[0]) - C * a[1]) * dt;
      a[0] += a[1] * dt;
      if (Math.abs(goal - a[0]) > .01 || Math.abs(a[1]) > .01) moving = true;
      root.style.setProperty('--' + k, a[0].toFixed(3));
    }
    raf = moving ? requestAnimationFrame(step) : 0;
  }

  /* ---------- pointer ---------- */
  let lastPointer = 'mouse';
  addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, true);
  doors.forEach(door => {
    door.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') activate(door.dataset.door); });
    door.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || body.classList.contains('leaving')) return;
      const r = door.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      aim(nx, ny);
      door.style.setProperty('--mx', ((nx + 1) * 50).toFixed(1) + '%');
      door.style.setProperty('--my', ((ny + 1) * 50).toFixed(1) + '%');
      if (active !== door.dataset.door) activate(door.dataset.door);
      wake();
    });
    door.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch' || body.classList.contains('leaving')) return;
      // moving straight onto the other door: its pointerenter takes over, no flash of lavender
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.door');
      if (!to) activate('');
    });
    // keyboard focus shows the same theme and preview, without parallax
    door.addEventListener('focus', () => { if (door.matches(':focus-visible')) { activate(door.dataset.door); aim(0, 0); } });
    door.addEventListener('blur', () => { if (!body.classList.contains('leaving') && !door.matches(':hover')) activate(''); });

    door.addEventListener('click', e => {
      // modified clicks, other buttons and keyboard Enter (detail 0) stay ordinary links
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.detail === 0) return;
      e.preventDefault();
      const href = door.href;
      if (lastPointer === 'touch') {
        body.classList.add('tap');
        activate(door.dataset.door);
        listenTilt();
        setTimeout(() => leave(href, TAP_MS - 300), 300);
      } else {
        activate(door.dataset.door);
        leave(href, LEAVE_MS);
      }
    });
  });

  function leave(href, ms) {
    body.classList.add('leaving');
    aim(0, 0); wake();
    setTimeout(() => { location.href = href; }, ms);
  }

  // back button from the page: bfcache restores the frozen zoom, so reset to idle
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    body.classList.remove('leaving', 'tap');
    activate('');
  });

  /* ---------- phone tilt (no permission prompt: iOS is skipped rather than interrupt the tap) ---------- */
  let tiltOn = false, base = null;
  function listenTilt() {
    if (tiltOn || typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission === 'function') return;
    tiltOn = true;
    addEventListener('deviceorientation', e => {
      if (e.beta == null || !active) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      aim(Math.max(-1, Math.min(1, (e.gamma - base.g) / 25)), Math.max(-1, Math.min(1, (e.beta - base.b) / 25)));
      wake();
    });
  }

  /* ---------- liquid glass ---------- */
  // Chromium renders backdrop-filter: url(#svg-filter); other engines get the blur fallback in landing.css
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const chromium = brands.some(b => /Chromium/.test(b.brand)) || (/Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent)) || /Edg\//.test(navigator.userAgent);
  if (chromium && CSS.supports('backdrop-filter', 'url(#glass)')) root.classList.add('glass-svg');

  // displacement map for the door's rounded rectangle: neutral (128) in the middle,
  // pushing along the edge normal near the rim, strongest right at the edge
  let mapKey = '';
  function drawGlassMap(door) {
    if (!root.classList.contains('glass-svg') || !door) return;
    const w = Math.round(door.offsetWidth), h = Math.round(door.offsetHeight);
    const key = w + 'x' + h;
    if (key === mapKey || !w || !h) return;
    mapKey = key;
    const s = 0.5, cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s));
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d'), img = g.createImageData(cw, ch), px = img.data;
    const r = 40 * s, edge = Math.min(cw, ch) * 0.3;
    const hx = cw / 2, hy = ch / 2;
    const sdf = (x, y) => {   // signed distance to the rounded rect, negative inside
      const qx = Math.abs(x - hx) - (hx - r), qy = Math.abs(y - hy) - (hy - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    };
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const d = -sdf(x + .5, y + .5);            // depth inside, px
      let dx = 0, dy = 0;
      if (d > 0 && d < edge) {
        const gx = sdf(x + 1.5, y + .5) - sdf(x - .5, y + .5), gy = sdf(x + .5, y + 1.5) - sdf(x + .5, y - .5);
        const n = Math.hypot(gx, gy) || 1, k = Math.pow(1 - d / edge, 1.8);
        dx = gx / n * k; dy = gy / n * k;
      }
      const i = (y * cw + x) * 4;
      px[i] = 128 + dx * 127; px[i + 1] = 128 + dy * 127; px[i + 2] = 128; px[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const fe = document.getElementById('glass-map');
    fe.setAttribute('width', w); fe.setAttribute('height', h);
    fe.setAttribute('href', cv.toDataURL());
  }
  addEventListener('resize', () => { mapKey = ''; if (active === 'services') drawGlassMap(doors[1]); });

  body.dataset.active = '';
})();
